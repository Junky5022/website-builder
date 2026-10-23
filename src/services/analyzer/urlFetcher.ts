/**
 * Multi-strategy web page content & visual screenshot fetcher for browser clients.
 * Combines:
 * 1) Real live browser screenshot via Microlink API (so Gemini Vision sees the exact colors, layout, banners, and UI)
 * 2) Rendered Markdown & image URLs via Jina Reader (so Gemini gets all real text, links, and product images)
 * 3) Raw HTML source (for metadata & styles)
 */

async function imageUrlToDownscaledBase64(imgUrl: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const res = await fetch(imgUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const maxDim = 1400;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            resolve({
              base64: dataUrl.split(',')[1] || '',
              mimeType: 'image/jpeg',
            });
            return;
          }
          resolve(null);
        };
        img.onerror = () => resolve(null);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function fetchUrlScreenshot(targetUrl: string): Promise<{ base64: string; mimeType: string } | null> {
  const normalizedUrl = targetUrl.startsWith('http://') || targetUrl.startsWith('https://')
    ? targetUrl
    : `https://${targetUrl}`;

  try {
    const mlRes = await fetch(
      `https://api.microlink.io?url=${encodeURIComponent(normalizedUrl)}&screenshot=true&viewport.width=1440&viewport.height=1200`
    );
    if (!mlRes.ok) return null;
    const json = await mlRes.json();
    const screenshotUrl = json?.data?.screenshot?.url;
    if (screenshotUrl && typeof screenshotUrl === 'string') {
      return await imageUrlToDownscaledBase64(screenshotUrl);
    }
  } catch {
    // ignore screenshot failure and fall back to text
  }
  return null;
}

export interface CloneDomOptions {
  keepScripts?: boolean;
}

