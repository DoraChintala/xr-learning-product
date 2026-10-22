// ---------------------------------------------------------------------------
// Interactive human-anatomy figure (inline SVG).
//
// Renders a stylized front-facing body with clickable, highlightable regions.
// Each region maps to an anatomy module id (see src/shared/content.js). No
// external assets or libraries — crisp at any size, fully styleable/clickable.
//
// buildAnatomy(container, modules, onSelect):
//   - draws the body + a hotspot per module that has a matching region
//   - clicking a hotspot calls onSelect(moduleId)
// ---------------------------------------------------------------------------

// Map a module's `region` to coordinates + an organ glyph on the body figure.
const REGION_POS = {
  Brain: { cx: 100, cy: 42, r: 26, glyph: '🧠', label: 'Brain' },
  Heart: { cx: 88, cy: 150, r: 24, glyph: '❤️', label: 'Heart' },
  Airway: { cx: 100, cy: 108, r: 20, glyph: '🫁', label: 'Airway / Lungs' },
};

export function buildAnatomy(container, modules, onSelect) {
  const svgNS = 'http://www.w3.org/2000/svg';

  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 200 440');
  svg.setAttribute('class', 'anatomy-svg');
  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-label', 'Human anatomy region selector');

  // --- body silhouette (simple, stylized) ---------------------------------
  const body = document.createElementNS(svgNS, 'path');
  body.setAttribute('class', 'body-silhouette');
  body.setAttribute('d', [
    'M100 8',               // top of head
    'c-16 0 -26 12 -26 28', // head
    'c0 12 6 20 12 24',     // neck down left
    'l-2 10',
    'c-22 4 -34 16 -34 40', // left shoulder
    'l-6 56 l10 4 l6 -46',  // left arm
    'c2 20 2 30 6 44',      // torso left
    'l-6 92 l12 0 l10 -78', // left leg
    'l6 0 l10 78 l12 0 l-6 -92', // right leg + torso right
    'c4 -14 4 -24 6 -44',
    'l6 46 l10 -4 l-6 -56',  // right arm
    'c0 -24 -12 -36 -34 -40', // right shoulder
    'l-2 -10',
    'c6 -4 12 -12 12 -24',   // neck up right
    'c0 -16 -10 -28 -26 -28', // close head
    'Z',
  ].join(' '));
  svg.appendChild(body);

  // --- clickable region hotspots -------------------------------------------
  const available = new Set(modules.map((m) => m.region));
  for (const [region, pos] of Object.entries(REGION_POS)) {
    if (!available.has(region)) continue;
    const mod = modules.find((m) => m.region === region);

    const g = document.createElementNS(svgNS, 'g');
    g.setAttribute('class', 'hotspot');
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', `Learn ${mod.title}`);
    g.dataset.module = mod.id;

    const halo = document.createElementNS(svgNS, 'circle');
    halo.setAttribute('class', 'halo');
    halo.setAttribute('cx', pos.cx); halo.setAttribute('cy', pos.cy);
    halo.setAttribute('r', pos.r + 6);

    const dot = document.createElementNS(svgNS, 'circle');
    dot.setAttribute('class', 'organ');
    dot.setAttribute('cx', pos.cx); dot.setAttribute('cy', pos.cy);
    dot.setAttribute('r', pos.r);

    const icon = document.createElementNS(svgNS, 'text');
    icon.setAttribute('x', pos.cx); icon.setAttribute('y', pos.cy + 1);
    icon.setAttribute('class', 'organ-glyph');
    icon.setAttribute('text-anchor', 'middle');
    icon.setAttribute('dominant-baseline', 'central');
    icon.textContent = pos.glyph;

    const label = document.createElementNS(svgNS, 'text');
    label.setAttribute('x', pos.cx); label.setAttribute('y', pos.cy + pos.r + 16);
    label.setAttribute('class', 'organ-label');
    label.setAttribute('text-anchor', 'middle');
    label.textContent = pos.label;

    g.append(halo, dot, icon, label);

    const fire = () => onSelect(mod.id);
    g.addEventListener('click', fire);
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fire(); } });

    svg.appendChild(g);
  }

  container.innerHTML = '';
  container.appendChild(svg);
}
