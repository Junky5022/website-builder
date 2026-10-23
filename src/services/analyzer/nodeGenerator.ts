import type { PageAnalysis } from '../../types/ai';
import type { NodeSectionType } from '../../types/sections';
import type { DesignNode, DesignEdge } from '../../types/nodes';
import { NODE_SECTION_LABELS } from '../../types/nodes';
import type { SectionDataMap } from '../../types/sections';
import { createDefaultSection } from '../../types/sections';
import { generateId } from '../../utils/storage';
import { sectionDataToElements } from './elementConverter';
import type { Edge } from '@xyflow/react';

// Node dimensions for layout
const NODE_WIDTH = 300;
const NODE_HEIGHT = 180;
const NODE_GAP_Y = 60;
const START_X = 100;
const START_Y = 80;

function coerceString(val: unknown, fallback = ''): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    const o = val as Record<string, unknown>;
    if (typeof o.alt === 'string' && o.alt) return o.alt;
    if (typeof o.text === 'string' && o.text) return o.text;
    if (typeof o.label === 'string' && o.label) return o.label;
    if (typeof o.name === 'string' && o.name) return o.name;
    if (typeof o.value === 'string' && o.value) return o.value;
    if (typeof o.content === 'string' && o.content) return o.content;
    if (typeof o.title === 'string' && o.title) return o.title;
  }
  return fallback;
}

