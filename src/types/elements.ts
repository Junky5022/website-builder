export type ElementType =
  | 'heading'
  | 'text'
  | 'button'
  | 'image'
  | 'badge'
  | 'container'
  | 'card'
  | 'icon'
  | 'divider'
  | 'nav-item';

export type TextWrapMode = 'none' | 'left' | 'right' | 'break' | 'in-front' | 'behind';

export interface ElementStyle {
  fontSize?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  backgroundColor?: string;
  borderRadius?: string;
  padding?: string;
  margin?: string;
  width?: string;
  height?: string;
  maxWidth?: string;
  border?: string;
  boxShadow?: string;
  display?: 'flex' | 'block' | 'inline-block' | 'grid';
  flexDirection?: 'row' | 'column';
  alignItems?: 'start' | 'center' | 'end';
  justifyContent?: 'start' | 'center' | 'end' | 'between';
  gap?: string;
  gridCols?: number;
  // Word-style Text Wrapping & Freeplace
  wrapMode?: TextWrapMode;
  positionMode?: 'flow' | 'free';
  freeX?: number;
  freeY?: number;
  zIndex?: number;
}

export interface CanvasElement {
  id: string;
  type: ElementType;
  label?: string;
  content?: string;
  url?: string;
  alt?: string;
  icon?: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  groupId?: string;
  style?: ElementStyle;
  children?: CanvasElement[];
}

export const ELEMENT_TYPE_ICONS: Record<ElementType, string> = {
  heading: 'H',
  text: 'T',
  button: '🔘',
  image: '🖼️',
  badge: '🏷️',
  container: '📦',
  card: '🃏',
  icon: '✨',
  divider: '➖',
  'nav-item': '🔗',
};

export const ELEMENT_TYPE_LABELS: Record<ElementType, string> = {
  heading: 'Heading',
  text: 'Text',
  button: 'Button',
  image: 'Image',
  badge: 'Badge',
  container: 'Container',
  card: 'Card',
  icon: 'Icon',
  divider: 'Divider',
  'nav-item': 'Nav Link',
};
