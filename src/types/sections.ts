import type { CanvasElement } from './elements';

export type NodeSectionType =
  | 'header'
  | 'hero'
  | 'features'
  | 'imageText'
  | 'gallery'
  | 'testimonials'
  | 'pricing'
  | 'faq'
  | 'cta'
  | 'footer';

export type NodeStatus = 'draft' | 'generated' | 'modified';

export type LayoutVariant =
  | 'centered'
  | 'left'
  | 'right'
  | 'split'
  | 'imageLeft'
  | 'imageRight'
  | 'grid2'
  | 'grid3'
  | 'grid4';

export type SectionWidth = 'full' | 'container' | 'narrow' | 'wide';

export interface ImageRef {
  url: string;
  alt: string;
  isPlaceholder: boolean;
}

export interface SectionBackground {
  type: 'color' | 'gradient' | 'image';
  color?: string;
  gradient?: string;
  imageUrl?: string;
  overlay?: string;
}

export interface SectionSpacing {
  paddingTop: number; // rem
  paddingBottom: number;
  width: SectionWidth;
}

export interface VisibilitySettings {
  desktop: boolean;
  tablet: boolean;
  mobile: boolean;
}

export interface NavItem {
  label: string;
  href: string;
}

export interface HeaderSectionData {
  type: 'header';
  id: string;
  logo: string;
  navItems: NavItem[];
  cta?: { label: string; href: string };
  background: SectionBackground;
  sticky: boolean;
  spacing: SectionSpacing;
  visible: VisibilitySettings;
}

export interface HeroSectionData {
  type: 'hero';
  id: string;
  layout: LayoutVariant;
  badge?: string;
  heading: string;
  subheading: string;
  bodyText: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  image?: ImageRef;
  background: SectionBackground;
  spacing: SectionSpacing;
  visible: VisibilitySettings;
}

export interface Feature {
  icon: string;
  title: string;
  description: string;
}

export interface FeaturesSectionData {
  type: 'features';
  id: string;
  layout: LayoutVariant;
  badge?: string;
  heading: string;
  subheading: string;
  features: Feature[];
  background: SectionBackground;
  spacing: SectionSpacing;
  visible: VisibilitySettings;
}

export interface ImageTextSectionData {
  type: 'imageText';
  id: string;
  layout: LayoutVariant;
  badge?: string;
  heading: string;
  bodyText: string;
  bullets?: string[];
  cta?: { label: string; href: string };
  image: ImageRef;
  background: SectionBackground;
  spacing: SectionSpacing;
  visible: VisibilitySettings;
}

export interface GalleryItem {
  image: ImageRef;
  caption?: string;
}

export interface GallerySectionData {
  type: 'gallery';
  id: string;
  layout: LayoutVariant;
  heading: string;
  subheading?: string;
  items: GalleryItem[];
  background: SectionBackground;
  spacing: SectionSpacing;
  visible: VisibilitySettings;
}

export interface Testimonial {
  quote: string;
  authorName: string;
  authorTitle: string;
  authorImage?: ImageRef;
  rating?: number;
}

export interface TestimonialsSectionData {
  type: 'testimonials';
  id: string;
  layout: LayoutVariant;
  heading: string;
  subheading?: string;
  testimonials: Testimonial[];
  background: SectionBackground;
  spacing: SectionSpacing;
  visible: VisibilitySettings;
}

export interface PricingTier {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: { label: string; href: string };
  highlighted: boolean;
  badge?: string;
}

