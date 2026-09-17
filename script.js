const summaryData = [
  {
    label: 'Total controls',
    value: '1,482',
    change: '+8.2%',
    direction: 'up',
    icon: '▣',
    accent: 'blue'
  },
  {
    label: 'Critical risks',
    value: '27',
    change: '-6.1%',
    direction: 'down',
    icon: '⚑',
    accent: 'red'
  },
  {
    label: 'Controls tested',
    value: '91.4%',
    change: '+3.7%',
    direction: 'up',
    icon: '◎',
    accent: 'green'
  },
  {
    label: 'Open actions',
    value: '43',
    change: '-11.8%',
    direction: 'down',
    icon: '◍',
    accent: 'orange'
  }
];

const trendData = [54, 60, 58, 72, 67, 84, 78, 92];
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];

const recommendations = [
  {
    tag: 'Priority',
    title: 'Tighten privileged access reviews across finance and infrastructure',
    detail: 'AI model flags a 14% increase in dormant admin rights and elevated risk around lateral movement exposure.'
  },
  {
    tag: 'Automation',
    title: 'Automate evidence collection for quarterly control attestations',
    detail: 'Evidence gaps from payroll and vendor workflows are creating manual review delays and inconsistent audit trails.'
  },
  {
    tag: 'Research',
    title: 'Review third-party patch coverage for legacy operating environments',
    detail: 'High-severity event frequency remains above baseline in a subset of older endpoints and outsourced provider integrations.'
  }
];

const controls = [
  { control: 'IAM Access Review', owner: 'L. Moore', status: 'Good', risk: 'Low', last: '6 days ago' },
  { control: 'Change Management', owner: 'R. Patel', status: 'Watch', risk: 'Medium', last: '12 days ago' },
  { control: 'Vendor Due Diligence', owner: 'C. Gomez', status: 'Alert', risk: 'High', last: '1 day ago' },
  { control: 'Incident Response', owner: 'J. Hill', status: 'Good', risk: 'Low', last: '4 days ago' },
  { control: 'Asset Inventory', owner: 'N. Brooks', status: 'Watch', risk: 'Medium', last: '9 days ago' }
];

const activities = [
  { title: 'Access review complete', detail: 'Finance admin list reconciled', time: '12 min ago' },
  { title: 'Monitoring alert reduced', detail: 'Endpoint drift normalized', time: '38 min ago' },
  { title: 'Vendor packet uploaded', detail: 'New onboarding checklist reviewed', time: '1 hr ago' },
  { title: 'Control evidence verified', detail: 'Quarterly sign-off approved', time: '3 hrs ago' }
];

const REQUIRED_COLUMNS = [
  'Customer_ID',
  'Transaction_ID',
  'Transaction_Date',
  'Amount',
  'Entries',
  'Employee',
  'Reversed'
];

const AUDIT_TRAIL_STORAGE_KEY = 'audit-guard-raffle-validation-history';
const WORKING_PAPER_STORAGE_KEY = 'audit-guard-raffle-working-papers';
const FINDINGS_STORAGE_KEY = 'audit-guard-findings';
const REMEDIATION_STORAGE_KEY = 'audit-guard-remediation';
const REMEDIATION_AUDIT_EVENTS_STORAGE_KEY = 'audit-guard-remediation-audit-events';
const CONTROLS_STORAGE_KEY = 'audit-guard-controls';
const BRANCH_RISK_STORAGE_KEY = 'audit-guard-branch-risk-intelligence';
let pendingBranchImport = null;
let editingFindingId = null;
let editingRemediationFindingId = null;
let editingControlId = null;

const branchRiskDefaultWeights = {
  complaints: 15,
  gl: 20,
  access: 15,
  shortages: 20,
  incidents: 10,
  findings: 10,
  controls: 10
};

const branchRiskSourceDefinitions = [
  { key: 'complaints', label: 'Customer Complaints', department: 'Compliance / Complaints Officer', icon: '☷' },
  { key: 'gl', label: 'GL Transactions', department: 'Finance / Core Banking', icon: '∑' },
  { key: 'access', label: 'Branch Access Logs', department: 'Security / Access Control System', icon: '⌁' },
  { key: 'shortages', label: 'Teller Cash Shortages', department: 'Zone Managers / Branch Operations', icon: '¤' },
  { key: 'incidents', label: 'Incident Reports', department: 'Zone Managers / Branch Management', icon: '⚑' }
];

const branchRiskDemoSources = {
  complaints: [
    { complaintId: 'CMP-004-01', complaintDate: '2026-09-03', branch: 'Branch 004', complaintCategory: 'Teller service', complaintDescription: 'Long wait and transaction handling concern', status: 'Open', outcome: '', severity: 'Medium' },
    { complaintId: 'CMP-004-02', complaintDate: '2026-09-05', branch: 'Branch 004', complaintCategory: 'Incorrect information from branch staff', complaintDescription: 'Customer received conflicting information', status: 'Under Review', outcome: '', severity: 'High' },
    { complaintId: 'CMP-005-01', complaintDate: '2026-09-04', branch: 'Branch 005', complaintCategory: 'Service quality', complaintDescription: 'Service delay', status: 'Closed', outcome: 'Resolved', severity: 'Low' }
  ],
  gl: [
    { transactionId: 'GL-004-01', branch: 'Branch 004', userId: 'E104', employeeId: 'E104', date: '2026-09-03', time: '23:51', glAccount: '7001', transactionType: 'Manual Adjustment', amount: '8200', manualEntry: 'Yes', reversal: 'No', authorizationUser: 'M201' },
    { transactionId: 'GL-004-02', branch: 'Branch 004', userId: 'E104', employeeId: 'E104', date: '2026-09-06', time: '22:18', glAccount: '7001', transactionType: 'Manual Adjustment', amount: '6100', manualEntry: 'Yes', reversal: 'Yes', authorizationUser: 'M201' },
    { transactionId: 'GL-005-01', branch: 'Branch 005', userId: 'T104', employeeId: 'T104', date: '2026-09-02', time: '10:14', glAccount: '7001', transactionType: 'Manual Adjustment', amount: '480', manualEntry: 'Yes', reversal: 'No', authorizationUser: 'M202' }
  ],
  access: [
    { employeeId: 'E104', employeeName: 'Demo Employee', branch: 'Branch 004', accessDate: '2026-09-03', entryTime: '23:42', exitTime: '23:59', accessPoint: 'Main Entrance' },
    { employeeId: 'E104', employeeName: 'Demo Employee', branch: 'Branch 004', accessDate: '2026-09-06', entryTime: '22:02', exitTime: '22:35', accessPoint: 'Back Office' },
    { employeeId: 'T104', employeeName: 'Demo Teller', branch: 'Branch 005', accessDate: '2026-09-02', entryTime: '06:45', exitTime: '07:10', accessPoint: 'Main Entrance' }
  ],
  shortages: [
    { branch: 'Branch 005', date: '2026-09-02', tellerUserId: 'T104', employeeId: 'T104', shortageAmount: '120', currency: 'BHD', reason: 'Cash count variance', incidentReportNumber: 'INC-005-01', investigationResult: 'Open', recovered: 'No', repeatIncident: 'Yes' },
    { branch: 'Branch 005', date: '2026-09-05', tellerUserId: 'T104', employeeId: 'T104', shortageAmount: '180', currency: 'BHD', reason: 'Cash count variance', incidentReportNumber: 'INC-005-02', investigationResult: 'Open', recovered: 'No', repeatIncident: 'Yes' },
    { branch: 'Branch 004', date: '2026-09-06', tellerUserId: 'T204', employeeId: 'T204', shortageAmount: '80', currency: 'BHD', reason: 'Unresolved difference', incidentReportNumber: 'INC-004-01', investigationResult: 'Open', recovered: 'No', repeatIncident: 'No' }
  ],
  incidents: [
    { incidentId: 'INC-005-01', branch: 'Branch 005', date: '2026-09-02', employeeUser: 'T104', incidentType: 'Cash shortage', description: 'Teller shortage recorded', rootCause: '', zoneManager: 'Manager 005', managementResponse: '', status: 'Open' },
    { incidentId: 'INC-005-02', branch: 'Branch 005', date: '2026-09-05', employeeUser: 'T104', incidentType: 'Cash shortage', description: 'Repeat teller shortage recorded', rootCause: '', zoneManager: 'Manager 005', managementResponse: '', status: 'Open' },
    { incidentId: 'INC-004-01', branch: 'Branch 004', date: '2026-09-06', employeeUser: 'T204', incidentType: 'Cash shortage', description: 'Shortage requires review', rootCause: '', zoneManager: 'Manager 004', managementResponse: '', status: 'Open' }
  ]
};

function getBranchRiskStore() {
  try {
    const stored = localStorage.getItem(BRANCH_RISK_STORAGE_KEY);
    return stored ? JSON.parse(stored) : { sources: {}, weights: { ...branchRiskDefaultWeights }, demo: true, uploads: {} };
  } catch (error) {
    return { sources: {}, weights: { ...branchRiskDefaultWeights }, demo: true, uploads: {} };
  }
}

function saveBranchRiskStore(store) {
  localStorage.setItem(BRANCH_RISK_STORAGE_KEY, JSON.stringify(store));
}

