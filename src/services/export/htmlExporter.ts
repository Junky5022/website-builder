import type { Project } from '../../types/project';
import type { SectionData } from '../../types/sections';
import { getOrderedNodes } from '../analyzer/nodeGenerator';
import { sectionDataToElements } from '../analyzer/elementConverter';
import { tokensToCssVars } from '../../types/design-tokens';

export function generatePreviewHtml(project: Project): string {
  if (project.clonedPageHtml) {
    return project.clonedPageHtml;
  }

  const orderedNodes = getOrderedNodes(project.nodes as any, project.edges as any);
  const visibleNodes = orderedNodes.filter((n) => !n.data.hidden);

  const sectionsHtml = visibleNodes
    .map((node) => {
      const sd = project.sectionData[node.data.sectionDataId];
      if (!sd) return '';
      return renderSection(sd, project.tokens);
    })
    .filter(Boolean)
    .join('\n\n');

  const fontUrl = buildFontUrl(project.tokens.typography.headingFont, project.tokens.typography.bodyFont);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${project.name}</title>
  ${fontUrl ? `<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin /><link href="${fontUrl}" rel="stylesheet" />` : ''}
  <style>
    :root {
      ${tokensToCssVars(project.tokens)}
    }
    ${baseStyles(project.tokens)}
  </style>
</head>
<body>
${sectionsHtml}
${previewScript()}
</body>
</html>`;
}

function buildFontUrl(heading: string, body: string): string {
  const fonts = [...new Set([heading, body])].filter(
    (f) => f && f !== 'system-ui' && !f.includes(',')
  );
  if (!fonts.length) return '';
  const params = fonts.map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700`).join('&');
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

