export function renderRelationshipGraph(canvasId, mainStandard) {
  const container = document.getElementById(canvasId);
  if (!container) return;

  container.innerHTML = `
    <svg width="100%" height="100%" viewBox="0 0 700 400" style="background:var(--bg-main);">
      <!-- Connections -->
      <line x1="350" y1="200" x2="180" y2="100" stroke="var(--border-dark)" stroke-width="2" stroke-dasharray="4"/>
      <line x1="350" y1="200" x2="520" y2="100" stroke="var(--border-dark)" stroke-width="2" stroke-dasharray="4"/>
      <line x1="350" y1="200" x2="180" y2="300" stroke="var(--border-dark)" stroke-width="2" stroke-dasharray="4"/>
      <line x1="350" y1="200" x2="520" y2="300" stroke="var(--border-dark)" stroke-width="2" stroke-dasharray="4"/>

      <!-- Center Node -->
      <g transform="translate(350, 200)" style="cursor:pointer;">
        <circle r="45" fill="var(--primary-blue)" filter="drop-shadow(0 4px 8px rgba(11,92,173,0.3))"/>
        <text y="-5" text-anchor="middle" fill="#FFF" font-weight="700" font-size="11">MAIN STANDARD</text>
        <text y="12" text-anchor="middle" fill="#EBF3FA" font-size="9">${mainStandard.isNumber}</text>
      </g>

      <!-- Testing Node -->
      <g transform="translate(180, 100)" style="cursor:pointer;">
        <circle r="32" fill="var(--surface-white)" stroke="var(--indian-green)" stroke-width="2"/>
        <text y="-2" text-anchor="middle" fill="var(--text-primary)" font-weight="600" font-size="10">Testing</text>
        <text y="12" text-anchor="middle" fill="var(--text-secondary)" font-size="8">IS DEMO-4651</text>
      </g>

      <!-- Safety Node -->
      <g transform="translate(520, 100)" style="cursor:pointer;">
        <circle r="32" fill="var(--surface-white)" stroke="var(--primary-blue)" stroke-width="2"/>
        <text y="-2" text-anchor="middle" fill="var(--text-primary)" font-weight="600" font-size="10">Safety</text>
        <text y="12" text-anchor="middle" fill="var(--text-secondary)" font-size="8">IS DEMO-9523</text>
      </g>

      <!-- Normative Node -->
      <g transform="translate(180, 300)" style="cursor:pointer;">
        <circle r="32" fill="var(--surface-white)" stroke="var(--saffron-accent)" stroke-width="2"/>
        <text y="-2" text-anchor="middle" fill="var(--text-primary)" font-weight="600" font-size="10">Normative</text>
        <text y="12" text-anchor="middle" fill="var(--text-secondary)" font-size="8">IS DEMO-8623</text>
      </g>

      <!-- Related Node -->
      <g transform="translate(520, 300)" style="cursor:pointer;">
        <circle r="32" fill="var(--surface-white)" stroke="var(--secondary-blue)" stroke-width="2"/>
        <text y="-2" text-anchor="middle" fill="var(--text-primary)" font-weight="600" font-size="10">Related</text>
        <text y="12" text-anchor="middle" fill="var(--text-secondary)" font-size="8">IS DEMO-18201</text>
      </g>
    </svg>
  `;
}