export async function fetchRawPageHtml(
  targetUrl: string,
  options?: CloneDomOptions
): Promise<{ html: string; origin: string }> {
  const normalizedUrl = targetUrl.startsWith('http://') || targetUrl.startsWith('https://')
    ? targetUrl
    : `https://${targetUrl}`;

  const parsedUrl = new URL(normalizedUrl);
  const origin = parsedUrl.origin;

  let directHtml = '';
  let jinaHtml = '';

  // 1. Try built-in local dev server proxy first (fetches 100% untouched HTML with all SVG paths, navbars, and styles!)
  try {
    const localRes = await fetch(`/__vds_proxy?url=${encodeURIComponent(normalizedUrl)}`);
    if (localRes.ok) {
      const text = await localRes.text();
      if (text && text.includes('<') && text.length > 500) {
        directHtml = text;
      }
    }
  } catch {
    // fallback if not running on Vite dev server
  }

  // 2. Try AllOrigins RAW endpoint (returns untouched HTML with full <svg><path> icons for sites like apple.com)
  if (!directHtml) {
    try {
      const rawOriginsRes = await fetch(
        `https://api.allorigins.win/raw?url=${encodeURIComponent(normalizedUrl)}`
      );
      if (rawOriginsRes.ok) {
        const text = await rawOriginsRes.text();
        if (text && text.includes('<') && text.length > 500) {
          directHtml = text;
        }
      }
    } catch {
      // fallback
    }
  }

  // 3. If direct HTML looks like an unrendered SPA shell (e.g. tiny body with just <div id="app"></div>),
  //    or if direct fetch was blocked by Cloudflare, also fetch Jina Reader HTML (which runs a headless browser)
  const isUnrenderedSpaShell =
    !directHtml ||
    (directHtml.length < 15000 && /<div[^>]*id=["']?(app|root|__next)["']?[^>]*>\s*<\/div>/i.test(directHtml));

  if (isUnrenderedSpaShell) {
    try {
      const jinaRes = await fetch(`https://r.jina.ai/${normalizedUrl}`, {
        headers: {
          'X-Return-Format': 'html',
          'X-No-Cache': 'true',
        },
      });
      if (jinaRes.ok) {
        const text = await jinaRes.text();
        if (text && text.includes('<') && text.length > 200) {
          jinaHtml = text;
        }
      }
    } catch {
      // fallback
    }
  }

  const rawHtml = jinaHtml && jinaHtml.length > directHtml.length ? jinaHtml : directHtml || jinaHtml;

  if (!rawHtml) {
    throw new Error('Could not fetch raw HTML from this URL. You can also copy the HTML from Inspect Element (Right-click <html> -> Copy outerHTML) and paste it into the "Paste Code" tab!');
  }

  return {
    html: prepareClonedHtmlDocument(rawHtml, normalizedUrl, options),
    origin,
  };
}

export function prepareClonedHtmlDocument(
  rawHtml: string,
  sourceUrl?: string,
  options?: CloneDomOptions
): string {
  let html = rawHtml.trim();

  if (!options?.keepScripts) {
    // Remove only external/executable <script> tags (preserve JSON-LD / application/json data blocks)
    html = html.replace(
      /<script\b(?![^>]*type=["']?(?:application\/(?:ld\+)?json|importmap)["']?)[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      ''
    );
  }
  // Swap SSR "no-js" classes to "js" so CSS rules that wait for JS initialization show their desktop elements immediately
  html = html.replace(/\bno-js\b/g, 'js');
  // Convert common lazy-loaded image attributes (data-src, data-lazy-src, data-original) into real src attributes so images render even without JS
  html = html.replace(/<img\b([^>]*?)\sdata-(?:lazy-)?src=(["'][^"']+["'])([^>]*)>/gi, (match, before, dataSrc, after) => {
    if (/\bsrc=["']https?:\/\//i.test(match)) return match;
    return `<img${before} src=${dataSrc}${after}>`;
  });
  // Remove Content-Security-Policy meta tags that block inline styles or external images
  html = html.replace(/<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, '');

  const baseTag = sourceUrl ? `<base href="${sourceUrl}">` : '';
  const navbarPreserveCss = `<style id="vibe-sticky-guard">
    header, nav, #globalheader, #globalnav {
      visibility: visible !important;
      opacity: 1 !important;
    }
    #globalnav {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      height: 44px !important;
      max-height: 44px !important;
      z-index: 9999 !important;
      background: rgba(255, 255, 255, 0.85) !important;
      backdrop-filter: saturate(180%) blur(20px) !important;
    }
    #globalnav .globalnav-list {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
    }
    #globalnav .globalnav-menu {
      display: contents !important;
      visibility: visible !important;
      opacity: 1 !important;
    }
    #globalnav .globalnav-menu > .globalnav-flyout {
      display: contents !important;
      padding-top: 0 !important;
      height: 44px !important;
      visibility: visible !important;
      opacity: 1 !important;
      pointer-events: auto !important;
    }
    #globalnav .globalnav-menu-list {
      display: contents !important;
      padding-bottom: 0 !important;
      height: 44px !important;
      visibility: visible !important;
      opacity: 1 !important;
    }
    #globalnav .globalnav-item,
    #globalnav .globalnav-item-menu,
    #globalnav .globalnav-submenu-trigger-group,
    #globalnav .globalnav-submenu-trigger-item,
    #globalnav .globalnav-submenu-trigger-link {
      visibility: visible !important;
      opacity: 1 !important;
      pointer-events: auto !important;
    }
    #globalnav .globalnav-submenu-trigger-group:not([data-vds-x]) {
      transform: none !important;
    }
    .globalnav-curtain, .globalnav-submenu, .globalnav-flyout-content, .globalnav-submenu-content, .ac-gn-curtain,
    .sticky-placeholder, .header-spacer, .sticky-spacer {
      display: none !important;
      pointer-events: none !important;
      opacity: 0 !important;
      visibility: hidden !important;
    }
  </style>`;

  if (!/<html[\s>]/i.test(html)) {
    html = `<!DOCTYPE html><html><head><meta charset="utf-8">${baseTag}${navbarPreserveCss}</head><body>${html}</body></html>`;
  } else {
    const injectHead = `${baseTag}${navbarPreserveCss}`;
    if (/<head[\s>]/i.test(html)) {
      html = html.replace(/<head([^>]*)>/i, `<head$1>${injectHead}`);
    } else {
      html = html.replace(/<html([^>]*)>/i, `<html$1><head>${injectHead}</head>`);
    }
  }

  return html;
}

export async function fetchPageContent(targetUrl: string): Promise<string> {
  const normalizedUrl = targetUrl.startsWith('http://') || targetUrl.startsWith('https://')
    ? targetUrl
    : `https://${targetUrl}`;

  const parts: string[] = [];
  const errors: string[] = [];

  // 1. Fetch Jina Reader Markdown (executes JS / Vue / React and extracts all visible text, links, and image URLs)
  try {
    const jinaMarkdownRes = await fetch(`https://r.jina.ai/${normalizedUrl}`, {
      headers: {
        'X-With-Images-Summary': 'true',
      },
    });
    if (jinaMarkdownRes.ok) {
      const markdown = await jinaMarkdownRes.text();
      if (markdown && markdown.trim().length > 80) {
        parts.push(`=== RENDERED PAGE CONTENT (MARKDOWN & IMAGES) ===\n${markdown.slice(0, 45000)}`);
      }
    } else {
      errors.push(`Jina Markdown status ${jinaMarkdownRes.status}`);
    }
  } catch (err: any) {
    errors.push(`Jina Markdown error: ${err?.message || err}`);
  }

  // 2. Also fetch raw HTML via Jina HTML or AllOrigins to capture <head>, meta tags, CSS variables, and DOM classes
  try {
    const jinaHtmlRes = await fetch(`https://r.jina.ai/${normalizedUrl}`, {
      headers: {
        'X-Return-Format': 'html',
      },
    });
    if (jinaHtmlRes.ok) {
      const html = await jinaHtmlRes.text();
      if (html && html.trim().length > 80) {
        parts.push(`=== RAW HTML SOURCE ===\n${html.slice(0, 35000)}`);
      }
    }
  } catch {
    // Fallback to AllOrigins for raw HTML if Jina HTML fails
    try {
      const allOriginsRes = await fetch(
        `https://api.allorigins.win/get?url=${encodeURIComponent(normalizedUrl)}`
      );
      if (allOriginsRes.ok) {
        const data = await allOriginsRes.json();
        if (data?.contents && typeof data.contents === 'string' && data.contents.trim().length > 50) {
          parts.push(`=== RAW HTML SOURCE ===\n${data.contents.slice(0, 35000)}`);
        }
      }
    } catch (err: any) {
      errors.push(`AllOrigins error: ${err?.message || err}`);
    }
  }

  if (parts.length > 0) {
    return parts.join('\n\n');
  }

  throw new Error(
    `Unable to fetch page from URL. Web servers or proxies blocked access.\n\n` +
    `Tip: You can use the "Paste Screenshot" tab or paste the page source directly in the "Paste Code" tab for immediate 100% reliable analysis.`
  );
}
