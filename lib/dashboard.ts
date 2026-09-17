export interface SummaryCard {
  label: string;
  value: string;
  change: string;
  direction: 'up' | 'down';
  icon: string;
  accent: 'blue' | 'red' | 'green' | 'orange';
}

export const summaryData: SummaryCard[] = [
  { label: 'Total controls', value: '1,482', change: '+8.2%', direction: 'up', icon: '▣', accent: 'blue' },
  { label: 'Critical risks', value: '27', change: '-6.1%', direction: 'down', icon: '⚑', accent: 'red' },
  { label: 'Controls tested', value: '91.4%', change: '+3.7%', direction: 'up', icon: '◎', accent: 'green' },
  { label: 'Open actions', value: '43', change: '-11.8%', direction: 'down', icon: '◍', accent: 'orange' },
];

export const trendData = [54, 60, 58, 72, 67, 84, 78, 92];
export const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];

export interface Recommendation {
  tag: string;
  title: string;
  detail: string;
}

export const recommendations: Recommendation[] = [
  {
    tag: 'Priority',
    title: 'Tighten privileged access reviews across finance and infrastructure',
    detail:
      'AI model flags a 14% increase in dormant admin rights and elevated risk around lateral movement exposure.',
  },
  {
    tag: 'Automation',
    title: 'Automate evidence collection for quarterly control attestations',
    detail:
      'Evidence gaps from payroll and vendor workflows are creating manual review delays and inconsistent audit trails.',
  },
  {
    tag: 'Research',
    title: 'Review third-party patch coverage for legacy operating environments',
    detail:
      'High-severity event frequency remains above baseline in a subset of older endpoints and outsourced provider integrations.',
  },
];

export interface DashboardControl {
  control: string;
  owner: string;
  status: 'Good' | 'Watch' | 'Alert';
  risk: 'Low' | 'Medium' | 'High';
  last: string;
}

export const dashboardControls: DashboardControl[] = [
  { control: 'IAM Access Review', owner: 'L. Moore', status: 'Good', risk: 'Low', last: '6 days ago' },
  { control: 'Change Management', owner: 'R. Patel', status: 'Watch', risk: 'Medium', last: '12 days ago' },
  { control: 'Vendor Due Diligence', owner: 'C. Gomez', status: 'Alert', risk: 'High', last: '1 day ago' },
  { control: 'Incident Response', owner: 'J. Hill', status: 'Good', risk: 'Low', last: '4 days ago' },
  { control: 'Asset Inventory', owner: 'N. Brooks', status: 'Watch', risk: 'Medium', last: '9 days ago' },
];

export interface Activity {
  title: string;
  detail: string;
  time: string;
}

export const activities: Activity[] = [
  { title: 'Access review complete', detail: 'Finance admin list reconciled', time: '12 min ago' },
  { title: 'Monitoring alert reduced', detail: 'Endpoint drift normalized', time: '38 min ago' },
  { title: 'Vendor packet uploaded', detail: 'New onboarding checklist reviewed', time: '1 hr ago' },
  { title: 'Control evidence verified', detail: 'Quarterly sign-off approved', time: '3 hrs ago' },
];
