import type { CanvasElement, ElementType, ElementStyle } from '../../types/elements';
import type { SectionData } from '../../types/sections';
import { generateId } from '../../utils/storage';

export function createElement(
  type: ElementType,
  overrides?: Partial<CanvasElement>
): CanvasElement {
  const id = generateId();

  const defaults: Record<ElementType, Partial<CanvasElement>> = {
    heading: {
      type: 'heading',
      label: 'Heading',
      content: 'New Headline',
      level: 2,
      style: {
        fontSize: '2xl',
        fontWeight: 'bold',
        textAlign: 'left',
      },
    },
    text: {
      type: 'text',
      label: 'Paragraph',
      content: 'Click to edit this paragraph text. Describe your features or value proposition here.',
      style: {
        fontSize: 'base',
        fontWeight: 'normal',
        textAlign: 'left',
      },
    },
    button: {
      type: 'button',
      label: 'Button',
      content: 'Click Me',
      url: '#',
      variant: 'primary',
      style: {
        borderRadius: '8px',
        padding: '0.625rem 1.25rem',
        fontWeight: 'semibold',
      },
    },
    image: {
      type: 'image',
      label: 'Image',
      url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80',
      alt: 'Sample photo',
      style: {
        borderRadius: '12px',
        width: '100%',
        height: 'auto',
      },
    },
    badge: {
      type: 'badge',
      label: 'Badge',
      content: 'New Feature ✨',
      style: {
        borderRadius: '9999px',
        padding: '0.25rem 0.75rem',
        fontSize: 'xs',
        fontWeight: 'semibold',
      },
    },
    container: {
      type: 'container',
      label: 'Container Box',
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        padding: '1rem',
        borderRadius: '12px',
      },
      children: [],
    },
    card: {
      type: 'card',
      label: 'Feature Card',
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        padding: '1.5rem',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        border: '1px solid #f1f5f9',
      },
      children: [
        {
          id: generateId(),
          type: 'icon',
          label: 'Card Icon',
          content: '⚡',
          style: { fontSize: '2xl' },
        },
        {
          id: generateId(),
          type: 'heading',
          label: 'Card Title',
          content: 'Speed & Performance',
          level: 3,
          style: { fontSize: 'lg', fontWeight: 'bold' },
        },
        {
          id: generateId(),
          type: 'text',
          label: 'Card Description',
          content: 'Optimized for lightning-fast load times and smooth user interaction.',
          style: { fontSize: 'sm', color: '#64748b' },
        },
      ],
    },
    icon: {
      type: 'icon',
      label: 'Icon',
      content: '✨',
      style: {
        fontSize: '2xl',
      },
    },
    divider: {
      type: 'divider',
      label: 'Divider',
      style: {
        border: '1px solid #e2e8f0',
        margin: '1.5rem 0',
      },
    },
    'nav-item': {
      type: 'nav-item',
      label: 'Nav Link',
      content: 'New Link',
      url: '#',
      style: {
        fontSize: 'sm',
        fontWeight: 'medium',
      },
    },
  };

  return {
    id,
    ...(defaults[type] || defaults.text),
    ...overrides,
  } as CanvasElement;
}

