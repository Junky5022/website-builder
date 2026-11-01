# Key Pages and Component Trees

## 1. Editor Page (`src/components/layout/AppShell.tsx`)
Entry: `src/App.tsx` (view === 'editor')
Dependencies:
- `src/components/layout/Topbar.tsx`
- `src/components/layout/LeftSidebar.tsx`
  - `src/components/canvas/NodeLibraryPanel.tsx`
  - `src/components/canvas/SectionLayersPanel.tsx`
  - `src/components/editor/DesignTokenPanel.tsx`
  - `src/components/input/SourceInputPanel.tsx`
- `src/components/canvas/InteractiveVisualCanvas.tsx`
  - `src/components/canvas/LiveDomCanvas.tsx`
  - `src/components/canvas/ElementToolbar.tsx`
  - `src/components/canvas/AddElementMenu.tsx`
  - `src/components/canvas/SandboxElementRenderer.tsx`
- `src/components/canvas/DesignCanvas.tsx` (@xyflow/react node graph)
  - `src/components/canvas/nodes/HeroNode.tsx`
  - `src/components/canvas/nodes/FeaturesNode.tsx`
  - `src/components/canvas/nodes/CtaNode.tsx`
  - `src/components/canvas/nodes/FaqNode.tsx`
  - `src/components/canvas/nodes/HeaderNode.tsx`
  - `src/components/canvas/nodes/FooterNode.tsx`
- `src/components/layout/RightSidebar.tsx`
  - `src/components/editor/ElementInspector.tsx`
  - `src/components/editor/SectionEditor.tsx`
  - `src/components/export/ExportPanel.tsx`
  - `src/components/ai/AIChatPanel.tsx`
- `src/components/preview/PreviewModal.tsx`

## 2. Project Picker Dashboard (`src/components/setup/ProjectPicker.tsx`)
Entry: `src/App.tsx` (view === 'projects')
Dependencies:
- `src/utils/storage.ts`

## 3. API Key Setup View (`src/components/setup/ApiKeySetup.tsx`)
Entry: `src/App.tsx` (view === 'api-key')
Dependencies:
- `src/utils/storage.ts`