function baseStyles(tokens: Project['tokens']): string {
  const radiusMap: Record<string, string> = { none: '0', sm: '4px', md: '8px', lg: '16px', full: '9999px' };
  const shadowMap: Record<string, string> = { none: 'none', sm: '0 1px 3px rgba(0,0,0,.12)', md: '0 4px 16px rgba(0,0,0,.12)', lg: '0 10px 40px rgba(0,0,0,.16)' };

  return `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--font-body); font-size: var(--font-size-base); color: var(--color-text); background: var(--color-bg); line-height: 1.6; }
    img { max-width: 100%; height: auto; display: block; }
    a { color: inherit; text-decoration: none; }

    .vds-container { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; }
    .vds-container--wide { max-width: 1400px; margin: 0 auto; padding: 0 2rem; }
    .vds-container--narrow { max-width: 760px; margin: 0 auto; padding: 0 1.5rem; }

    .vds-btn { display: inline-flex; align-items: center; gap: .5rem; padding: .6rem 1.4rem; border-radius: ${radiusMap[tokens.spacing.borderRadius]}; font-weight: 600; font-size: .9rem; cursor: pointer; border: none; transition: opacity .15s, transform .1s; }
    .vds-btn:hover { opacity: .9; transform: translateY(-1px); }
    .vds-btn--primary { background: var(--color-primary); color: #fff; box-shadow: ${shadowMap[tokens.shadows]}; }
    .vds-btn--secondary { background: transparent; border: 2px solid currentColor; }
    .vds-btn--ghost { background: rgba(255,255,255,.15); color: #fff; }

    .vds-badge { display: inline-block; padding: .2rem .75rem; border-radius: 999px; font-size: .75rem; font-weight: 600; background: color-mix(in srgb, var(--color-primary) 15%, transparent); color: var(--color-primary); border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent); margin-bottom: 1rem; }

    .vds-section { padding: 5rem 0; }
    .vds-section--compact { padding: 3rem 0; }
    .vds-heading { font-family: var(--font-heading); font-weight: 700; line-height: 1.15; }
    .vds-heading--xl { font-size: clamp(2rem, 5vw, 4rem); }
    .vds-heading--lg { font-size: clamp(1.5rem, 3vw, 2.5rem); }
    .vds-heading--md { font-size: clamp(1.2rem, 2vw, 1.75rem); }
    .vds-subheading { font-size: 1.125rem; color: var(--color-muted); max-width: 600px; }
    .vds-subheading--center { margin: 0 auto; text-align: center; }

    .vds-grid { display: grid; gap: 1.5rem; }
    .vds-grid--2 { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
    .vds-grid--3 { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
    .vds-grid--4 { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }

    .vds-card { background: var(--color-surface); border-radius: ${radiusMap[tokens.spacing.borderRadius]}; padding: 1.5rem; box-shadow: ${shadowMap[tokens.shadows]}; }

    /* Nav */
    nav.vds-nav { position: sticky; top: 0; z-index: 100; background: var(--color-bg); border-bottom: 1px solid rgba(0,0,0,.08); backdrop-filter: blur(8px); }
    .vds-nav__inner { max-width: 1200px; margin: 0 auto; padding: .875rem 1.5rem; display: flex; align-items: center; gap: 2rem; }
    .vds-nav__logo { font-weight: 800; font-size: 1.2rem; font-family: var(--font-heading); }
    .vds-nav__links { display: flex; gap: 1.5rem; flex: 1; }
    .vds-nav__links a { font-size: .9rem; color: var(--color-muted); transition: color .15s; }
    .vds-nav__links a:hover { color: var(--color-text); }
    .vds-nav__toggle { display: none; background: none; border: none; cursor: pointer; padding: .25rem; }
    @media (max-width: 768px) {
      .vds-nav__links { display: none; flex-direction: column; position: absolute; top: 100%; left: 0; right: 0; background: var(--color-bg); padding: 1rem 1.5rem; border-bottom: 1px solid rgba(0,0,0,.08); }
      .vds-nav__links.open { display: flex; }
      .vds-nav__toggle { display: block; }
    }

    /* Accordion */
    .vds-accordion__item { border-bottom: 1px solid rgba(0,0,0,.08); }
    .vds-accordion__trigger { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 0; font-weight: 600; background: none; border: none; cursor: pointer; text-align: left; font-size: 1rem; font-family: var(--font-body); color: var(--color-text); }
    .vds-accordion__content { overflow: hidden; max-height: 0; transition: max-height .3s ease; }
    .vds-accordion__content.open { max-height: 500px; }
    .vds-accordion__body { padding: 0 0 1.25rem; color: var(--color-muted); line-height: 1.7; }

    @media (max-width: 640px) {
      .vds-section { padding: 3rem 0; }
      .vds-heading--xl { font-size: 2rem; }
    }
  `;
}

function safeStr(val: unknown, fallback = ''): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    const o = val as any;
    return o.alt || o.text || o.label || o.name || o.value || fallback;
  }
  return fallback;
}

function safeArr<T>(val: unknown): T[] {
  return Array.isArray(val) ? val : [];
}

function isDarkHex(color?: string): boolean {
  if (!color || !color.startsWith('#')) return false;
  const hex = color.replace('#', '');
  if (hex.length !== 6) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum < 0.45;
}

function renderSection(sd: SectionData, _tokens: Project['tokens']): string {
  const elements =
    Array.isArray((sd as any).elements) && (sd as any).elements.length > 0
      ? (sd as any).elements
      : sectionDataToElements(sd);
  return renderSandboxSection(sd, elements);
}

function renderSandboxSection(sd: any, elements: any[]): string {
  const bg = sd.background?.color || (sd.type === 'footer' ? '#0f172a' : 'var(--color-bg)');
  const darkBg = sd.type === 'footer' || isDarkHex(bg);
  const textColor = darkBg ? '#f8fafc' : 'var(--color-text)';
  const isHeader = sd.type === 'header';
  const hasFloats = elements.some(
    (el) => el.style?.wrapMode === 'left' || el.style?.wrapMode === 'right'
  );
  const innerHtml = elements.map(renderSingleElement).join('\n');

  if (isHeader) {
    return `<header class="vds-section" style="background:${bg};color:${textColor};padding:1.25rem 0;border-bottom:1px solid rgba(0,0,0,0.08);">
      <div class="vds-container" style="display:flex;align-items:center;justify-content:space-between;gap:1.5rem;flex-wrap:wrap;">
        ${innerHtml}
      </div>
    </header>`;
  }

  return `<section class="vds-section" style="background:${bg};color:${textColor};padding:3.5rem 0;">
    <div class="vds-container" style="${hasFloats ? 'display:block;overflow:hidden;' : 'display:flex;flex-direction:column;gap:1.5rem;'}">
      ${innerHtml}
    </div>
  </section>`;
}

