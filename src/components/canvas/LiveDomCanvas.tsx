import { useEffect, useRef, useState } from 'react';
import {
  Copy,
  Trash2,
  RotateCcw,
  Plus,
  Sparkles,
  ArrowUp,
  Edit3,
  Layers,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Lock,
  Unlock,
  Palette,
  Type,
  Image as ImageIcon,
  Link as LinkIcon,
  WrapText,
  ChevronRight,
  ArrowUpToLine,
  ArrowDownToLine,
  Group,
  Ungroup,
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useCanvasStore } from '../../store/useCanvasStore';

interface Props {
  html: string;
  readOnly?: boolean;
}

interface SelectedDomInfo {
  tagName: string;
  text: string;
  src?: string;
  href?: string;
  color: string;
  backgroundColor: string;
  fontSize: string;
  textAlign: string;
  borderRadius: string;
  opacity: string;
  width: string;
  height: string;
  locked: boolean;
  groupId?: string;
  multiCount: number;
  rect: { top: number; left: number; width: number; height: number };
}

interface ContextMenuState {
  x: number;
  y: number;
  subMenu?: 'layer' | 'align' | 'style' | 'wrap' | 'add' | 'icon' | null;
}

interface SnapGuide {
  axis: 'vertical' | 'horizontal';
  pos: number;
  start: number;
  end: number;
  label?: string;
}

