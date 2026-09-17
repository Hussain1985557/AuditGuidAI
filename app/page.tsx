'use client';

import { activities, dashboardControls, months, recommendations, summaryData, trendData } from '@/lib/dashboard';

export default function OverviewPage() {
  const max = Math.max(...trendData) + 10;

  return (
    <div>
      <header className="topbar">
        <div>
          <p className="eyebrow">Internal Risk Analytics</p>
          <h1>Audit Overview</h1>
        </div>

        <div className="topbar-actions">
          <button className="ghost-button">Export</button>
          <button className="primary-button">Run AI review</button>
        </div>
      </header>

      <section className="summary-grid">
        {summaryData.map((item) => (
          <article className="summary-card" key={item.label}>
            <div className="card-top">
              <span>{item.label}</span>
              <span className={`card-icon ${item.accent}`}>{item.icon}</span>
            </div>
            <div className="card-figure">{item.value}</div>
            <div className="card-footer">
              <span className={`delta ${item.direction}`}>{item.change}</span>
              <span>vs last period</span>
            </div>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <div className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Risk trend</p>
              <h2>Quarterly exposure</h2>
            </div>
            <span className="chip positive">-12.4% vs prior quarter</span>
          </div>

          <div className="trend-chart">
            {trendData.map((value, index) => (
              <div className="bar-group" key={months[index]}>
                <div className="bar-wrap">
                  <div className="bar" style={{ height: `${(value / max) * 100}%` }} />
                </div>
                <span className="month-label">{months[index]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel recommendations-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">AI guidance</p>
              <h2>Recommended actions</h2>
            </div>
          </div>
          <div className="recommendation-list">
            {recommendations.map((item) => (
              <div className="recommendation-item" key={item.title}>
                <div className="rec-header">
                  <span className="rec-tag">{item.tag}</span>
                </div>
                <h3>{item.title}</h3>
                <p className="rec-item">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bottom-grid">
        <div className="panel table-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Control universe</p>
              <h2>High-priority controls</h2>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Control</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Risk</th>
                <th>Last test</th>
              </tr>
            </thead>
            <tbody>
              {dashboardControls.map((item) => {
                const statusClass = item.status === 'Good' ? 'good' : item.status === 'Watch' ? 'watch' : 'alert';
                const riskClass = item.risk === 'High' ? 'high' : item.risk === 'Medium' ? 'medium' : 'low';
                return (
                  <tr key={item.control}>
                    <td>{item.control}</td>
                    <td>{item.owner}</td>
                    <td>
                      <span className={`status-pill ${statusClass}`}>{item.status}</span>
                    </td>
                    <td>
                      <div className="risk-meter">
                        <span className={`risk-level ${riskClass}`} />
                        {item.risk}
                      </div>
                    </td>
                    <td>{item.last}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Live update</p>
              <h2>Operations pulse</h2>
            </div>
          </div>
          <div className="activity-feed">
            {activities.map((item) => (
              <div className="activity-item" key={item.title}>
                <span className="activity-dot" />
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                </div>
                <span className="activity-time">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
