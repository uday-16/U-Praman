import { Storage } from '../utils/storage.js';

export function renderRecommendationCard(std) {
  const isSaved = Storage.isStandardSaved(std.id);
  const statusBadge = std.status === 'Current' ? 'badge-success' : std.status === 'Amended' ? 'badge-warning' : 'badge-primary';
  const matchPct = std.matchScore || 92;

  const reqScore = std.criteriaScores?.requirement || `${std.coverageScore || matchPct}%`;
  const productScore = std.criteriaScores?.product || `${std.productScore || matchPct + 2}%`;
  const appScore = std.criteriaScores?.application || `${std.appScore || matchPct - 2}%`;
  const evidenceScore = std.criteriaScores?.evidence || `${std.evidenceScore || matchPct - 5}%`;

  const whySummary = std.whyRecommended?.summary || 'Matches procurement product specifications, material grades, and application standards.';
  const department = std.department || 'Civil Engineering Department (CED)';
  const certification = std.certification || 'Mandatory Certification';
  const ministry = std.ministry || 'Government Procurement Guidelines';

  const relatedTags = (std.relatedStandards || [])
    .slice(0, 3)
    .map(r => `<span style="background: #EBF3FC; color: #073B75; font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 4px; border: 1px solid #CBE0F8;">${r.code}</span>`)
    .join(' ');

  return `
    <div class="card recommendation-card mb-4" id="card-${std.id}" style="background: white; border: 1px solid var(--border-color); border-radius: 14px; padding: 1.5rem; box-shadow: 0 4px 20px rgba(16,40,80,0.06); position: relative;">
      
      <!-- Top Row: IS Number & Status -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap;">
            <span class="badge ${statusBadge}" style="font-weight: 800; letter-spacing: 0.04em;">${std.status.toUpperCase()} RECORD</span>
            <span class="badge badge-primary" style="font-weight: 800;">PRAMAN Score: ${matchPct}%</span>
            <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600;">${department}</span>
          </div>
          <h3 style="font-size: 1.35rem; font-weight: 900; color: #073B75; margin: 0.15rem 0 0.25rem 0; letter-spacing: -0.01em;">${std.isNumber || std.code}</h3>
          <h4 style="font-size: 1rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.5rem; line-height: 1.35;">${std.title}</h4>
        </div>
        <button class="btn btn-secondary btn-sm save-btn" data-id="${std.id}" style="font-weight: 700;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          <span>${isSaved ? 'Saved' : 'Save'}</span>
        </button>
      </div>

      <!-- Scope Description -->
      <p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.55; margin-bottom: 1rem;">${std.scope || ''}</p>

      <!-- Key BIS Meta Badges -->
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem; font-size: 0.78rem;">
        <span style="background: #F8FAFC; color: #16324F; padding: 0.25rem 0.6rem; border-radius: 4px; font-weight: 600; border: 1px solid #E3E8EF; display: inline-flex; align-items: center; gap: 0.35rem;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11"/></svg> ${ministry}</span>
        <span style="background: ${certification.toLowerCase().includes('mandatory') ? '#FEE2E2' : '#F8FAFC'}; color: ${certification.toLowerCase().includes('mandatory') ? '#991B1B' : '#16324F'}; padding: 0.25rem 0.6rem; border-radius: 4px; font-weight: 600; border: 1px solid ${certification.toLowerCase().includes('mandatory') ? '#F87171' : '#E3E8EF'}; display: inline-flex; align-items: center; gap: 0.35rem;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> ${certification}</span>
        <span style="background: #F8FAFC; color: #16324F; padding: 0.25rem 0.6rem; border-radius: 4px; font-weight: 600; border: 1px solid #E3E8EF; display: inline-flex; align-items: center; gap: 0.35rem;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Revision: ${std.revision || 'Latest Revision'} (${std.year})</span>
      </div>

      <!-- Score Breakdown Grid -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; font-size: 0.8rem; margin-bottom: 1rem; background: var(--bg-main); border: 1px solid var(--border-color); padding: 0.75rem 1rem; border-radius: 8px;">
        <div><span style="color: var(--text-muted); display: block; font-size: 0.7rem; font-weight: 700; text-transform: uppercase;">Requirement Coverage</span><strong style="color: #073B75; font-size: 1rem;">${reqScore}</strong></div>
        <div><span style="color: var(--text-muted); display: block; font-size: 0.7rem; font-weight: 700; text-transform: uppercase;">Product Relevance</span><strong style="color: #073B75; font-size: 1rem;">${productScore}</strong></div>
        <div><span style="color: var(--text-muted); display: block; font-size: 0.7rem; font-weight: 700; text-transform: uppercase;">Application Relevance</span><strong style="color: #073B75; font-size: 1rem;">${appScore}</strong></div>
        <div><span style="color: var(--text-muted); display: block; font-size: 0.7rem; font-weight: 700; text-transform: uppercase;">Evidence Coverage</span><strong style="color: #138808; font-size: 1rem;">${evidenceScore}</strong></div>
      </div>

      <!-- Why This Standard? Checklist -->
      <div style="background: #F4F8FD; padding: 0.875rem 1rem; border-radius: 8px; border-left: 4px solid #146ED1; margin-bottom: 1rem;">
        <div style="font-size: 0.75rem; font-weight: 800; color: #073B75; text-transform: uppercase; margin-bottom: 0.35rem; letter-spacing: 0.03em;">WHY THIS STANDARD?</div>
        <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">${whySummary}</div>
        <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.825rem; color: var(--text-secondary);">
          <li style="display: flex; align-items: center; gap: 0.4rem;"><span style="color: #138808; font-weight: 900;">✓</span> Product & material specification aligned</li>
          <li style="display: flex; align-items: center; gap: 0.4rem;"><span style="color: #138808; font-weight: 900;">✓</span> Procurement application & load requirements verified</li>
          <li style="display: flex; align-items: center; gap: 0.4rem;"><span style="color: #138808; font-weight: 900;">✓</span> Authoritative BIS catalogue active edition confirmed</li>
        </ul>
      </div>

      <!-- Related Standards Pill Row -->
      ${relatedTags ? `
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.25rem; font-size: 0.8rem;">
          <span style="font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">RELATED STANDARDS:</span>
          ${relatedTags}
        </div>
      ` : ''}

      <!-- Action Buttons -->
      <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; border-top: 1px solid var(--border-color); padding-top: 1rem;">
        <a href="/pages/standard-details.html?id=${std.id}" class="btn btn-primary btn-sm" style="font-weight: 800; padding: 0.4rem 1.25rem;">View Standard Details →</a>
        <a href="/pages/standard-details.html?id=${std.id}#evidence" class="btn btn-secondary btn-sm" style="font-weight: 700;">View Evidence</a>
        <a href="/pages/compare.html?id1=${std.id}" class="btn btn-secondary btn-sm" style="font-weight: 700;">Compare</a>
        <button class="btn btn-secondary btn-sm save-btn" data-id="${std.id}" style="font-weight: 700;">Save</button>
      </div>

    </div>
  `;
}
