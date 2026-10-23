import { useState, useEffect, useRef } from 'react';
import { Globe, Camera, FileCode, FolderArchive, Code, Loader2, CheckCircle, AlertCircle, ClipboardPaste, X } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import { getAIProvider } from '../../services/ai/aiProvider';
import { analysisToGraph } from '../../services/analyzer/nodeGenerator';
import { fetchPageContent, fetchUrlScreenshot, fetchRawPageHtml, prepareClonedHtmlDocument } from '../../services/analyzer/urlFetcher';

type InputMode = 'url' | 'screenshot' | 'imageFiles' | 'htmlFile' | 'code';

export default function SourceInputPanel() {
  const [mode, setMode] = useState<InputMode>('url');
  const [url, setUrl] = useState('');
  const [html, setHtml] = useState('');
  const [keepScripts, setKeepScripts] = useState(false);
  const [images, setImages] = useState<Array<{ base64: string; mimeType: string; name: string }>>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const screenshotBoxRef = useRef<HTMLDivElement>(null);

  // Helper to downscale large screenshots so localStorage doesn't overflow or crash
  const processImageFile = async (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            resolve({
              base64: dataUrl.split(',')[1] || '',
              mimeType: 'image/jpeg',
            });
            return;
          }
          // fallback
          const raw = (e.target?.result as string) || '';
          resolve({
            base64: raw.split(',')[1] || '',
            mimeType: file.type || 'image/jpeg',
          });
        };
        img.onerror = () => {
          const raw = (e.target?.result as string) || '';
          resolve({
            base64: raw.split(',')[1] || '',
            mimeType: file.type || 'image/jpeg',
          });
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // Global & box paste listener for screenshot mode
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const clipboardItems = e.clipboardData?.items;
      if (!clipboardItems) return;

      const imageItems: File[] = [];
      for (let i = 0; i < clipboardItems.length; i++) {
        const item = clipboardItems[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) imageItems.push(file);
        }
      }

      if (imageItems.length > 0) {
        e.preventDefault();
        setMode('screenshot');
        Promise.all(
          imageItems.map(async (f, idx) => {
            const processed = await processImageFile(f);
            return {
              base64: processed.base64,
              mimeType: processed.mimeType,
              name: `Screenshot ${images.length + idx + 1}`,
            };
          })
        ).then((newImages) => {
          setImages((prev) => [...prev, ...newImages]);
          setStatus('idle');
          setMessage('');
        });
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [images.length]);

  const project = useProjectStore((s) => s.project);
  const setNodes = useProjectStore((s) => s.setNodes);
  const setEdges = useProjectStore((s) => s.setEdges);
  const setSectionDataBulk = useProjectStore((s) => s.setSectionData);
  const setClonedPageHtml = useProjectStore((s) => s.setClonedPageHtml);
  const updateTokens = useProjectStore((s) => s.updateTokens);
  const setAnalyzing = useCanvasStore((s) => s.setAnalyzing);
  const setProgress = useCanvasStore((s) => s.setAnalyzeProgress);

  const ai = getAIProvider();

  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>, accept: 'html' | 'image') => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    if (accept === 'html') {
      const text = await files[0].text();
      setHtml(text);
    } else {
      const loaded = await Promise.all(
        files.map(async (f) => {
          const base64 = await fileToBase64(f);
          return { base64, mimeType: f.type, name: f.name };
        })
      );
      setImages(loaded);
    }
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip data URL prefix
        resolve(result.split(',')[1] ?? result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // Direct 1:1 Inspect Element / DOM Cloner (0 API tokens used!)
  const cloneDirectDom = async () => {
    if (!project) {
      setStatus('error');
      setMessage('No project open.');
      return;
    }

    setStatus('loading');
    setAnalyzing(true);
    setProgress('Cloning exact DOM & CSS directly (0 API tokens)…');

    try {
      if (mode === 'url') {
        if (!url.trim()) throw new Error('Please enter a URL to clone.');
        const { html: clonedHtml } = await fetchRawPageHtml(url.trim(), { keepScripts });
        setClonedPageHtml(clonedHtml, url.trim());
        setStatus('success');
        setMessage('Exact 1:1 DOM & CSS cloned onto canvas! (0 API tokens used)');
      } else if (mode === 'htmlFile' || mode === 'code') {
        if (!html.trim()) throw new Error('Please provide or paste Inspect Element HTML.');
        const baseUrl = url.trim() || undefined;
        const clonedHtml = prepareClonedHtmlDocument(html, baseUrl, { keepScripts });
        setClonedPageHtml(clonedHtml, baseUrl);
        setStatus('success');
        setMessage('Exact Inspect Element DOM cloned onto canvas! (0 API tokens used)');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err?.message ?? 'Direct DOM clone failed.');
    } finally {
      setAnalyzing(false);
      setProgress('');
    }
  };

  const analyze = async () => {
    if (mode === 'url' || mode === 'htmlFile' || mode === 'code') {
      return cloneDirectDom();
    }

    if (!ai) { setStatus('error'); setMessage('No AI provider configured. Check your API key.'); return; }
    if (!project) { setStatus('error'); setMessage('No project open.'); return; }

    setStatus('loading');
    setAnalyzing(true);
    setProgress('Sending to AI for analysis…');

    try {
      let analysis;

      if (mode === 'screenshot' || mode === 'imageFiles') {
        if (!images.length) throw new Error('Please select image files.');
        setProgress('Analyzing images with AI vision…');
        analysis = await ai.analyzeImages(images);
      } else {
        return;
      }

      setProgress('Building design canvas…');
      const { nodes, edges, sectionData } = analysisToGraph(analysis);

      // Clear any previous cloned DOM mode and apply sections
      setClonedPageHtml(undefined);
      setNodes(nodes as any);
      setEdges(edges as any);
      Object.entries(sectionData).forEach(([id, data]) => {
        setSectionDataBulk(id, data);
      });
      if (analysis.tokens) {
        updateTokens(analysis.tokens as any);
      }

      setStatus('success');
      setMessage(`Found ${nodes.length} sections! Canvas updated.`);
    } catch (err: any) {
      setStatus('error');
      let errMsg = err?.message ?? 'Analysis failed. Please try again.';
      if (errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('high demand')) {
        errMsg = 'Google Gemini servers are experiencing temporary high demand. Please click Analyze again in a few seconds.';
      }
      setMessage(errMsg);
    } finally {
      setAnalyzing(false);
      setProgress('');
    }
  };

  const modes: { id: InputMode; icon: typeof Globe; label: string }[] = [
    { id: 'url', icon: Globe, label: 'URL' },
    { id: 'screenshot', icon: Camera, label: 'Paste Screenshot' },
    { id: 'imageFiles', icon: FolderArchive, label: 'Image Files' },
    { id: 'htmlFile', icon: FileCode, label: 'HTML File' },
    { id: 'code', icon: Code, label: 'Paste Code' },
  ];

  return (
    <div className="p-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Analyze Source</p>

      {/* Mode tabs */}
      <div className="flex flex-wrap gap-1 mb-4">
        {modes.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => { setMode(id); setStatus('idle'); setMessage(''); }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${mode === id ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="space-y-3">
        {mode === 'url' && (
          <>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 text-xs text-emerald-300">
              ⚡ <strong>Direct 1:1 DOM Cloner (0 API Tokens)</strong>: Clones the exact HTML & CSS from the URL straight onto the interactive Canva sandbox.
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.andelemandele.lv/"
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              onKeyDown={(e) => e.key === 'Enter' && analyze()}
            />
            <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-800/70 border border-slate-700 cursor-pointer hover:border-slate-600 transition">
              <input
                type="checkbox"
                checked={keepScripts}
                onChange={(e) => setKeepScripts(e.target.checked)}
                className="mt-0.5 rounded border-slate-600 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="text-[11px] leading-relaxed">
                <span className="font-semibold text-slate-200 block">Include Page JavaScript (Experimental)</span>
                <span className="text-slate-400">
                  Runs the website&apos;s scripts to initialize dynamic UI/menus. Leave off if a site&apos;s scripts interfere with dragging.
                </span>
              </div>
            </label>
          </>
        )}

        {mode === 'screenshot' && (
          <div className="space-y-3">
            <div
              ref={screenshotBoxRef}
              tabIndex={0}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={async (e) => {
                e.preventDefault();
                setIsDragging(false);
                const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                if (files.length > 0) {
                  const loaded = await Promise.all(
                    files.map(async (f, idx) => ({
                      base64: await fileToBase64(f),
                      mimeType: f.type,
                      name: f.name || `Dropped Image ${idx + 1}`,
                    }))
                  );
                  setImages(prev => [...prev, ...loaded]);
                }
              }}
              className={`border-2 border-dashed rounded-xl p-5 text-center transition cursor-pointer outline-none ${
                isDragging ? 'border-indigo-400 bg-indigo-500/10' : 'border-slate-700 hover:border-indigo-500 bg-slate-800/60'
              }`}
            >
              <ClipboardPaste className="w-8 h-8 text-indigo-400 mx-auto mb-2 opacity-80" />
              <p className="text-xs font-semibold text-white mb-1">
                Press <kbd className="px-1.5 py-0.5 bg-slate-700 border border-slate-600 rounded text-[11px] text-slate-200">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-slate-700 border border-slate-600 rounded text-[11px] text-slate-200">V</kbd> anywhere to paste
              </p>
              <p className="text-[11px] text-slate-400">
                Take a snippet (Win + Shift + S) and paste directly here. Or drag & drop.
              </p>
            </div>

            {images.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{images.length} screenshot(s) ready</span>
                  <button
                    onClick={() => setImages([])}
                    className="text-red-400 hover:text-red-300 text-[11px]"
                  >
                    Clear all
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group border border-slate-700 rounded-lg overflow-hidden bg-slate-900">
                      <img
                        src={`data:${img.mimeType};base64,${img.base64}`}
                        alt={img.name}
                        className="w-full h-20 object-cover"
                      />
                      <button
                        onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 p-1 bg-slate-900/80 hover:bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <p className="text-[10px] text-slate-400 p-1 truncate bg-slate-900/90">{img.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {mode === 'htmlFile' && (
          <div>
            <label className="block text-xs text-slate-400 mb-2">Upload an HTML file</label>
            <input
              type="file"
              accept=".html,.htm"
              onChange={(e) => handleFilesChange(e, 'html')}
              className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white file:text-xs file:cursor-pointer cursor-pointer"
            />
            {html && <p className="text-xs text-emerald-400 mt-1">HTML loaded ({html.length.toLocaleString()} chars)</p>}
          </div>
        )}

        {mode === 'imageFiles' && (
          <div>
            <label className="block text-xs text-slate-400 mb-2">Upload image files to analyze</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFilesChange(e, 'image')}
              className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white file:text-xs file:cursor-pointer cursor-pointer"
            />
            {images.length > 0 && <p className="text-xs text-emerald-400 mt-1">{images.length} image(s) selected</p>}
          </div>
        )}

        {mode === 'code' && (
          <div className="space-y-2">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 text-xs text-emerald-300">
              💡 <strong>Inspect Element Tip:</strong> On any website, press <kbd className="px-1 bg-slate-800 rounded">F12</kbd>, right-click the top <code>&lt;html&gt;</code> tag → <strong>Copy → Copy outerHTML</strong>, and paste it below for an instant 100% exact clone (0 API tokens)!
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Optional base URL for images/CSS (e.g. https://www.andelemandele.lv)"
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              placeholder="Paste Inspect Element outerHTML or HTML/CSS code here…"
              className="w-full h-40 bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono resize-none"
            />
          </div>
        )}

        {/* Status */}
        {status !== 'idle' && (
          <div className={`flex items-start gap-2 text-xs p-2.5 rounded-lg ${
            status === 'loading' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
            status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
            'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {status === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0 mt-0.5" />}
            {status === 'success' && <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
            {status === 'error' && <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
            <span>{status === 'loading' ? useCanvasStore.getState().analyzeProgress || 'Analyzing…' : message}</span>
          </div>
        )}

        <button
          onClick={analyze}
          disabled={status === 'loading'}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl py-2.5 transition"
        >
          {status === 'loading'
            ? 'Working…'
            : mode === 'url' || mode === 'code' || mode === 'htmlFile'
            ? '⚡ Instant 1:1 DOM Clone (0 Tokens)'
            : '✨ Analyze Screenshots with AI'}
        </button>
      </div>
    </div>
  );
}
