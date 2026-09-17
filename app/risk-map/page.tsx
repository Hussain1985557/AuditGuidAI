'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { branchRiskMetrics, ensureBranchRiskDemoData } from '@/lib/branchRisk';
import { useCrossView } from '@/lib/crossView';
import type { BranchRiskMetric } from '@/lib/types';

const LEGEND_STOPS: { label: string; score: number }[] = [
  { label: 'Low', score: 10 },
  { label: 'Moderate', score: 45 },
  { label: 'High', score: 70 },
  { label: 'Critical', score: 92 },
];

function heatColor(score: number): string {
  const clamped = Math.max(0, Math.min(100, score));
  const hue = 140 - (clamped / 100) * 140; // 140 = green, 0 = red
  return `hsl(${hue}, 68%, 46%)`;
}

export default function RiskMapPage() {
  const router = useRouter();
  const { setIntent } = useCrossView();
  const [metrics, setMetrics] = useState<BranchRiskMetric[] | null>(null);

  useEffect(() => {
    void (async () => {
      await ensureBranchRiskDemoData();
      setMetrics(await branchRiskMetrics());
    })();
  }, []);

  function openBranchProfile(branch: string) {
    setIntent({ type: 'openBranchProfile', branch });
    router.push('/branch-risk');
  }

  return (
    <div>
      <header className="topbar">
        <div>
          <p className="eyebrow">Branch Risk Monitoring</p>
          <h1>Risk Map</h1>
        </div>
      </header>

      <section className="panel risk-map-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Suggested Audit Attention</p>
            <h2>Branch Risk Heat Map</h2>
          </div>
        </div>

        {metrics === null ? (
          <p className="finding-evidence-message">Loading branch risk data…</p>
        ) : metrics.length === 0 ? (
          <p className="finding-evidence-message">No branch data available.</p>
        ) : (
          <>
            <div className="risk-map-grid">
              {metrics.map((item) => (
                <button
                  key={item.branch}
                  type="button"
                  className="risk-map-tile"
                  style={{ background: heatColor(item.score) }}
                  onClick={() => openBranchProfile(item.branch)}
                >
                  <span className="risk-map-tile-name">{item.displayBranch}</span>
                  <span className="risk-map-tile-score">{item.score}/100</span>
                  <span className={`risk-badge ${item.rating.toLowerCase()}`}>{item.rating}</span>
                </button>
              ))}
            </div>

            <div className="risk-map-legend">
              <span>Risk score</span>
              {LEGEND_STOPS.map((stop) => (
                <span className="risk-map-legend-item" key={stop.label}>
                  <span className="risk-map-legend-swatch" style={{ background: heatColor(stop.score) }} />
                  {stop.label}
                </span>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
