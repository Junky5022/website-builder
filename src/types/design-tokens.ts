export interface DesignTokenColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
}

export interface DesignTokenTypography {
  headingFont: string;
  bodyFont: string;
  baseFontSize: number; // px
}

export interface DesignTokenSpacing {
  scale: 'compact' | 'default' | 'relaxed';
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

export type ShadowStyle = 'none' | 'sm' | 'md' | 'lg';
export type ButtonStyle = 'filled' | 'outline' | 'ghost' | 'pill';

export interface DesignTokens {
  colors: DesignTokenColors;
  typography: DesignTokenTypography;
  spacing: DesignTokenSpacing;
  shadows: ShadowStyle;
  buttonStyle: ButtonStyle;
}

export const DEFAULT_TOKENS: DesignTokens = {
  colors: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    accent: '#f59e0b',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#0f172a',
    muted: '#64748b',
  },
  typography: {
    headingFont: 'Inter',
    bodyFont: 'Inter',
    baseFontSize: 16,
  },
  spacing: {
    scale: 'default',
    borderRadius: 'md',
  },
  shadows: 'md',
  buttonStyle: 'filled',
};

export function tokensToCssVars(tokens: DesignTokens): string {
  const { colors, typography, spacing, shadows, buttonStyle } = tokens;

  const borderRadiusMap: Record<string, string> = {
    none: '0px',
    sm: '4px',
    md: '8px',
    lg: '16px',
    full: '9999px',
  };

  const shadowMap: Record<string, string> = {
    none: 'none',
    sm: '0 1px 3px rgba(0,0,0,0.12)',
    md: '0 4px 16px rgba(0,0,0,0.12)',
    lg: '0 10px 40px rgba(0,0,0,0.16)',
  };

  const spacingMap: Record<string, string> = {
    compact: '0.75',
    default: '1',
    relaxed: '1.5',
  };

  return `
    --color-primary: ${colors.primary};
    --color-secondary: ${colors.secondary};
    --color-accent: ${colors.accent};
    --color-bg: ${colors.background};
    --color-surface: ${colors.surface};
    --color-text: ${colors.text};
    --color-muted: ${colors.muted};
    --font-heading: '${typography.headingFont}', system-ui, sans-serif;
    --font-body: '${typography.bodyFont}', system-ui, sans-serif;
    --font-size-base: ${typography.baseFontSize}px;
    --radius: ${borderRadiusMap[spacing.borderRadius]};
    --shadow: ${shadowMap[shadows]};
    --spacing-scale: ${spacingMap[spacing.scale]};
    --btn-style: ${buttonStyle};
  `.trim();
}
