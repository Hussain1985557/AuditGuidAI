'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

const GREETING: ChatTurn = {
  role: 'assistant',
  content: "Hi, I'm Saqer. Ask me about findings, controls, or branch risk — or ask me to create a finding or control for you.",
};

export function SaqerChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatTurn[]>([GREETING]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || isLoading) return;

    const nextMessages: ChatTurn[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/saqer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Something went wrong.');
        return;
      }
      setMessages([...nextMessages, { role: 'assistant', content: data.reply }]);
    } catch {
      setError('Could not reach Saqer. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <button type="button" className="saqer-toggle" onClick={() => setOpen((value) => !value)} aria-label="Open Saqer assistant">
        <Image src="/Saqer.png" alt="Saqer" fill sizes="52px" className="saqer-toggle-image" />
      </button>

      {open ? (
        <div className="saqer-panel">
          <div className="saqer-header">
            <div className="saqer-header-avatar">
              <Image src="/Saqer.png" alt="Saqer" fill sizes="32px" />
            </div>
            <div>
              <strong>Saqer</strong>
              <span>Audit assistant</span>
            </div>
            <button type="button" className="saqer-close" onClick={() => setOpen(false)} aria-label="Close Saqer assistant">
              ×
            </button>
          </div>

          <div className="saqer-messages" ref={listRef}>
            {messages.map((turn, index) => (
              <div key={index} className={`saqer-message ${turn.role}`}>
                {turn.content}
              </div>
            ))}
            {isLoading ? <div className="saqer-message assistant saqer-typing">Thinking…</div> : null}
          </div>

          {error ? <div className="saqer-error">{error}</div> : null}

          <div className="saqer-input-row">
            <input
              type="text"
              placeholder="Ask Saqer anything..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              disabled={isLoading}
            />
            <button type="button" className="primary-button" onClick={() => void sendMessage()} disabled={isLoading || !input.trim()}>
              Send
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
