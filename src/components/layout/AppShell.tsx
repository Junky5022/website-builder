import { useEffect, useCallback } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import Topbar from './Topbar';
import DesignCanvas from '../canvas/DesignCanvas';
import InteractiveVisualCanvas from '../canvas/InteractiveVisualCanvas';
import PreviewModal from '../preview/PreviewModal';
import UpdateNotification from './UpdateNotification';

interface Props { onBackToProjects: () => void; onManageApiKey?: () => void; }

export default function AppShell({ onBackToProjects, onManageApiKey }: Props) {
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const isPreviewOpen = useCanvasStore((s) => s.isPreviewOpen);
  const viewMode = useCanvasStore((s) => s.viewMode);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
  }, [undo, redo]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex flex-col h-screen bg-slate-950 overflow-hidden">
      <Topbar onBackToProjects={onBackToProjects} onManageApiKey={onManageApiKey} />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        <main className="flex-1 overflow-hidden bg-slate-950 flex flex-col">
          {viewMode === 'canvas' ? <InteractiveVisualCanvas /> : <DesignCanvas />}
        </main>
        <RightSidebar />
      </div>
      {isPreviewOpen && <PreviewModal />}
      <UpdateNotification />
    </div>
  );
}
