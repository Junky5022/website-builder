import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, Trash2 } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import { getAIProvider } from '../../services/ai/aiProvider';
import { generateId } from '../../utils/storage';
import ChangePreview from './ChangePreview';
import type { ChatMessage } from '../../types/ai';

export default function AIChatPanel() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const project = useProjectStore((s) => s.project);
  const addChatMessage = useProjectStore((s) => s.addChatMessage);
  const clearChat = useProjectStore((s) => s.clearChat);
  const addPendingChange = useProjectStore((s) => s.addPendingChange);
  const pendingChanges = useProjectStore((s) => s.pendingChanges);
  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);

  const messages = project?.chatHistory ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingChanges]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const ai = getAIProvider();
    if (!ai) {
      addChatMessage({ id: generateId(), role: 'system', content: 'No AI provider configured.', timestamp: Date.now() });
      return;
    }

    const userMsg: ChatMessage = { id: generateId(), role: 'user', content: text, timestamp: Date.now() };
    addChatMessage(userMsg);
    setInput('');
    setIsLoading(true);

    try {
      const selectedDomContext = useCanvasStore.getState().selectedDomContext;

      const context = {
        projectName: project?.name ?? 'Project',
        tokens: project?.tokens!,
        sections: (project?.nodes ?? []).map((n) => ({
          id: n.id,
          type: n.data.nodeType,
          label: n.data.label,
          data: project?.sectionData[n.data.sectionDataId]!,
        })),
        selectedNodeIds,
        clonedPageHtml: project?.clonedPageHtml,
        selectedElementContext: selectedDomContext || undefined,
      };

      const allMessages = [...messages, userMsg];
      const result = await ai.chat(allMessages, context);

      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: result.explanation,
        timestamp: Date.now(),
      };
      addChatMessage(assistantMsg);

      result.changes.forEach((c) => addPendingChange(c));
    } catch (err: any) {
      addChatMessage({
        id: generateId(),
        role: 'system',
        content: `Error: ${err?.message ?? 'AI request failed'}`,
        timestamp: Date.now(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const activePending = pendingChanges.filter((c) => c.status === 'pending');

  const suggestions = [
    'Make the hero more bold and modern',
    'Change the color palette to dark mode',
    'Make the typography more premium',
    'Simplify the navigation',
    'Add a new CTA section',
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-white">Vibe AI</span>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="w-10 h-10 text-indigo-400 mx-auto mb-3 opacity-60" />
            <p className="text-sm text-slate-400 mb-4">Ask me to modify your design</p>
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s)}
                  className="w-full text-xs text-left px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition border border-slate-700 hover:border-slate-600"
                >
                  "{s}"
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user' ? 'bg-indigo-600' : msg.role === 'system' ? 'bg-slate-700' : 'bg-purple-700'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
            </div>
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
              msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' :
              msg.role === 'system' ? 'bg-red-900/30 text-red-400 border border-red-800' :
              'bg-slate-800 text-slate-200 rounded-tl-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-purple-700 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-slate-800 px-3 py-2 rounded-xl rounded-tl-sm">
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
            </div>
          </div>
        )}

        {/* Pending changes */}
        {activePending.length > 0 && (
          <div className="space-y-2">
            {activePending.map((change) => (
              <ChangePreview key={change.id} change={change} />
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-700">
        {useCanvasStore.getState().selectedDomContext ? (
          <div className="flex items-center gap-1.5 text-xs text-indigo-400 mb-2 truncate">
            <span className="font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 font-mono text-[10px]">
              &lt;{useCanvasStore.getState().selectedDomContext?.tagName}&gt;
            </span>
            <span className="truncate text-slate-300">
              "{useCanvasStore.getState().selectedDomContext?.text.slice(0, 40)}"
            </span>
          </div>
        ) : selectedNodeIds.length > 0 ? (
          <p className="text-xs text-indigo-400 mb-2">
            {selectedNodeIds.length} section{selectedNodeIds.length > 1 ? 's' : ''} selected
          </p>
        ) : null}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="Describe a design change…"
            rows={2}
            className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none transition"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition self-end"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
