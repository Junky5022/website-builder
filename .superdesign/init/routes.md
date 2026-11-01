# Routes and Views

The application is an Electron + React single-page desktop application (`App.tsx`) with state-driven views instead of multi-page URL routes:

## Views:
1. **`api-key` (`ApiKeySetup.tsx`)**
   - Setup / welcome view when no Google Gemini API key is configured.
   - Allows users to enter API key and select default AI models.

2. **`projects` (`ProjectPicker.tsx`)**
   - Project dashboard and management screen.
   - Lists saved websites, thumbnail previews, last edited time, delete button, and "New Project" modal.

3. **`editor` (`AppShell.tsx`)**
   - Main workspace with Canva-style website builder.
   - Features:
     - Top navigation and controls bar (`Topbar.tsx`)
     - Left toolbox (`LeftSidebar.tsx`: Layers, Sections library, Elements, Brand tokens)
     - Central infinite workspace:
       - **Page Visual Canvas** (`InteractiveVisualCanvas.tsx` / `LiveDomCanvas.tsx`)
       - **Flow Node Graph** (`DesignCanvas.tsx` via `@xyflow/react`)
     - Right properties sidebar (`RightSidebar.tsx`: Element Inspector, Section Settings, Export, AI Chat)
     - Fullscreen live preview (`PreviewModal.tsx`)
