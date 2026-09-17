import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { executeSaqerTool, SAQER_TOOLS } from '@/lib/saqerTools';

export const runtime = 'nodejs';

const MAX_HISTORY_MESSAGES = 30;
const MAX_MESSAGE_LENGTH = 8000;
const MAX_TOOL_ITERATIONS = 8;

const SYSTEM_PROMPT = `You are Saqer, an AI assistant embedded in AuditGuard AI, an internal audit analytics tool for the National Bank of Bahrain's Internal Audit Division.

You can answer questions about audit findings, internal controls, raffle validation runs, remediation status, and branch risk scores using the read tools available to you, and you can create new findings and controls or update remediation tracking when the user asks you to.

Guidelines:
- Use the list_* tools to check current data before creating a record, so you don't create an unnecessary duplicate and so you can reference real, valid IDs (e.g. a relatedRunId from list_audit_trail_runs).
- If the user's request is ambiguous or is missing information you'd need for a required field, ask a clarifying question before calling a create/update tool rather than guessing.
- After creating or updating a record, briefly confirm what you did and its assigned ID.
- This is a single shared workspace with no individual user accounts, so don't assume who "I" refers to unless the user tells you their name.
- Be concise and direct. This is a professional audit tool, not a casual chat.
- Today's date is ${new Date().toISOString().slice(0, 10)}.`;

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

function isValidHistory(value: unknown): value is ChatTurn[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item === 'object' &&
        (item.role === 'user' || item.role === 'assistant') &&
        typeof item.content === 'string'
    )
  );
}

export async function POST(request: Request) {
  const apiKey = process.env.CLAUDE_API;
  if (!apiKey) {
    return NextResponse.json({ error: 'Saqer is not configured on the server (missing CLAUDE_API).' }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const history = (body as { messages?: unknown })?.messages;
  if (!isValidHistory(history) || history.length === 0) {
    return NextResponse.json({ error: 'Expected a non-empty "messages" array of {role, content} turns.' }, { status: 400 });
  }
  if (history.some((turn) => turn.content.length > MAX_MESSAGE_LENGTH)) {
    return NextResponse.json({ error: 'A message is too long.' }, { status: 400 });
  }

  const trimmedHistory = history.slice(-MAX_HISTORY_MESSAGES);
  const client = new Anthropic({ apiKey });
  const messages: Anthropic.MessageParam[] = trimmedHistory.map((turn) => ({ role: turn.role, content: turn.content }));

  try {
    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
      const response = await client.messages.create({
        model: 'claude-opus-5',
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        tools: SAQER_TOOLS,
        messages,
      });

      if (response.stop_reason === 'tool_use') {
        messages.push({ role: 'assistant', content: response.content });

        const toolUseBlocks = response.content.filter(
          (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
        );
        const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
          toolUseBlocks.map(async (block) => {
            try {
              const result = await executeSaqerTool(block.name, block.input);
              return { type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) };
            } catch (error) {
              return {
                type: 'tool_result',
                tool_use_id: block.id,
                is_error: true,
                content: error instanceof Error ? error.message : 'Tool execution failed.',
              };
            }
          })
        );

        messages.push({ role: 'user', content: toolResults });
        continue;
      }

      if (response.stop_reason === 'refusal') {
        return NextResponse.json({ reply: "I can't help with that request." });
      }

      const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === 'text');
      return NextResponse.json({ reply: textBlock?.text || "I didn't have a response for that." });
    }

    return NextResponse.json({ reply: 'I made several tool calls but did not reach a final answer. Please try rephrasing.' });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'Saqer is rate-limited right now. Please try again shortly.' }, { status: 429 });
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: 'Saqer is misconfigured (invalid API key).' }, { status: 500 });
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `Saqer request failed: ${error.message}` }, { status: 502 });
    }
    return NextResponse.json({ error: 'Saqer encountered an unexpected error.' }, { status: 500 });
  }
}