export interface PricingSectionData {
  type: 'pricing';
  id: string;
  heading: string;
  subheading?: string;
  tiers: PricingTier[];
  background: SectionBackground;
  spacing: SectionSpacing;
  visible: VisibilitySettings;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqSectionData {
  type: 'faq';
  id: string;
  heading: string;
  subheading?: string;
  items: FaqItem[];
  background: SectionBackground;
  spacing: SectionSpacing;
  visible: VisibilitySettings;
}

export interface CtaSectionData {
  type: 'cta';
  id: string;
  layout: LayoutVariant;
  heading: string;
  subheading?: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  background: SectionBackground;
  spacing: SectionSpacing;
  visible: VisibilitySettings;
}

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterColumn {
  heading: string;
  links: FooterLink[];
}

export interface FooterSectionData {
  type: 'footer';
  id: string;
  logo: string;
  tagline?: string;
  columns: FooterColumn[];
  socialLinks?: { platform: string; href: string }[];
  copyright: string;
  background: SectionBackground;
  spacing: SectionSpacing;
  visible: VisibilitySettings;
}

export type SectionData = (
  | HeaderSectionData
  | HeroSectionData
  | FeaturesSectionData
  | ImageTextSectionData
  | GallerySectionData
  | TestimonialsSectionData
  | PricingSectionData
  | FaqSectionData
  | CtaSectionData
  | FooterSectionData
) & {
  elements?: CanvasElement[];
};

export type SectionDataMap = Record<string, SectionData>;

// ─── Default section factories ──────────────────────────────────────────────

const defaultBg: SectionBackground = { type: 'color', color: 'var(--color-bg)' };
const defaultSpacing: SectionSpacing = { paddingTop: 5, paddingBottom: 5, width: 'container' };
const defaultVisible: VisibilitySettings = { desktop: true, tablet: true, mobile: true };

export function createDefaultSection(type: NodeSectionType, id: string): SectionData {
  switch (type) {
    case 'header':
      return {
        type: 'header', id,
        logo: 'Brand',
        navItems: [
          { label: 'Home', href: '#' },
          { label: 'Features', href: '#features' },
          { label: 'Pricing', href: '#pricing' },
          { label: 'About', href: '#about' },
        ],
        cta: { label: 'Get Started', href: '#' },
        background: { type: 'color', color: 'var(--color-bg)' },
        sticky: true,
        spacing: { paddingTop: 1, paddingBottom: 1, width: 'container' },
        visible: defaultVisible,
      };

    case 'hero':
      return {
        type: 'hero', id,
        layout: 'centered',
        badge: 'New ✨',
        heading: 'Build something amazing',
        subheading: 'The platform that helps you ship faster.',
        bodyText: 'Start for free. No credit card required.',
        primaryCta: { label: 'Get Started', href: '#' },
        secondaryCta: { label: 'Learn More', href: '#' },
        image: { url: 'https://picsum.photos/seed/hero/1200/600', alt: 'Hero image', isPlaceholder: true },
        background: defaultBg,
        spacing: { paddingTop: 8, paddingBottom: 8, width: 'container' },
        visible: defaultVisible,
      };

    case 'features':
      return {
        type: 'features', id,
        layout: 'grid3',
        heading: 'Everything you need',
        subheading: 'Powerful tools to help you succeed.',
        features: [
          { icon: '⚡', title: 'Lightning Fast', description: 'Optimized for speed from the ground up.' },
          { icon: '🔒', title: 'Secure by Default', description: 'Enterprise-grade security built in.' },
          { icon: '📱', title: 'Mobile First', description: 'Looks great on any device.' },
          { icon: '🎨', title: 'Fully Customizable', description: 'Make it yours with our design system.' },
          { icon: '🤝', title: 'Team Ready', description: 'Collaborate with your entire team.' },
          { icon: '📊', title: 'Analytics Built In', description: 'Understand your users from day one.' },
        ],
        background: { type: 'color', color: 'var(--color-surface)' },
        spacing: defaultSpacing,
        visible: defaultVisible,
      };

    case 'imageText':
      return {
        type: 'imageText', id,
        layout: 'imageLeft',
        heading: 'Designed for your workflow',
        bodyText: 'Our platform fits seamlessly into your existing workflow. No complicated setup, just results.',
        bullets: ['Integrate with your tools', 'Custom automations', 'Real-time sync'],
        cta: { label: 'Learn More', href: '#' },
        image: { url: 'https://picsum.photos/seed/imgtext/800/600', alt: 'Feature image', isPlaceholder: true },
        background: defaultBg,
        spacing: defaultSpacing,
        visible: defaultVisible,
      };

    case 'gallery':
      return {
        type: 'gallery', id,
        layout: 'grid3',
        heading: 'See it in action',
        items: Array.from({ length: 6 }, (_, i) => ({
          image: { url: `https://picsum.photos/seed/gallery${i}/600/400`, alt: `Gallery ${i + 1}`, isPlaceholder: true },
          caption: `Image ${i + 1}`,
        })),
        background: { type: 'color', color: 'var(--color-surface)' },
        spacing: defaultSpacing,
        visible: defaultVisible,
      };

    case 'testimonials':
      return {
        type: 'testimonials', id,
        layout: 'grid3',
        heading: 'Loved by teams worldwide',
        subheading: 'Here\'s what our customers say.',
        testimonials: [
          { quote: 'This product changed how our team works. Absolutely love it!', authorName: 'Alex Johnson', authorTitle: 'CTO at TechCorp', rating: 5 },
          { quote: 'The best investment we\'ve made this year. Highly recommended.', authorName: 'Maria Garcia', authorTitle: 'Founder at StartupXYZ', rating: 5 },
          { quote: 'Intuitive, powerful, and their support team is incredible.', authorName: 'Sam Chen', authorTitle: 'Product Lead at BigCo', rating: 5 },
        ],
        background: { type: 'color', color: 'var(--color-surface)' },
        spacing: defaultSpacing,
        visible: defaultVisible,
      };

    case 'pricing':
      return {
        type: 'pricing', id,
        heading: 'Simple, transparent pricing',
        subheading: 'No hidden fees. Cancel anytime.',
        tiers: [
          {
            name: 'Starter', price: '\$0', period: '/month',
            description: 'Perfect for individuals and small projects.',
            features: ['5 projects', '10GB storage', 'Basic analytics', 'Email support'],
            cta: { label: 'Start Free', href: '#' },
            highlighted: false,
          },
          {
            name: 'Pro', price: '\$29', period: '/month',
            description: 'Everything you need to scale your business.',
            features: ['Unlimited projects', '100GB storage', 'Advanced analytics', 'Priority support', 'Custom domains'],
            cta: { label: 'Start Trial', href: '#' },
            highlighted: true,
            badge: 'Most Popular',
          },
          {
            name: 'Enterprise', price: 'Custom',
            description: 'For large teams with custom requirements.',
            features: ['Unlimited everything', 'Dedicated support', 'SLA guarantee', 'Custom integrations', 'On-premise option'],
            cta: { label: 'Contact Sales', href: '#' },
            highlighted: false,
          },
        ],
        background: defaultBg,
        spacing: defaultSpacing,
        visible: defaultVisible,
      };

    case 'faq':
      return {
        type: 'faq', id,
        heading: 'Frequently asked questions',
        subheading: 'Can\'t find an answer? Reach out to our team.',
        items: [
          { question: 'How do I get started?', answer: 'Sign up for a free account and follow our quick-start guide. No credit card required.' },
          { question: 'Can I change my plan later?', answer: 'Yes! You can upgrade, downgrade, or cancel your plan at any time from your account settings.' },
          { question: 'Is my data secure?', answer: 'Absolutely. We use industry-standard encryption and security practices to protect your data.' },
          { question: 'Do you offer a free trial?', answer: 'Yes, our Starter plan is free forever. For Pro features, we offer a 14-day free trial.' },
        ],
        background: { type: 'color', color: 'var(--color-surface)' },
        spacing: defaultSpacing,
        visible: defaultVisible,
      };

    case 'cta':
      return {
        type: 'cta', id,
        layout: 'centered',
        heading: 'Ready to get started?',
        subheading: 'Join thousands of teams already using our platform.',
        primaryCta: { label: 'Start for Free', href: '#' },
        secondaryCta: { label: 'Talk to Sales', href: '#' },
        background: { type: 'color', color: 'var(--color-primary)' },
        spacing: { paddingTop: 8, paddingBottom: 8, width: 'container' },
        visible: defaultVisible,
      };

    case 'footer':
      return {
        type: 'footer', id,
        logo: 'Brand',
        tagline: 'Building the future, together.',
        columns: [
          { heading: 'Product', links: [{ label: 'Features', href: '#' }, { label: 'Pricing', href: '#' }, { label: 'Changelog', href: '#' }] },
          { heading: 'Company', links: [{ label: 'About', href: '#' }, { label: 'Blog', href: '#' }, { label: 'Careers', href: '#' }] },
          { heading: 'Legal', links: [{ label: 'Privacy', href: '#' }, { label: 'Terms', href: '#' }, { label: 'Security', href: '#' }] },
        ],
        copyright: `© ${new Date().getFullYear()} Brand Inc. All rights reserved.`,
        background: { type: 'color', color: '#0f172a' },
        spacing: { paddingTop: 5, paddingBottom: 3, width: 'container' },
        visible: defaultVisible,
      };
  }
}