function renderSingleElement(el: any): string {
  const hasOffset = Boolean(el.style?.freeX || el.style?.freeY);
  const wrapMode = el.style?.wrapMode || 'none';
  let wrapCss = '';
  if (wrapMode === 'left') wrapCss = 'float:left;margin:0.5rem 1.5rem 1rem 0;display:inline-block;';
  else if (wrapMode === 'right') wrapCss = 'float:right;margin:0.5rem 0 1rem 1.5rem;display:inline-block;';
  else if (wrapMode === 'break') wrapCss = 'clear:both;display:block;margin:1.5rem 0;';
  else if (wrapMode === 'in-front') wrapCss = 'position:relative;z-index:35;box-shadow:0 12px 35px rgba(0,0,0,0.18);';
  else if (wrapMode === 'behind') wrapCss = 'position:relative;z-index:0;opacity:0.75;';

  const styleStr = [
    wrapCss,
    el.style?.color ? `color:${el.style.color}` : '',
    el.style?.backgroundColor ? `background-color:${el.style.backgroundColor}` : '',
    el.style?.borderRadius ? `border-radius:${el.style.borderRadius}` : '',
    el.style?.padding ? `padding:${el.style.padding}` : '',
    el.style?.border ? `border:${el.style.border}` : '',
    el.style?.boxShadow ? `box-shadow:${el.style.boxShadow}` : '',
    el.style?.textAlign ? `text-align:${el.style.textAlign}` : '',
    el.style?.width ? `width:${el.style.width}` : '',
    el.style?.height ? `height:${el.style.height}` : '',
    hasOffset ? `transform:translate3d(${el.style?.freeX || 0}px, ${el.style?.freeY || 0}px, 0);position:relative;z-index:${el.style?.zIndex || 25}` : '',
  ].filter(Boolean).join(';');

  switch (el.type) {
    case 'heading': {
      const lvl = el.level || 2;
      return `<h${lvl} class="vds-heading ${lvl === 1 ? 'vds-heading--xl' : 'vds-heading--lg'}" style="${styleStr}">${safeStr(el.content)}</h${lvl}>`;
    }
    case 'text':
      return `<p class="vds-text" style="color:var(--color-muted);line-height:1.7;${styleStr}">${safeStr(el.content)}</p>`;
    case 'badge':
      return `<div><span class="vds-badge" style="${styleStr}">${safeStr(el.content)}</span></div>`;
    case 'button': {
      const isSec = el.variant === 'secondary' || el.variant === 'outline';
      return `<div><a href="${safeStr(el.url, '#')}" class="vds-btn ${isSec ? 'vds-btn--secondary' : 'vds-btn--primary'}" style="${styleStr}">${safeStr(el.content)}</a></div>`;
    }
    case 'image':
      return `<div style="width:100%;text-align:center;"><img src="${safeStr(el.url)}" alt="${safeStr(el.alt)}" style="border-radius:12px;max-width:100%;height:auto;${styleStr}" /></div>`;
    case 'icon':
      return `<div style="font-size:2rem;${styleStr}">${safeStr(el.content)}</div>`;
    case 'divider':
      return `<hr style="border:none;border-top:1px solid #e2e8f0;margin:1.5rem 0;${styleStr}" />`;
    case 'nav-item':
      return `<a href="${safeStr(el.url, '#')}" style="font-size:.9rem;color:var(--color-muted);${styleStr}">${safeStr(el.content)}</a>`;
    case 'card':
    case 'container': {
      const children = safeArr<any>(el.children).map(renderSingleElement).join('\n');
      const isGrid = el.style?.display === 'grid';
      const cols = el.style?.gridCols || 3;
      if (isGrid) {
        return `<div class="vds-grid vds-grid--${cols}" style="${styleStr}">${children}</div>`;
      }
      const isRow = el.style?.flexDirection === 'row';
      return `<div style="display:flex;flex-direction:${isRow ? 'row' : 'column'};gap:1rem;flex-wrap:wrap;${styleStr}">${children}</div>`;
    }
    default:
      return `<div style="${styleStr}">${safeStr(el.content)}</div>`;
  }
}