export function analysisToGraph(rawAnalysis: any): {
  nodes: DesignNode[];
  edges: DesignEdge[];
  sectionData: SectionDataMap;
} {
  // Resilient normalizer: handle array root, nested object, or alternate keys
  let rawSections: any[] = [];
  if (Array.isArray(rawAnalysis)) {
    rawSections = rawAnalysis;
  } else if (rawAnalysis && typeof rawAnalysis === 'object') {
    if (Array.isArray(rawAnalysis.sections)) {
      rawSections = rawAnalysis.sections;
    } else if (Array.isArray(rawAnalysis.pageSections)) {
      rawSections = rawAnalysis.pageSections;
    } else if (Array.isArray(rawAnalysis.data)) {
      rawSections = rawAnalysis.data;
    } else if (Array.isArray(rawAnalysis.components)) {
      rawSections = rawAnalysis.components;
    } else if (rawAnalysis.page && Array.isArray(rawAnalysis.page.sections)) {
      rawSections = rawAnalysis.page.sections;
    }
  }

  // If no sections could be identified, fallback to a sensible starter set
  if (!rawSections || rawSections.length === 0) {
    return buildDefaultGraph(['header', 'hero', 'features', 'cta', 'footer']);
  }

  const sorted = [...rawSections].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  const nodes: DesignNode[] = [];
  const edges: DesignEdge[] = [];
  const sectionData: SectionDataMap = {};

  sorted.forEach((section: any, idx: number) => {
    const rawType = (section.type || section.nodeType || 'features') as string;
    // Map any non-standard names to our 10 canonical types
    const validTypes: NodeSectionType[] = [
      'header', 'hero', 'features', 'imageText', 'gallery',
      'testimonials', 'pricing', 'faq', 'cta', 'footer'
    ];
    let type: NodeSectionType = 'features';
    if (validTypes.includes(rawType as NodeSectionType)) {
      type = rawType as NodeSectionType;
    } else if (rawType.toLowerCase().includes('nav') || rawType.toLowerCase().includes('header')) {
      type = 'header';
    } else if (rawType.toLowerCase().includes('hero') || rawType.toLowerCase().includes('banner')) {
      type = 'hero';
    } else if (rawType.toLowerCase().includes('price') || rawType.toLowerCase().includes('plan')) {
      type = 'pricing';
    } else if (rawType.toLowerCase().includes('foot')) {
      type = 'footer';
    } else if (rawType.toLowerCase().includes('testi') || rawType.toLowerCase().includes('review')) {
      type = 'testimonials';
    } else if (rawType.toLowerCase().includes('faq') || rawType.toLowerCase().includes('question')) {
      type = 'faq';
    } else if (rawType.toLowerCase().includes('call') || rawType.toLowerCase().includes('cta')) {
      type = 'cta';
    } else if (rawType.toLowerCase().includes('gallery') || rawType.toLowerCase().includes('portfolio')) {
      type = 'gallery';
    } else if (rawType.toLowerCase().includes('image') || rawType.toLowerCase().includes('about')) {
      type = 'imageText';
    }

    const nodeId = generateId();
    const sectionDataId = section.sectionData?.id || section.id || generateId();

    // Store section data
    const defaultData = createDefaultSection(type, sectionDataId);
    const rawSd = (section.sectionData && typeof section.sectionData === 'object') ? section.sectionData : {};
    const sd: any = {
      ...defaultData,
      ...rawSd,
      id: sectionDataId,
      type,
    };
    if (section.heading && !('heading' in rawSd)) {
      sd.heading = section.heading;
    }
    if (section.subheading && !('subheading' in rawSd)) {
      sd.subheading = section.subheading;
    }

    // Defensive string sanitization to protect React rendering
    if ('logo' in sd) sd.logo = coerceString(sd.logo, 'Brand');
    if ('heading' in sd) sd.heading = coerceString(sd.heading, defaultData && 'heading' in defaultData ? (defaultData as any).heading : '');
    if ('subheading' in sd) sd.subheading = coerceString(sd.subheading, '');
    if ('bodyText' in sd) sd.bodyText = coerceString(sd.bodyText, '');
    if ('badge' in sd) sd.badge = coerceString(sd.badge, '');
    if ('tagline' in sd) sd.tagline = coerceString(sd.tagline, '');
    if ('copyright' in sd) sd.copyright = coerceString(sd.copyright, '');

    if (sd.cta && typeof sd.cta === 'object') {
      sd.cta.label = coerceString(sd.cta.label, 'Get Started');
    }
    if (sd.primaryCta && typeof sd.primaryCta === 'object') {
      sd.primaryCta.label = coerceString(sd.primaryCta.label, 'Get Started');
    }
    if (sd.secondaryCta && typeof sd.secondaryCta === 'object') {
      sd.secondaryCta.label = coerceString(sd.secondaryCta.label, 'Learn More');
    }

    if (Array.isArray(sd.navItems)) {
      sd.navItems = sd.navItems.map((item: any) => ({
        label: coerceString(item?.label ?? item, 'Link'),
        href: coerceString(item?.href, '#'),
      }));
    }
    if (Array.isArray(sd.features)) {
      sd.features = sd.features.map((f: any) => ({
        icon: coerceString(f?.icon, '✨'),
        title: coerceString(f?.title, 'Feature'),
        description: coerceString(f?.description, ''),
      }));
    }
    if (Array.isArray(sd.tiers)) {
      sd.tiers = sd.tiers.map((t: any) => ({
        name: coerceString(t?.name, 'Plan'),
        price: coerceString(t?.price, '$0'),
        period: coerceString(t?.period, '/mo'),
        description: coerceString(t?.description, ''),
        features: Array.isArray(t?.features) ? t.features.map((f: any) => coerceString(f)) : [],
        highlighted: Boolean(t?.highlighted),
        cta: t?.cta ? { label: coerceString(t.cta.label, 'Get Started'), href: coerceString(t.cta.href, '#') } : undefined,
      }));
    }
    if (Array.isArray(sd.testimonials)) {
      sd.testimonials = sd.testimonials.map((t: any) => ({
        quote: coerceString(t?.quote, 'Great service!'),
        authorName: coerceString(t?.authorName, 'Anonymous'),
        authorTitle: coerceString(t?.authorTitle, ''),
      }));
    }
    if (Array.isArray(sd.items)) {
      sd.items = sd.items.map((item: any) => {
        const rawImg = item?.image ?? item?.imageUrl ?? item?.url;
        const imageObj =
          typeof rawImg === 'string'
            ? { url: rawImg, alt: coerceString(item?.caption || item?.title, ''), isPlaceholder: false }
            : rawImg && typeof rawImg === 'object'
            ? {
                url: coerceString(rawImg.url || rawImg.src, 'https://picsum.photos/seed/item/600/400'),
                alt: coerceString(rawImg.alt || item?.caption, ''),
                isPlaceholder: Boolean(rawImg.isPlaceholder),
              }
            : undefined;
        return {
          ...item,
          ...(imageObj ? { image: imageObj } : {}),
          question: coerceString(item?.question, ''),
          answer: coerceString(item?.answer, ''),
          caption: coerceString(item?.caption || item?.title || item?.name, ''),
        };
      });
    }

    if (sd.image && typeof sd.image === 'string') {
      sd.image = { url: sd.image, alt: coerceString(sd.heading, 'Image'), isPlaceholder: false };
    } else if (sd.image && typeof sd.image === 'object') {
      sd.image = {
        url: coerceString(sd.image.url || sd.image.src, 'https://picsum.photos/seed/hero/1200/600'),
        alt: coerceString(sd.image.alt || sd.heading, 'Image'),
        isPlaceholder: Boolean(sd.image.isPlaceholder),
      };
    }

    // Pre-populate persistent sandbox elements so element IDs are stable across renders
    if (!Array.isArray(sd.elements) || sd.elements.length === 0) {
      sd.elements = sectionDataToElements(sd);
    }

    sectionData[sectionDataId] = sd;

    // Create node
    const nodeLabel = coerceString(section.label, NODE_SECTION_LABELS[type] || type);
    const nodeSummary = coerceString(section.summary || sd.heading, '');

    nodes.push({
      id: nodeId,
      type,
      position: {
        x: START_X,
        y: START_Y + idx * (NODE_HEIGHT + NODE_GAP_Y),
      },
      data: {
        label: nodeLabel,
        summary: nodeSummary,
        status: 'generated',
        hidden: false,
        sectionDataId,
        nodeType: type,
      },
    });

    // Create edge to previous node
    if (idx > 0) {
      const prevNode = nodes[idx - 1];
      edges.push({
        id: `e-${prevNode.id}-${nodeId}`,
        source: prevNode.id,
        target: nodeId,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#6366f1', strokeWidth: 2 },
        markerEnd: { type: 'arrowclosed' as any, color: '#6366f1' },
      });
    }
  });

  return { nodes, edges, sectionData };
}