/** Converts any SectionData into modular CanvasElement tree */
export function sectionDataToElements(sd: SectionData): CanvasElement[] {
  if (Array.isArray((sd as any).elements) && (sd as any).elements.length > 0) {
    return (sd as any).elements;
  }

  const elements: CanvasElement[] = [];

  switch (sd.type) {
    case 'header': {
      // Header brand
      elements.push({
        id: generateId(),
        type: 'heading',
        label: 'Brand Logo',
        content: typeof sd.logo === 'string' ? sd.logo : (sd.logo as any)?.alt || 'Brand',
        level: 2,
        style: { fontSize: 'xl', fontWeight: 'bold' },
      });

      // Navigation container
      const navChildren: CanvasElement[] = (sd.navItems || []).map((item) => ({
        id: generateId(),
        type: 'nav-item',
        label: 'Nav Link',
        content: typeof item?.label === 'string' ? item.label : String(item ?? 'Link'),
        url: item?.href || '#',
      }));

      if (navChildren.length > 0) {
        elements.push({
          id: generateId(),
          type: 'container',
          label: 'Navigation Links',
          style: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '1.5rem',
          },
          children: navChildren,
        });
      }

      // CTA
      if (sd.cta) {
        elements.push({
          id: generateId(),
          type: 'button',
          label: 'Header CTA',
          content: sd.cta.label || 'Action',
          url: sd.cta.href || '#',
          variant: 'primary',
        });
      }
      break;
    }

    case 'hero': {
      const textItems: CanvasElement[] = [];

      if (sd.badge) {
        textItems.push({
          id: generateId(),
          type: 'badge',
          label: 'Hero Badge',
          content: sd.badge,
        });
      }

      if (sd.heading) {
        textItems.push({
          id: generateId(),
          type: 'heading',
          label: 'Main Headline',
          level: 1,
          content: sd.heading,
          style: { fontSize: '4xl', fontWeight: 'extrabold' },
        });
      }

      if (sd.subheading) {
        textItems.push({
          id: generateId(),
          type: 'text',
          label: 'Hero Subtitle',
          content: sd.subheading,
          style: { fontSize: 'lg' },
        });
      }

      if (sd.bodyText && sd.bodyText !== sd.subheading) {
        textItems.push({
          id: generateId(),
          type: 'text',
          label: 'Hero Body',
          content: sd.bodyText,
          style: { fontSize: 'base' },
        });
      }

      const buttonChildren: CanvasElement[] = [];
      if (sd.primaryCta && sd.primaryCta.label) {
        buttonChildren.push({
          id: generateId(),
          type: 'button',
          label: 'Primary Button',
          content: sd.primaryCta.label,
          url: sd.primaryCta.href || '#',
          variant: 'primary',
        });
      }
      if (sd.secondaryCta && sd.secondaryCta.label) {
        buttonChildren.push({
          id: generateId(),
          type: 'button',
          label: 'Secondary Button',
          content: sd.secondaryCta.label,
          url: sd.secondaryCta.href || '#',
          variant: 'secondary',
        });
      }

      if (buttonChildren.length > 0) {
        textItems.push({
          id: generateId(),
          type: 'container',
          label: 'Button Group',
          style: {
            display: 'flex',
            flexDirection: 'row',
            gap: '1rem',
            alignItems: 'center',
          },
          children: buttonChildren,
        });
      }

      const isSplit = sd.layout === 'split' || sd.layout === 'imageRight' || sd.layout === 'imageLeft';

      if (isSplit && sd.image && sd.image.url) {
        elements.push({
          id: generateId(),
          type: 'container',
          label: 'Hero Split Layout',
          style: {
            display: 'grid',
            gridCols: 2,
            gap: '2.5rem',
          },
          children: [
            {
              id: generateId(),
              type: 'container',
              label: 'Hero Content Column',
              style: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
              children: textItems,
            },
            {
              id: generateId(),
              type: 'image',
              label: 'Hero Image',
              url: sd.image.url,
              alt: sd.image.alt || 'Hero Image',
              style: { borderRadius: '16px', width: '100%' },
            },
          ],
        });
      } else {
        elements.push(...textItems);
        if (sd.image && sd.image.url) {
          elements.push({
            id: generateId(),
            type: 'image',
            label: 'Hero Image',
            url: sd.image.url,
            alt: sd.image.alt || 'Hero Image',
            style: { borderRadius: '16px', width: '100%' },
          });
        }
      }
      break;
    }

    case 'features': {
      if (sd.heading) {
        elements.push({
          id: generateId(),
          type: 'heading',
          label: 'Section Heading',
          level: 2,
          content: sd.heading,
          style: { fontSize: '3xl', fontWeight: 'bold', textAlign: 'center' },
        });
      }

      if (sd.subheading) {
        elements.push({
          id: generateId(),
          type: 'text',
          label: 'Section Subtitle',
          content: sd.subheading,
          style: { textAlign: 'center' },
        });
      }

      const cards: CanvasElement[] = (sd.features || []).map((f) => ({
        id: generateId(),
        type: 'card',
        label: 'Feature Item',
        style: {
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
          border: '1px solid #f1f5f9',
          gap: '0.5rem',
        },
        children: [
          {
            id: generateId(),
            type: 'icon',
            label: 'Icon',
            content: f.icon || '✨',
            style: { fontSize: '2xl' },
          },
          {
            id: generateId(),
            type: 'heading',
            label: 'Title',
            level: 3,
            content: f.title || 'Feature',
            style: { fontSize: 'lg', fontWeight: 'bold' },
          },
          {
            id: generateId(),
            type: 'text',
            label: 'Description',
            content: f.description || '',
            style: { fontSize: 'sm' },
          },
        ],
      }));

      elements.push({
        id: generateId(),
        type: 'container',
        label: 'Features Grid',
        style: {
          display: 'grid',
          gridCols: sd.layout === 'grid4' ? 4 : sd.layout === 'grid2' ? 2 : 3,
          gap: '1.5rem',
        },
        children: cards,
      });
      break;
    }

    case 'imageText': {
      const textColChildren: CanvasElement[] = [];

      if (sd.badge) {
        textColChildren.push({
          id: generateId(),
          type: 'badge',
          label: 'Badge',
          content: sd.badge,
        });
      }

      if (sd.heading) {
        textColChildren.push({
          id: generateId(),
          type: 'heading',
          label: 'Headline',
          level: 2,
          content: sd.heading,
          style: { fontSize: '3xl', fontWeight: 'bold' },
        });
      }

      if (sd.bodyText) {
        textColChildren.push({
          id: generateId(),
          type: 'text',
          label: 'Body Text',
          content: sd.bodyText,
        });
      }

      if (Array.isArray(sd.bullets) && sd.bullets.length > 0) {
        const bulletList: CanvasElement[] = sd.bullets.map((b) => ({
          id: generateId(),
          type: 'text',
          label: 'Bullet Point',
          content: `✓ ${b}`,
          style: { fontWeight: 'medium' },
        }));

        textColChildren.push({
          id: generateId(),
          type: 'container',
          label: 'Bullet List',
          style: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
          children: bulletList,
        });
      }

      if (sd.cta && sd.cta.label) {
        textColChildren.push({
          id: generateId(),
          type: 'button',
          label: 'Action Button',
          content: sd.cta.label,
          url: sd.cta.href || '#',
          variant: 'primary',
        });
      }

      const textCol: CanvasElement = {
        id: generateId(),
        type: 'container',
        label: 'Text Column',
        style: { display: 'flex', flexDirection: 'column', gap: '1rem' },
        children: textColChildren,
      };

      if (sd.image && sd.image.url) {
        const imgEl: CanvasElement = {
          id: generateId(),
          type: 'image',
          label: 'Story Image',
          url: sd.image.url,
          alt: sd.image.alt || 'Story Image',
          style: { borderRadius: '16px', width: '100%' },
        };

        elements.push({
          id: generateId(),
          type: 'container',
          label: 'Split Image & Text',
          style: { display: 'grid', gridCols: 2, gap: '2.5rem' },
          children: sd.layout === 'imageRight' ? [textCol, imgEl] : [imgEl, textCol],
        });
      } else {
        elements.push(...textColChildren);
      }
      break;
    }

    case 'pricing': {
      if (sd.heading) {
        elements.push({
          id: generateId(),
          type: 'heading',
          label: 'Pricing Title',
          level: 2,
          content: sd.heading,
          style: { fontSize: '3xl', fontWeight: 'bold', textAlign: 'center' },
        });
      }

      if (sd.subheading) {
        elements.push({
          id: generateId(),
          type: 'text',
          label: 'Pricing Subtitle',
          content: sd.subheading,
          style: { textAlign: 'center' },
        });
      }

      const tiers: CanvasElement[] = (sd.tiers || []).map((t) => ({
        id: generateId(),
        type: 'card',
        label: `${t.name || 'Plan'} Card`,
        style: {
          display: 'flex',
          flexDirection: 'column',
          padding: '1.75rem',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: t.highlighted ? '2px solid #6366f1' : '1px solid #e2e8f0',
          boxShadow: t.highlighted ? '0 10px 30px rgba(99,102,241,0.15)' : 'none',
          gap: '1rem',
        },
        children: [
          {
            id: generateId(),
            type: 'heading',
            label: 'Plan Name',
            level: 3,
            content: t.name || 'Tier',
            style: { fontSize: 'lg', fontWeight: 'bold' },
          },
          {
            id: generateId(),
            type: 'heading',
            label: 'Price',
            level: 2,
            content: `${t.price || '$0'} ${t.period || ''}`,
            style: { fontSize: '3xl', fontWeight: 'extrabold' },
          },
          {
            id: generateId(),
            type: 'text',
            label: 'Description',
            content: t.description || '',
            style: { fontSize: 'xs' },
          },
          {
            id: generateId(),
            type: 'container',
            label: 'Feature Checklist',
            style: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
            children: (t.features || []).map((feat) => ({
              id: generateId(),
              type: 'text',
              label: 'Plan Feature',
              content: `✓ ${feat}`,
              style: { fontSize: 'xs' },
            })),
          },
          {
            id: generateId(),
            type: 'button',
            label: 'Choose Plan',
            content: t.cta?.label || 'Get Started',
            url: t.cta?.href || '#',
            variant: t.highlighted ? 'primary' : 'secondary',
          },
        ],
      }));

      elements.push({
        id: generateId(),
        type: 'container',
        label: 'Pricing Grid',
        style: {
          display: 'grid',
          gridCols: 3,
          gap: '1.5rem',
        },
        children: tiers,
      });
      break;
    }

    case 'cta': {
      if (sd.heading) {
        elements.push({
          id: generateId(),
          type: 'heading',
          label: 'Call to Action Headline',
          level: 2,
          content: sd.heading,
          style: { fontSize: '3xl', fontWeight: 'extrabold', textAlign: 'center' },
        });
      }

      if (sd.subheading) {
        elements.push({
          id: generateId(),
          type: 'text',
          label: 'Call to Action Subtitle',
          content: sd.subheading,
          style: { textAlign: 'center' },
        });
      }

      const ctaBtns: CanvasElement[] = [];
      if (sd.primaryCta) {
        ctaBtns.push({
          id: generateId(),
          type: 'button',
          label: 'Primary CTA',
          content: sd.primaryCta.label || 'Get Started',
          url: sd.primaryCta.href || '#',
          variant: 'primary',
        });
      }
      if (sd.secondaryCta) {
        ctaBtns.push({
          id: generateId(),
          type: 'button',
          label: 'Secondary CTA',
          content: sd.secondaryCta.label || 'Learn More',
          url: sd.secondaryCta.href || '#',
          variant: 'secondary',
        });
      }

      if (ctaBtns.length > 0) {
        elements.push({
          id: generateId(),
          type: 'container',
          label: 'CTA Buttons',
          style: {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: '1rem',
          },
          children: ctaBtns,
        });
      }
      break;
    }

    case 'footer': {
      elements.push({
        id: generateId(),
        type: 'heading',
        label: 'Footer Logo',
        level: 3,
        content: typeof sd.logo === 'string' ? sd.logo : (sd.logo as any)?.alt || 'Brand',
        style: { fontSize: 'lg', fontWeight: 'bold' },
      });

      if (sd.tagline) {
        elements.push({
          id: generateId(),
          type: 'text',
          label: 'Tagline',
          content: sd.tagline,
          style: { fontSize: 'xs' },
        });
      }

      if (sd.copyright) {
        elements.push({
          id: generateId(),
          type: 'text',
          label: 'Copyright Notice',
          content: sd.copyright,
          style: { fontSize: 'xs' },
        });
      }

      if (Array.isArray(sd.columns) && sd.columns.length > 0) {
        const colElements: CanvasElement[] = sd.columns.map((col) => ({
          id: generateId(),
          type: 'container',
          label: col.heading || 'Footer Column',
          style: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
          children: [
            {
              id: generateId(),
              type: 'heading',
              label: 'Column Title',
              level: 4,
              content: col.heading || 'Links',
              style: { fontSize: 'sm', fontWeight: 'bold' },
            },
            ...(col.links || []).map((lnk) => ({
              id: generateId(),
              type: 'nav-item' as const,
              label: 'Footer Link',
              content: lnk.label || 'Link',
              url: lnk.href || '#',
              style: { fontSize: 'xs' },
            })),
          ],
        }));

        elements.push({
          id: generateId(),
          type: 'container',
          label: 'Footer Columns',
          style: { display: 'grid', gridCols: Math.min(4, sd.columns.length), gap: '1.5rem' },
          children: colElements,
        });
      }
      break;
    }

    case 'gallery': {
      if (sd.heading) {
        elements.push({
          id: generateId(),
          type: 'heading',
          label: 'Gallery Heading',
          level: 2,
          content: sd.heading,
          style: { fontSize: '3xl', fontWeight: 'bold', textAlign: 'center' },
        });
      }

      if (sd.subheading) {
        elements.push({
          id: generateId(),
          type: 'text',
          label: 'Gallery Subheading',
          content: sd.subheading,
          style: { textAlign: 'center' },
        });
      }

      const galleryCards: CanvasElement[] = (sd.items || []).map((item) => ({
        id: generateId(),
        type: 'card',
        label: item.caption || 'Gallery Item',
        style: {
          display: 'flex',
          flexDirection: 'column',
          padding: '0.75rem',
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
          border: '1px solid #f1f5f9',
          gap: '0.625rem',
        },
        children: [
          {
            id: generateId(),
            type: 'image',
            label: 'Item Photo',
            url: item.image?.url || 'https://picsum.photos/seed/item/600/400',
            alt: item.image?.alt || item.caption || 'Gallery image',
            style: { borderRadius: '10px', width: '100%', height: '220px' },
          },
          ...(item.caption
            ? [
                {
                  id: generateId(),
                  type: 'text' as const,
                  label: 'Caption / Price',
                  content: item.caption,
                  style: { fontSize: 'sm' as const, fontWeight: 'semibold' as const },
                },
              ]
            : []),
        ],
      }));

      if (galleryCards.length > 0) {
        elements.push({
          id: generateId(),
          type: 'container',
          label: 'Items Grid',
          style: {
            display: 'grid',
            gridCols: sd.layout === 'grid4' ? 4 : 3,
            gap: '1.25rem',
          },
          children: galleryCards,
        });
      }
      break;
    }

    case 'testimonials': {
      if (sd.heading) {
        elements.push({
          id: generateId(),
          type: 'heading',
          label: 'Testimonials Heading',
          level: 2,
          content: sd.heading,
          style: { fontSize: '3xl', fontWeight: 'bold', textAlign: 'center' },
        });
      }

      if (sd.subheading) {
        elements.push({
          id: generateId(),
          type: 'text',
          label: 'Testimonials Subtitle',
          content: sd.subheading,
          style: { textAlign: 'center' },
        });
      }

      const testimonialCards: CanvasElement[] = (sd.testimonials || []).map((t) => ({
        id: generateId(),
        type: 'card',
        label: t.authorName || 'Review Card',
        style: {
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
          border: '1px solid #f1f5f9',
          gap: '0.75rem',
        },
        children: [
          {
            id: generateId(),
            type: 'text',
            label: 'Quote',
            content: `"${t.quote || ''}"`,
            style: { fontSize: 'sm' },
          },
          {
            id: generateId(),
            type: 'heading',
            label: 'Author',
            level: 4,
            content: `${t.authorName || 'Customer'}${t.authorTitle ? ` — ${t.authorTitle}` : ''}`,
            style: { fontSize: 'xs', fontWeight: 'bold' },
          },
        ],
      }));

      if (testimonialCards.length > 0) {
        elements.push({
          id: generateId(),
          type: 'container',
          label: 'Testimonials Grid',
          style: {
            display: 'grid',
            gridCols: 3,
            gap: '1.25rem',
          },
          children: testimonialCards,
        });
      }
      break;
    }

    case 'faq': {
      if (sd.heading) {
        elements.push({
          id: generateId(),
          type: 'heading',
          label: 'FAQ Heading',
          level: 2,
          content: sd.heading,
          style: { fontSize: '3xl', fontWeight: 'bold', textAlign: 'center' },
        });
      }

      if (sd.subheading) {
        elements.push({
          id: generateId(),
          type: 'text',
          label: 'FAQ Subtitle',
          content: sd.subheading,
          style: { textAlign: 'center' },
        });
      }

      const faqItems: CanvasElement[] = (sd.items || []).map((item) => ({
        id: generateId(),
        type: 'card',
        label: item.question || 'FAQ Item',
        style: {
          display: 'flex',
          flexDirection: 'column',
          padding: '1.25rem',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          gap: '0.5rem',
        },
        children: [
          {
            id: generateId(),
            type: 'heading',
            label: 'Question',
            level: 3,
            content: item.question || 'Question',
            style: { fontSize: 'base', fontWeight: 'bold' },
          },
          {
            id: generateId(),
            type: 'text',
            label: 'Answer',
            content: item.answer || '',
            style: { fontSize: 'sm' },
          },
        ],
      }));

      if (faqItems.length > 0) {
        elements.push({
          id: generateId(),
          type: 'container',
          label: 'FAQ List',
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          },
          children: faqItems,
        });
      }
      break;
    }

    default: {
      if ((sd as any).heading) {
        elements.push({
          id: generateId(),
          type: 'heading',
          label: 'Section Heading',
          content: (sd as any).heading,
          level: 2,
        });
      }
      if ((sd as any).subheading || (sd as any).bodyText) {
        elements.push({
          id: generateId(),
          type: 'text',
          label: 'Description',
          content: (sd as any).subheading || (sd as any).bodyText,
        });
      }
      break;
    }
  }

  // Fallback if empty
  if (elements.length === 0) {
    elements.push(createElement('heading', { content: `${sd.type.toUpperCase()} Section` }));
    elements.push(createElement('text', { content: 'Add elements from the toolbar to build your content.' }));
  }

  return elements;
}