function generateBranchImportBatchId(store) {
  const existing = Object.values(store.uploads || {}).map((upload) => String(upload.importBatchId || '')).filter(Boolean);
  const highest = existing.reduce((max, value) => {
    const match = value.match(/^IMP-\d{4}-(\d{4})$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `IMP-${new Date().getFullYear()}-${String(highest + 1).padStart(4, '0')}`;
}

function ensureBranchRiskDemoData() {
  const store = getBranchRiskStore();
  if (Object.keys(store.sources || {}).length) {
    if (normalizeBranchRiskStoreRecords(store)) {
      saveBranchRiskStore(store);
    }
    return;
  }
  store.sources = JSON.parse(JSON.stringify(branchRiskDemoSources));
  store.weights = { ...branchRiskDefaultWeights };
  store.demo = true;
  store.uploads = {};
  normalizeBranchRiskStoreRecords(store);
  saveBranchRiskStore(store);
}

function branchRiskRecords(key) {
  return getBranchRiskStore().sources?.[key] || [];
}

function canonicalBranchId(value) {
  const normalized = String(value || '').trim().replace(/^branch\s*/i, '').trim();
  if (!normalized) {
    return '';
  }

  const numericId = normalized.match(/^\d+$/);
  return numericId ? numericId[0].padStart(3, '0') : normalized.toUpperCase();
}

function branchDisplayName(branchId) {
  return /^\d+$/.test(branchId) ? `Branch ${branchId}` : branchId;
}

function normalizeBranchRiskStoreRecords(store) {
  let changed = false;
  Object.keys(store.sources || {}).forEach((sourceKey) => {
    store.sources[sourceKey] = (store.sources[sourceKey] || []).map((record) => {
      const rawBranch = record.branch || record.Branch || record.branchId || record.Branch_ID || record.Branch_Name || '';
      const normalizedId = canonicalBranchId(record.canonicalBranchId || rawBranch);
      const normalizedRecord = {
        ...record,
        canonicalBranchId: normalizedId,
        branch: normalizedId ? branchDisplayName(normalizedId) : ''
      };
      if (record.canonicalBranchId !== normalizedId || record.branch !== normalizedRecord.branch) {
        changed = true;
      }
      return normalizedRecord;
    });
  });
  return changed;
}

function branchRiskObjectsFromRows(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).map((row) => headers.reduce((record, header, index) => {
    record[header] = row[index] || '';
    return record;
  }, {}));
}

function branchName(record) {
  return canonicalBranchId(record.canonicalBranchId || record.branch || record.Branch || record.branchId || record.Branch_ID || record.Branch_Name || '');
}

function isAfterHours(time) {
  const hour = Number(String(time || '').split(':')[0]);
  return Number.isFinite(hour) && (hour < 7 || hour >= 20);
}

function isWeekend(date) {
  const parsed = new Date(date);
  return !Number.isNaN(parsed.getTime()) && [0, 6].includes(parsed.getDay());
}

function branchRiskRating(score) {
  if (score >= 80) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 30) return 'Moderate';
  return 'Low';
}

function branchRiskSourceMeta(sourceKey) {
  const definition = branchRiskSourceDefinitions.find((source) => source.key === sourceKey) || {};
  const upload = getBranchRiskStore().uploads?.[sourceKey];
  return {
    sourceType: definition.label || sourceKey,
    department: definition.department || 'Not recorded',
    sourceFile: upload?.fileName || (getBranchRiskStore().demo ? 'Branch Risk demo dataset' : 'Not recorded'),
    imported: upload?.uploadDate ? new Date(upload.uploadDate).toLocaleString() : 'Not recorded',
    importBatch: upload?.importBatchId || 'Not recorded'
  };
}

function branchRecordReference(record, sourceKey) {
  return record.complaintReference || record.complaintId || record.transactionId || record.referenceNumber || record.incidentId || record.incidentReportNumber || record.employeeId || `${sourceKey}-record`;
}

function branchEvidenceFields(record, sourceKey) {
  if (sourceKey === 'complaints') {
    return [
      ['Complaint Reference', branchRecordReference(record, sourceKey)],
      ['Date', record.complaintDate || record.date],
      ['Branch', record.branch || record.branchName],
      ['Category', record.category || record.complaintCategory],
      ['Employee/User', record.employeeId],
      ['Description', record.description || record.complaintDescription],
      ['Classification', record.classification || 'Branch record retained in source'],
      ['Scoring Reason', 'Stored branch complaint included in the current complaint contribution.']
    ];
  }
  if (sourceKey === 'gl') {
    return [
      ['Transaction Reference', branchRecordReference(record, sourceKey)], ['Date', record.date], ['Time', record.time],
      ['Branch', record.branch], ['Employee/User ID', record.employeeId || record.userId], ['GL Account', record.glAccount],
      ['Amount', record.amount], ['Exception Type', 'GL Timing / Manual / Amount / Reversal indicator'],
      ['Reason Flagged', 'Matched the existing GL exception predicate.']
    ];
  }
  if (sourceKey === 'access') {
    return [
      ['Access Event ID', branchRecordReference(record, sourceKey)], ['Date', record.accessDate], ['Time', record.entryTime],
      ['Branch', record.branch], ['Employee/User ID', record.employeeId], ['Access Point', record.accessPoint],
      ['Event Type', 'Access exception'], ['Reason Flagged', 'After-hours or weekend access matched the existing predicate.']
    ];
  }
  if (sourceKey === 'shortages') {
    return [
      ['Shortage Reference', branchRecordReference(record, sourceKey)], ['Date', record.date], ['Branch', record.branch],
      ['Teller/User ID', record.tellerUserId || record.employeeId], ['Amount', record.shortageAmount], ['Reason', record.reason],
      ['Incident Reference', record.incidentReportNumber], ['Status', record.investigationResult || record.status],
      ['Scoring Reason', 'Stored shortage record counted by the existing methodology.']
    ];
  }
  return [
    ['Incident Reference', branchRecordReference(record, sourceKey)], ['Date', record.date], ['Branch', record.branch],
    ['Employee/User', record.employeeUser || record.employeeId], ['Incident Type', record.incidentType],
    ['Description', record.description], ['Root Cause', record.rootCause], ['Corrective Action', record.managementResponse],
    ['Status', record.status], ['Scoring Reason', 'Stored incident record counted by the existing methodology.']
  ];
}

function renderBranchEvidenceRecord(record, sourceKey, correlationText) {
  const meta = branchRiskSourceMeta(sourceKey);
  const fields = branchEvidenceFields(record, sourceKey).filter(([, value]) => value !== undefined && value !== '');
  return `<article class="branch-evidence-record"><div class="branch-evidence-record-heading"><strong>${escapeHtml(branchRecordReference(record, sourceKey))}</strong>${correlationText ? '<span class="risk-badge moderate">Correlated Risk Event</span>' : ''}</div><div class="branch-evidence-fields">${fields.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}</div><div class="branch-evidence-lineage"><span>Source Type: ${escapeHtml(meta.sourceType)}</span><span>Department: ${escapeHtml(meta.department)}</span><span>File: ${escapeHtml(meta.sourceFile)}</span><span>Imported: ${escapeHtml(meta.imported)}</span><span>Import Batch: ${escapeHtml(meta.importBatch)}</span></div>${correlationText ? `<p class="branch-correlation-note">${escapeHtml(correlationText)}</p>` : ''}</article>`;
}

function renderBranchEvidence(item, key) {
  const labels = { complaints: 'Customer Complaints', gl: 'GL Exceptions', access: 'Access Exceptions', shortages: 'Cash/Teller Shortages', incidents: 'Incident Reports', findings: 'Previous Findings', controls: 'Overdue Remediation' };
  const max = getBranchRiskStore().weights[key] || 0;
  const contribution = item.contributions[key] || 0;
  let records = [];
  let sourceKey = key;
  let qualifyingReason = '';

  if (['complaints', 'gl', 'access', 'shortages', 'incidents'].includes(key)) {
    records = item[key === 'gl' ? 'glExceptions' : key === 'access' ? 'accessExceptions' : key];
    qualifyingReason = key === 'complaints' ? 'Stored branch complaint records currently counted by the existing methodology.' : 'Records shown matched the existing Branch Risk exception predicate.';
  } else if (key === 'findings') {
    records = item.openFindings;
    sourceKey = 'findings';
    qualifyingReason = 'Open findings whose branch matches the selected canonical branch.';
  } else if (key === 'controls') {
    records = item.overdueActions;
    sourceKey = 'remediation';
    qualifyingReason = 'Open finding actions with a target date before today.';
  }

  const title = `${labels[key]} — ${item.displayBranch}`;
  const summary = `<div><strong>Risk Contribution: ${contribution} / ${max}</strong><span>Qualifying Records: ${records.length}</span><span>How this score was calculated: ${escapeHtml(qualifyingReason)} Calculated contribution: ${contribution} / ${max}. Maximum permitted contribution under the current methodology: ${max} points.</span></div>`;
  const recordsHtml = records.length ? records.map((record) => {
    if (key === 'findings') {
      const remediation = getRemediationByFinding(record.findingId);
      return `<article class="branch-evidence-record"><div class="branch-evidence-record-heading"><strong>${escapeHtml(record.findingId)}</strong><button type="button" class="audit-trail-button" data-evidence-finding-id="${escapeHtml(record.findingId)}">View Finding</button></div><div class="branch-evidence-fields"><div><span>Finding Title</span><strong>${escapeHtml(record.title)}</strong></div><div><span>Risk Rating</span><strong>${escapeHtml(record.riskRating)}</strong></div><div><span>Status</span><strong>${escapeHtml(record.status)}</strong></div><div><span>Preparation Date</span><strong>${escapeHtml(record.preparationDate)}</strong></div><div><span>Related Run</span><strong>${escapeHtml(record.relatedRunId)}</strong></div><div><span>Remediation Status</span><strong>${escapeHtml(remediation.status)}</strong></div></div></article>`;
    }
    if (key === 'controls') {
      const finding = getFindings().find((item) => item.findingId === record.findingId);
      const remediation = getRemediationByFinding(record.findingId);
      return `<article class="branch-evidence-record"><div class="branch-evidence-record-heading"><strong>${escapeHtml(record.findingId)}</strong></div><div class="branch-evidence-fields"><div><span>Action Owner</span><strong>${escapeHtml(finding?.actionOwner || '')}</strong></div><div><span>Target Date</span><strong>${escapeHtml(finding?.targetDate || '')}</strong></div><div><span>Current Status</span><strong>${escapeHtml(remediation.status)}</strong></div><div><span>Days Overdue</span><strong>${Math.max(0, Math.floor((Date.now() - new Date(finding?.targetDate).getTime()) / 86400000))}</strong></div><div><span>Validation Result</span><strong>${escapeHtml(remediation.validationResult || 'Not completed')}</strong></div></div></article>`;
    }
    return renderBranchEvidenceRecord(record, sourceKey, key === 'access' && item.glExceptions.some((gl) => gl.employeeId === record.employeeId && gl.date === record.accessDate) ? 'Correlated risk pattern requiring auditor review.' : '');
  }).join('') : '<p class="finding-evidence-message">No qualifying records were retained for this indicator.</p>';

  const drilldown = document.getElementById('branchEvidenceDrilldown');
  drilldown.hidden = false;
  document.getElementById('branchEvidenceTitle').textContent = title;
  document.getElementById('branchEvidenceSummary').innerHTML = summary;
  document.getElementById('branchEvidenceRecords').innerHTML = recordsHtml;
  document.querySelectorAll('[data-evidence-finding-id]').forEach((button) => button.addEventListener('click', () => {
    toggleView('findings');
    const finding = getFindings().find((candidate) => candidate.findingId === button.dataset.evidenceFindingId);
    if (finding) openFindingEditor(finding);
  }));
  drilldown.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function branchRiskMetrics() {
  const store = getBranchRiskStore();
  const findings = getFindings();
  const branches = new Set();
  branchRiskSourceDefinitions.forEach(({ key }) => branchRiskRecords(key).forEach((record) => {
    if (branchName(record)) branches.add(branchName(record));
  }));
  const scores = [];
  branches.forEach((branch) => {
    const complaints = branchRiskRecords('complaints').filter((r) => branchName(r) === branch);
    const gl = branchRiskRecords('gl').filter((r) => branchName(r) === branch);
    const access = branchRiskRecords('access').filter((r) => branchName(r) === branch);
    const shortages = branchRiskRecords('shortages').filter((r) => branchName(r) === branch);
    const incidents = branchRiskRecords('incidents').filter((r) => branchName(r) === branch);
    const openFindings = findings.filter((finding) => canonicalBranchId(finding.branch) === branch && !['Closed'].includes(finding.status));
    const overdueActions = openFindings.filter((finding) => finding.targetDate && new Date(finding.targetDate) < new Date());
    const glExceptions = gl.filter((r) => isAfterHours(r.time) || String(r.manualEntry).toLowerCase() === 'yes' || Number(r.amount) >= 5000 || String(r.reversal).toLowerCase() === 'yes');
    const accessExceptions = access.filter((r) => isAfterHours(r.entryTime) || isWeekend(r.accessDate));
    const riskEvents = complaints.length + glExceptions.length + accessExceptions.length + shortages.length + incidents.length + openFindings.length + overdueActions.length;
    const weights = store.weights || branchRiskDefaultWeights;
    const contributions = {
      complaints: Math.min(weights.complaints, complaints.length * 5),
      gl: Math.min(weights.gl, glExceptions.length * 7),
      access: Math.min(weights.access, accessExceptions.length * 7),
      shortages: Math.min(weights.shortages, shortages.length * 7),
      incidents: Math.min(weights.incidents, incidents.length * 5),
      findings: Math.min(weights.findings, openFindings.length * 5),
      controls: overdueActions.length ? Math.min(weights.controls, overdueActions.length * 5) : 0
    };
    const score = Math.min(100, Object.values(contributions).reduce((sum, value) => sum + value, 0));
    scores.push({ branch, displayBranch: branchDisplayName(branch), score, rating: branchRiskRating(score), complaints, gl, access, shortages, incidents, glExceptions, accessExceptions, openFindings, overdueActions, contributions, riskEvents });
  });
  return scores.sort((a, b) => b.score - a.score);
}

function renderBranchRiskDashboard() {
  const metrics = branchRiskMetrics();
  const count = (rating) => metrics.filter((item) => item.rating === rating).length;
  document.getElementById('branchTotalValue').textContent = formatNumber(metrics.length);
  document.getElementById('branchCriticalValue').textContent = formatNumber(count('Critical'));
  document.getElementById('branchHighValue').textContent = formatNumber(count('High'));
  document.getElementById('branchModerateValue').textContent = formatNumber(count('Moderate'));
  document.getElementById('branchLowValue').textContent = formatNumber(count('Low'));
  document.getElementById('branchEventsValue').textContent = formatNumber(metrics.reduce((sum, item) => sum + item.riskEvents, 0));
  const tbody = document.getElementById('branchRiskTableBody');
  tbody.innerHTML = metrics.length ? metrics.map((item) => `
    <tr><td>${escapeHtml(item.displayBranch)}</td><td>${item.score}/100</td><td><span class="risk-badge ${item.rating.toLowerCase()}">${item.rating}</span></td><td>${item.complaints.length}</td><td>${item.glExceptions.length}</td><td>${item.accessExceptions.length}</td><td>${item.shortages.length}</td><td>${item.incidents.length}</td><td>${item.openFindings.length}</td><td>${item.overdueActions.length}</td><td>${item.score >= 60 ? 'Elevated' : 'Stable'}</td><td><button type="button" class="audit-trail-button" data-branch-profile="${escapeHtml(item.branch)}">View Risk Profile</button></td></tr>
  `).join('') : '<tr><td colspan="12">No branch data available.</td></tr>';
  tbody.querySelectorAll('[data-branch-profile]').forEach((button) => button.addEventListener('click', () => openBranchRiskProfile(button.dataset.branchProfile)));
}

function openBranchRiskProfile(branch) {
  const item = branchRiskMetrics().find((metric) => metric.branch === branch);
  if (!item) return;
  document.getElementById('branchRiskRegisterPanel')?.removeAttribute('hidden');
  document.getElementById('branchRiskProfile').hidden = false;
  document.getElementById('branchRiskProfile').scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('branchProfileTitle').textContent = `${item.displayBranch} Risk Profile`;
  document.getElementById('branchProfileSummary').innerHTML = `<strong>Risk Score: ${item.score}/100</strong><span class="risk-badge ${item.rating.toLowerCase()}">${item.rating}</span><p>Risk indicators and suggested audit attention only. Final conclusions remain with the auditor.</p>`;
  const profileActions = document.getElementById('branchProfileActions');
  profileActions.hidden = false;
  profileActions.innerHTML = '<span>Audit workflow</span><button type="button" class="audit-trail-button" data-branch-action="finding">Create Finding</button><button type="button" class="audit-trail-button" data-branch-action="control">Create / Link Control</button>';
  profileActions.querySelector('[data-branch-action="finding"]').addEventListener('click', () => {
    toggleView('findings');
    openFindingEditor(null);
    document.getElementById('findingAuditArea').value = 'Branch Risk Intelligence';
    document.getElementById('findingCondition').value = `${item.branch} has ${item.riskEvents} risk indicators requiring auditor review.`;
  });
  profileActions.querySelector('[data-branch-action="control"]').addEventListener('click', () => {
    toggleView('controls');
    openControlEditor(null);
    document.getElementById('controlAuditArea').value = 'Branch Risk Intelligence';
    document.getElementById('controlName').value = `${item.branch} risk monitoring control`;
  });
  const labels = { complaints: 'Customer Complaints', gl: 'GL Exceptions', access: 'Access Exceptions', shortages: 'Cash/Teller Shortages', incidents: 'Incident Reports', findings: 'Previous Findings', controls: 'Overdue Remediation' };
  document.getElementById('branchDriverGrid').innerHTML = Object.entries(item.contributions).map(([key, value]) => `<button type="button" class="result-card branch-driver-card" data-branch-evidence="${escapeHtml(key)}"><span>${labels[key]}</span><strong>${value}/${getBranchRiskStore().weights[key]}</strong><small>Suggested risk contribution</small><em>View Evidence</em></button>`).join('');
  document.querySelectorAll('[data-branch-evidence]').forEach((card) => card.addEventListener('click', () => renderBranchEvidence(item, card.dataset.branchEvidence)));
  const correlations = [];
  const correlationKeys = new Set();
  item.accessExceptions.forEach((access) => {
    item.glExceptions
      .filter((gl) => gl.employeeId === access.employeeId && gl.date === access.accessDate)
      .forEach((gl) => {
        const accessTime = access.entryTime || '';
        const glId = gl.transactionId || `${gl.glAccount || ''}|${gl.time || ''}|${gl.amount || ''}`;
        const correlationKey = [
          item.branch,
          access.employeeId,
          access.accessDate,
          accessTime,
          glId,
          gl.date,
          gl.time,
          'access-before-unusual-gl'
        ].join('|');

        if (correlationKeys.has(correlationKey)) {
          return;
        }

        correlationKeys.add(correlationKey);
        correlations.push({
          text: `Physical branch access occurred at ${accessTime || 'an unusual time'} on ${access.accessDate} before unusual GL activity at ${gl.time || 'an unusual time'} associated with ${escapeHtml(access.employeeId)}.`,
          key: correlationKey
        });
      });
  });
  document.getElementById('branchCorrelationPanel').innerHTML = `<h3>Correlated Risk Events</h3>${correlations.length ? correlations.map((correlation) => `<p><strong>Risk Pattern Requiring Auditor Review</strong><br>${correlation.text}</p>`).join('') : '<p>No cross-source correlation identified in the selected demo data.</p>'}`;
  document.getElementById('branchAiPanel').innerHTML = `<h3>AI Suggested Audit Procedures</h3><p>Rule-based prototype summary: ${escapeHtml(item.branch)} has ${item.riskEvents} risk indicators across the selected sources. This is Suggested Audit Attention, not a fraud conclusion.</p><ul><li>Review supporting documentation for identified GL transactions.</li><li>Compare system activity with physical access records.</li><li>Review teller shortage incident reports and corrective actions.</li><li>Discuss recurring indicators with the Branch Manager.</li></ul>`;
}

function renderBranchUploadCentre() {
  const store = getBranchRiskStore();
  document.getElementById('branchUploadGrid').innerHTML = branchRiskSourceDefinitions.map((source) => {
    const records = branchRiskRecords(source.key);
    const upload = store.uploads?.[source.key];
    return `<div class="branch-upload-card"><span class="upload-icon">${source.icon}</span><div><strong>${source.label}</strong><p>Source: ${escapeHtml(source.department)}</p><p>${upload ? escapeHtml(upload.fileName) : store.demo ? 'Demo data loaded' : 'No file imported'}</p><small>${upload ? `Worksheet: ${escapeHtml(upload.worksheetName || 'N/A')} · Uploaded ${escapeHtml(new Date(upload.uploadDate).toLocaleString())} · ${upload.records} records · ${escapeHtml(upload.status)}${upload.detectedColumns?.length ? ` · Columns: ${escapeHtml(upload.detectedColumns.join(', '))}` : ''}` : `${records.length} records · ${store.demo ? 'Demo' : 'Awaiting import'}`}</small></div><label class="ghost-button">${upload ? 'Replace File' : 'Upload File'}<input type="file" accept=".csv,.xlsx,.xls" data-branch-source="${source.key}" hidden /></label></div>`;
  }).join('');
  document.querySelectorAll('[data-branch-source]').forEach((input) => input.addEventListener('change', (event) => handleBranchSourceUpload(event, event.target.dataset.branchSource)));
  renderBranchDataQuality();
}

function renderBranchDataQuality() {
  const store = getBranchRiskStore();
  const total = branchRiskSourceDefinitions.reduce((sum, source) => sum + branchRiskRecords(source.key).length, 0);
  const invalid = Object.values(store.uploads || {}).reduce((sum, upload) => sum + (upload.invalidRecords || 0), 0);
  const duplicates = Object.values(store.uploads || {}).reduce((sum, upload) => sum + (upload.duplicateRecords || 0), 0);
  document.getElementById('branchDataQualitySummary').innerHTML = `<div class="data-quality-card"><strong>${total}</strong><span>Valid Records</span></div><div class="data-quality-card"><strong>${invalid}</strong><span>Invalid Records</span></div><div class="data-quality-card"><strong>${duplicates}</strong><span>Duplicate Records</span></div><div class="data-quality-card"><strong>${invalid + duplicates}</strong><span>Excluded Records</span></div>`;
}

async function handleBranchSourceUpload(event, sourceKey) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (sourceKey === 'complaints') {
    await handleComplaintUpload(file);
    return;
  }
  const rows = parseCSV(await file.text());
  const headers = rows.length ? rows[0].map(normalizeHeader) : [];
  const rawData = branchRiskObjectsFromRows(rows);
  const data = rawData.map((record) => normalizeBranchRiskRecord(record, sourceKey));
  const invalidRecords = data.filter((row) => !row.branch || (row.date && Number.isNaN(new Date(row.date).getTime()))).length;
  const mappedRecords = data.filter((row) => row.branch).length;
  const duplicateRecords = Math.max(0, data.length - new Set(data.map((row) => JSON.stringify(row))).size);
  pendingBranchImport = { sourceKey, fileName: file.name, data, records: data.length, mappedRecords, invalidRecords, duplicateRecords, uploadDate: new Date().toISOString() };
  showBranchImportReview();
}

const complaintHeaderAliases = {
  reference: ['complaint reference', 'complaint ref', 'complaint id', 'complaint number', 'complaint no', 'reference', 'reference number', 'case id', 'ticket id'],
  date: ['complaint date', 'date', 'received date', 'date received', 'created date'],
  branchId: ['branch id', 'branch code', 'branch number', 'branch no'],
  branchName: ['branch name', 'branch'],
  customerId: ['customer id', 'customer number', 'client id'],
  employeeId: ['employee id', 'employee number', 'user id', 'staff id'],
  category: ['complaint category', 'category', 'complaint type', 'type'],
  description: ['complaint description', 'description', 'details', 'complaint details'],
  status: ['complaint status', 'status', 'case status'],
  outcome: ['resolution', 'outcome', 'resolution outcome', 'result']
};

function normalizedHeader(value) {
  return String(value || '').toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function findComplaintColumn(headers, aliases) {
  return headers.find((header) => aliases.includes(normalizedHeader(header)));
}

function classifyComplaint(complaint) {
  const text = `${complaint.category} ${complaint.description}`.toLowerCase();
  const physicalBranchIndicators = [
    'physical branch', 'branch service', 'branch operation', 'branch operations', 'branch teller',
    'branch cashier', 'branch staff', 'branch employee', 'teller', 'cashier', 'cash deposit',
    'cash withdrawal', 'cash handling', 'cash shortage', 'cash overage', 'customer service at branch',
    'transaction handled at branch', 'branch queue', 'branch waiting'
  ];
  const centralizedChannelIndicators = [
    'mobile banking', 'mobile application', 'mobile app', 'digital banking', 'internet banking',
    'online banking', 'website', 'web banking', 'call centre', 'call center', 'call-centre',
    'telephone banking', 'telephone service', 'phone banking', 'online card transaction',
    'online card transactions', 'digital channel', 'centralized channel', 'centralised channel'
  ];
  const hasPhysicalBranchEvidence = physicalBranchIndicators.some((indicator) => text.includes(indicator));
  const hasCentralizedChannelEvidence = centralizedChannelIndicators.some((indicator) => text.includes(indicator));
  const atmHasBranchContext = text.includes('atm') && (text.includes('branch') || text.includes('teller') || text.includes('cashier'));

  if (hasCentralizedChannelEvidence && !hasPhysicalBranchEvidence && !atmHasBranchContext) {
    return 'Non-Branch Related';
  }
  if (hasPhysicalBranchEvidence || atmHasBranchContext) {
    return 'Branch Related';
  }
  return 'Requires Auditor Review';
}

function complaintMappingStatus(complaint) {
  if (complaint.branchId) return 'Mapped';
  return 'Branch Mapping Required';
}

async function readComplaintWorkbook(file) {
  if (!window.XLSX) {
    throw new Error('Excel parser unavailable');
  }
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  const worksheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[worksheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const columns = Object.fromEntries(Object.entries(complaintHeaderAliases).map(([key, aliases]) => [key, findComplaintColumn(headers, aliases)]));
  return { worksheetName, headers, rows, columns };
}

async function handleComplaintUpload(file) {
  try {
    const workbookData = await readComplaintWorkbook(file);
    const { rows, columns } = workbookData;
    const complaints = rows.map((row, index) => {
      const value = (key) => columns[key] ? String(row[columns[key]] ?? '').trim() : '';
      const complaint = {
        originalRecord: row,
        rowNumber: index + 2,
        complaintReference: value('reference'),
        complaintDate: value('date'),
        branchId: value('branchId'),
        branchName: value('branchName'),
        customerId: value('customerId'),
        employeeId: value('employeeId'),
        category: value('category'),
        description: value('description'),
        status: value('status'),
        outcome: value('outcome')
      };
      complaint.classification = classifyComplaint(complaint);
      complaint.canonicalBranchId = canonicalBranchId(complaint.branchId || complaint.branchName);
      complaint.mappingStatus = complaint.classification === 'Branch Related' ? complaintMappingStatus(complaint) : 'Not Applicable';
      complaint.include = complaint.classification === 'Branch Related' && complaint.mappingStatus === 'Mapped';
      complaint.invalid = !complaint.complaintReference || !complaint.complaintDate || Number.isNaN(new Date(complaint.complaintDate).getTime());
      complaint.shortDescription = complaint.description.slice(0, 120);
      return complaint;
    });
    const references = complaints.map((complaint) => complaint.complaintReference).filter(Boolean);
    const duplicateReferences = new Set(references.filter((reference, index) => references.indexOf(reference) !== index));
    complaints.forEach((complaint) => { complaint.duplicate = Boolean(complaint.complaintReference && duplicateReferences.has(complaint.complaintReference)); });
    const invalidRecords = complaints.filter((complaint) => complaint.invalid).length;
    pendingBranchImport = { sourceKey: 'complaints', fileName: file.name, worksheetName: workbookData.worksheetName, detectedColumns: workbookData.headers, data: complaints, records: complaints.length, mappedRecords: complaints.filter((complaint) => complaint.mappingStatus === 'Mapped').length, invalidRecords, duplicateRecords: complaints.filter((complaint) => complaint.duplicate).length, uploadDate: new Date().toISOString() };
    showBranchImportReview();
  } catch (error) {
    const message = document.getElementById('branchImportReviewMessage');
    message.textContent = 'Unable to read the complaints workbook. Confirm that it is a valid .xlsx, .xls, or .csv file.';
    document.getElementById('branchImportReview').hidden = false;
  }
}

function normalizeBranchRiskRecord(record, sourceKey) {
  const normalized = { ...record };
  normalized.branch = record.Branch_ID || record.Branch || record.branch || record.Branch_Name || '';
  normalized.branchName = record.Branch_Name || record.branchName || normalized.branch;
  normalized.employeeUserId = record.Employee_ID || record.EmployeeId || record.Employee_ID || record.User_ID || record.User_ID || record.Teller_User_ID || record.Teller_ID || '';
  normalized.date = record.Date || record.Transaction_Date || record.Complaint_Date || record.Access_Date || record.Incident_Date || '';
  normalized.time = record.Time || record.Entry_Time || record.EntryTime || '';
  normalized.eventType = record.Event_Type || record.Transaction_Type || record.Complaint_Category || record.Incident_Type || '';
  normalized.amount = record.Amount || record.Shortage_Amount || record.Amount_BHD || '';
  normalized.description = record.Description || record.Complaint_Description || record.Reason || record.Description_Reason || '';
  normalized.referenceNumber = record.Reference_Number || record.Transaction_ID || record.Complaint_ID || record.Incident_ID || record.Incident_Report_Number || '';
  normalized.canonicalBranchId = canonicalBranchId(normalized.branch);
  normalized.branch = normalized.canonicalBranchId ? branchDisplayName(normalized.canonicalBranchId) : '';
  normalized.source = sourceKey;
  return normalized;
}

function showBranchImportReview() {
  const review = document.getElementById('branchImportReview');
  const summary = document.getElementById('branchImportReviewSummary');
  const message = document.getElementById('branchImportReviewMessage');
  review.hidden = false;
  summary.innerHTML = '';
  message.textContent = `${pendingBranchImport.fileName} is ready for review. Existing ${branchRiskSourceDefinitions.find((source) => source.key === pendingBranchImport.sourceKey).label} data will be replaced only after confirmation.`;
  const complaintDetails = document.getElementById('complaintImportDetails');
  if (pendingBranchImport.sourceKey !== 'complaints') {
    complaintDetails.hidden = true;
    complaintDetails.innerHTML = '';
    return;
  }
  complaintDetails.hidden = false;
  complaintDetails.innerHTML = `
    <div class="complaint-import-meta"><strong>Worksheet:</strong> ${escapeHtml(pendingBranchImport.worksheetName)} <span><strong>Detected columns:</strong> ${escapeHtml(pendingBranchImport.detectedColumns.join(', '))}</span></div>
    <div class="table-scroll"><table class="complaint-review-table"><thead><tr><th>Complaint Reference</th><th>Date</th><th>Branch</th><th>Category</th><th>Short Description</th><th>Classification</th><th>Mapping Status</th><th>Include / Exclude</th></tr></thead><tbody>${pendingBranchImport.data.map((complaint, index) => `
      <tr data-complaint-index="${index}">
        <td>${escapeHtml(complaint.complaintReference || 'Missing reference')}</td>
        <td>${escapeHtml(complaint.complaintDate || 'Missing date')}</td>
        <td><input class="complaint-review-input" data-complaint-field="branchId" value="${escapeHtml(complaint.branchId || complaint.branchName)}" /></td>
        <td>${escapeHtml(complaint.category)}</td>
        <td>${escapeHtml(complaint.shortDescription)}</td>
        <td><select class="complaint-review-select" data-complaint-field="classification"><option ${complaint.classification === 'Branch Related' ? 'selected' : ''}>Branch Related</option><option ${complaint.classification === 'Non-Branch Related' ? 'selected' : ''}>Non-Branch Related</option><option ${complaint.classification === 'Requires Auditor Review' ? 'selected' : ''}>Requires Auditor Review</option></select></td>
        <td class="complaint-mapping-status">${escapeHtml(complaint.mappingStatus)}</td>
        <td><input type="checkbox" data-complaint-field="include" ${complaint.include ? 'checked' : ''} /></td>
      </tr>
    `).join('')}</tbody></table></div>`;
  complaintDetails.querySelectorAll('[data-complaint-field]').forEach((control) => {
    control.addEventListener('change', () => {
      const row = control.closest('[data-complaint-index]');
      const complaint = pendingBranchImport.data[Number(row.dataset.complaintIndex)];
      const field = control.dataset.complaintField;
      if (field === 'include') complaint.include = control.checked;
      if (field === 'branchId') { complaint.branchId = control.value.trim(); complaint.canonicalBranchId = canonicalBranchId(complaint.branchId); complaint.mappingStatus = complaint.canonicalBranchId ? 'Mapped' : 'Branch Mapping Required'; control.value = complaint.canonicalBranchId ? branchDisplayName(complaint.canonicalBranchId) : ''; }
      if (field === 'classification') { complaint.classification = control.value; complaint.mappingStatus = complaint.classification === 'Branch Related' ? (complaint.branchId ? 'Mapped' : 'Branch Mapping Required') : 'Not Applicable'; complaint.include = complaint.classification === 'Branch Related' && complaint.mappingStatus === 'Mapped'; row.querySelector('[data-complaint-field="include"]').checked = complaint.include; }
      row.querySelector('.complaint-mapping-status').textContent = complaint.mappingStatus;
      updateComplaintImportSummary();
    });
  });
  updateComplaintImportSummary();
}

function updateComplaintImportSummary() {
  if (!pendingBranchImport || pendingBranchImport.sourceKey !== 'complaints') return;
  const complaints = pendingBranchImport.data;
  const mapped = complaints.filter((complaint) => complaint.classification === 'Branch Related' && complaint.mappingStatus === 'Mapped').length;
  const nonBranch = complaints.filter((complaint) => complaint.classification === 'Non-Branch Related').length;
  const requiresReview = complaints.filter((complaint) => complaint.classification === 'Requires Auditor Review').length;
  const branchRelated = complaints.filter((complaint) => complaint.classification === 'Branch Related').length;
  const unmapped = complaints.filter((complaint) => complaint.classification === 'Branch Related' && complaint.mappingStatus !== 'Mapped').length;
  const excluded = complaints.filter((complaint) => complaint.classification === 'Non-Branch Related' || (complaint.classification === 'Branch Related' && !complaint.include && !complaint.invalid)).length;
  const categoryTotal = branchRelated + nonBranch + requiresReview;
  document.getElementById('branchImportReviewSummary').innerHTML = `<div class="data-quality-card"><strong>${complaints.length}</strong><span>Total Complaints</span></div><div class="data-quality-card"><strong>${branchRelated}</strong><span>Branch Related</span></div><div class="data-quality-card"><strong>${nonBranch}</strong><span>Non-Branch Related</span></div><div class="data-quality-card"><strong>${requiresReview}</strong><span>Requires Auditor Review</span></div><div class="data-quality-card"><strong>${mapped}</strong><span>Successfully Mapped</span></div><div class="data-quality-card"><strong>${unmapped}</strong><span>Unmapped</span></div><div class="data-quality-card"><strong>${pendingBranchImport.duplicateRecords}</strong><span>Duplicate Records</span></div><div class="data-quality-card"><strong>${pendingBranchImport.invalidRecords}</strong><span>Invalid Records</span></div><div class="data-quality-card"><strong>${excluded}</strong><span>Excluded Records</span></div><div class="data-quality-card"><strong>${categoryTotal}</strong><span>Classification Total</span></div>`;
}

function validateComplaintImport() {
  const complaints = pendingBranchImport.data;
  const branchRelated = complaints.filter((complaint) => complaint.classification === 'Branch Related').length;
  const nonBranch = complaints.filter((complaint) => complaint.classification === 'Non-Branch Related').length;
  const requiresReview = complaints.filter((complaint) => complaint.classification === 'Requires Auditor Review').length;
  const metrics = [
    ['Invalid Records', complaints.filter((complaint) => complaint.invalid).length],
    ['Duplicate Records', complaints.filter((complaint) => complaint.duplicate).length],
    ['Excluded Records', complaints.filter((complaint) => complaint.classification === 'Non-Branch Related' || (complaint.classification === 'Branch Related' && !complaint.include && !complaint.invalid)).length]
  ];
  const categoryTotal = branchRelated + nonBranch + requiresReview;
  const invalidMetric = metrics.find(([, value]) => value > complaints.length);
  if (categoryTotal !== complaints.length) {
    return `Classification totals do not reconcile: ${categoryTotal} classified for ${complaints.length} complaints.`;
  }
  if (invalidMetric) {
    return `${invalidMetric[0]} cannot exceed Total Complaints.`;
  }
  return '';
}

function renderBranchWeights() {
  const weights = getBranchRiskStore().weights || branchRiskDefaultWeights;
  const labels = { complaints: 'Customer Complaints', gl: 'GL Activity Exceptions', access: 'Access Card Exceptions', shortages: 'Cash/Teller Shortages', incidents: 'Incident Reports', findings: 'Previous Audit Findings', controls: 'Control/Remediation Issues' };
  document.getElementById('branchWeightGrid').innerHTML = Object.entries(labels).map(([key, label]) => `<label class="rule-field"><span>${label} (%)</span><input type="number" min="0" max="100" step="1" data-branch-weight="${key}" value="${weights[key]}"></label>`).join('');
}

function exportBranchRiskAssessment() {
  const rows = [['Branch', 'Risk Score', 'Risk Rating', 'Risk Events'], ...branchRiskMetrics().map((item) => [item.branch, item.score, item.rating, item.riskEvents])];
  const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
  const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = 'branch-risk-assessment.csv'; link.click(); URL.revokeObjectURL(link.href);
}

function attachBranchRiskHandlers() {
  ensureBranchRiskDemoData();
  document.getElementById('branchRiskUploadBtn').addEventListener('click', () => { document.getElementById('branchRiskUploadCentre').hidden = false; document.getElementById('branchRiskProfile').hidden = true; renderBranchUploadCentre(); });
  document.getElementById('closeBranchRiskUploadBtn').addEventListener('click', () => { document.getElementById('branchRiskUploadCentre').hidden = true; renderBranchRiskDashboard(); });
  document.getElementById('calculateBranchRiskBtn').addEventListener('click', renderBranchRiskDashboard);
  document.getElementById('runBranchAiBtn').addEventListener('click', () => { const first = branchRiskMetrics()[0]; if (first) openBranchRiskProfile(first.branch); });
  document.getElementById('exportBranchRiskBtn').addEventListener('click', exportBranchRiskAssessment);
  document.getElementById('branchRiskMethodologyBtn').addEventListener('click', () => { document.getElementById('branchRiskMethodology').hidden = false; renderBranchWeights(); });
  document.getElementById('closeBranchRiskMethodologyBtn').addEventListener('click', () => { document.getElementById('branchRiskMethodology').hidden = true; });
  document.getElementById('backToBranchRiskBtn').addEventListener('click', () => { document.getElementById('branchRiskProfile').hidden = true; });
  document.getElementById('closeBranchEvidenceBtn').addEventListener('click', () => { document.getElementById('branchEvidenceDrilldown').hidden = true; });
  document.getElementById('saveBranchWeightsBtn').addEventListener('click', () => { const weights = {}; document.querySelectorAll('[data-branch-weight]').forEach((input) => { weights[input.dataset.branchWeight] = Number(input.value || 0); }); const total = Object.values(weights).reduce((sum, value) => sum + value, 0); const error = document.getElementById('branchWeightError'); if (total !== 100) { error.hidden = false; return; } error.hidden = true; const store = getBranchRiskStore(); store.weights = weights; saveBranchRiskStore(store); document.getElementById('branchRiskMethodology').hidden = true; renderBranchRiskDashboard(); });
  document.getElementById('clearBranchDemoDataBtn').addEventListener('click', () => { const store = getBranchRiskStore(); store.sources = {}; store.demo = false; store.uploads = {}; saveBranchRiskStore(store); renderBranchUploadCentre(); renderBranchRiskDashboard(); });
  document.getElementById('confirmBranchImportBtn').addEventListener('click', () => {
    if (!pendingBranchImport) return;
    if (pendingBranchImport.sourceKey === 'complaints') {
      const validationMessage = validateComplaintImport();
      if (validationMessage) {
        document.getElementById('branchImportReviewMessage').textContent = validationMessage;
        return;
      }
    }
    const store = getBranchRiskStore();
    store.sources[pendingBranchImport.sourceKey] = pendingBranchImport.sourceKey === 'complaints'
      ? pendingBranchImport.data.filter((record) => record.include && !record.invalid && record.classification === 'Branch Related' && record.mappingStatus === 'Mapped').map((record) => ({ ...record, canonicalBranchId: canonicalBranchId(record.branchId), branch: branchDisplayName(canonicalBranchId(record.branchId)), branchName: record.branchName, complaintId: record.complaintReference, complaintDate: record.complaintDate, complaintCategory: record.category, complaintDescription: record.description, status: record.status, outcome: record.outcome, source: 'complaints' }))
      : pendingBranchImport.data.filter((record) => record.branch && !Number.isNaN(new Date(record.date).getTime()));
    store.demo = false;
    store.uploads[pendingBranchImport.sourceKey] = { fileName: pendingBranchImport.fileName, worksheetName: pendingBranchImport.worksheetName || '', detectedColumns: pendingBranchImport.detectedColumns || [], uploadDate: pendingBranchImport.uploadDate, importBatchId: generateBranchImportBatchId(store), records: pendingBranchImport.records, invalidRecords: pendingBranchImport.invalidRecords, duplicateRecords: pendingBranchImport.duplicateRecords, status: 'Imported and confirmed' };
    saveBranchRiskStore(store);
    pendingBranchImport = null;
    document.getElementById('branchImportReview').hidden = true;
    renderBranchUploadCentre();
    renderBranchRiskDashboard();
  });
  document.getElementById('cancelBranchImportBtn').addEventListener('click', () => { pendingBranchImport = null; document.getElementById('branchImportReview').hidden = true; });
  renderBranchRiskDashboard();
}

function renderSummary() {
  const container = document.getElementById('summaryGrid');
  container.innerHTML = summaryData
    .map(
      (item) => `
        <article class="summary-card">
          <div class="card-top">
            <span>${item.label}</span>
            <span class="card-icon ${item.accent}">${item.icon}</span>
          </div>
          <div class="card-figure">${item.value}</div>
          <div class="card-footer">
            <span class="delta ${item.direction}">${item.change}</span>
            <span>vs last period</span>
          </div>
        </article>
      `
    )
    .join('');
}

function renderTrendChart() {
  const container = document.getElementById('trendChart');
  const max = Math.max(...trendData) + 10;

  container.innerHTML = trendData
    .map(
      (value, index) => `
        <div class="bar-group">
          <div class="bar-wrap">
            <div class="bar" style="height:${(value / max) * 100}%"></div>
          </div>
          <span class="month-label">${months[index]}</span>
        </div>
      `
    )
    .join('');
}

function renderRecommendations() {
  const container = document.getElementById('recommendationList');
  container.innerHTML = recommendations
    .map(
      (item) => `
        <div class="recommendation-item">
          <div class="rec-header">
            <span class="rec-tag">${item.tag}</span>
          </div>
          <h3>${item.title}</h3>
          <p class="rec-item">${item.detail}</p>
        </div>
      `
    )
    .join('');
}

function renderControls() {
  const tbody = document.getElementById('controlTableBody');

  tbody.innerHTML = controls
    .map((item) => {
      const statusClass =
        item.status === 'Good' ? 'good' : item.status === 'Watch' ? 'watch' : 'alert';

      const riskClass =
        item.risk === 'High' ? 'high' : item.risk === 'Medium' ? 'medium' : 'low';

      return `
        <tr>
          <td>${item.control}</td>
          <td>${item.owner}</td>
          <td><span class="status-pill ${statusClass}">${item.status}</span></td>
          <td>
            <div class="risk-meter">
              <span class="risk-level ${riskClass}"></span>
              ${item.risk}
            </div>
          </td>
          <td>${item.last}</td>
        </tr>
      `;
    })
    .join('');
}

function renderActivity() {
  const feed = document.getElementById('activityFeed');
  feed.innerHTML = activities
    .map(
      (item) => `
        <div class="activity-item">
          <span class="activity-dot"></span>
          <div>
            <h3>${item.title}</h3>
            <p>${item.detail}</p>
          </div>
          <span class="activity-time">${item.time}</span>
        </div>
      `
    )
    .join('');
}

function toggleView(view) {
  const views = document.querySelectorAll('.view-panel');
  views.forEach((panel) => panel.classList.toggle('active', panel.id === `${view}View`));

  if (view === 'findings') {
    showFindingsRegister();
  }

  if (view === 'remediation') {
    showRemediationRegister();
  }

  if (view === 'controls') {
    showControlsRegister();
  }

  if (view === 'branchRisk') {
    renderBranchRiskDashboard();
  }

  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach((item) => item.classList.toggle('active', item.dataset.view === view));
}

function showValidationError(message) {
  const errorBox = document.getElementById('validationError');
  errorBox.textContent = message;
  errorBox.hidden = false;
}

function clearValidationError() {
  const errorBox = document.getElementById('validationError');
  errorBox.textContent = '';
  errorBox.hidden = true;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return '0';
  }

  return Number(value).toLocaleString();
}

function normalizeHeader(value) {
  return String(value || '').trim().replace(/^\uFEFF/, '');
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }

      row.push(current);
      if (row.some((field) => String(field).trim() !== '')) {
        rows.push(row);
      }
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    if (row.some((field) => String(field).trim() !== '')) {
      rows.push(row);
    }
  }

  return rows;
}