function renderHeader(d: any): string {
  const navLinks = safeArr<any>(d.navItems).map((item) => `<a href="${safeStr(item?.href, '#')}">${safeStr(item?.label ?? item)}</a>`).join('');
  const cta = d.cta ? `<a href="${safeStr(d.cta.href, '#')}" class="vds-btn vds-btn--primary" style="margin-left:auto">${safeStr(d.cta.label)}</a>` : '';
  return `<nav class="vds-nav">
  <div class="vds-nav__inner">
    <div class="vds-nav__logo">${safeStr(d.logo, 'Brand')}</div>
    <div class="vds-nav__links" id="vds-nav-links">${navLinks}</div>
    ${cta}
    <button class="vds-nav__toggle" onclick="document.getElementById('vds-nav-links').classList.toggle('open')" aria-label="Toggle menu">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    </button>
  </div>
</nav>`;
}

function renderHero(d: any): string {
  const isCentered = d.layout === 'centered';
  const textAlign = isCentered ? 'text-align:center;' : '';
  const imgHtml = d.image ? `<img src="${d.image.url}" alt="${safeStr(d.image.alt, 'Hero')}" style="border-radius:12px;width:100%;max-width:600px;" />` : '';
  const badge = d.badge ? `<span class="vds-badge">${safeStr(d.badge)}</span>` : '';
  const layout = isCentered
    ? `<div style="text-align:center;display:flex;flex-direction:column;align-items:center;">`
    : `<div style="display:grid;grid-template-columns:1fr 1fr;gap:3rem;align-items:center;">`;

  return `<section class="vds-section" style="background:${d.background?.color ?? 'var(--color-bg)'};">
  <div class="vds-container">
    ${layout}
      <div>
        ${badge}
        <h1 class="vds-heading vds-heading--xl" style="margin-bottom:1rem;${textAlign}">${safeStr(d.heading)}</h1>
        <p class="vds-subheading${isCentered ? ' vds-subheading--center' : ''}" style="margin-bottom:2rem;">${safeStr(d.subheading)}</p>
        ${d.bodyText ? `<p style="color:var(--color-muted);margin-bottom:2rem;">${safeStr(d.bodyText)}</p>` : ''}
        <div style="display:flex;gap:1rem;flex-wrap:wrap;${isCentered ? 'justify-content:center;' : ''}">
          <a href="${safeStr(d.primaryCta?.href, '#')}" class="vds-btn vds-btn--primary">${safeStr(d.primaryCta?.label, 'Get Started')}</a>
          ${d.secondaryCta ? `<a href="${safeStr(d.secondaryCta?.href, '#')}" class="vds-btn vds-btn--secondary">${safeStr(d.secondaryCta?.label, 'Learn More')}</a>` : ''}
        </div>
      </div>
      ${!isCentered && imgHtml ? `<div>${imgHtml}</div>` : ''}
    </div>
    ${isCentered && imgHtml ? `<div style="margin-top:3rem;">${imgHtml}</div>` : ''}
  </div>
</section>`;
}