// ─── Tree Operations ──────────────────────────────────────────────────────────

export function findElementInTree(
  elements: CanvasElement[],
  id: string,
  parent: CanvasElement | null = null
): { element: CanvasElement; parent: CanvasElement | null; index: number } | null {
  for (let i = 0; i < elements.length; i++) {
    if (elements[i].id === id) {
      return { element: elements[i], parent, index: i };
    }
    if (elements[i].children && elements[i].children!.length > 0) {
      const found = findElementInTree(elements[i].children!, id, elements[i]);
      if (found) return found;
    }
  }
  return null;
}

export function updateElementInTree(
  elements: CanvasElement[],
  id: string,
  patch: Partial<CanvasElement>
): CanvasElement[] {
  return elements.map((el) => {
    if (el.id === id) {
      return {
        ...el,
        ...patch,
        style: {
          ...(el.style || {}),
          ...(patch.style || {}),
        },
      };
    }
    if (el.children && el.children.length > 0) {
      return {
        ...el,
        children: updateElementInTree(el.children, id, patch),
      };
    }
    return el;
  });
}

export function deleteElementFromTree(
  elements: CanvasElement[],
  id: string
): CanvasElement[] {
  return elements
    .filter((el) => el.id !== id)
    .map((el) => {
      if (el.children && el.children.length > 0) {
        return {
          ...el,
          children: deleteElementFromTree(el.children, id),
        };
      }
      return el;
    });
}

