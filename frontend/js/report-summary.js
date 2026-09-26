import {escapeHtml as esc} from './utils/api.js';

export const briefFacts = facts => `<dl class="requirement-facts">${Object.entries(facts || {}).map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;
export const briefActions = actions => actions?.length ? `<ul class="finding-list">${actions.map(action=>`<li>${esc(action)}</li>`).join('')}</ul>` : '<p>No specific gaps were identified. Confirm applicability before approval.</p>';

export function sourceReferences(rec) {
  const sources = new Map();
  for (const ev of rec.evidence || []) {
    if (!sources.has(ev.source)) sources.set(ev.source, new Set());
    sources.get(ev.source).add(Number(ev.page));
  }
  return [...sources].map(([name,pages])=>`${name} · p. ${[...pages].sort((a,b)=>a-b).join(', ')}`).join('; ') || 'Source evidence unavailable';
}

export function recommendationSections(brief, interactive=false, controls=()=> '', analysisMeta={}) {
  const standards = brief.primary_standards || brief.standards || [];
  const allied = brief.allied_standards || [];
  const versions = brief.version_status || [];
  const cert = brief.certification_compliance || {};
  const trace = brief.evidence_traceability || [];
  const readiness = brief.procurement_readiness || {};
  const actions = brief.recommended_actions || brief.actions || [];
  const analysisId = analysisMeta.id || '';
  const reportId = analysisMeta.report_id || '';

  const section = (number, title, body, extraClass='') =>
    `<section class="${interactive ? 'card ' : ''}recommendation-field field-${number} ${extraClass}" id="section-${number}">
      <div class="field-header"><span class="field-num">0${number}</span><h2>${title}</h2></div>
      <div class="field-body">${body}</div>
    </section>`;

  // 1. PRIMARY STANDARD
  const s1 = section(1, 'PRIMARY STANDARD', standards.length ? standards.map((s, i) => `
    <article class="primary-standard-card">
      <div class="standard-header">
        <div>
          <span class="badge badge-primary-standard">Primary Standard</span>
          <h3 class="standard-number">${esc(s.is_number)}</h3>
          <p class="standard-title">${esc(s.title)}</p>
        </div>
        <div class="match-pill"><span class="score-num">${esc(s.match || (s.score ? s.score + '/100' : 'High Relevance'))}</span></div>
      </div>
      <p class="standard-summary-text">${esc(s.summary || 'Primary Indian Standard governing material specification and technical conformity.')}</p>
      ${s.evidence ? `<p class="source-ref"><small><b>Source Passage:</b> ${esc(s.evidence.source)}, p. ${Number(s.evidence.page)}</small></p>` : ''}
      ${controls(i)}
    </article>
  `).join('') : '<p class="muted">No primary standard identified in available records.</p>');

  // 2. ALLIED / RELATED STANDARDS
  const s2 = section(2, 'ALLIED / RELATED STANDARDS', allied.length ? `
    <div class="allied-standards-grid">
      ${allied.map(a => `
        <div class="allied-card">
          <div class="allied-top">
            <span class="allied-is-number">${esc(a.is_number)}</span>
            <span class="badge badge-rel">${esc(a.relationship || 'Allied Standard')}</span>
          </div>
          <p class="allied-title"><b>${esc(a.title)}</b></p>
          <p class="allied-desc">${esc(a.description || 'Referenced in technical specifications and execution guidelines.')}</p>
        </div>
      `).join('')}
    </div>
  ` : '<p class="muted">No allied standards identified in repository.</p>');

  // 3. VERSION & AMENDMENT STATUS
  const s3 = section(3, 'VERSION & AMENDMENT STATUS', versions.length ? `
    <div class="table-scroll">
      <table class="report-table version-status-table">
        <thead>
          <tr>
            <th>Standard</th>
            <th>Active Edition</th>
            <th>Amendment Status</th>
            <th>Superseded Editions</th>
            <th>Validity Status</th>
          </tr>
        </thead>
        <tbody>
          ${versions.map(v => `
            <tr>
              <td><b>${esc(v.is_number)}</b></td>
              <td><span class="badge badge-edition">${esc(v.edition || v.active_version)}</span></td>
              <td>${v.amendments?.length ? `<ul class="table-list">${v.amendments.map(am => `<li>${esc(am)}</li>`).join('')}</ul>` : '<span class="muted">No separate amendments</span>'}</td>
              <td>${v.previous_versions?.length ? `<span class="muted">${esc(v.previous_versions.join('; '))}</span>` : '<span class="muted">None recorded</span>'}</td>
              <td><span class="status-badge status-active">Active Baseline</span><br><small class="muted">Verify on BIS Manakonline before award</small></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : `<p class="muted">Current editions active in local repository. Confirm latest amendments on BIS portal.</p>`);

  // 4. CERTIFICATION / COMPLIANCE
  const s4 = section(4, 'CERTIFICATION / COMPLIANCE', `
    <div class="compliance-panel">
      <div class="qco-box">
        <div class="compliance-icon">🏛️</div>
        <div>
          <h4>Quality Control Orders (QCO) &amp; BIS Mandate</h4>
          <p>${esc(cert.qco_status || 'Mandatory BIS Certification applies where notified under Ministry Quality Control Orders.')}</p>
        </div>
      </div>
      <div class="compliance-grid">
        <div class="compliance-item">
          <h5>📄 Material Test Certificate (MTC)</h5>
          <p>${esc(cert.mtc_required || 'Manufacturer Test Certificate with heat/batch identification required with all consignments.')}</p>
        </div>
        <div class="compliance-item">
          <h5>🔬 Laboratory Testing</h5>
          <p>${esc(cert.testing_mandate || 'Chemical analysis and mechanical property testing at accredited NABL laboratory.')}</p>
        </div>
        <div class="compliance-item">
          <h5>🏷️ Product Marking &amp; ISI Mark</h5>
          <p>${esc(cert.marking_rule || 'Each product/tag shall carry manufacturer trademark, grade designation, and BIS Standard Mark.')}</p>
        </div>
      </div>
      ${cert.tender_mandates?.length ? `
        <div class="tender-clauses">
          <h5>Tender-Specified Conformity Obligations:</h5>
          <ul class="finding-list">${cert.tender_mandates.map(m => `<li>${esc(m)}</li>`).join('')}</ul>
        </div>
      ` : ''}
      <p class="helper">${esc(cert.note || brief.certification_note || '')}</p>
    </div>
  `);

  // 5. EVIDENCE & TRACEABILITY
  const s5 = section(5, 'EVIDENCE & TRACEABILITY', trace.length ? `
    <div class="table-scroll">
      <table class="report-table trace-table">
        <thead>
          <tr>
            <th style="width:28%">Tender Requirement</th>
            <th style="width:22%">Standard &amp; Source</th>
            <th style="width:38%">Evidence Excerpt</th>
            <th style="width:12%">Status</th>
          </tr>
        </thead>
        <tbody>
          ${trace.map((t, idx) => `
            <tr>
              <td><b>${esc(t.requirement)}</b></td>
              <td>
                <span class="source-is">${esc(t.is_number)}</span>
                ${t.source ? `<small class="source-loc">${esc(t.source)} · p. ${Number(t.page || 0)}</small>` : ''}
              </td>
              <td>
                <blockquote class="trace-quote">${esc(t.excerpt || t.note || 'No mapped excerpt')}</blockquote>
                ${interactive && t.source ? `<button class="btn btn-secondary btn-xs" data-evidence="${idx}">View Citation</button>` : ''}
              </td>
              <td><span class="status-label ${t.status === 'Supported' ? 'supported' : t.status === 'Not Found' ? 'unavailable' : 'review'}">${esc(t.status)}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '<p class="muted">Requirement-to-standard traceability records are retained in full analysis data.</p>');

  // 6. PROCUREMENT READINESS
  const s6 = section(6, 'PROCUREMENT READINESS', `
    <div class="readiness-panel">
      <div class="readiness-scorecard">
        <div class="readiness-meter">
          <span class="readiness-score">${readiness.score || 80}%</span>
          <span class="readiness-badge ${readiness.score >= 75 ? 'badge-high' : 'badge-warn'}">${esc(readiness.level || 'READINESS VERIFIED')}</span>
        </div>
        <p class="readiness-summary">${esc(readiness.summary || 'Technical specifications and standards are defined.')}</p>
      </div>
      ${readiness.items?.length ? `
        <div class="readiness-items-grid">
          ${readiness.items.map(it => `
            <div class="readiness-item ${it.status}">
              <span class="readiness-icon">${it.status === 'pass' ? '✓' : it.status === 'warning' ? '⚠' : '✗'}</span>
              <div>
                <strong>${esc(it.label || it.category)}</strong>
                <p>${esc(it.details)}</p>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `);

  // 7. RECOMMENDED ACTIONS
  const s7 = section(7, 'RECOMMENDED ACTIONS', `
    <ol class="action-checklist">
      ${actions.map(act => `<li><span class="action-check">✓</span> <div>${esc(act)}</div></li>`).join('')}
    </ol>
  `);

  return s1 + s2 + s3 + s4 + s5 + s6 + s7;
}

export function reportDocument(report) {
  const a = report.analysis, ext = a.extracted, brief = a.brief;
  return `<article class="report-document report-brief">
    <header class="report-letterhead">
      <img src="/assets/brand/praman-logo.svg" alt="PRAMAN" width="160">
      <div>
        <span class="gov-kicker">GOVERNMENT PROCUREMENT DECISION SUPPORT</span>
        <span class="gov-tag">OFFICIAL REVIEW DOCUMENT</span>
      </div>
    </header>
    <div class="report-title">
      <span class="eyebrow">PROCUREMENT STANDARDS REPORT</span>
      <h1>${esc(ext.product_name)}</h1>
    </div>
    <div class="report-meta-box">
      <p class="report-record">
        <b>Report Reference:</b> ${esc(report.id)} &nbsp;|&nbsp; 
        <b>Date:</b> ${esc(report.created_at)} &nbsp;|&nbsp; 
        <b>Prepared for:</b> ${esc(report.officer_name)}<br>
        <b>Source:</b> ${esc(a.source_name || ext.source_name)}
      </p>
      ${ext.quantity ? `<p class="report-quantity"><b>Quantity:</b> ${esc(ext.quantity)}</p>` : ''}
    </div>
    
    ${recommendationSections(brief, false, () => '', { id: a.id, report_id: report.id })}

    <div class="report-signoff-section">
      <h3>Official Sign-Off &amp; Departmental Verification</h3>
      <p class="report-disclaimer">${esc(brief.notice)}</p>
      <div class="signoff-boxes">
        <div class="signoff-box">
          <p><b>Reviewed By:</b> __________________________________</p>
          <p><b>Designation:</b> __________________________________</p>
          <p><b>Date:</b> ____________________</p>
        </div>
        <div class="signoff-box">
          <p><b>Approval:</b> [ &nbsp; ] Approved &nbsp;&nbsp; [ &nbsp; ] Conditional &nbsp;&nbsp; [ &nbsp; ] Clarification</p>
          <p><b>Signature / Seal:</b> ______________________________</p>
          <p><small>Full audit trail retained in Analysis ID: ${esc(a.id)}</small></p>
        </div>
      </div>
    </div>
  </article>`;
}

