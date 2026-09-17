'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', icon: '◈', label: 'Overview' },
  { href: '/raffle', icon: '✦', label: 'Raffle Validation' },
  { href: '/branch-risk', icon: '◉', label: 'Branch Risk Intelligence' },
  { href: '/audit-trail', icon: '🕘', label: 'Audit Trail' },
  { href: '/controls', icon: '▣', label: 'Controls' },
  { href: '/risk-map', icon: '◎', label: 'Risk Map' },
  { href: '/findings', icon: '◍', label: 'Findings' },
  { href: '/remediation', icon: '⚑', label: 'Remediation' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">A</div>
        <div>
          <div className="brand-name">AuditGuard</div>
          <div className="brand-subtitle">AI</div>
        </div>
      </div>

      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item${pathname === item.href ? ' active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