export default function LiveDomCanvas({ html, readOnly = false }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastLoadedHtmlRef = useRef<string>('');
  const selectedElRef = useRef<HTMLElement | null>(null);
  const selectedElsRef = useRef<HTMLElement[]>([]);

  const [selectedEl, setSelectedEl] = useState<HTMLElement | null>(null);
  const [selectedEls, setSelectedEls] = useState<HTMLElement[]>([]);
  const [selectedInfo, setSelectedInfo] = useState<SelectedDomInfo | null>(null);
  const [liveDragCoords, setLiveDragCoords] = useState<{ x: number; y: number; freeform?: boolean; snapX?: string; snapY?: string } | null>(null);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const [liveResizeDims, setLiveResizeDims] = useState<{ w: number; h: number } | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [stageSize, setStageSize] = useState<{ w: number; h: number }>({ w: 1200, h: 800 });
  const zoomScrollRef = useRef<HTMLDivElement>(null);
  const zoomLevel = useCanvasStore((s) => s.zoomLevel);
  const deviceView = useCanvasStore((s) => s.deviceView);
  const scale = zoomLevel / 100;

  // Measure the available stage size so Desktop mode ALWAYS renders inside a genuine >= 1280px desktop viewport
  useEffect(() => {
    const el = zoomScrollRef.current;
    if (!el) return;
    const updateSize = () => {
      setStageSize({
        w: el.clientWidth || 1200,
        h: el.clientHeight || 800,
      });
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const baseDesktopW = Math.max(1280, stageSize.w);
  const logicalWidth =
    deviceView === 'desktop' ? baseDesktopW : deviceView === 'tablet' ? 768 : 390;
  const logicalHeight = stageSize.h;
  // Auto-fit when at 100% zoom if the center panel is narrower than 1280px so the whole desktop page fits AND stays in Desktop breakpoint!
  const fitRatio =
    deviceView === 'desktop' && stageSize.w < baseDesktopW
      ? stageSize.w / baseDesktopW
      : 1;
  const effectiveScale = scale * fitRatio;

  // Sync current iframe DOM back into Zustand store WITHOUT triggering an iframe reload!
  const commitDomChanges = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    // Temporarily strip selection attributes before serializing
    const prevSelected = doc.querySelectorAll('[data-vds-selected], [data-vds-hovered]');
    prevSelected.forEach((el) => {
      el.removeAttribute('data-vds-selected');
      el.removeAttribute('data-vds-hovered');
    });

    const serialized = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
    // Mark this serialized HTML as already loaded in the iframe so the useEffect never reloads srcdoc!
    lastLoadedHtmlRef.current = serialized;

    // Restore selection attribute on all active elements
    selectedElsRef.current.forEach((item) => {
      if (doc.contains(item)) {
        item.setAttribute('data-vds-selected', 'true');
      }
    });

    useProjectStore.setState((s) => {
      if (s.project) {
        s.project.clonedPageHtml = serialized;
      }
    });
    useProjectStore.getState().saveNow();
  };

  const refreshSelectedInfo = (el: HTMLElement | null) => {
    if (!el || !iframeRef.current?.contentWindow) {
      setSelectedInfo(null);
      return;
    }
    const win = iframeRef.current.contentWindow;
    const computed = win.getComputedStyle(el);
    const activeList = selectedElsRef.current.filter((item) => item.isConnected);
    const r = el.getBoundingClientRect();

    // Compute union bounding rect when multiple items or a group are selected
    let minLeft = r.left;
    let minTop = r.top;
    let maxRight = r.right;
    let maxBottom = r.bottom;
    if (activeList.length > 1) {
      activeList.forEach((item) => {
        const ir = item.getBoundingClientRect();
        if (ir.width > 0 || ir.height > 0) {
          minLeft = Math.min(minLeft, ir.left);
          minTop = Math.min(minTop, ir.top);
          maxRight = Math.max(maxRight, ir.right);
          maxBottom = Math.max(maxBottom, ir.bottom);
        }
      });
    }
    const unionW = Math.max(1, maxRight - minLeft);
    const unionH = Math.max(1, maxBottom - minTop);

    setSelectedInfo({
      tagName: el.tagName.toLowerCase(),
      text: el.innerText || '',
      src: (el as HTMLImageElement).src || undefined,
      href: (el as HTMLAnchorElement).href || undefined,
      color: rgbToHex(computed.color) || '#000000',
      backgroundColor: rgbToHex(computed.backgroundColor) || '#ffffff',
      fontSize: computed.fontSize || '16px',
      textAlign: computed.textAlign || 'left',
      borderRadius: computed.borderRadius || '0px',
      opacity: computed.opacity || '1',
      width: `${Math.round(unionW)}px`,
      height: `${Math.round(unionH)}px`,
      locked: el.getAttribute('data-vds-locked') === 'true',
      groupId: el.getAttribute('data-vds-group') || undefined,
      multiCount: Math.max(1, activeList.length),
      rect: { top: minTop, left: minLeft, width: unionW, height: unionH },
    });
  };

  // Only write to iframe.srcdoc when a genuinely new page or Undo/Redo state arrives
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    if (html === lastLoadedHtmlRef.current) return;

    lastLoadedHtmlRef.current = html;
    iframe.srcdoc = html;
  }, [html]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      const doc = iframe.contentDocument;
      const win = iframe.contentWindow;
      if (!doc || !win) return;

      // Emulate JS-initialized classes on <html>, <body>, and <nav> (many sites ship with "no-js" on SSR HTML and swap to "js" on load)
      doc.querySelectorAll('.no-js').forEach((el) => {
        el.classList.remove('no-js');
        el.classList.add('js');
      });

      // Fix any previously injected #vibe-sticky-guard style tag inside saved clonedPageHtml
      const oldGuardStyle = doc.getElementById('vibe-sticky-guard');
      if (oldGuardStyle) {
        oldGuardStyle.textContent = `
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
        `;
      }

      // Auto-heal any navbar menu trigger elements or menu containers that may have been hidden in an earlier saved state
      doc.querySelectorAll(
        '.globalnav-menu, .globalnav-flyout, .globalnav-menu-list, .globalnav-submenu-trigger-group, .globalnav-submenu-trigger-item, .globalnav-submenu-trigger-link, .globalnav-item-menu, .globalnav-item, .globalnav-link'
      ).forEach((node) => {
        const navEl = node as HTMLElement;
        navEl.style.removeProperty('display');
        navEl.style.removeProperty('pointer-events');
        navEl.style.removeProperty('opacity');
        navEl.style.removeProperty('visibility');
      });

      // Clean up cookie/consent overlays and empty sticky spacer divs while PRESERVING real floating navbars & headers!
      const allNodes = doc.querySelectorAll('*');
      allNodes.forEach((node) => {
        const el = node as HTMLElement;
        if (!el.tagName) return;
        const tag = el.tagName.toLowerCase();
        const style = win.getComputedStyle(el);
        const cls = (typeof el.className === 'string' ? el.className : '').toLowerCase();
        const idStr = (el.id || '').toLowerCase();
        const classTokens = cls.split(/\s+/);

        // 1. Hide cookie/GDPR consent banners, full-screen blur curtains/scrims, and hidden mega-menu dropdown panels
        // IMPORTANT: Use exact class token match for 'globalnav-submenu' and NEVER hide '.globalnav-flyout' (which wraps .globalnav-menu-list on Apple.com)!
        const isDropdownSubmenuPanel =
          classTokens.includes('globalnav-submenu') ||
          cls.includes('globalnav-flyout-content') ||
          cls.includes('globalnav-submenu-content');

        if (
          cls.includes('cookie') ||
          cls.includes('gdpr') ||
          cls.includes('consent') ||
          idStr.includes('cookie') ||
          idStr.includes('consent') ||
          cls.includes('sticky-placeholder') ||
          cls.includes('header-spacer') ||
          cls.includes('globalnav-curtain') ||
          isDropdownSubmenuPanel ||
          cls.includes('ac-gn-curtain') ||
          cls.includes('nav-backdrop') ||
          cls.includes('menu-backdrop') ||
          cls.includes('modal-backdrop')
        ) {
          el.style.setProperty('display', 'none', 'important');
          el.style.setProperty('pointer-events', 'none', 'important');
          return;
        }

        // 2. Ensure ONLY top-level <header> and <nav> elements (not inner curtains/submenus) are visible and properly stacked
        const isNavbarOrHeader =
          tag === 'header' ||
          tag === 'nav' ||
          idStr === 'globalnav' ||
          idStr === 'globalheader' ||
          el.getAttribute('role') === 'navigation' ||
          el.getAttribute('role') === 'banner' ||
          cls === 'navbar' ||
          cls.startsWith('navbar ') ||
          cls.includes('site-header') ||
          cls.includes('main-header') ||
          cls.includes('topbar');

        if (isNavbarOrHeader) {
          if (style.opacity === '0') el.style.opacity = '1';
          if (style.visibility === 'hidden') el.style.visibility = 'visible';
          // If it's a fixed/sticky floating navbar, make sure it stays on top of page content
          if (style.position === 'fixed' || style.position === 'sticky' || idStr === 'globalnav') {
            el.style.zIndex = '9999';
          }
          // Fallback: if a <nav> had its inline <svg> paths stripped by a proxy and hides its .globalnav-link-text via clip, unclip the text so links remain visible
          el.querySelectorAll('svg').forEach((svg) => {
            if (svg.children.length === 0) {
              const link = svg.closest('a, button, li');
              const hiddenLabel = link?.querySelector('.globalnav-link-text, .ac-gn-link-text, .sr-only, .visuallyhidden') as HTMLElement | null;
              if (hiddenLabel) {
                hiddenLabel.style.cssText = 'position:static !important;clip:auto !important;clip-path:none !important;width:auto !important;height:auto !important;overflow:visible !important;display:inline-flex !important;align-items:center !important;font-size:12px !important;color:inherit !important;';
                svg.style.display = 'none';
              }
            }
          });
          return;
        }

        // 3. Only hide genuinely empty fixed/sticky overlay/spacer bars (never hide elements with links, buttons, images, inputs, or text)
        if (style.position === 'fixed' || style.position === 'sticky') {
          const hasInteractiveOrMedia =
            el.querySelector('a, button, img, svg, input, nav, ul') !== null;
          const hasText = (el.innerText || '').trim().length > 0;
          if (!hasInteractiveOrMedia && !hasText) {
            el.style.display = 'none';
          }
        }
      });

      // Inject editor interaction styles inside the iframe
      let styleEl = doc.getElementById('vds-editor-style') as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = doc.createElement('style');
        styleEl.id = 'vds-editor-style';
        doc.head.appendChild(styleEl);
      }

      if (readOnly) {
        styleEl.textContent = `
          [data-vds-selected], [data-vds-hovered] { outline: none !important; }
        `;
        return;
      }

      styleEl.textContent = `
        [data-vds-hovered="true"]:not([data-vds-selected="true"]) {
          outline: 2px dashed rgba(99, 102, 241, 0.75) !important;
          outline-offset: 2px !important;
          cursor: grab !important;
        }
        [data-vds-selected="true"] {
          outline: 2px solid #8b5cf6 !important;
          outline-offset: 2px !important;
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.22) !important;
          cursor: move !important;
        }
        [data-vds-group][data-vds-selected="true"] {
          outline: 2px solid #6366f1 !important;
          outline-offset: 2px !important;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.25) !important;
          cursor: move !important;
        }
        [data-vds-locked="true"][data-vds-selected="true"] {
          outline: 2px solid #f59e0b !important;
          cursor: not-allowed !important;
        }
        [contenteditable="true"] {
          outline: 2px solid #10b981 !important;
          background: rgba(255,255,255,0.92) !important;
          color: #0f172a !important;
          cursor: text !important;
        }
      `;

      let hoveredEl: HTMLElement | null = null;

      // Guard against selecting/dragging the entire page root or giant page-wide layout wrappers!
      const isPageLevelWrapper = (el: HTMLElement): boolean => {
        const tag = el.tagName.toLowerCase();
        if (
          tag === 'html' ||
          tag === 'body' ||
          tag === 'head' ||
          tag === 'style' ||
          tag === 'script' ||
          tag === 'main'
        ) {
          return true;
        }
        if (el.parentElement === doc.body && doc.body.children.length <= 3) {
          return true;
        }
        const rect = el.getBoundingClientRect();
        const viewW = win.innerWidth || 1200;
        const viewH = win.innerHeight || 800;
        if (rect.width >= viewW * 0.92 && rect.height >= viewH * 0.75) {
          return true;
        }
        return false;
      };

      const isValidTarget = (target: EventTarget | null): target is HTMLElement => {
        if (!target || typeof (target as HTMLElement).tagName !== 'string') return false;
        const el = target as HTMLElement;
        if (isPageLevelWrapper(el)) return false;
        return true;
      };

      const setSelectionList = (list: HTMLElement[], primary?: HTMLElement | null) => {
        doc.querySelectorAll('[data-vds-selected]').forEach((node) => node.removeAttribute('data-vds-selected'));
        const unique = Array.from(new Set(list.filter((item) => item && doc.contains(item))));
        unique.forEach((item) => item.setAttribute('data-vds-selected', 'true'));
        selectedElsRef.current = unique;
        setSelectedEls(unique);
        const mainEl = primary && unique.includes(primary) ? primary : unique[unique.length - 1] || null;
        selectedElRef.current = mainEl;
        setSelectedEl(mainEl);
        refreshSelectedInfo(mainEl);
      };

      const resolveActionableTarget = (rawEl: HTMLElement): HTMLElement => {
        // 1. If rawEl or any of its ancestors is part of a group, resolve to the grouped element!
        const groupedAncestor = rawEl.closest('[data-vds-group]') as HTMLElement | null;
        if (groupedAncestor && !isPageLevelWrapper(groupedAncestor)) {
          return groupedAncestor;
        }
        // 2. If rawEl is inside an already-selected element in a multi-selection, resolve to that selected ancestor!
        for (const selItem of selectedElsRef.current) {
          if (selItem !== rawEl && selItem.contains(rawEl)) {
            return selItem;
          }
        }
        // 3. If rawEl is an inline SVG child (<path>, <circle>, <g>, <svg>) or a tiny inner <span> inside a button/link,
        //    promote to the interactive button/link or parent if the child is non-block
        const tag = rawEl.tagName.toLowerCase();
        if (tag === 'path' || tag === 'svg' || tag === 'g' || tag === 'circle' || tag === 'rect' || tag === 'polygon' || tag === 'use') {
          const interactive = rawEl.closest('a, button, [role="button"], li') as HTMLElement | null;
          if (interactive && !isPageLevelWrapper(interactive)) {
            return interactive;
          }
        }
        return rawEl;
      };

      const getElementsWithGroupExpansion = (el: HTMLElement): HTMLElement[] => {
        const groupedEl = (el.closest('[data-vds-group]') as HTMLElement | null) || el;
        const groupId = groupedEl.getAttribute('data-vds-group');
        if (groupId) {
          const members = Array.from(
            doc.querySelectorAll(`[data-vds-group="${groupId}"]`)
          ) as HTMLElement[];
          if (members.length > 0) return members;
        }
        return [el];
      };

      const selectDomElement = (el: HTMLElement, isMultiToggle = false) => {
        const targetMembers = getElementsWithGroupExpansion(el);

        if (isMultiToggle) {
          const current = [...selectedElsRef.current];
          const alreadySelected = current.includes(el);
          if (alreadySelected) {
            const next = current.filter((item) => !targetMembers.includes(item));
            setSelectionList(next);
          } else {
            const next = [...current, ...targetMembers];
            setSelectionList(next, el);
          }
          return;
        }

        // If user clicks an element that is ALREADY part of a multi-selection (without Ctrl), keep the multi-selection so they can drag all selected items together!
        if (selectedElsRef.current.length > 1 && selectedElsRef.current.includes(el)) {
          selectedElRef.current = el;
          setSelectedEl(el);
          refreshSelectedInfo(el);
          return;
        }

        setSelectionList(targetMembers, el);
      };

      const onMouseOver = (e: MouseEvent) => {
        if (!isValidTarget(e.target)) return;
        e.stopPropagation();
        if (hoveredEl && hoveredEl !== e.target) {
          hoveredEl.removeAttribute('data-vds-hovered');
        }
        hoveredEl = e.target;
        hoveredEl.setAttribute('data-vds-hovered', 'true');
      };

      const onMouseOut = (e: MouseEvent) => {
        if (hoveredEl && e.target === hoveredEl) {
          hoveredEl.removeAttribute('data-vds-hovered');
          hoveredEl = null;
        }
      };

      // Prevent navigation when clicking links inside the editor
      const onClick = (e: MouseEvent) => {
        const anchor = (e.target as HTMLElement)?.closest?.('a');
        if (anchor) {
          e.preventDefault();
        }
      };

      // Right-click (Context Menu) — Canva-style popup right at cursor!
      const onContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        let targetEl: HTMLElement | null = null;
        if (isValidTarget(e.target)) {
          targetEl = resolveActionableTarget(e.target);
          if (!selectedElsRef.current.includes(targetEl)) {
            selectDomElement(targetEl, false);
          } else {
            selectedElRef.current = targetEl;
            setSelectedEl(targetEl);
            refreshSelectedInfo(targetEl);
          }
        } else if (selectedElRef.current) {
          targetEl = selectedElRef.current;
        }

        if (!targetEl) return;

        const panX = zoomScrollRef.current?.scrollLeft || 0;
        const panY = zoomScrollRef.current?.scrollTop || 0;
        const containerRect = containerRef.current?.getBoundingClientRect();
        const maxW = containerRect?.width || 900;
        const maxH = containerRect?.height || 700;

        const curFit =
          useCanvasStore.getState().deviceView === 'desktop' &&
          (zoomScrollRef.current?.clientWidth || 1280) < 1280
            ? (zoomScrollRef.current?.clientWidth || 1280) / 1280
            : 1;
        const curScale = (useCanvasStore.getState().zoomLevel / 100) * curFit;

        // Convert iframe coordinates to outer camera viewport coordinates
        const rawX = e.clientX * curScale - panX;
        const rawY = e.clientY * curScale - panY;

        // Clamp so popup stays inside the canvas viewport
        const menuX = Math.min(Math.max(12, rawX), Math.max(20, maxW - 280));
        const menuY = Math.min(Math.max(12, rawY), Math.max(20, maxH - 380));

        setContextMenu({ x: menuX, y: menuY, subMenu: null });
      };

      // Double-click any text element to edit its text directly inline
      const onDoubleClick = (e: MouseEvent) => {
        if (!isValidTarget(e.target)) return;
        e.preventDefault();
        e.stopPropagation();
        setContextMenu(null);
        const el = e.target;
        if (el.getAttribute('data-vds-locked') === 'true') return;
        el.contentEditable = 'true';
        el.focus();

        const onBlur = () => {
          el.removeAttribute('contenteditable');
          el.removeEventListener('blur', onBlur);
          refreshSelectedInfo(el);
          commitDomChanges();
        };
        useProjectStore.getState().pushHistory();
        el.addEventListener('blur', onBlur);
      };

      // MouseDown: select element (or Ctrl+click multi-select) AND allow immediate Canva-style uniform dragging
      const onMouseDown = (e: MouseEvent) => {
        // Close right-click context menu on left click
        if (e.button === 0) {
          setContextMenu(null);
        }
        if (e.button !== 0) return;

        if (!isValidTarget(e.target)) {
          doc.querySelectorAll('[data-vds-selected]').forEach((el) => el.removeAttribute('data-vds-selected'));
          selectedElRef.current = null;
          selectedElsRef.current = [];
          setSelectedEl(null);
          setSelectedEls([]);
          setSelectedInfo(null);
          return;
        }

        const rawTarget = e.target;
        if (rawTarget.isContentEditable) return;

        const el = resolveActionableTarget(rawTarget);

        e.stopPropagation();
        if (el.tagName.toLowerCase() === 'img' || el.closest('a') || rawTarget.tagName.toLowerCase() === 'img' || rawTarget.closest('a')) {
          e.preventDefault();
        }

        // Ctrl + Click (or Cmd + Click): toggle this element (or its group) in the multi-selection
        if (e.ctrlKey || e.metaKey) {
          selectDomElement(el, true);
          return;
        }

        selectDomElement(el, false);

        // If element is locked, select it so user can unlock it via right-click, but don't drag it
        if (el.getAttribute('data-vds-locked') === 'true') {
          return;
        }

        // All elements that should move together in uniform (either a multi-selection or a grouped set)
        const groupMembers = getElementsWithGroupExpansion(el);
        const dragTargets =
          selectedElsRef.current.length > 1
            ? [...selectedElsRef.current]
            : groupMembers.length > 1
            ? groupMembers
            : [el];

        // Filter out any locked elements or elements nested inside another selected element
        const rootDragTargets = dragTargets.filter(
          (item) =>
            item.getAttribute('data-vds-locked') !== 'true' &&
            !dragTargets.some((other) => other !== item && other.contains(item))
        );
        if (rootDragTargets.length === 0) return;

        const initialOffsets = rootDragTargets.map((item) => {
          const itemComp = win.getComputedStyle(item);
          return {
            el: item,
            origX: parseFloat(item.getAttribute('data-vds-x') || '0') || 0,
            origY: parseFloat(item.getAttribute('data-vds-y') || '0') || 0,
            wasInline: itemComp.display === 'inline',
            wasStatic: itemComp.position === 'static',
          };
        });

        const startClientX = e.clientX;
        const startClientY = e.clientY;
        const origX = parseFloat(el.getAttribute('data-vds-x') || '0') || 0;
        const origY = parseFloat(el.getAttribute('data-vds-y') || '0') || 0;

        // Compute union bounding rect of all dragged items for magnetic snapping
        let minL = Infinity;
        let minT = Infinity;
        let maxR = -Infinity;
        let maxB = -Infinity;
        rootDragTargets.forEach((item) => {
          const ir = item.getBoundingClientRect();
          minL = Math.min(minL, ir.left);
          minT = Math.min(minT, ir.top);
          maxR = Math.max(maxR, ir.right);
          maxB = Math.max(maxB, ir.bottom);
        });
        const startRect = {
          left: minL,
          top: minT,
          right: maxR,
          bottom: maxB,
          width: Math.max(1, maxR - minL),
          height: Math.max(1, maxB - minT),
        };
        let moved = false;

        // Collect Canva-style smart snap targets (screen center, parent box center/edges, sibling boxes, and nearby elements)
        const viewW = win.innerWidth || 1200;
        const viewH = win.innerHeight || 800;

        interface SnapCandidate {
          pos: number;
          spanStart: number;
          spanEnd: number;
          label: string;
        }
        const vTargets: SnapCandidate[] = [
          { pos: viewW / 2, spanStart: 0, spanEnd: viewH, label: 'Screen Center' },
        ];
        const hTargets: SnapCandidate[] = [
          { pos: viewH / 2, spanStart: 0, spanEnd: viewW, label: 'Screen Middle' },
        ];

        const parentEl = el.parentElement;
        if (parentEl && parentEl !== doc.body && parentEl !== doc.documentElement) {
          const pRect = parentEl.getBoundingClientRect();
          if (pRect.width > 20 && pRect.height > 20) {
            vTargets.push(
              { pos: pRect.left + pRect.width / 2, spanStart: pRect.top, spanEnd: pRect.bottom, label: 'Container Center' },
              { pos: pRect.left, spanStart: pRect.top, spanEnd: pRect.bottom, label: 'Container Left' },
              { pos: pRect.right, spanStart: pRect.top, spanEnd: pRect.bottom, label: 'Container Right' }
            );
            hTargets.push(
              { pos: pRect.top + pRect.height / 2, spanStart: pRect.left, spanEnd: pRect.right, label: 'Container Middle' },
              { pos: pRect.top, spanStart: pRect.left, spanEnd: pRect.right, label: 'Container Top' },
              { pos: pRect.bottom, spanStart: pRect.left, spanEnd: pRect.right, label: 'Container Bottom' }
            );
          }
        }

        // Gather visible sibling & nearby boxes on screen
        const candidatePool = new Set<HTMLElement>();
        if (parentEl) {
          Array.from(parentEl.children).forEach((c) => {
            if (c !== el && (c as HTMLElement).tagName) candidatePool.add(c as HTMLElement);
          });
        }
        if (parentEl?.parentElement) {
          Array.from(parentEl.parentElement.children).forEach((c) => {
            if (c !== el && c !== parentEl && (c as HTMLElement).tagName) candidatePool.add(c as HTMLElement);
          });
        }

        candidatePool.forEach((other) => {
          if (other.contains(el) || el.contains(other)) return;
          const r = other.getBoundingClientRect();
          if (r.width < 12 || r.height < 12 || r.bottom < 0 || r.top > viewH) return;

          vTargets.push(
            { pos: r.left, spanStart: r.top, spanEnd: r.bottom, label: 'Align Left' },
            { pos: r.left + r.width / 2, spanStart: r.top, spanEnd: r.bottom, label: 'Align Center' },
            { pos: r.right, spanStart: r.top, spanEnd: r.bottom, label: 'Align Right' }
          );
          hTargets.push(
            { pos: r.top, spanStart: r.left, spanEnd: r.right, label: 'Align Top' },
            { pos: r.top + r.height / 2, spanStart: r.left, spanEnd: r.right, label: 'Align Middle' },
            { pos: r.bottom, spanStart: r.left, spanEnd: r.right, label: 'Align Bottom' }
          );
        });

        const SNAP_THRESHOLD = 9; // Magnetic snap radius in px (unless holding Alt)

        const onMouseMove = (moveEv: MouseEvent) => {
          const dx = moveEv.clientX - startClientX;
          const dy = moveEv.clientY - startClientY;
          if (!moved && Math.hypot(dx, dy) < 3) return;
          if (!moved) {
            moved = true;
            useProjectStore.getState().pushHistory();
          }

          const isFreeform = moveEv.altKey;
          let finalDx = dx;
          let finalDy = dy;
          const activeGuides: SnapGuide[] = [];
          let snapXLabel: string | undefined;
          let snapYLabel: string | undefined;

          if (!isFreeform) {
            const rawLeft = startRect.left + dx;
            const rawCenterX = rawLeft + startRect.width / 2;
            const rawRight = rawLeft + startRect.width;

            const rawTop = startRect.top + dy;
            const rawCenterY = rawTop + startRect.height / 2;
            const rawBottom = rawTop + startRect.height;

            // Find closest horizontal/X magnetic snap (Left edge, Center X, Right edge)
            let bestXDiff = SNAP_THRESHOLD + 1;
            let bestXAdjust = 0;
            let bestVGuide: SnapGuide | null = null;

            for (const t of vTargets) {
              const points = [
                { val: rawCenterX, name: t.label },
                { val: rawLeft, name: t.label },
                { val: rawRight, name: t.label },
              ];
              for (const pt of points) {
                const diff = Math.abs(pt.val - t.pos);
                if (diff < bestXDiff) {
                  bestXDiff = diff;
                  bestXAdjust = t.pos - pt.val;
                  snapXLabel = pt.name;
                  bestVGuide = {
                    axis: 'vertical',
                    pos: Math.round(t.pos),
                    start: Math.min(t.spanStart, rawTop) - 20,
                    end: Math.max(t.spanEnd, rawBottom) + 20,
                    label: t.label,
                  };
                }
              }
            }

            if (bestVGuide) {
              finalDx += bestXAdjust;
              activeGuides.push(bestVGuide);
            }

            // Find closest vertical/Y magnetic snap (Top edge, Center Y, Bottom edge)
            let bestYDiff = SNAP_THRESHOLD + 1;
            let bestYAdjust = 0;
            let bestHGuide: SnapGuide | null = null;

            for (const t of hTargets) {
              const points = [
                { val: rawCenterY, name: t.label },
                { val: rawTop, name: t.label },
                { val: rawBottom, name: t.label },
              ];
              for (const pt of points) {
                const diff = Math.abs(pt.val - t.pos);
                if (diff < bestYDiff) {
                  bestYDiff = diff;
                  bestYAdjust = t.pos - pt.val;
                  snapYLabel = pt.name;
                  bestHGuide = {
                    axis: 'horizontal',
                    pos: Math.round(t.pos),
                    start: Math.min(t.spanStart, rawLeft) - 20,
                    end: Math.max(t.spanEnd, rawRight) + 20,
                    label: t.label,
                  };
                }
              }
            }

            if (bestHGuide) {
              finalDy += bestYAdjust;
              activeGuides.push(bestHGuide);
            }
          }

          const nextX = Math.round(origX + finalDx);
          const nextY = Math.round(origY + finalDy);

          // Move all selected / grouped items together in uniform while keeping their HTML structure 100% separate!
          initialOffsets.forEach(({ el: item, origX: itemOrigX, origY: itemOrigY, wasInline, wasStatic }) => {
            const itemNextX = Math.round(itemOrigX + finalDx);
            const itemNextY = Math.round(itemOrigY + finalDy);
            item.setAttribute('data-vds-x', String(itemNextX));
            item.setAttribute('data-vds-y', String(itemNextY));
            item.style.setProperty('transform', `translate3d(${itemNextX}px, ${itemNextY}px, 0)`, 'important');
            if (wasInline) {
              item.style.setProperty('display', 'inline-block', 'important');
            }
            if (wasStatic) {
              item.style.position = 'relative';
            }
            if (!item.style.zIndex) {
              item.style.zIndex = '50';
            }
          });

          setSnapGuides(activeGuides);
          setLiveDragCoords({
            x: nextX,
            y: nextY,
            freeform: isFreeform,
            snapX: snapXLabel,
            snapY: snapYLabel,
          });
          refreshSelectedInfo(el);
        };

        const onMouseUp = () => {
          doc.removeEventListener('mousemove', onMouseMove);
          doc.removeEventListener('mouseup', onMouseUp);
          setLiveDragCoords(null);
          setSnapGuides([]);
          if (moved) {
            commitDomChanges();
          }
        };

        doc.addEventListener('mousemove', onMouseMove);
        doc.addEventListener('mouseup', onMouseUp);
      };

      const onKeyDown = (e: KeyboardEvent) => {
        const current = selectedElRef.current;
        if (current?.isContentEditable) return;

        // Undo (Ctrl+Z) / Redo (Ctrl+Y or Ctrl+Shift+Z) inside the iframe
        if (e.ctrlKey || e.metaKey) {
          if (e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
              useProjectStore.getState().redo();
            } else {
              useProjectStore.getState().undo();
            }
            return;
          } else if (e.key.toLowerCase() === 'y') {
            e.preventDefault();
            useProjectStore.getState().redo();
            return;
          }
        }

        // Ctrl + Plus / Minus / 0 to Zoom In / Out / Reset
        if (e.ctrlKey || e.metaKey) {
          if (e.key === '=' || e.key === '+') {
            e.preventDefault();
            const z = useCanvasStore.getState().zoomLevel;
            useCanvasStore.getState().setZoomLevel(Math.min(300, z + 15));
            return;
          } else if (e.key === '-') {
            e.preventDefault();
            const z = useCanvasStore.getState().zoomLevel;
            useCanvasStore.getState().setZoomLevel(Math.max(40, z - 15));
            return;
          } else if (e.key === '0') {
            e.preventDefault();
            useCanvasStore.getState().setZoomLevel(100);
            return;
          }
        }

        if (!current) return;

        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          useProjectStore.getState().pushHistory();
          const targets = selectedElsRef.current.length > 0 ? [...selectedElsRef.current] : [current];
          targets.forEach((item) => item.remove());
          selectedElRef.current = null;
          selectedElsRef.current = [];
          setSelectedEl(null);
          setSelectedEls([]);
          setSelectedInfo(null);
          setContextMenu(null);
          commitDomChanges();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
          e.preventDefault();
          if (e.shiftKey) {
            handleUngroupSelected();
          } else {
            handleGroupSelected();
          }
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
          e.preventDefault();
          if (current.parentElement) {
            useProjectStore.getState().pushHistory();
            const clone = current.cloneNode(true) as HTMLElement;
            clone.removeAttribute('data-vds-selected');
            current.parentElement.insertBefore(clone, current.nextSibling);
            commitDomChanges();
          }
        } else if (e.key === 'Escape') {
          setContextMenu(null);
        }
      };

      // Canva-style Camera Wheel Navigation:
      // - Ctrl + Wheel = Camera Zoom In / Out (never changes page layout!)
      // - Shift + Wheel = Horizontal Camera Pan (when zoomed in)
      // - Regular Wheel = Vertical Scroll
      const onWheel = (e: WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const currentZoom = useCanvasStore.getState().zoomLevel;
          const delta = e.deltaY < 0 ? 10 : -10;
          const nextZoom = Math.min(300, Math.max(40, currentZoom + delta));
          useCanvasStore.getState().setZoomLevel(nextZoom);
          return;
        }
        if (e.shiftKey) {
          e.preventDefault();
          const scrollDelta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
          if (zoomScrollRef.current && useCanvasStore.getState().zoomLevel > 100) {
            zoomScrollRef.current.scrollLeft += scrollDelta;
          } else {
            win.scrollBy({ left: scrollDelta, behavior: 'auto' });
          }
          return;
        }
      };

      const onScrollOrResize = () => {
        const current = selectedElRef.current;
        if (current && doc.contains(current)) {
          refreshSelectedInfo(current);
        }
      };

      doc.addEventListener('mouseover', onMouseOver);
      doc.addEventListener('mouseout', onMouseOut);
      doc.addEventListener('click', onClick, true);
      doc.addEventListener('contextmenu', onContextMenu);
      doc.addEventListener('dblclick', onDoubleClick);
      doc.addEventListener('mousedown', onMouseDown);
      doc.addEventListener('keydown', onKeyDown);
      doc.addEventListener('wheel', onWheel, { passive: false });
      win.addEventListener('scroll', onScrollOrResize, true);
      win.addEventListener('resize', onScrollOrResize);
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [readOnly]);

  // Select parent container (useful when clicking an image/span inside a card and wanting to move the whole card)
  const handleSelectParent = () => {
    const doc = iframeRef.current?.contentDocument;
    const win = iframeRef.current?.contentWindow;
    if (!selectedEl || !selectedEl.parentElement || !doc || !win) return;
    const parent = selectedEl.parentElement;
    const tag = parent.tagName.toLowerCase();
    if (tag === 'body' || tag === 'html' || tag === 'main') return;

    doc.querySelectorAll('[data-vds-selected]').forEach((n) => n.removeAttribute('data-vds-selected'));
    parent.setAttribute('data-vds-selected', 'true');
    selectedElRef.current = parent;
    selectedElsRef.current = [parent];
    setSelectedEl(parent);
    setSelectedEls([parent]);
    refreshSelectedInfo(parent);
  };

  // Trigger inline text editing programmatically (from Right-Click menu)
  const handleStartInlineEdit = () => {
    if (!selectedEl) return;
    setContextMenu(null);
    selectedEl.contentEditable = 'true';
    selectedEl.focus();
    const onBlur = () => {
      selectedEl.removeAttribute('contenteditable');
      selectedEl.removeEventListener('blur', onBlur);
      refreshSelectedInfo(selectedEl);
      commitDomChanges();
    };
    useProjectStore.getState().pushHistory();
    selectedEl.addEventListener('blur', onBlur);
  };

  // Handle corner resize drag from the overlay handle
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedEl || selectedInfo?.locked) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const rect = selectedEl.getBoundingClientRect();
    const startW = rect.width;
    const startH = rect.height;

    let hasPushedResizeHistory = false;

    const onMouseMove = (moveEv: MouseEvent) => {
      if (!hasPushedResizeHistory) {
        hasPushedResizeHistory = true;
        useProjectStore.getState().pushHistory();
      }
      const curScale = useCanvasStore.getState().zoomLevel / 100;
      const nextW = Math.max(24, Math.round(startW + (moveEv.clientX - startX) / curScale));
      const nextH = Math.max(20, Math.round(startH + (moveEv.clientY - startY) / curScale));
      selectedEl.style.width = `${nextW}px`;
      selectedEl.style.height = `${nextH}px`;
      setLiveResizeDims({ w: nextW, h: nextH });
      refreshSelectedInfo(selectedEl);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setLiveResizeDims(null);
      if (hasPushedResizeHistory) {
        commitDomChanges();
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Actions on the selected DOM element(s) / group
  const handleGroupSelected = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || selectedElsRef.current.length < 2) return;
    useProjectStore.getState().pushHistory();

    const newGroupId = `grp-${Date.now().toString(36)}`;
    selectedElsRef.current.forEach((item) => {
      if (doc.contains(item)) {
        item.setAttribute('data-vds-group', newGroupId);
      }
    });
    if (selectedElRef.current) {
      refreshSelectedInfo(selectedElRef.current);
    }
    setContextMenu(null);
    commitDomChanges();
  };

  const handleUngroupSelected = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    useProjectStore.getState().pushHistory();

    const activeGroupId = selectedElRef.current?.getAttribute('data-vds-group');
    if (activeGroupId) {
      doc.querySelectorAll(`[data-vds-group="${activeGroupId}"]`).forEach((node) => {
        node.removeAttribute('data-vds-group');
      });
    }
    selectedElsRef.current.forEach((item) => {
      item.removeAttribute('data-vds-group');
    });

    if (selectedElRef.current) {
      refreshSelectedInfo(selectedElRef.current);
    }
    setContextMenu(null);
    commitDomChanges();
  };

  const handleDuplicate = () => {
    if (!selectedEl || !selectedEl.parentElement) return;
    useProjectStore.getState().pushHistory();
    const targets = selectedElsRef.current.length > 0 ? [...selectedElsRef.current] : [selectedEl];
    const newGroupId = targets.length > 1 && targets[0].getAttribute('data-vds-group')
      ? `grp-${Date.now().toString(36)}`
      : null;

    targets.forEach((item) => {
      if (!item.parentElement) return;
      const clone = item.cloneNode(true) as HTMLElement;
      clone.removeAttribute('data-vds-selected');
      if (newGroupId) {
        clone.setAttribute('data-vds-group', newGroupId);
      }
      item.parentElement.insertBefore(clone, item.nextSibling);
    });
    setContextMenu(null);
    commitDomChanges();
  };

  const handleDelete = () => {
    if (!selectedEl) return;
    useProjectStore.getState().pushHistory();
    const targets = selectedElsRef.current.length > 0 ? [...selectedElsRef.current] : [selectedEl];
    targets.forEach((item) => item.remove());
    selectedElRef.current = null;
    selectedElsRef.current = [];
    setSelectedEl(null);
    setSelectedEls([]);
    setSelectedInfo(null);
    setContextMenu(null);
    commitDomChanges();
  };

  const handleResetPosition = () => {
    if (!selectedEl) return;
    useProjectStore.getState().pushHistory();
    const targets = selectedElsRef.current.length > 0 ? [...selectedElsRef.current] : [selectedEl];
    targets.forEach((item) => {
      item.removeAttribute('data-vds-x');
      item.removeAttribute('data-vds-y');
      item.style.removeProperty('transform');
    });
    refreshSelectedInfo(selectedEl);
    setContextMenu(null);
    commitDomChanges();
  };

  const handleLayerOrder = (action: 'front' | 'forward' | 'backward' | 'back') => {
    if (!selectedEl) return;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    useProjectStore.getState().pushHistory();

    if (win.getComputedStyle(selectedEl).position === 'static') {
      selectedEl.style.position = 'relative';
    }
    const currentZ = parseInt(selectedEl.style.zIndex || '10', 10) || 10;
    const nextZ =
      action === 'front'
        ? 999
        : action === 'forward'
        ? currentZ + 10
        : action === 'backward'
        ? Math.max(0, currentZ - 10)
        : 0;

    selectedEl.style.zIndex = String(nextZ);
    refreshSelectedInfo(selectedEl);
    setContextMenu(null);
    commitDomChanges();
  };

  const handleToggleLock = () => {
    if (!selectedEl) return;
    const isLocked = selectedEl.getAttribute('data-vds-locked') === 'true';
    if (isLocked) {
      selectedEl.removeAttribute('data-vds-locked');
    } else {
      selectedEl.setAttribute('data-vds-locked', 'true');
    }
    refreshSelectedInfo(selectedEl);
    setContextMenu(null);
    commitDomChanges();
  };

  const handleSetAlign = (align: 'left' | 'center' | 'right') => {
    if (!selectedEl) return;
    useProjectStore.getState().pushHistory();
    selectedEl.style.textAlign = align;
    refreshSelectedInfo(selectedEl);
    commitDomChanges();
  };

  const handleSetWrap = (mode: 'none' | 'left' | 'right') => {
    if (!selectedEl) return;
    useProjectStore.getState().pushHistory();
    if (mode === 'left') {
      selectedEl.style.float = 'left';
      selectedEl.style.margin = '0.5rem 1.25rem 1rem 0';
    } else if (mode === 'right') {
      selectedEl.style.float = 'right';
      selectedEl.style.margin = '0.5rem 0 1rem 1.25rem';
    } else {
      selectedEl.style.float = 'none';
      selectedEl.style.margin = '';
    }
    refreshSelectedInfo(selectedEl);
    setContextMenu(null);
    commitDomChanges();
  };

  const handleInsertElement = (type: 'heading' | 'text' | 'button' | 'image' | 'icon') => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    useProjectStore.getState().pushHistory();

    let newEl: HTMLElement;
    if (type === 'heading') {
      newEl = doc.createElement('h2');
      newEl.innerText = 'New Heading';
      newEl.style.cssText = 'font-size:28px;font-weight:700;margin:12px 0;';
    } else if (type === 'text') {
      newEl = doc.createElement('p');
      newEl.innerText = 'Double-click to edit this paragraph text.';
      newEl.style.cssText = 'font-size:16px;line-height:1.6;margin:8px 0;';
    } else if (type === 'button') {
      newEl = doc.createElement('button');
      newEl.innerText = 'Click Me';
      newEl.style.cssText = 'padding:10px 20px;background:#6366f1;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;margin:8px 0;';
    } else if (type === 'image') {
      const img = doc.createElement('img');
      img.src = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop&q=80';
      img.style.cssText = 'max-width:320px;border-radius:12px;display:block;margin:10px 0;';
      newEl = img;
    } else {
      newEl = doc.createElement('span');
      newEl.innerText = '✨';
      newEl.style.cssText = 'font-size:32px;display:inline-block;margin:8px;';
    }

    if (selectedEl && selectedEl.parentElement) {
      selectedEl.parentElement.insertBefore(newEl, selectedEl.nextSibling);
    } else {
      doc.body.prepend(newEl);
    }

    doc.querySelectorAll('[data-vds-selected]').forEach((n) => n.removeAttribute('data-vds-selected'));
    newEl.setAttribute('data-vds-selected', 'true');
    selectedElRef.current = newEl;
    setSelectedEl(newEl);
    refreshSelectedInfo(newEl);
    setShowAddMenu(false);
    setContextMenu(null);
    commitDomChanges();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col bg-white overflow-hidden"
      onClick={() => {
        setContextMenu(null);
        setShowAddMenu(false);
        setShowIconPicker(false);
      }}
    >
      {/* Main Cloned Webpage Iframe + Camera Zoom & Pan Viewport + Canva Right-Click Context Menu */}
      <div className="relative flex-1 w-full h-full overflow-hidden bg-slate-950">
        <div
          ref={zoomScrollRef}
          className="w-full h-full overflow-auto"
        >
          <div
            style={{
              width: `${Math.round(logicalWidth * effectiveScale)}px`,
              height: `${Math.round(logicalHeight * effectiveScale)}px`,
              margin: '0 auto',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: `${logicalWidth}px`,
                height: `${logicalHeight}px`,
                transform: `scale(${effectiveScale})`,
                transformOrigin: '0 0',
              }}
              className="relative bg-white shadow-2xl"
            >
              <iframe
                ref={iframeRef}
                title="Cloned Webpage Sandbox"
                className="w-full h-full border-0 block"
              />

              {/* Unified Group / Multi-Selection Bounding Box */}
              {!readOnly && selectedInfo && selectedInfo.multiCount > 1 && (
                <div
                  style={{
                    position: 'absolute',
                    top: `${selectedInfo.rect.top - 4}px`,
                    left: `${selectedInfo.rect.left - 4}px`,
                    width: `${selectedInfo.rect.width + 8}px`,
                    height: `${selectedInfo.rect.height + 8}px`,
                  }}
                  className="border-2 border-dashed border-indigo-500 rounded-lg pointer-events-none z-30 bg-indigo-500/5"
                >
                  <span className="absolute -top-5 left-0 bg-indigo-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow whitespace-nowrap">
                    {selectedInfo.groupId
                      ? `Grouped (${selectedInfo.multiCount} items)`
                      : `${selectedInfo.multiCount} items selected`}
                  </span>
                </div>
              )}

              {/* Corner Resize Handle positioned over the selected element in the iframe */}
              {!readOnly && selectedInfo && !selectedInfo.locked && (
                <div
                  onMouseDown={handleResizeStart}
                  style={{
                    position: 'absolute',
                    top: `${selectedInfo.rect.top + selectedInfo.rect.height - 6}px`,
                    left: `${selectedInfo.rect.left + selectedInfo.rect.width - 6}px`,
                  }}
                  className="w-4 h-4 bg-purple-600 border-2 border-white rounded-full cursor-nwse-resize shadow-lg z-40 hover:scale-125 transition"
                  title="Drag corner to resize element"
                />
              )}

              {/* Canva-style Magenta Alignment & Snap Guide Lines */}
              {snapGuides.map((g, idx) =>
                g.axis === 'vertical' ? (
                  <div
                    key={`v-${idx}`}
                    style={{
                      position: 'absolute',
                      left: `${g.pos}px`,
                      top: `${Math.max(0, g.start)}px`,
                      height: `${Math.max(24, g.end - Math.max(0, g.start))}px`,
                    }}
                    className="w-0 border-l border-dashed border-fuchsia-500 shadow-[0_0_6px_#d946ef] z-40 pointer-events-none"
                  >
                    {g.label && (
                      <span className="absolute -top-5 -translate-x-1/2 bg-fuchsia-600 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                        {g.label}
                      </span>
                    )}
                  </div>
                ) : (
                  <div
                    key={`h-${idx}`}
                    style={{
                      position: 'absolute',
                      top: `${g.pos}px`,
                      left: `${Math.max(0, g.start)}px`,
                      width: `${Math.max(24, g.end - Math.max(0, g.start))}px`,
                    }}
                    className="h-0 border-t border-dashed border-fuchsia-500 shadow-[0_0_6px_#d946ef] z-40 pointer-events-none"
                  >
                    {g.label && (
                      <span className="absolute -top-4 left-2 bg-fuchsia-600 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                        {g.label}
                      </span>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* ── CANVA-STYLE RIGHT-CLICK CONTEXT MENU POPUP ──────────────────────── */}
        {!readOnly && contextMenu && selectedEl && selectedInfo && (
          <div
            style={{
              position: 'absolute',
              top: `${contextMenu.y}px`,
              left: `${contextMenu.x}px`,
            }}
            onClick={(e) => e.stopPropagation()}
            className="z-50 w-64 bg-slate-900/98 backdrop-blur-xl border border-slate-700/90 rounded-2xl shadow-2xl py-2 text-xs text-slate-200 select-none animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Header Pill + Quick Action Bar */}
            <div className="px-3 pb-2 mb-1.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-purple-600/30 border border-purple-500/40 text-purple-300 font-mono text-[10px] font-bold uppercase">
                  {selectedInfo.groupId
                    ? `GROUP (${selectedInfo.multiCount})`
                    : selectedInfo.multiCount > 1
                    ? `${selectedInfo.multiCount} SELECTED`
                    : `<${selectedInfo.tagName}>`}
                </span>
                <span className="text-[11px] text-slate-400">
                  {selectedInfo.width} × {selectedInfo.height}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDuplicate}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
                  title="Duplicate (Ctrl+D)"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleToggleLock}
                  className={`p-1.5 rounded-lg hover:bg-slate-800 transition ${
                    selectedInfo.locked ? 'text-amber-400' : 'text-slate-300 hover:text-white'
                  }`}
                  title={selectedInfo.locked ? 'Unlock Element' : 'Lock Element'}
                >
                  {selectedInfo.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition"
                  title="Delete (Del)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Group / Ungroup Actions (Keeps HTML separate while moving items together in uniform!) */}
            {selectedInfo.multiCount > 1 && (
              <button
                onClick={handleGroupSelected}
                className="w-full px-3 py-2 flex items-center justify-between bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-200 transition text-left font-semibold"
              >
                <span className="flex items-center gap-2.5">
                  <Group className="w-3.5 h-3.5 text-indigo-400" />
                  Group {selectedInfo.multiCount} Items Together
                </span>
                <span className="text-[10px] text-indigo-300/80">Ctrl+G</span>
              </button>
            )}

            {(selectedInfo.groupId || selectedEls.some((el) => el.getAttribute('data-vds-group'))) && (
              <button
                onClick={handleUngroupSelected}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-800/90 text-amber-300 transition text-left font-medium"
              >
                <span className="flex items-center gap-2.5">
                  <Ungroup className="w-3.5 h-3.5 text-amber-400" />
                  Ungroup Items
                </span>
                <span className="text-[10px] text-slate-500">Ctrl+Shift+G</span>
              </button>
            )}

            {(selectedInfo.multiCount > 1 || selectedInfo.groupId) && (
              <div className="my-1.5 border-t border-slate-800" />
            )}

            {/* Primary Actions */}
            <button
              onClick={handleStartInlineEdit}
              className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-800/90 transition text-left"
            >
              <span className="flex items-center gap-2.5 font-medium text-white">
                <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                Edit Text Inline
              </span>
              <span className="text-[10px] text-slate-500">Double-click</span>
            </button>

            <button
              onClick={handleDuplicate}
              className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-800/90 transition text-left"
            >
              <span className="flex items-center gap-2.5">
                <Copy className="w-3.5 h-3.5 text-indigo-400" />
                Duplicate
              </span>
              <span className="text-[10px] text-slate-500">Ctrl+D</span>
            </button>

            <button
              onClick={() => {
                handleSelectParent();
              }}
              className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-800/90 transition text-left"
            >
              <span className="flex items-center gap-2.5">
                <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                Select Parent Container
              </span>
              <span className="text-[10px] text-slate-500">Card / Box</span>
            </button>

            <div className="my-1.5 border-t border-slate-800" />

            {/* Submenu: Colors & Appearance */}
            <div className="relative">
              <button
                onClick={() =>
                  setContextMenu({
                    ...contextMenu,
                    subMenu: contextMenu.subMenu === 'style' ? null : 'style',
                  })
                }
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-800/90 transition text-left"
              >
                <span className="flex items-center gap-2.5">
                  <Palette className="w-3.5 h-3.5 text-pink-400" />
                  Colors & Style
                </span>
                <ChevronRight
                  className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                    contextMenu.subMenu === 'style' ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {contextMenu.subMenu === 'style' && (
                <div className="mx-2 my-1 p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Text Color</span>
                    <input
                      type="color"
                      value={selectedInfo.color}
                      onChange={(e) => {
                        selectedEl.style.color = e.target.value;
                        refreshSelectedInfo(selectedEl);
                        commitDomChanges();
                      }}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Background</span>
                    <input
                      type="color"
                      value={selectedInfo.backgroundColor}
                      onChange={(e) => {
                        selectedEl.style.backgroundColor = e.target.value;
                        refreshSelectedInfo(selectedEl);
                        commitDomChanges();
                      }}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Font Size</span>
                      <span>{selectedInfo.fontSize}</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="72"
                      value={parseInt(selectedInfo.fontSize, 10) || 16}
                      onChange={(e) => {
                        selectedEl.style.fontSize = `${e.target.value}px`;
                        refreshSelectedInfo(selectedEl);
                        commitDomChanges();
                      }}
                      className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Corner Rounding</span>
                      <span>{selectedInfo.borderRadius}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="48"
                      value={parseInt(selectedInfo.borderRadius, 10) || 0}
                      onChange={(e) => {
                        selectedEl.style.borderRadius = `${e.target.value}px`;
                        refreshSelectedInfo(selectedEl);
                        commitDomChanges();
                      }}
                      className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submenu: Layer Order (Bring to Front / Send to Back) */}
            <div className="relative">
              <button
                onClick={() =>
                  setContextMenu({
                    ...contextMenu,
                    subMenu: contextMenu.subMenu === 'layer' ? null : 'layer',
                  })
                }
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-800/90 transition text-left"
              >
                <span className="flex items-center gap-2.5">
                  <Layers className="w-3.5 h-3.5 text-sky-400" />
                  Layer Order
                </span>
                <ChevronRight
                  className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                    contextMenu.subMenu === 'layer' ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {contextMenu.subMenu === 'layer' && (
                <div className="mx-2 my-1 p-1.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1">
                  <button
                    onClick={() => handleLayerOrder('front')}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-slate-800 flex items-center gap-2 text-left"
                  >
                    <ArrowUpToLine className="w-3.5 h-3.5 text-sky-400" />
                    Bring to Front
                  </button>
                  <button
                    onClick={() => handleLayerOrder('forward')}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-slate-800 flex items-center gap-2 text-left"
                  >
                    <ArrowUp className="w-3.5 h-3.5 text-slate-400" />
                    Bring Forward
                  </button>
                  <button
                    onClick={() => handleLayerOrder('backward')}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-slate-800 flex items-center gap-2 text-left"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5 text-slate-400" />
                    Send Backward
                  </button>
                  <button
                    onClick={() => handleLayerOrder('back')}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-slate-800 flex items-center gap-2 text-left"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5 text-amber-400" />
                    Send to Back
                  </button>
                </div>
              )}
            </div>

            {/* Submenu: Align & Text Wrap */}
            <div className="relative">
              <button
                onClick={() =>
                  setContextMenu({
                    ...contextMenu,
                    subMenu: contextMenu.subMenu === 'align' ? null : 'align',
                  })
                }
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-800/90 transition text-left"
              >
                <span className="flex items-center gap-2.5">
                  <WrapText className="w-3.5 h-3.5 text-amber-400" />
                  Align & Wrap Text
                </span>
                <ChevronRight
                  className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                    contextMenu.subMenu === 'align' ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {contextMenu.subMenu === 'align' && (
                <div className="mx-2 my-1 p-2 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleSetAlign('left')}
                      className="flex-1 py-1.5 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center"
                      title="Align Left"
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleSetAlign('center')}
                      className="flex-1 py-1.5 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center"
                      title="Align Center"
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleSetAlign('right')}
                      className="flex-1 py-1.5 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center"
                      title="Align Right"
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={() => handleSetWrap('left')}
                      className="py-1 px-1.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px]"
                    >
                      Float Left
                    </button>
                    <button
                      onClick={() => handleSetWrap('right')}
                      className="py-1 px-1.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px]"
                    >
                      Float Right
                    </button>
                    <button
                      onClick={() => handleSetWrap('none')}
                      className="py-1 px-1.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px]"
                    >
                      Inline
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Image URL / Link URL inline inputs if applicable */}
            {selectedInfo.tagName === 'img' && (
              <div className="px-3 py-2 space-y-1">
                <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <ImageIcon className="w-3 h-3" /> Replace Image URL
                </span>
                <input
                  type="text"
                  value={selectedInfo.src || ''}
                  onChange={(e) => {
                    (selectedEl as HTMLImageElement).src = e.target.value;
                    refreshSelectedInfo(selectedEl);
                    commitDomChanges();
                  }}
                  placeholder="https://..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                />
              </div>
            )}

            {selectedInfo.tagName === 'a' && (
              <div className="px-3 py-2 space-y-1">
                <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <LinkIcon className="w-3 h-3" /> Link Destination URL
                </span>
                <input
                  type="text"
                  value={selectedInfo.href || ''}
                  onChange={(e) => {
                    (selectedEl as HTMLAnchorElement).href = e.target.value;
                    refreshSelectedInfo(selectedEl);
                    commitDomChanges();
                  }}
                  placeholder="https://..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                />
              </div>
            )}

            {/* Submenu: Change Icon / Emoji */}
            <div className="relative">
              <button
                onClick={() =>
                  setContextMenu({
                    ...contextMenu,
                    subMenu: contextMenu.subMenu === 'icon' ? null : 'icon',
                  })
                }
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-800/90 transition text-left"
              >
                <span className="flex items-center gap-2.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Replace with Icon / Emoji
                </span>
                <ChevronRight
                  className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                    contextMenu.subMenu === 'icon' ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {contextMenu.subMenu === 'icon' && (
                <div className="mx-2 my-1 p-2 rounded-xl bg-slate-950/90 border border-slate-800 grid grid-cols-7 gap-1">
                  {[
                    '✨', '⚡', '🔥', '🚀', '💎', '👑', '🎯',
                    '❤️', '⭐', '🌟', '💡', '🎉', '🏆', '🛡️',
                    '🔒', '🔑', '⚙️', '🛒', '🛍️', '🎁', '👗',
                    '👠', '👟', '👜', '👶', '🏠', '🚗', '📱',
                  ].map((ico) => (
                    <button
                      key={ico}
                      onClick={() => {
                        selectedEl.innerText = ico;
                        refreshSelectedInfo(selectedEl);
                        setContextMenu(null);
                        commitDomChanges();
                      }}
                      className="h-7 rounded hover:bg-slate-800 flex items-center justify-center text-base"
                    >
                      {ico}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Submenu: Insert New Element Below */}
            <div className="relative">
              <button
                onClick={() =>
                  setContextMenu({
                    ...contextMenu,
                    subMenu: contextMenu.subMenu === 'add' ? null : 'add',
                  })
                }
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-800/90 transition text-left"
              >
                <span className="flex items-center gap-2.5">
                  <Plus className="w-3.5 h-3.5 text-indigo-400" />
                  Add Element Here
                </span>
                <ChevronRight
                  className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                    contextMenu.subMenu === 'add' ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {contextMenu.subMenu === 'add' && (
                <div className="mx-2 my-1 p-1.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1">
                  {[
                    { type: 'heading' as const, label: 'Heading' },
                    { type: 'text' as const, label: 'Paragraph Text' },
                    { type: 'button' as const, label: 'Button' },
                    { type: 'image' as const, label: 'Image' },
                    { type: 'icon' as const, label: 'Icon / Emoji' },
                  ].map((item) => (
                    <button
                      key={item.type}
                      onClick={() => handleInsertElement(item.type)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-xs text-slate-200"
                    >
                      + {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="my-1.5 border-t border-slate-800" />

            <button
              onClick={handleResetPosition}
              className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-slate-800/90 text-amber-300 transition text-left"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Dragged Position
            </button>

            <button
              onClick={handleDelete}
              className="w-full px-3 py-2 flex items-center justify-between hover:bg-red-500/20 text-red-400 transition text-left"
            >
              <span className="flex items-center gap-2.5">
                <Trash2 className="w-3.5 h-3.5" />
                Delete Element
              </span>
              <span className="text-[10px] text-red-400/70">Del</span>
            </button>
          </div>
        )}

        {/* Live Dragging / Resizing HUD badge */}
        {(liveDragCoords || liveResizeDims) && (
          <div className="fixed bottom-5 right-96 bg-slate-900/95 text-white text-xs font-mono px-3 py-1.5 rounded-xl border border-purple-500 shadow-2xl z-50 pointer-events-none flex items-center gap-2">
            {liveDragCoords && (
              <>
                <span>
                  X: {liveDragCoords.x}px, Y: {liveDragCoords.y}px
                </span>
                {liveDragCoords.freeform ? (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-sans">
                    Freeform (Alt)
                  </span>
                ) : liveDragCoords.snapX || liveDragCoords.snapY ? (
                  <span className="px-1.5 py-0.5 rounded bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300 text-[10px] font-sans">
                    Snapped: {[liveDragCoords.snapX, liveDragCoords.snapY].filter(Boolean).join(' + ')}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-sans">
                    Hold Alt for Freeform
                  </span>
                )}
              </>
            )}
            {liveResizeDims && `Size: ${liveResizeDims.w} × ${liveResizeDims.h} px`}
          </div>
        )}
      </div>
    </div>
  );
}

function rgbToHex(rgb: string): string {
  const m = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!m) return '#000000';
  const r = parseInt(m[1], 10).toString(16).padStart(2, '0');
  const g = parseInt(m[2], 10).toString(16).padStart(2, '0');
  const b = parseInt(m[3], 10).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}
