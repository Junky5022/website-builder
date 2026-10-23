import { useEffect, useState } from 'react';
import { getApiKey, getActiveProjectId, loadProject, createBlankProject, saveProject } from './utils/storage';
import { useProjectStore } from './store/useProjectStore';
import ApiKeySetup from './components/setup/ApiKeySetup';
import ProjectPicker from './components/setup/ProjectPicker';
import AppShell from './components/layout/AppShell';

type AppView = 'api-key' | 'projects' | 'editor';

export default function App() {
  const [view, setView] = useState<AppView>('api-key');
  const setProject = useProjectStore((s) => s.setProject);

  useEffect(() => {
    const key = getApiKey();
    if (!key) { setView('api-key'); return; }

    const activeId = getActiveProjectId();
    if (activeId) {
      try {
        const p = loadProject(activeId);
        if (p) {
          setProject(p);
          setView('editor');
          return;
        }
      } catch (err) {
        console.error('Failed to load active project:', err);
        localStorage.removeItem('vds:active-project');
      }
    }
    setView('projects');
  }, []);

  const handleApiKeySet = () => {
    const activeId = getActiveProjectId();
    if (activeId) {
      const p = loadProject(activeId);
      if (p) { setProject(p); setView('editor'); return; }
    }
    setView('projects');
  };

  const handleProjectSelected = (projectId: string) => {
    const p = loadProject(projectId);
    if (p) { setProject(p); setView('editor'); }
  };

  const handleProjectCreated = (name: string) => {
    const p = createBlankProject(name);
    saveProject(p);
    setProject(p);
    setView('editor');
  };

  if (view === 'api-key') {
    return (
      <ApiKeySetup
        onKeySet={handleApiKeySet}
        onCancel={() => {
          if (getActiveProjectId() && loadProject(getActiveProjectId()!)) {
            setView('editor');
          } else {
            setView('projects');
          }
        }}
      />
    );
  }
  if (view === 'projects') return (
    <ProjectPicker
      onSelect={handleProjectSelected}
      onCreate={handleProjectCreated}
      onChangeKey={() => setView('api-key')}
    />
  );
  return (
    <AppShell
      onBackToProjects={() => setView('projects')}
      onManageApiKey={() => setView('api-key')}
    />
  );
}