function renderFeatures(d: any): string {
  const colCount = d.layout === 'grid4' ? '4' : d.layout === 'grid2' ? '2' : '3';
  const cols = safeArr<any>(d.features).map((f) => `
    <div class="vds-card">
      <div style="font-size:2rem;margin-bottom:.75rem;">${safeStr(f?.icon, '✨')}</div>
      <h3 style="font-weight:600;margin-bottom:.5rem;font-family:var(--font-heading);">${safeStr(f?.title, 'Feature')}</h3>
      <p style="color:var(--color-muted);font-size:.9rem;line-height:1.6;">${safeStr(f?.description)}</p>
    </div>`).join('');
  return `<section class="vds-section" style="background:${d.background?.color ?? 'var(--color-surface)'};">
  <div class="vds-container">
    <div style="text-align:center;margin-bottom:3rem;">
      ${d.badge ? `<span class="vds-badge">${safeStr(d.badge)}</span>` : ''}
      <h2 class="vds-heading vds-heading--lg" style="margin-bottom:1rem;">${safeStr(d.heading, 'Features')}</h2>
      ${d.subheading ? `<p class="vds-subheading vds-subheading--center">${safeStr(d.subheading)}</p>` : ''}
    </div>
    <div class="vds-grid vds-grid--${colCount}">${cols}</div>
  </div>
</section>`;
}

function renderImageText(d: any): string {
  const reversed = d.layout === 'imageRight';
  const bullets = safeArr<any>(d.bullets).map((b) => `<li style="margin-bottom:.5rem;">${safeStr(b)}</li>`).join('');
  const imgHtml = d.image ? `<img src="${d.image.url}" alt="${safeStr(d.image.alt)}" style="border-radius:12px;width:100%;" />` : '';
  const textBlock = `
    <div>
      ${d.badge ? `<span class="vds-badge">${safeStr(d.badge)}</span>` : ''}
      <h2 class="vds-heading vds-heading--lg" style="margin-bottom:1rem;">${safeStr(d.heading)}</h2>
      <p style="color:var(--color-muted);margin-bottom:1.5rem;">${safeStr(d.bodyText)}</p>
      ${bullets ? `<ul style="list-style:none;margin-bottom:1.5rem;">${bullets}</ul>` : ''}
      ${d.cta ? `<a href="${safeStr(d.cta.href, '#')}" class="vds-btn vds-btn--primary">${safeStr(d.cta.label)}</a>` : ''}
    </div>`;
  return `<section class="vds-section" style="background:${d.background?.color ?? 'var(--color-bg)'};">
  <div class="vds-container">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:center;">
      ${reversed ? textBlock + imgHtml : imgHtml + textBlock}
    </div>
  </div>
</section>`;
}

function renderGallery(d: any): string {
  const cols = safeArr<any>(d.items).map((item) => `
    <div style="border-radius:12px;overflow:hidden;">
      <img src="${item.image?.url || ''}" alt="${safeStr(item.image?.alt)}" style="width:100%;height:200px;object-fit:cover;" />
      ${item.caption ? `<p style="text-align:center;padding:.5rem;font-size:.85rem;color:var(--color-muted);">${safeStr(item.caption)}</p>` : ''}
    </div>`).join('');
  return `<section class="vds-section" style="background:${d.background?.color ?? 'var(--color-surface)'};">
  <div class="vds-container">
    <div style="text-align:center;margin-bottom:3rem;">
      <h2 class="vds-heading vds-heading--lg">${safeStr(d.heading, 'Gallery')}</h2>
      ${d.subheading ? `<p class="vds-subheading vds-subheading--center" style="margin-top:.75rem;">${safeStr(d.subheading)}</p>` : ''}
    </div>
    <div class="vds-grid vds-grid--3">${cols}</div>
  </div>
</section>`;
}