function parseBoolean(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return ['yes', 'y', 'true', '1'].includes(normalized);
}

function parseNumber(value) {
  const cleaned = String(value ?? '').replace(/[$,%\s]/g, '').replace(/,/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDate(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function calculateExpectedEntries(amount, minimumEligibleAmount, entriesPerEligibleAmount) {
  if (!Number.isFinite(amount) || !Number.isFinite(minimumEligibleAmount) || minimumEligibleAmount <= 0) {
    return 0;
  }

  return Math.floor(amount / minimumEligibleAmount) * entriesPerEligibleAmount;
}

function objectFromRows(rows) {
  const header = rows[0].map(normalizeHeader);
  const map = {};
  header.forEach((name, index) => {
    map[name] = index;
  });

  return rows.slice(1).map((row, rowIndex) => {
    const record = {};
    REQUIRED_COLUMNS.forEach((column) => {
      const index = map[column];
      record[column] = index !== undefined ? (row[index] ?? '') : '';
    });
    record._rowNumber = rowIndex + 2;
    return record;
  });
}

function getValidationRules() {
  return {
    startDate: document.getElementById('campaignStartDate').value,
    endDate: document.getElementById('campaignEndDate').value,
    minimumEligibleAmount: Number(document.getElementById('minimumEligibleAmount').value || 0),
    entriesPerEligibleAmount: Number(document.getElementById('entriesPerEligibleAmount').value || 0),
    excludeEmployees: document.getElementById('excludeEmployees').value === 'Yes',
    excludeReversed: document.getElementById('excludeReversedTransactions').value === 'Yes'
  };
}

function updateResultCard(id, value) {
  const card = document.getElementById(id);
  if (card) {
    card.textContent = value;
  }
}

function renderExceptionsTable(rows) {
  const tbody = document.getElementById('exceptionsTableBody');

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="8">No invalid records yet.</td></tr>';
    return;
  }

  tbody.innerHTML = rows
    .map((row) => `
      <tr>
        <td>${row.Customer_ID || ''}</td>
        <td>${row.Transaction_ID || ''}</td>
        <td>${row.Transaction_Date || ''}</td>
        <td>${row.Amount || ''}</td>
        <td>${row.Entries || '0'}</td>
        <td>${row.expectedEntries}</td>
        <td>${row.actualEntries}</td>
        <td>${row.exceptions.join('; ')}</td>
      </tr>
    `)
    .join('');
}

function exportExceptionsCsv() {
  const rows = window.currentValidationRows || [];

  if (!rows.length) {
    return;
  }

  const csvRows = [
    ['Customer ID', 'Transaction ID', 'Transaction Date', 'Amount', 'Number of Entries', 'Expected Entries', 'Actual Entries', 'Exception Reason'],
    ...rows.map((row) => [
      row.Customer_ID || '',
      row.Transaction_ID || '',
      row.Transaction_Date || '',
      row.Amount || '',
      row.Entries || '',
      row.expectedEntries,
      row.actualEntries,
      row.exceptions.join('; ')
    ])
  ];

  const csvContent = csvRows
    .map((entry) => entry.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'raffle-validation-exceptions.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getAuditTrailEntries() {
  try {
    const stored = localStorage.getItem(AUDIT_TRAIL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
}

function saveAuditTrailEntries(entries) {
  localStorage.setItem(AUDIT_TRAIL_STORAGE_KEY, JSON.stringify(entries));
}

function generateRunId() {
  const currentYear = new Date().getFullYear();
  const entries = getAuditTrailEntries();
  const yearEntries = entries.filter((entry) => entry.runId && entry.runId.startsWith(`RV-${currentYear}-`));
  const highest = yearEntries.reduce((max, entry) => {
    const match = entry.runId.match(/RV-(\d{4})-(\d{6})$/);
    if (!match) {
      return max;
    }
    return Math.max(max, Number(match[2]));
  }, 0);

  const nextSequence = highest + 1;
  return `RV-${currentYear}-${String(nextSequence).padStart(6, '0')}`;
}

function buildAuditTrailRecord(fileName, rules, summaryData, invalidRows) {
  return {
    runId: generateRunId(),
    dateTime: new Date().toISOString(),
    fileName,
    campaignStartDate: rules.startDate,
    campaignEndDate: rules.endDate,
    minimumEligibleAmount: rules.minimumEligibleAmount,
    entriesPerEligibleAmount: rules.entriesPerEligibleAmount,
    excludeEmployees: rules.excludeEmployees ? 'Yes' : 'No',
    excludeReversedTransactions: rules.excludeReversed ? 'Yes' : 'No',
    totalRecordsTested: summaryData.totalRecordsTested,
    validRecords: summaryData.validRecords,
    invalidRecords: summaryData.invalidRecords,
    duplicateRecords: summaryData.duplicateRecords,
    reversedTransactions: summaryData.reversedTransactions,
    outsideCampaignPeriod: summaryData.outsideCampaignPeriod,
    exceptionEvidence: invalidRows.map((row) => ({
      transactionId: row.Transaction_ID || '',
      transactionDate: row.Transaction_Date || '',
      transactionAmount: row.Amount || '',
      customerId: row.Customer_ID || '',
      raffleEntries: row.Entries || '0',
      validationResult: 'Invalid',
      exceptionReasons: Array.isArray(row.exceptions) ? row.exceptions.slice() : []
    })),
    status: 'Completed'
  };
}

function getWorkingPapers() {
  try {
    const stored = localStorage.getItem(WORKING_PAPER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    return {};
  }
}

function saveWorkingPapers(workingPapers) {
  localStorage.setItem(WORKING_PAPER_STORAGE_KEY, JSON.stringify(workingPapers));
}

function getWorkingPaperByRun(runId) {
  const workingPapers = getWorkingPapers();
  const stored = workingPapers[runId];
  return stored ? {
    runId,
    auditorNotes: stored.auditorNotes || stored.auditorName || '',
    conclusion: stored.conclusion || '',
    preparedBy: stored.preparedBy || '',
    reviewedBy: stored.reviewedBy || '',
    reviewStatus: ['Draft', 'Prepared', 'Reviewed'].includes(stored.reviewStatus) ? stored.reviewStatus : 'Draft',
    preparationDate: stored.preparationDate || '',
    reviewDate: stored.reviewDate || ''
  } : {
    runId,
    auditorNotes: '',
    conclusion: '',
    preparedBy: '',
    reviewedBy: '',
    reviewStatus: 'Draft',
    preparationDate: '',
    reviewDate: ''
  };
}

function saveWorkingPaperByRun(runId, data) {
  const workingPapers = getWorkingPapers();
  workingPapers[runId] = {
    runId,
    auditorNotes: data.auditorNotes || '',
    conclusion: data.conclusion || '',
    preparedBy: data.preparedBy || '',
    reviewedBy: data.reviewedBy || '',
    reviewStatus: data.reviewStatus || 'Draft',
    preparationDate: data.preparationDate || '',
    reviewDate: data.reviewDate || ''
  };
  saveWorkingPapers(workingPapers);
}

function getFindings() {
  try {
    const stored = localStorage.getItem(FINDINGS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
}

function saveFindings(findings) {
  localStorage.setItem(FINDINGS_STORAGE_KEY, JSON.stringify(findings));
}

function getControls() {
  try {
    const stored = localStorage.getItem(CONTROLS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
}

function saveControls(controls) {
  localStorage.setItem(CONTROLS_STORAGE_KEY, JSON.stringify(controls));
}

function generateControlId() {
  const year = new Date().getFullYear();
  const highest = getControls().reduce((max, control) => {
    const match = String(control.controlId || '').match(new RegExp(`^C-${year}-(\\d{6})$`));
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `C-${year}-${String(highest + 1).padStart(6, '0')}`;
}

function renderControlReferenceOptions(selectedRunId, selectedFindingId) {
  const runSelect = document.getElementById('controlRunId');
  const findingSelect = document.getElementById('controlFindingId');
  const runs = getAuditTrailEntries();
  const findings = getFindings();

  runSelect.innerHTML = `<option value="">None</option>${runs.map((run) => `<option value="${escapeHtml(run.runId)}" ${run.runId === selectedRunId ? 'selected' : ''}>${escapeHtml(run.runId)} - ${escapeHtml(run.fileName)}</option>`).join('')}`;
  findingSelect.innerHTML = `<option value="">None</option>${findings.map((finding) => `<option value="${escapeHtml(finding.findingId)}" ${finding.findingId === selectedFindingId ? 'selected' : ''}>${escapeHtml(finding.findingId)} - ${escapeHtml(finding.title || 'Untitled finding')}</option>`).join('')}`;
}

function renderControlsList() {
  const tbody = document.getElementById('controlsTableBody');
  const controls = getControls();
  if (!controls.length) {
    tbody.innerHTML = '<tr><td colspan="10">No controls created yet.</td></tr>';
    return;
  }

  tbody.innerHTML = controls.slice().reverse().map((control) => `
    <tr>
      <td>${escapeHtml(control.controlId)}</td>
      <td>${escapeHtml(control.controlName)}</td>
      <td>${escapeHtml(control.auditArea)}</td>
      <td>${escapeHtml(control.controlType)}</td>
      <td>${escapeHtml(control.frequency)}</td>
      <td>${escapeHtml(control.controlOwner)}</td>
      <td>${escapeHtml(control.controlStatus)}</td>
      <td>${escapeHtml(control.relatedRunId || 'None')}</td>
      <td>${escapeHtml(control.relatedFindingId || 'None')}</td>
      <td><button type="button" class="audit-trail-button" data-control-id="${escapeHtml(control.controlId)}">View / Edit</button></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-control-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const control = getControls().find((item) => item.controlId === button.dataset.controlId);
      if (control) {
        openControlEditor(control);
      }
    });
  });
}

function showControlsRegister() {
  document.getElementById('controlsRegister').hidden = false;
  document.getElementById('controlEditor').hidden = true;
  editingControlId = null;
  renderControlsList();
}

function renderControlLinks(control) {
  const links = document.getElementById('controlLinks');
  const items = [];
  if (control.relatedRunId) {
    items.push(`<button type="button" class="audit-trail-button" data-control-reference="auditTrail" data-related-run-id="${escapeHtml(control.relatedRunId)}">Open Related Run in Audit Trail</button>`);
  }
  if (control.relatedFindingId) {
    items.push(`<button type="button" class="audit-trail-button" data-control-reference="findings" data-related-finding-id="${escapeHtml(control.relatedFindingId)}">Open Related Finding</button>`);
  }
  links.innerHTML = items.length ? `<span>Linked audit records</span>${items.join('')}` : '';
  links.hidden = !items.length;
  links.querySelectorAll('[data-control-reference]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.controlReference === 'auditTrail') {
        openAuditTrailRun(button.dataset.relatedRunId);
        return;
      }
      if (button.dataset.controlReference === 'findings') {
        openFindingDetails(button.dataset.relatedFindingId);
        return;
      }
      toggleView(button.dataset.controlReference);
    });
  });
}

function openFindingDetails(findingId) {
  toggleView('findings');
  const finding = getFindings().find((item) => item.findingId === findingId);
  if (!finding) {
    renderFindingNotFound(findingId);
    return;
  }

  openFindingEditor(finding);
}

function renderFindingNotFound(findingId) {
  const register = document.getElementById('findingsRegister');
  const editor = document.getElementById('findingEditor');
  register.hidden = true;
  editor.hidden = false;
  document.getElementById('findingEditorTitle').textContent = 'Finding Details';
  document.getElementById('findingError').textContent = `Related finding not found: ${escapeHtml(findingId)}`;
  document.getElementById('findingError').hidden = false;
}

function openAuditTrailRun(runId) {
  toggleView('auditTrail');
  openAuditTrailDetails(runId);
  document.getElementById('auditTrailDetails').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openAuditTrailDetails(runId) {
  const selected = getAuditTrailEntries().find((entry) => entry.runId === runId);
  if (!selected) {
    renderAuditTrailNotFound(runId);
    return;
  }

  renderRunDetails(selected);
}

function renderAuditTrailNotFound(runId) {
  const details = document.getElementById('auditTrailDetails');
  const detailsContent = document.getElementById('auditTrailDetailsContent');
  details.querySelector('h2').textContent = 'Run Details';
  details.hidden = false;
  detailsContent.innerHTML = `<div class="validation-error">Related audit run not found: ${escapeHtml(runId)}</div>`;
}

function openControlEditor(control) {
  editingControlId = control ? control.controlId : null;
  document.getElementById('controlsRegister').hidden = true;
  document.getElementById('controlEditor').hidden = false;
  document.getElementById('controlEditorTitle').textContent = control ? 'Edit Control' : 'Create Control';
  document.getElementById('controlIdValue').textContent = control ? control.controlId : 'New control ID will be assigned on save';
  document.getElementById('controlError').hidden = true;
  const values = {
    controlName: control?.controlName || '',
    controlAuditArea: control?.auditArea || '',
    controlObjective: control?.controlObjective || '',
    controlRiskAddressed: control?.riskAddressed || '',
    controlOwner: control?.controlOwner || '',
    controlAuditorNotes: control?.auditorNotes || ''
  };
  Object.entries(values).forEach(([id, value]) => { document.getElementById(id).value = value; });
  document.getElementById('controlType').value = control?.controlType || 'Preventive';
  document.getElementById('controlNature').value = control?.controlNature || 'Manual';
  document.getElementById('controlFrequency').value = control?.frequency || 'Per Transaction';
  document.getElementById('controlOwner').value = control?.controlOwner || '';
  document.getElementById('controlStatus').value = control?.controlStatus || 'Active';
  document.getElementById('controlDesignEffectiveness').value = control?.designEffectiveness || 'Not Assessed';
  document.getElementById('controlOperatingEffectiveness').value = control?.operatingEffectiveness || 'Not Tested';
  renderControlReferenceOptions(control?.relatedRunId || '', control?.relatedFindingId || '');
  renderControlLinks(control || {});
  document.getElementById('controlEditor').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function collectControlForm() {
  return {
    controlName: document.getElementById('controlName').value,
    auditArea: document.getElementById('controlAuditArea').value,
    controlObjective: document.getElementById('controlObjective').value,
    riskAddressed: document.getElementById('controlRiskAddressed').value,
    controlType: document.getElementById('controlType').value,
    controlNature: document.getElementById('controlNature').value,
    frequency: document.getElementById('controlFrequency').value,
    controlOwner: document.getElementById('controlOwner').value,
    controlStatus: document.getElementById('controlStatus').value,
    relatedRunId: document.getElementById('controlRunId').value,
    relatedFindingId: document.getElementById('controlFindingId').value,
    designEffectiveness: document.getElementById('controlDesignEffectiveness').value,
    operatingEffectiveness: document.getElementById('controlOperatingEffectiveness').value,
    auditorNotes: document.getElementById('controlAuditorNotes').value
  };
}

function saveControl() {
  const form = collectControlForm();
  if (!form.controlName.trim()) {
    const error = document.getElementById('controlError');
    error.textContent = 'Enter a control name before saving.';
    error.hidden = false;
    return;
  }
  const controls = getControls();
  const control = { ...form, controlId: editingControlId || generateControlId() };
  const existingIndex = controls.findIndex((item) => item.controlId === control.controlId);
  if (existingIndex >= 0) {
    controls[existingIndex] = control;
  } else {
    controls.push(control);
  }
  saveControls(controls);
  showControlsRegister();
}

function ensureSeededControl() {
  if (getControls().length) {
    return;
  }
  saveControls([{
    controlId: 'C-2026-000001',
    controlName: 'Raffle Entry Eligibility Validation',
    auditArea: 'Raffle Campaign Controls',
    controlObjective: 'Ensure raffle entries are issued only to eligible transactions in accordance with approved campaign rules.',
    riskAddressed: 'Ineligible, duplicate, reversed, employee, out-of-period, or incorrectly calculated transactions may receive raffle entries.',
    controlType: 'Preventive',
    controlNature: 'Automated',
    frequency: 'Per Transaction',
    controlOwner: 'IT Manager',
    controlStatus: 'Active',
    relatedRunId: 'RV-2026-000008',
    relatedFindingId: 'F-2026-000001',
    designEffectiveness: 'Effective',
    operatingEffectiveness: 'Ineffective',
    auditorNotes: 'Testing identified exceptions in the operation of the raffle eligibility control. The related finding and remediation record provide the detailed audit trail.'
  }]);
}

function attachControlsHandlers() {
  document.getElementById('createControlBtn').addEventListener('click', () => openControlEditor(null));
  document.getElementById('saveControlBtn').addEventListener('click', saveControl);
  document.getElementById('backToControlsBtn').addEventListener('click', showControlsRegister);
  renderControlsList();
}

function getRemediationRecords() {
  try {
    const stored = localStorage.getItem(REMEDIATION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    return {};
  }
}

function saveRemediationRecords(records) {
  localStorage.setItem(REMEDIATION_STORAGE_KEY, JSON.stringify(records));
}

function getRemediationAuditEvents() {
  try {
    const stored = localStorage.getItem(REMEDIATION_AUDIT_EVENTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
}

function saveRemediationAuditEvents(events) {
  localStorage.setItem(REMEDIATION_AUDIT_EVENTS_STORAGE_KEY, JSON.stringify(events));
}

function recordRemediationAuditEvent(finding, remediation, change) {
  const events = getRemediationAuditEvents();
  events.push({
    dateTime: new Date().toISOString(),
    findingId: finding.findingId,
    relatedRunId: finding.relatedRunId,
    remediationStatus: remediation.status,
    validationResult: remediation.validationResult || 'Not completed',
    change
  });
  saveRemediationAuditEvents(events);
}

function renderRemediationAuditEvents() {
  const tbody = document.getElementById('remediationAuditEventsBody');
  if (!tbody) {
    return;
  }

  const events = getRemediationAuditEvents();
  if (!events.length) {
    tbody.innerHTML = '<tr><td colspan="6">No remediation changes recorded yet.</td></tr>';
    return;
  }

  tbody.innerHTML = events.slice().reverse().map((event) => `
    <tr>
      <td>${escapeHtml(new Date(event.dateTime).toLocaleString())}</td>
      <td>${escapeHtml(event.findingId)}</td>
      <td>${escapeHtml(event.relatedRunId)}</td>
      <td>${escapeHtml(event.remediationStatus)}</td>
      <td>${escapeHtml(event.validationResult)}</td>
      <td>${escapeHtml(event.change)}</td>
    </tr>
  `).join('');
}

function getRemediationByFinding(findingId) {
  const stored = getRemediationRecords()[findingId];
  return stored ? {
    findingId,
    status: ['Not Started', 'In Progress', 'Pending Validation', 'Completed', 'Closed'].includes(stored.status) ? stored.status : 'Not Started',
    followUpDate: stored.followUpDate || '',
    auditorComments: stored.auditorComments || '',
    closureResult: stored.closureResult || '',
    evidence: stored.evidence || '',
    validationPerformed: stored.validationPerformed || '',
    validationDate: stored.validationDate || '',
    validationResult: ['Effective', 'Partially Effective', 'Ineffective'].includes(stored.validationResult) ? stored.validationResult : ''
  } : {
    findingId,
    status: 'Not Started',
    followUpDate: '',
    auditorComments: '',
    closureResult: '',
    evidence: '',
    validationPerformed: '',
    validationDate: '',
    validationResult: ''
  };
}

function renderRemediationList() {
  const tbody = document.getElementById('remediationTableBody');
  const findings = getFindings();

  if (!findings.length) {
    tbody.innerHTML = '<tr><td colspan="10">No saved findings available for remediation.</td></tr>';
    return;
  }

  tbody.innerHTML = findings.slice().reverse().map((finding) => {
    const remediation = getRemediationByFinding(finding.findingId);
    return `
      <tr>
        <td>${escapeHtml(finding.findingId)}</td>
        <td>${escapeHtml(finding.title || 'Untitled finding')}</td>
        <td>${escapeHtml(finding.relatedRunId)}</td>
        <td>${escapeHtml(finding.riskRating)}</td>
        <td>${escapeHtml(finding.status)}</td>
        <td>${escapeHtml(finding.actionOwner)}</td>
        <td>${escapeHtml(finding.targetDate)}</td>
        <td>${escapeHtml(finding.managementResponse)}</td>
        <td>${escapeHtml(remediation.status)}</td>
        <td><button type="button" class="audit-trail-button" data-remediation-finding-id="${escapeHtml(finding.findingId)}">Open</button></td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('[data-remediation-finding-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const finding = getFindings().find((item) => item.findingId === button.dataset.remediationFindingId);
      if (finding) {
        openRemediationEditor(finding);
      }
    });
  });
}

function showRemediationRegister() {
  const register = document.getElementById('remediationRegister');
  const editor = document.getElementById('remediationEditor');
  register.hidden = false;
  editor.hidden = true;
  editingRemediationFindingId = null;
  renderRemediationList();
}

function openRemediationEditor(finding) {
  const remediation = getRemediationByFinding(finding.findingId);
  editingRemediationFindingId = finding.findingId;
  document.getElementById('remediationRegister').hidden = true;
  document.getElementById('remediationEditor').hidden = false;
  document.getElementById('remediationError').hidden = true;
  document.getElementById('remediationFindingId').textContent = finding.findingId;
  document.getElementById('remediationRunId').textContent = finding.relatedRunId;
  document.getElementById('remediationFindingTitle').textContent = finding.title || 'Untitled finding';
  document.getElementById('remediationRiskRating').textContent = finding.riskRating;
  document.getElementById('remediationFindingStatus').textContent = finding.status;
  document.getElementById('remediationActionOwner').textContent = finding.actionOwner || 'Not assigned';
  document.getElementById('remediationTargetDate').textContent = finding.targetDate || 'Not set';
  document.getElementById('remediationManagementResponse').textContent = finding.managementResponse || 'No management response recorded';
  document.getElementById('remediationStatus').value = remediation.status;
  document.getElementById('remediationFollowUpDate').value = remediation.followUpDate;
  document.getElementById('remediationEvidence').value = remediation.evidence;
  document.getElementById('remediationValidationPerformed').value = remediation.validationPerformed;
  document.getElementById('remediationValidationDate').value = remediation.validationDate;
  document.getElementById('remediationValidationResult').value = remediation.validationResult;
  document.getElementById('remediationAuditorComments').value = remediation.auditorComments;
  document.getElementById('remediationClosureResult').value = remediation.closureResult;
  document.getElementById('remediationSaveStatus').textContent = '';
  document.getElementById('remediationEditor').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function saveRemediation() {
  if (!editingRemediationFindingId) {
    return;
  }

  const status = document.getElementById('remediationStatus').value;
  const validationPerformed = document.getElementById('remediationValidationPerformed').value.trim();
  const validationDate = document.getElementById('remediationValidationDate').value;
  const validationResult = document.getElementById('remediationValidationResult').value;
  const error = document.getElementById('remediationError');

  if (status === 'Closed' && (!validationPerformed || !validationDate || !validationResult)) {
    error.textContent = 'A Closed remediation requires auditor validation/re-test details, a validation date, and a validation result.';
    error.hidden = false;
    return;
  }

  const finding = getFindings().find((item) => item.findingId === editingRemediationFindingId);
  if (!finding) {
    return;
  }

  const records = getRemediationRecords();
  const remediation = {
    findingId: editingRemediationFindingId,
    status,
    followUpDate: document.getElementById('remediationFollowUpDate').value,
    evidence: document.getElementById('remediationEvidence').value,
    validationPerformed,
    validationDate,
    validationResult,
    auditorComments: document.getElementById('remediationAuditorComments').value,
    closureResult: document.getElementById('remediationClosureResult').value
  };
  const previous = records[editingRemediationFindingId];
  records[editingRemediationFindingId] = remediation;
  saveRemediationRecords(records);
  const change = previous && previous.status !== remediation.status
    ? `Remediation status changed from ${previous.status} to ${remediation.status}.`
    : remediation.status === 'Closed'
      ? 'Remediation closed after auditor validation.'
      : 'Remediation record updated.';
  recordRemediationAuditEvent(finding, remediation, change);
  renderRemediationAuditEvents();
  showRemediationRegister();
}

function attachRemediationHandlers() {
  document.getElementById('saveRemediationBtn').addEventListener('click', saveRemediation);
  document.getElementById('backToRemediationBtn').addEventListener('click', showRemediationRegister);
  renderRemediationList();
  renderRemediationAuditEvents();
}

function generateFindingId() {
  const year = new Date().getFullYear();
  const highest = getFindings().reduce((max, finding) => {
    const match = String(finding.findingId || '').match(new RegExp(`^F-${year}-(\\d{6})$`));
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `F-${year}-${String(highest + 1).padStart(6, '0')}`;
}

function getRunById(runId) {
  return getAuditTrailEntries().find((entry) => entry.runId === runId) || null;
}

function getRunEvidence(runId) {
  const run = getRunById(runId);
  return run && Array.isArray(run.exceptionEvidence) ? run.exceptionEvidence : [];
}

function renderFindingsList() {
  const tbody = document.getElementById('findingsTableBody');
  const findings = getFindings();

  if (!findings.length) {
    tbody.innerHTML = '<tr><td colspan="8">No findings created yet.</td></tr>';
    return;
  }

  tbody.innerHTML = findings.slice().reverse().map((finding) => `
    <tr>
      <td>${escapeHtml(finding.findingId)}</td>
      <td>${escapeHtml(finding.title || 'Untitled finding')}</td>
      <td>${escapeHtml(finding.relatedRunId)}</td>
      <td>${escapeHtml(finding.auditArea)}</td>
      <td>${escapeHtml(finding.riskRating)}</td>
      <td>${escapeHtml(finding.status)}</td>
      <td>${escapeHtml(finding.preparedBy)}</td>
      <td>${escapeHtml(finding.preparationDate)}</td>
      <td><button type="button" class="audit-trail-button" data-finding-action="edit" data-finding-id="${escapeHtml(finding.findingId)}">View / Edit</button></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-finding-action="edit"]').forEach((button) => {
    button.addEventListener('click', () => {
      const finding = getFindings().find((item) => item.findingId === button.dataset.findingId);
      if (finding) {
        openFindingEditor(finding);
      }
    });
  });
}

function showFindingsRegister() {
  const register = document.getElementById('findingsRegister');
  const editor = document.getElementById('findingEditor');
  if (register) {
    register.hidden = false;
  }
  if (editor) {
    editor.hidden = true;
  }
  editingFindingId = null;
  renderFindingsList();
}

function renderFindingRunOptions(selectedRunId) {
  const select = document.getElementById('findingRunId');
  const runs = getAuditTrailEntries().filter((entry) => entry.status === 'Completed');
  select.innerHTML = runs.length
    ? runs.map((run) => `<option value="${escapeHtml(run.runId)}" ${run.runId === selectedRunId ? 'selected' : ''}>${escapeHtml(run.runId)} - ${escapeHtml(run.fileName)}</option>`).join('')
    : '<option value="">No completed validation runs available</option>';
}

function renderFindingEvidence(runId, selectedEvidence) {
  const evidenceList = document.getElementById('findingEvidenceList');
  const message = document.getElementById('findingEvidenceMessage');
  const evidence = getRunEvidence(runId);
  const selectedIds = new Set((selectedEvidence || []).map((item) => `${item.transactionId}|${item.transactionDate}|${item.customerId}`));

  if (!evidence.length) {
    message.textContent = 'No retained transaction-level exception evidence is available for this validation run. Historical summary data is not converted into fabricated evidence.';
    evidenceList.innerHTML = '';
    return;
  }

  message.textContent = 'Select one or more retained exception transactions. The evidence shown below is read-only.';
  evidenceList.innerHTML = evidence.map((record, index) => {
    const key = `${record.transactionId}|${record.transactionDate}|${record.customerId}`;
    return `
      <label class="finding-evidence-row">
        <input type="checkbox" data-evidence-index="${index}" ${selectedIds.has(key) ? 'checked' : ''} />
        <span><strong>${escapeHtml(record.transactionId || 'No transaction ID')}</strong> | ${escapeHtml(record.transactionDate)} | ${escapeHtml(record.customerId)} | ${escapeHtml(record.transactionAmount)}</span>
        <small>${escapeHtml(Array.isArray(record.exceptionReasons) ? record.exceptionReasons.join('; ') : '')}</small>
      </label>
    `;
  }).join('');
}

function collectFindingForm() {
  const fields = [
    'findingTitle', 'findingAuditArea', 'findingCriteria', 'findingCondition', 'findingCause',
    'findingRiskImpact', 'findingRecommendation', 'findingPreparedBy', 'findingPreparationDate',
    'findingReviewedBy', 'findingReviewDate', 'findingManagementResponse', 'findingActionOwner',
    'findingTargetDate'
  ];
  const finding = {};
  fields.forEach((id) => {
    const element = document.getElementById(id);
    finding[id.replace('finding', '').replace(/^./, (character) => character.toLowerCase())] = element ? element.value : '';
  });
  finding.relatedRunId = document.getElementById('findingRunId').value;
  finding.riskRating = document.getElementById('findingRiskRating').value;
  finding.status = document.getElementById('findingStatus').value;
  const evidence = getRunEvidence(finding.relatedRunId);
  finding.supportingExceptionEvidence = Array.from(document.querySelectorAll('#findingEvidenceList input:checked'))
    .map((checkbox) => evidence[Number(checkbox.dataset.evidenceIndex)])
    .filter(Boolean)
    .map((record) => ({ ...record, exceptionReasons: Array.isArray(record.exceptionReasons) ? record.exceptionReasons.slice() : [] }));
  return finding;
}

function showFindingError(message) {
  const error = document.getElementById('findingError');
  error.textContent = message;
  error.hidden = false;
}

function openFindingEditor(finding) {
  editingFindingId = finding ? finding.findingId : null;
  const editor = document.getElementById('findingEditor');
  document.getElementById('findingsRegister').hidden = true;
  editor.hidden = false;
  document.getElementById('findingEditorTitle').textContent = finding ? 'Edit Finding' : 'Create Finding';
  document.getElementById('findingIdValue').textContent = finding ? finding.findingId : 'New finding ID will be assigned on save';
  document.getElementById('findingError').hidden = true;

  const values = {
    findingTitle: finding?.title || '',
    findingAuditArea: finding?.auditArea || '',
    findingCriteria: finding?.criteria || '',
    findingCondition: finding?.condition || '',
    findingCause: finding?.cause || '',
    findingRiskImpact: finding?.riskImpact || '',
    findingRecommendation: finding?.recommendation || '',
    findingPreparedBy: finding?.preparedBy || '',
    findingPreparationDate: finding?.preparationDate || '',
    findingReviewedBy: finding?.reviewedBy || '',
    findingReviewDate: finding?.reviewDate || '',
    findingManagementResponse: finding?.managementResponse || '',
    findingActionOwner: finding?.actionOwner || '',
    findingTargetDate: finding?.targetDate || ''
  };
  Object.entries(values).forEach(([id, value]) => { document.getElementById(id).value = value; });
  renderFindingRunOptions(finding?.relatedRunId || getAuditTrailEntries().find((entry) => entry.status === 'Completed')?.runId || '');
  document.getElementById('findingRiskRating').value = finding?.riskRating || 'Low';
  document.getElementById('findingStatus').value = finding?.status || 'Draft';
  renderFindingEvidence(document.getElementById('findingRunId').value, finding?.supportingExceptionEvidence || []);
  editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function saveFinding() {
  const form = collectFindingForm();
  if (!form.relatedRunId) {
    showFindingError('Select a completed validation Run ID before saving the finding.');
    return;
  }
  if (!form.title.trim()) {
    showFindingError('Enter a finding title before saving.');
    return;
  }

  const findings = getFindings();
  const finding = {
    ...form,
    findingId: editingFindingId || generateFindingId()
  };
  const existingIndex = findings.findIndex((item) => item.findingId === finding.findingId);
  if (existingIndex >= 0) {
    findings[existingIndex] = finding;
  } else {
    findings.push(finding);
  }
  saveFindings(findings);
  showFindingsRegister();
}

function attachFindingsHandlers() {
  document.getElementById('createFindingBtn').addEventListener('click', () => openFindingEditor(null));
  document.getElementById('saveFindingBtn').addEventListener('click', saveFinding);
  document.getElementById('findingRunId').addEventListener('change', (event) => renderFindingEvidence(event.target.value, []));
  document.getElementById('backToFindingsBtn').addEventListener('click', () => {
    showFindingsRegister();
    document.getElementById('findingsTableBody').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  renderFindingsList();
}

function renderAuditTrailTable() {
  const tbody = document.getElementById('auditTrailTableBody');
  const entries = getAuditTrailEntries();

  if (!entries.length) {
    tbody.innerHTML = '<tr><td colspan="8">No validation history yet.</td></tr>';
    return;
  }

  tbody.innerHTML = entries
    .slice()
    .reverse()
    .map((entry) => `
      <tr>
        <td>${entry.runId}</td>
        <td>${new Date(entry.dateTime).toLocaleString()}</td>
        <td>${entry.fileName}</td>
        <td>${formatNumber(entry.totalRecordsTested)}</td>
        <td>${formatNumber(entry.validRecords)}</td>
        <td>${formatNumber(entry.invalidRecords)}</td>
        <td>${entry.status}</td>
        <td>
          <div class="audit-trail-actions">
            <button type="button" class="audit-trail-button" data-action="details" data-run-id="${entry.runId}">View Details</button>
            <button type="button" class="audit-trail-button working-paper-button" data-action="working-paper" data-run-id="${entry.runId}">Working Paper</button>
          </div>
        </td>
      </tr>
    `)
    .join('');

  document.querySelectorAll('.audit-trail-button').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.action === 'working-paper') {
        const selected = getAuditTrailEntries().find((entry) => entry.runId === button.dataset.runId);
        if (!selected) {
          return;
        }
        renderWorkingPaper(selected);
        return;
      }

      openAuditTrailDetails(button.dataset.runId);
    });
  });
}

function renderRunDetails(selected) {
  const details = document.getElementById('auditTrailDetails');
  const detailsContent = document.getElementById('auditTrailDetailsContent');
  details.querySelector('h2').textContent = 'Run Details';
  details.hidden = false;

  detailsContent.innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><span>Run ID</span><strong>${selected.runId}</strong></div>
      <div class="detail-item"><span>Date &amp; Time</span><strong>${new Date(selected.dateTime).toLocaleString()}</strong></div>
      <div class="detail-item"><span>File Name</span><strong>${selected.fileName}</strong></div>
      <div class="detail-item"><span>Status</span><strong>${selected.status}</strong></div>
      <div class="detail-item"><span>Campaign Start Date</span><strong>${selected.campaignStartDate}</strong></div>
      <div class="detail-item"><span>Campaign End Date</span><strong>${selected.campaignEndDate}</strong></div>
      <div class="detail-item"><span>Minimum Eligible Amount</span><strong>${selected.minimumEligibleAmount}</strong></div>
      <div class="detail-item"><span>Raffle Entries per Eligible Amount</span><strong>${selected.entriesPerEligibleAmount}</strong></div>
      <div class="detail-item"><span>Exclude Employees</span><strong>${selected.excludeEmployees}</strong></div>
      <div class="detail-item"><span>Exclude Reversed Transactions</span><strong>${selected.excludeReversedTransactions}</strong></div>
      <div class="detail-item"><span>Total Records Tested</span><strong>${formatNumber(selected.totalRecordsTested)}</strong></div>
      <div class="detail-item"><span>Valid Records</span><strong>${formatNumber(selected.validRecords)}</strong></div>
      <div class="detail-item"><span>Invalid Records</span><strong>${formatNumber(selected.invalidRecords)}</strong></div>
      <div class="detail-item"><span>Duplicate Records</span><strong>${formatNumber(selected.duplicateRecords)}</strong></div>
      <div class="detail-item"><span>Reversed Transactions</span><strong>${formatNumber(selected.reversedTransactions)}</strong></div>
      <div class="detail-item"><span>Outside Campaign Period</span><strong>${formatNumber(selected.outsideCampaignPeriod)}</strong></div>
    </div>
  `;
}

function renderWorkingPaper(selected) {
  const details = document.getElementById('auditTrailDetails');
  const detailsContent = document.getElementById('auditTrailDetailsContent');
  const workingPaper = getWorkingPaperByRun(selected.runId);
  const exceptionEvidence = Array.isArray(selected.exceptionEvidence) ? selected.exceptionEvidence : null;
  const evidenceRows = exceptionEvidence && exceptionEvidence.length ? exceptionEvidence.map((record) => `
    <tr>
      <td>${escapeHtml(record.transactionId)}</td>
      <td>${escapeHtml(record.transactionDate)}</td>
      <td>${escapeHtml(record.transactionAmount)}</td>
      <td>${escapeHtml(record.customerId)}</td>
      <td>${escapeHtml(record.raffleEntries)}</td>
      <td>${escapeHtml(record.validationResult || 'Invalid')}</td>
      <td>${escapeHtml(Array.isArray(record.exceptionReasons) ? record.exceptionReasons.join('; ') : '')}</td>
    </tr>
  `).join('') : '';
  const evidenceContent = exceptionEvidence === null
    ? '<div class="evidence-limitation">Transaction-level exception evidence was not retained for this historical run. The original validation summary is available, but individual invalid records cannot be reconstructed without fabricating historical evidence.</div>'
    : `<div class="evidence-table-wrap"><table class="evidence-table"><thead><tr><th>Transaction ID</th><th>Transaction Date</th><th>Transaction Amount</th><th>Customer / Identifier</th><th>Raffle Entries</th><th>Validation Result</th><th>Specific Exception Reason(s)</th></tr></thead><tbody>${evidenceRows || '<tr><td colspan="7">No invalid records were stored for this run.</td></tr>'}</tbody></table></div>`;

  details.querySelector('h2').textContent = 'Audit Working Paper';
  details.hidden = false;
  detailsContent.innerHTML = `
    <div class="working-paper-form">
      <div class="detail-grid">
        <div class="detail-item"><span>Run ID</span><strong>${selected.runId}</strong></div>
        <div class="detail-item"><span>File Name</span><strong>${selected.fileName}</strong></div>
        <div class="detail-item"><span>Date &amp; Time</span><strong>${new Date(selected.dateTime).toLocaleString()}</strong></div>
        <div class="detail-item"><span>Records Tested</span><strong>${formatNumber(selected.totalRecordsTested)}</strong></div>
        <div class="detail-item"><span>Valid Records</span><strong>${formatNumber(selected.validRecords)}</strong></div>
        <div class="detail-item"><span>Invalid Records</span><strong>${formatNumber(selected.invalidRecords)}</strong></div>
      </div>

      <div class="working-paper-section">
        <h3>Audit Objective</h3>
        <p>Verify that raffle entries were issued only to eligible transactions in accordance with the configured campaign rules.</p>
      </div>

      <div class="working-paper-section working-paper-columns">
        <div>
          <h3>Validation Criteria / Rules Applied</h3>
          <ul>
            <li>Campaign period: ${selected.campaignStartDate} to ${selected.campaignEndDate}</li>
            <li>Minimum eligible amount: ${selected.minimumEligibleAmount}</li>
            <li>Raffle entries per eligible amount: ${selected.entriesPerEligibleAmount}</li>
            <li>Exclude employees: ${selected.excludeEmployees}</li>
            <li>Exclude reversed transactions: ${selected.excludeReversedTransactions}</li>
          </ul>
        </div>
        <div>
          <h3>Exception Summary</h3>
          <ul>
            <li>Duplicate transactions: ${formatNumber(selected.duplicateRecords)}</li>
            <li>Reversed transactions: ${formatNumber(selected.reversedTransactions)}</li>
            <li>Outside campaign period: ${formatNumber(selected.outsideCampaignPeriod)}</li>
            <li>Total exceptions identified: ${formatNumber(selected.invalidRecords)}</li>
          </ul>
        </div>
      </div>

      <div class="working-paper-section">
        <h3>Population Tested</h3>
        <ul>
          <li>File name: ${selected.fileName}</li>
          <li>Total records tested: ${formatNumber(selected.totalRecordsTested)}</li>
          <li>Valid records: ${formatNumber(selected.validRecords)}</li>
          <li>Invalid records: ${formatNumber(selected.invalidRecords)}</li>
        </ul>
      </div>

      <div class="working-paper-section exception-evidence-section">
        <div class="working-paper-section-heading">
          <div>
            <h3>Exception Details / Audit Evidence</h3>
            <p>Read-only transaction-level evidence retained for ${selected.runId}.</p>
          </div>
          <button id="exportExceptionEvidenceBtn" type="button" class="ghost-button evidence-export-button" ${exceptionEvidence && exceptionEvidence.length ? '' : 'disabled'}>Export Exception Evidence CSV</button>
        </div>
        ${evidenceContent}
      </div>

      <div class="working-paper-form-grid">
        <label class="rule-field">
          <span>Prepared By</span>
          <input id="workingPaperPreparedBy" type="text" value="${escapeHtml(workingPaper.preparedBy)}" />
        </label>

        <label class="rule-field">
          <span>Reviewed By</span>
          <input id="workingPaperReviewedBy" type="text" value="${escapeHtml(workingPaper.reviewedBy)}" />
        </label>

        <label class="rule-field">
          <span>Review Status</span>
          <select id="workingPaperReviewStatus">
            <option value="Draft" ${workingPaper.reviewStatus === 'Draft' ? 'selected' : ''}>Draft</option>
            <option value="Prepared" ${workingPaper.reviewStatus === 'Prepared' ? 'selected' : ''}>Prepared</option>
            <option value="Reviewed" ${workingPaper.reviewStatus === 'Reviewed' ? 'selected' : ''}>Reviewed</option>
          </select>
        </label>

        <label class="rule-field">
          <span>Preparation Date</span>
          <input id="workingPaperPreparationDate" type="date" value="${escapeHtml(workingPaper.preparationDate)}" />
        </label>

        <label class="rule-field">
          <span>Review Date</span>
          <input id="workingPaperReviewDate" type="date" value="${escapeHtml(workingPaper.reviewDate)}" />
        </label>
      </div>

      <label class="rule-field">
        <span>Auditor Notes</span>
        <textarea id="workingPaperAuditorNotes" rows="4">${escapeHtml(workingPaper.auditorNotes)}</textarea>
      </label>

      <label class="rule-field">
        <span>Audit Conclusion</span>
        <textarea id="workingPaperConclusion" rows="4">${escapeHtml(workingPaper.conclusion)}</textarea>
      </label>

      <div class="working-paper-actions">
        <button id="saveWorkingPaperBtn" type="button" class="primary-button">Save Working Paper</button>
        <button id="backToAuditTrailBtn" type="button" class="ghost-button">Back to Audit Trail</button>
        <span id="workingPaperSaveStatus" class="working-paper-save-status" role="status" aria-live="polite"></span>
      </div>
    </div>
  `;

  const auditorNotesInput = document.getElementById('workingPaperAuditorNotes');
  const conclusionInput = document.getElementById('workingPaperConclusion');
  const preparedByInput = document.getElementById('workingPaperPreparedBy');
  const reviewedByInput = document.getElementById('workingPaperReviewedBy');
  const reviewStatusInput = document.getElementById('workingPaperReviewStatus');
  const preparationDateInput = document.getElementById('workingPaperPreparationDate');
  const reviewDateInput = document.getElementById('workingPaperReviewDate');
  const saveButton = document.getElementById('saveWorkingPaperBtn');
  const backButton = document.getElementById('backToAuditTrailBtn');
  const saveStatus = document.getElementById('workingPaperSaveStatus');
  const exportEvidenceButton = document.getElementById('exportExceptionEvidenceBtn');

  const savePaper = () => {
    saveWorkingPaperByRun(selected.runId, {
      auditorNotes: auditorNotesInput ? auditorNotesInput.value : '',
      conclusion: conclusionInput ? conclusionInput.value : '',
      preparedBy: preparedByInput ? preparedByInput.value : '',
      reviewedBy: reviewedByInput ? reviewedByInput.value : '',
      reviewStatus: reviewStatusInput ? reviewStatusInput.value : 'Draft',
      preparationDate: preparationDateInput ? preparationDateInput.value : '',
      reviewDate: reviewDateInput ? reviewDateInput.value : ''
    });
    saveStatus.textContent = 'Saved';
  };

  saveButton.addEventListener('click', savePaper);
  exportEvidenceButton.addEventListener('click', () => exportExceptionEvidence(selected));
  backButton.addEventListener('click', () => {
    details.hidden = true;
    document.getElementById('auditTrailTableBody').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function exportExceptionEvidence(selected) {
  const evidence = Array.isArray(selected.exceptionEvidence) ? selected.exceptionEvidence : [];
  if (!evidence.length) {
    return;
  }

  const csvRows = [
    ['Run ID', 'Transaction ID', 'Transaction Date', 'Transaction Amount', 'Customer / Identifier', 'Raffle Entries', 'Validation Result', 'Specific Exception Reason(s)'],
    ...evidence.map((record) => [
      selected.runId,
      record.transactionId || '',
      record.transactionDate || '',
      record.transactionAmount || '',
      record.customerId || '',
      record.raffleEntries || '',
      record.validationResult || 'Invalid',
      Array.isArray(record.exceptionReasons) ? record.exceptionReasons.join('; ') : ''
    ])
  ];

  const csvContent = csvRows
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${selected.runId}-exception-evidence.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function ensureSeededHistoricalRun() {
  const entries = getAuditTrailEntries();
  if (entries.some((entry) => entry.runId === 'RV-2026-000004')) {
    return;
  }

  entries.push({
    runId: 'RV-2026-000004',
    dateTime: '2026-03-15T10:42:00.000Z',
    fileName: 'raffle-test-data.csv',
    campaignStartDate: '2026-01-15',
    campaignEndDate: '2026-03-31',
    minimumEligibleAmount: 10,
    entriesPerEligibleAmount: 1,
    excludeEmployees: 'Yes',
    excludeReversedTransactions: 'Yes',
    totalRecordsTested: 13,
    validRecords: 3,
    invalidRecords: 10,
    duplicateRecords: 2,
    reversedTransactions: 2,
    outsideCampaignPeriod: 3,
    status: 'Completed'
  });

  saveAuditTrailEntries(entries);
}

function persistAuditTrail(fileName, rules, validRows) {
  const totalRecordsTested = validRows.length;
  const validRecords = validRows.filter((row) => row.isValid).length;
  const invalidRecords = totalRecordsTested - validRecords;
  const duplicateRecords = validRows.filter((row) => row.exceptions.includes('Duplicate Transaction')).length;
  const reversedTransactions = validRows.filter((row) => row.exceptions.includes('Reversed Transaction')).length;
  const outsideCampaignPeriod = validRows.filter((row) => row.exceptions.includes('Outside Campaign Period')).length;

  const summary = {
    totalRecordsTested,
    validRecords,
    invalidRecords,
    duplicateRecords,
    reversedTransactions,
    outsideCampaignPeriod
  };

  const record = buildAuditTrailRecord(fileName, rules, summary, validRows.filter((row) => !row.isValid));
  const entries = getAuditTrailEntries();
  entries.push(record);
  saveAuditTrailEntries(entries);
  renderAuditTrailTable();
}

function validateCsvRows(rows) {
  const duplicateCounts = new Map();

  rows.forEach((row) => {
    const transactionId = String(row.Transaction_ID || '').trim();
    if (transactionId) {
      const key = transactionId.toUpperCase();
      duplicateCounts.set(key, (duplicateCounts.get(key) || 0) + 1);
    }
  });

  const validationResults = rows.map((row) => {
    const rules = getValidationRules();
    const exceptions = [];
    const transactionDate = parseDate(row.Transaction_Date);
    const startDate = parseDate(rules.startDate);
    const endDate = parseDate(rules.endDate);
    const amount = parseNumber(row.Amount);
    const entryCount = parseNumber(row.Entries);
    const expectedEntries = calculateExpectedEntries(amount, rules.minimumEligibleAmount, rules.entriesPerEligibleAmount);

    const transactionId = String(row.Transaction_ID || '').trim();
    if (transactionId && (duplicateCounts.get(transactionId.toUpperCase()) || 0) > 1) {
      exceptions.push('Duplicate Transaction');
    }

    if (transactionDate && startDate && endDate) {
      if (transactionDate < startDate || transactionDate > endDate) {
        exceptions.push('Outside Campaign Period');
      }
    }

    if (amount < rules.minimumEligibleAmount) {
      exceptions.push('Below Minimum Eligible Amount');
    }

    if (expectedEntries !== entryCount) {
      exceptions.push('Incorrect Number of Entries');
    }

    if (rules.excludeEmployees && parseBoolean(row.Employee)) {
      exceptions.push('Employee Not Eligible');
    }

    if (rules.excludeReversed && parseBoolean(row.Reversed)) {
      exceptions.push('Reversed Transaction');
    }

    return {
      ...row,
      actualEntries: row.Entries || '0',
      expectedEntries,
      exceptions,
      isValid: exceptions.length === 0
    };
  });

  return validationResults;
}

function updateSummary(results) {
  const totalEntries = results.length;
  const validEntries = results.filter((row) => row.isValid).length;
  const invalidEntries = totalEntries - validEntries;
  const duplicateEntries = results.filter((row) => row.exceptions.includes('Duplicate Transaction')).length;
  const reversedTransactions = results.filter((row) => row.exceptions.includes('Reversed Transaction')).length;
  const outsideCampaignPeriod = results.filter((row) => row.exceptions.includes('Outside Campaign Period')).length;

  updateResultCard('totalEntriesValue', formatNumber(totalEntries));
  updateResultCard('validEntriesValue', formatNumber(validEntries));
  updateResultCard('invalidEntriesValue', formatNumber(invalidEntries));
  updateResultCard('duplicateEntriesValue', formatNumber(duplicateEntries));
  updateResultCard('reversedTransactionsValue', formatNumber(reversedTransactions));
  updateResultCard('outsideCampaignPeriodValue', formatNumber(outsideCampaignPeriod));
}

async function handleFileSelection(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) {
    return;
  }

  const fileNameLabel = document.getElementById('fileNameLabel');
  fileNameLabel.textContent = file.name;

  if (!file.name.toLowerCase().endsWith('.csv')) {
    showValidationError('This prototype supports CSV files only. Please upload a CSV file with the required columns.');
    return;
  }

  try {
    clearValidationError();
    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length < 2) {
      showValidationError('The CSV file is empty or missing data rows.');
      return;
    }

    const header = rows[0].map(normalizeHeader);
    const missing = REQUIRED_COLUMNS.filter((column) => !header.includes(column));

    if (missing.length > 0) {
      showValidationError(`Missing required CSV columns: ${missing.join(', ')}`);
      return;
    }

    const normalizedRows = objectFromRows(rows);
    const validRows = validateCsvRows(normalizedRows);
    const invalidRows = validRows.filter((row) => !row.isValid);

    window.currentValidationRows = invalidRows.map((row) => ({
      Customer_ID: row.Customer_ID || '',
      Transaction_ID: row.Transaction_ID || '',
      Transaction_Date: row.Transaction_Date || '',
      Amount: row.Amount || '',
      Entries: row.Entries || '0',
      expectedEntries: row.expectedEntries,
      actualEntries: row.actualEntries,
      exceptions: row.exceptions
    }));

    updateSummary(validRows);
    renderExceptionsTable(window.currentValidationRows);
    document.getElementById('exportExceptionsBtn').hidden = window.currentValidationRows.length === 0;

    persistAuditTrail(file.name, getValidationRules(), validRows);
  } catch (error) {
    showValidationError('Unable to read the CSV file. Please check the file format and try again.');
  }
}

function attachCsvHandlers() {
  const input = document.getElementById('raffleFileInput');
  const dropZone = document.getElementById('uploadDropzone');
  const runBtn = document.getElementById('runValidationBtn');
  const exportBtn = document.getElementById('exportExceptionsBtn');

  input.addEventListener('change', handleFileSelection);

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.remove('dragover');
    });
  });

  dropZone.addEventListener('drop', (event) => {
    const file = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files[0] : null;
    if (!file) {
      return;
    }

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    input.files = dataTransfer.files;
    handleFileSelection({ target: input });
  });

  runBtn.addEventListener('click', () => {
    const file = input.files && input.files[0];
    if (!file) {
      showValidationError('Please upload a CSV file before running validation.');
      return;
    }

    handleFileSelection({ target: input });
  });

  exportBtn.addEventListener('click', exportExceptionsCsv);
}

renderSummary();
renderTrendChart();
renderRecommendations();
renderControls();
renderActivity();
ensureSeededHistoricalRun();
ensureSeededControl();
renderAuditTrailTable();
attachFindingsHandlers();
attachRemediationHandlers();
attachControlsHandlers();
attachBranchRiskHandlers();

document.querySelectorAll('.nav-item').forEach((button) => {
  button.addEventListener('click', () => toggleView(button.dataset.view));
});

attachCsvHandlers();
