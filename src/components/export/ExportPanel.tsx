import { useState } from 'react';
import { Download, Code, FileJson, Image, FileText, FileCode2, Loader2, FolderArchive, CheckCircle2 } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { generatePreviewHtml } from '../../services/export/htmlExporter';
import { exportProjectToZip, type ExportZipProgress } from '../../services/export/zipExporter';
import JSZip from 'jszip';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export default function ExportPanel() {
  const project = useProjectStore((s) => s.project);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [zipProgress, setZipProgress] = useState<ExportZipProgress | null>(null);

  if (!project) {
    return <div className="p-4 text-xs text-slate-500">No project loaded.</div>;
  }

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportFullZip = async () => {
    setDownloading('zip');
    try {
      const zipBlob = await exportProjectToZip(project, (progress) => {
        setZipProgress(progress);
      });
      triggerDownload(zipBlob, `${project.name.toLowerCase().replace(/\s+/g, '-')}-website.zip`);
    } catch (err) {
      console.error('ZIP Export Error:', err);
      alert('Failed to package zip. Please check console for details.');
    } finally {
      setTimeout(() => {
        setDownloading(null);
        setZipProgress(null);
      }, 500);
    }
  };

  const handleExportHtml = () => {
    setDownloading('html');
    try {
      const html = generatePreviewHtml(project);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      triggerDownload(blob, `${project.name.toLowerCase().replace(/\s+/g, '-')}.html`);
    } finally {
      setDownloading(null);
    }
  };

  const handleExportJson = () => {
    setDownloading('json');
    try {
      const data = {
        name: project.name,
        tokens: project.tokens,
        nodes: project.nodes,
        edges: project.edges,
        sectionData: project.sectionData,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      triggerDownload(blob, `${project.name.toLowerCase().replace(/\s+/g, '-')}-graph.json`);
    } finally {
      setDownloading(null);
    }
  };

  const handleExportTokens = () => {
    setDownloading('tokens');
    try {
      const blob = new Blob([JSON.stringify(project.tokens, null, 2)], { type: 'application/json' });
      triggerDownload(blob, `${project.name.toLowerCase().replace(/\s+/g, '-')}-tokens.json`);
    } finally {
      setDownloading(null);
    }
  };

  const handleExportReact = async () => {
    setDownloading('react');
    try {
      const zip = new JSZip();
      
      // Page component
      zip.file('App.tsx', `import React from 'react';
import './index.css';

export default function App() {
  return (
    <div className="vds-app min-h-screen">
      <main>
        {/* Render sections here */}
        <p>Vibe Design Studio Generated App: ${project.name}</p>
      </main>
    </div>
  );
}`);

      // Standalone HTML template & tokens
      zip.file('design-tokens.json', JSON.stringify(project.tokens, null, 2));
      zip.file('page.html', generatePreviewHtml(project));

      const content = await zip.generateAsync({ type: 'blob' });
      triggerDownload(content, `${project.name.toLowerCase().replace(/\s+/g, '-')}-react-bundle.zip`);
    } finally {
      setDownloading(null);
    }
  };

  const handleExportImageOrPdf = async (type: 'png' | 'pdf') => {
    setDownloading(type);
    try {
      // Create hidden container to render preview
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '-99999px';
      container.style.left = '-99999px';
      container.style.width = '1200px';
      container.style.zIndex = '-1000';
      container.innerHTML = generatePreviewHtml(project);
      document.body.appendChild(container);

      // Give images & fonts a brief moment
      await new Promise((r) => setTimeout(r, 400));

      const canvas = await html2canvas(container, {
        useCORS: true,
        allowTaint: true,
        scale: 1.5,
      });

      document.body.removeChild(container);

      if (type === 'png') {
        canvas.toBlob((blob) => {
          if (blob) triggerDownload(blob, `${project.name.toLowerCase().replace(/\s+/g, '-')}-preview.png`);
        }, 'image/png');
      } else {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${project.name.toLowerCase().replace(/\s+/g, '-')}-preview.pdf`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate export file. Ensure all images allow cross-origin access.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Export Project</p>
        <p className="text-xs text-slate-400">Export clean, production-ready frontend code and assets.</p>
      </div>

      <div className="space-y-2">
        {/* Full Production Website ZIP Bundle (Recommended) */}
        <button
          onClick={handleExportFullZip}
          disabled={!!downloading}
          className="w-full flex flex-col p-3.5 rounded-xl border-2 border-indigo-500 bg-indigo-600/15 hover:bg-indigo-600/25 transition text-left group shadow-lg"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 text-white rounded-lg shadow">
                <FolderArchive className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-white">Full Website Bundle (.ZIP)</p>
                  <span className="text-[10px] font-semibold bg-indigo-500 text-white px-2 py-0.5 rounded-full">Recommended</span>
                </div>
                <p className="text-xs text-indigo-200 mt-0.5">
                  Includes HTML, CSS, JS + all photos in a dedicated <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300">photos/</code> folder
                </p>
              </div>
            </div>
            {downloading === 'zip' ? (
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            ) : (
              <Download className="w-5 h-5 text-indigo-400 group-hover:text-white transition" />
            )}
          </div>

          {zipProgress && (
            <div className="w-full mt-3 pt-2.5 border-t border-indigo-500/30">
              <div className="flex justify-between text-[11px] text-indigo-200 mb-1">
                <span>{zipProgress.status}</span>
                <span>{zipProgress.percent}%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-500 h-1.5 rounded-full transition-all duration-200"
                  style={{ width: `${zipProgress.percent}%` }}
                />
              </div>
            </div>
          )}
        </button>

        <div className="pt-2">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2">Other Formats</p>
        </div>

        <button
          onClick={handleExportHtml}
          disabled={!!downloading}
          className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 hover:border-slate-500 transition text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg group-hover:bg-indigo-600/30">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Standalone HTML / CSS</p>
              <p className="text-[11px] text-slate-400">Single responsive self-contained file</p>
            </div>
          </div>
          {downloading === 'html' ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> : <Download className="w-4 h-4 text-slate-500 group-hover:text-white" />}
        </button>

        <button
          onClick={handleExportReact}
          disabled={!!downloading}
          className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 hover:border-slate-500 transition text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg group-hover:bg-emerald-600/30">
              <FileCode2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">React Bundle (.zip)</p>
              <p className="text-[11px] text-slate-400">Starter components & style tokens</p>
            </div>
          </div>
          {downloading === 'react' ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <Download className="w-4 h-4 text-slate-500 group-hover:text-white" />}
        </button>

        <button
          onClick={handleExportTokens}
          disabled={!!downloading}
          className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 hover:border-slate-500 transition text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-600/20 text-amber-400 rounded-lg group-hover:bg-amber-600/30">
              <FileJson className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Design Tokens JSON</p>
              <p className="text-[11px] text-slate-400">Color, typography, and spacing vars</p>
            </div>
          </div>
          {downloading === 'tokens' ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : <Download className="w-4 h-4 text-slate-500 group-hover:text-white" />}
        </button>

        <button
          onClick={handleExportJson}
          disabled={!!downloading}
          className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 hover:border-slate-500 transition text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600/20 text-purple-400 rounded-lg group-hover:bg-purple-600/30">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Node Graph JSON</p>
              <p className="text-[11px] text-slate-400">Nodes, connections & full canvas state</p>
            </div>
          </div>
          {downloading === 'json' ? <Loader2 className="w-4 h-4 animate-spin text-purple-400" /> : <Download className="w-4 h-4 text-slate-500 group-hover:text-white" />}
        </button>

        <button
          onClick={() => handleExportImageOrPdf('png')}
          disabled={!!downloading}
          className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 hover:border-slate-500 transition text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg group-hover:bg-blue-600/30">
              <Image className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Full-page Screenshot (PNG)</p>
              <p className="text-[11px] text-slate-400">High-res canvas snapshot</p>
            </div>
          </div>
          {downloading === 'png' ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> : <Download className="w-4 h-4 text-slate-500 group-hover:text-white" />}
        </button>
      </div>
    </div>
  );
}