function renderTestimonials(d: any): string {
  const stars = (n = 5) => Array(n).fill('★').join('');
  const cards = safeArr<any>(d.testimonials).map((t) => `
    <div class="vds-card">
      ${t.rating ? `<div style="color:#f59e0b;margin-bottom:.75rem;font-size:1.1rem;">${stars(t.rating)}</div>` : ''}
      <blockquote style="font-size:1rem;line-height:1.7;color:var(--color-text);margin-bottom:1.25rem;">"${safeStr(t.quote)}"</blockquote>
      <div style="display:flex;align-items:center;gap:.75rem;">
        ${t.authorImage ? `<img src="${t.authorImage.url}" alt="${safeStr(t.authorName)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" />` : `<div style="width:40px;height:40px;border-radius:50%;background:var(--color-primary);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;">${safeStr(t.authorName, 'A')[0]}</div>`}
        <div>
          <p style="font-weight:600;font-size:.9rem;">${safeStr(t.authorName)}</p>
          <p style="color:var(--color-muted);font-size:.8rem;">${safeStr(t.authorTitle)}</p>
        </div>
      </div>
    </div>`).join('');
  return `<section class="vds-section" style="background:${d.background?.color ?? 'var(--color-surface)'};">
  <div class="vds-container">
    <div style="text-align:center;margin-bottom:3rem;">
      <h2 class="vds-heading vds-heading--lg">${safeStr(d.heading, 'Testimonials')}</h2>
      ${d.subheading ? `<p class="vds-subheading vds-subheading--center" style="margin-top:.75rem;">${safeStr(d.subheading)}</p>` : ''}
    </div>
    <div class="vds-grid vds-grid--3">${cards}</div>
  </div>
</section>`;
}

function renderPricing(d: any): string {
  const tiers = safeArr<any>(d.tiers).map((t) => `
    <div class="vds-card" style="${t.highlighted ? 'border:2px solid var(--color-primary);' : 'border:1px solid rgba(0,0,0,.08);'}">
      ${t.badge ? `<div style="text-align:center;"><span class="vds-badge">${safeStr(t.badge)}</span></div>` : ''}
      <div style="text-align:center;margin-bottom:1.5rem;">
        <h3 style="font-weight:700;font-size:1.1rem;margin-bottom:.5rem;">${safeStr(t.name)}</h3>
        <p style="font-size:2.5rem;font-weight:800;line-height:1;">${safeStr(t.price)}<span style="font-size:1rem;font-weight:400;color:var(--color-muted);">${safeStr(t.period)}</span></p>
        <p style="color:var(--color-muted);font-size:.9rem;margin-top:.5rem;">${safeStr(t.description)}</p>
      </div>
      <ul style="list-style:none;margin-bottom:2rem;">
        ${safeArr<any>(t.features).map((f) => `<li style="padding:.4rem 0;display:flex;gap:.5rem;align-items:baseline;font-size:.9rem;"><span style="color:var(--color-primary);">✓</span>${safeStr(f)}</li>`).join('')}
      </ul>
      <a href="${safeStr(t.cta?.href, '#')}" class="vds-btn ${t.highlighted ? 'vds-btn--primary' : 'vds-btn--secondary'}" style="width:100%;justify-content:center;display:flex;">${safeStr(t.cta?.label, 'Get Started')}</a>
    </div>`).join('');
  return `<section class="vds-section" style="background:${d.background?.color ?? 'var(--color-bg)'};">
  <div class="vds-container">
    <div style="text-align:center;margin-bottom:3rem;">
      <h2 class="vds-heading vds-heading--lg">${safeStr(d.heading, 'Pricing')}</h2>
      ${d.subheading ? `<p class="vds-subheading vds-subheading--center" style="margin-top:.75rem;">${safeStr(d.subheading)}</p>` : ''}
    </div>
    <div class="vds-grid vds-grid--3">${tiers}</div>
  </div>
</section>`;
}

