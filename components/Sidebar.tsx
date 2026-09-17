'use client';

import Image from 'next/image';
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
        <Image src="/nbb-logo.svg" alt="National Bank of Bahrain" width={168} height={69} className="brand-logo" priority />
        <span className="brand-subtitle">Internal Audit</span>
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

      <div className="sidebar-footer">
        <strong>Internal Audit Division</strong>
        National Bank of Bahrain
      </div>
    </aside>
  );
}