export function buildDefaultGraph(types: NodeSectionType[]): {
  nodes: DesignNode[];
  edges: DesignEdge[];
  sectionData: SectionDataMap;
} {
  const nodes: DesignNode[] = [];
  const edges: DesignEdge[] = [];
  const sectionData: SectionDataMap = {};

  types.forEach((type, idx) => {
    const nodeId = generateId();
    const sectionDataId = generateId();
    const sd = createDefaultSection(type, sectionDataId);
    // Pre-populate persistent sandbox elements so element IDs are stable across renders
    if (!Array.isArray(sd.elements) || sd.elements.length === 0) {
      sd.elements = sectionDataToElements(sd);
    }

    sectionData[sectionDataId] = sd;

    nodes.push({
      id: nodeId,
      type,
      position: { x: START_X, y: START_Y + idx * (NODE_HEIGHT + NODE_GAP_Y) },
      data: {
        label: type.charAt(0).toUpperCase() + type.slice(1),
        summary: 'Default section',
        status: 'draft',
        hidden: false,
        sectionDataId,
        nodeType: type,
      },
    });

    if (idx > 0) {
      const prevNode = nodes[idx - 1];
      edges.push({
        id: `e-${prevNode.id}-${nodeId}`,
        source: prevNode.id,
        target: nodeId,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#6366f1', strokeWidth: 2 },
        markerEnd: { type: 'arrowclosed' as any, color: '#6366f1' },
      });
    }
  });

  return { nodes, edges, sectionData };
}

/** Return nodes in topological edge order (following connections) */
export function getOrderedNodes(nodes: DesignNode[], edges: DesignEdge[]): DesignNode[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const inDegree = new Map(nodes.map((n) => [n.id, 0]));
  const adjacency = new Map<string, string[]>();

  edges.forEach((e) => {
    adjacency.set(e.source, [...(adjacency.get(e.source) ?? []), e.target]);
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  });

  const queue = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0);
  const result: DesignNode[] = [];

  while (queue.length) {
    const current = queue.shift()!;
    result.push(current);
    const neighbors = adjacency.get(current.id) ?? [];
    neighbors.forEach((nid) => {
      const deg = (inDegree.get(nid) ?? 1) - 1;
      inDegree.set(nid, deg);
      if (deg === 0) {
        const n = nodeMap.get(nid);
        if (n) queue.push(n);
      }
    });
  }

  // Append any disconnected nodes
  nodes.forEach((n) => { if (!result.find((r) => r.id === n.id)) result.push(n); });
  return result;
}

/** Rebuild edges so nodes follow Y-position order */
export function autoLayoutNodes(nodes: DesignNode[]): { nodes: DesignNode[]; edges: DesignEdge[] } {
  const sorted = [...nodes].sort((a, b) => a.position.y - b.position.y);
  const laid = sorted.map((n, idx) => ({
    ...n,
    position: { x: START_X, y: START_Y + idx * (NODE_HEIGHT + NODE_GAP_Y) },
  }));

  const edges: DesignEdge[] = laid.slice(1).map((n, idx) => ({
    id: `e-${laid[idx].id}-${n.id}`,
    source: laid[idx].id,
    target: n.id,
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#6366f1', strokeWidth: 2 },
    markerEnd: { type: 'arrowclosed' as any, color: '#6366f1' },
  }));

  return { nodes: laid, edges };
}