function renderFaq(d: any): string {
  const items = safeArr<any>(d.items).map((item) => `
    <div class="vds-accordion__item">
      <button class="vds-accordion__trigger" onclick="vdsToggle(this)">
        ${safeStr(item.question)}
        <svg style="flex-shrink:0;transition:transform .3s;" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </button>
      <div class="vds-accordion__content">
        <div class="vds-accordion__body">${safeStr(item.answer)}</div>
      </div>
    </div>`).join('');
  return `<section class="vds-section" style="background:${d.background?.color ?? 'var(--color-surface)'};">
  <div class="vds-container--narrow">
    <div style="text-align:center;margin-bottom:3rem;">
      <h2 class="vds-heading vds-heading--lg">${safeStr(d.heading, 'Frequently Asked Questions')}</h2>
      ${d.subheading ? `<p class="vds-subheading vds-subheading--center" style="margin-top:.75rem;">${safeStr(d.subheading)}</p>` : ''}
    </div>
    <div>${items}</div>
  </div>
</section>`;
}

function renderCta(d: any): string {
  const bg = d.background?.color ?? 'var(--color-primary)';
  return `<section class="vds-section" style="background:${bg};">
  <div class="vds-container">
    <div style="text-align:center;">
      <h2 class="vds-heading vds-heading--lg" style="color:#fff;margin-bottom:1rem;">${safeStr(d.heading, 'Call to Action')}</h2>
      ${d.subheading ? `<p style="color:rgba(255,255,255,.8);font-size:1.125rem;margin-bottom:2rem;">${safeStr(d.subheading)}</p>` : ''}
      <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
        <a href="${safeStr(d.primaryCta?.href, '#')}" class="vds-btn" style="background:#fff;color:var(--color-primary);">${safeStr(d.primaryCta?.label, 'Get Started')}</a>
        ${d.secondaryCta ? `<a href="${safeStr(d.secondaryCta?.href, '#')}" class="vds-btn vds-btn--ghost">${safeStr(d.secondaryCta?.label, 'Learn More')}</a>` : ''}
      </div>
    </div>
  </div>
</section>`;
}

function renderFooter(d: any): string {
  const columns = safeArr<any>(d.columns).map((col) => `
    <div>
      <h4 style="font-weight:600;color:#f1f5f9;margin-bottom:1rem;font-family:var(--font-heading);">${safeStr(col?.heading)}</h4>
      <ul style="list-style:none;">
        ${safeArr<any>(col?.links).map((link) => `<li style="margin-bottom:.5rem;"><a href="${safeStr(link?.href, '#')}" style="color:#94a3b8;font-size:.9rem;transition:color .15s;" onmouseover="this.style.color='#f1f5f9'" onmouseout="this.style.color='#94a3b8'">${safeStr(link?.label)}</a></li>`).join('')}
      </ul>
    </div>`).join('');
  return `<footer style="background:${d.background?.color ?? '#0f172a'};padding:4rem 0 2rem;">
  <div class="vds-container">
    <div style="display:grid;grid-template-columns:1.5fr repeat(${safeArr(d.columns).length},1fr);gap:3rem;margin-bottom:3rem;">
      <div>
        <p style="font-weight:800;font-size:1.3rem;color:#fff;margin-bottom:.75rem;font-family:var(--font-heading);">${safeStr(d.logo, 'Brand')}</p>
        ${d.tagline ? `<p style="color:#94a3b8;font-size:.9rem;">${safeStr(d.tagline)}</p>` : ''}
      </div>
      ${columns}
    </div>
    <div style="border-top:1px solid rgba(255,255,255,.1);padding-top:1.5rem;text-align:center;">
      <p style="color:#64748b;font-size:.85rem;">${safeStr(d.copyright)}</p>
    </div>
  </div>
</footer>`;
}

function previewScript(): string {
  return `<script>
function vdsToggle(btn) {
  const content = btn.nextElementSibling;
  const svg = btn.querySelector('svg');
  const isOpen = content.classList.contains('open');
  document.querySelectorAll('.vds-accordion__content.open').forEach(el => {
    el.classList.remove('open');
    el.previousElementSibling.querySelector('svg').style.transform = '';
  });
  if (!isOpen) {
    content.classList.add('open');
    svg.style.transform = 'rotate(180deg)';
  }
}
</script>`;
}
