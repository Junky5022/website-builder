# Design System Tokens

## Token Summary
- **Color Palette**:
  - Primary: `#6366f1` (Indigo 500)
  - Secondary: `#8b5cf6` (Purple 500)
  - Accent: `#f59e0b` (Amber 500)
  - Background: `#ffffff`
  - Surface: `#f8fafc` (Slate 50)
  - Text: `#0f172a` (Slate 900)
  - Muted: `#64748b` (Slate 500)
- **Typography**:
  - Heading font: `Inter`, system-ui, sans-serif
  - Body font: `Inter`, system-ui, sans-serif
  - Base font size: 16px
- **Border Radius**:
  - Default: `8px` (`--radius`) / `md`
- **Shadows**:
  - Default: `0 4px 16px rgba(0,0,0,0.12)`
- **Framework & CSS**:
  - Tailwind CSS v4 (`@tailwindcss/vite`, `@import "tailwindcss";`)
  - CSS Variables in `:root`

## Raw CSS Source (`src/index.css`)
```css
@import "tailwindcss";

:root {
  --color-primary: #6366f1;
  --color-secondary: #8b5cf6;
  --color-accent: #f59e0b;
  --color-bg: #ffffff;
  --color-surface: #f8fafc;
  --color-text: #0f172a;
  --color-muted: #64748b;
  --font-heading: 'Inter', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-size-base: 16px;
  --radius: 8px;
  --shadow: 0 4px 16px rgba(0,0,0,0.12);
  --spacing-scale: 1;
}

* { box-sizing: border-box; }

body {
  font-family: var(--font-body);
  font-size: var(--font-size-base);
  color: var(--color-text);
  background: var(--color-bg);
  margin: 0;
  overflow: hidden;
}
```