export function duplicateElementInTree(
  elements: CanvasElement[],
  id: string
): CanvasElement[] {
  const result: CanvasElement[] = [];

  for (const el of elements) {
    if (el.id === id) {
      result.push(el);
      // Deep clone with new IDs
      const clone = cloneElementWithNewIds(el);
      clone.label = `${el.label || el.type} (copy)`;
      result.push(clone);
    } else {
      if (el.children && el.children.length > 0) {
        result.push({
          ...el,
          children: duplicateElementInTree(el.children, id),
        });
      } else {
        result.push(el);
      }
    }
  }

  return result;
}

export function moveElementInTree(
  elements: CanvasElement[],
  id: string,
  direction: 'up' | 'down'
): CanvasElement[] {
  const idx = elements.findIndex((el) => el.id === id);
  if (idx !== -1) {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= elements.length) return elements;
    const reordered = [...elements];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);
    return reordered;
  }

  return elements.map((el) => {
    if (el.children && el.children.length > 0) {
      return {
        ...el,
        children: moveElementInTree(el.children, id, direction),
      };
    }
    return el;
  });
}

export function addElementToTree(
  elements: CanvasElement[],
  newEl: CanvasElement,
  targetId?: string,
  position: 'before' | 'after' | 'inside' = 'after'
): CanvasElement[] {
  if (!targetId) {
    return [...elements, newEl];
  }

  const result: CanvasElement[] = [];

  for (const el of elements) {
    if (el.id === targetId) {
      if (position === 'before') {
        result.push(newEl);
        result.push(el);
      } else if (position === 'inside') {
        result.push({
          ...el,
          children: [...(el.children || []), newEl],
        });
      } else {
        result.push(el);
        result.push(newEl);
      }
    } else {
      if (el.children && el.children.length > 0) {
        result.push({
          ...el,
          children: addElementToTree(el.children, newEl, targetId, position),
        });
      } else {
        result.push(el);
      }
    }
  }

  return result;
}

export function extractElementFromTree(
  elements: CanvasElement[],
  id: string
): { extracted: CanvasElement | null; remaining: CanvasElement[] } {
  let extracted: CanvasElement | null = null;

  function recurse(list: CanvasElement[]): CanvasElement[] {
    const next: CanvasElement[] = [];
    for (const el of list) {
      if (el.id === id) {
        extracted = el;
      } else {
        if (el.children && el.children.length > 0) {
          next.push({
            ...el,
            children: recurse(el.children),
          });
        } else {
          next.push(el);
        }
      }
    }
    return next;
  }

  const remaining = recurse(elements);
  return { extracted, remaining };
}

function cloneElementWithNewIds(el: CanvasElement): CanvasElement {
  return {
    ...JSON.parse(JSON.stringify(el)),
    id: generateId(),
    children: el.children ? el.children.map(cloneElementWithNewIds) : undefined,
  };
}
