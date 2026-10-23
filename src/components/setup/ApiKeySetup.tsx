import { useState } from 'react';
import { Key, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';
import { setApiKey, getApiKey, setCachedModel } from '../../utils/storage';
import { resetAIProvider } from '../../services/ai/aiProvider';
import { GoogleGenAI } from '@google/genai';

interface Props { onKeySet: () => void; onCancel?: () => void; }

export default function ApiKeySetup({ onKeySet, onCancel }: Props) {
  const [key, setKey] = useState(() => getApiKey() || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) {
      setError('Please enter your Gemini API key.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Validate with Google GenAI endpoint
      const ai = new GoogleGenAI({ apiKey: trimmed });
      
      const candidatesToTry = [
        'gemini-2.5-flash',
        'gemini-3-flash-preview',
        'gemini-2.5-flash-lite',
        'gemini-2.0-flash',
      ];
      
      let verifiedModel: string | null = null;
      let lastErrMessage = '';

      for (const candidate of candidatesToTry) {
        try {
          await ai.models.generateContent({
            model: candidate,
            contents: 'ping',
          });
          verifiedModel = candidate;
          break;
        } catch (testErr: any) {
          lastErrMessage = testErr?.message || '';
          // Continue to next candidate
        }
      }

      if (!verifiedModel) {
        throw new Error(lastErrMessage || 'No supported Gemini model responded.');
      }

      // Valid! Store and reset instance
      setApiKey(trimmed);
      setCachedModel(verifiedModel);
      resetAIProvider();
      setLoading(false);
      onKeySet();
    } catch (err: any) {
      console.error('API key verification failed:', err);
      setLoading(false);
      const msg = err?.message || '';
      if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
        setError('Invalid API key. Please check your key from Google AI Studio.');
      } else if (msg.includes('PERMISSION_DENIED')) {
        setError('Permission denied. Please ensure the Gemini API is enabled for this key.');
      } else {
        setError(`Verification failed: ${msg.slice(0, 120)}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 mb-4">
            <span className="text-3xl">✨</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Vibe Design Studio</h1>
          <p className="text-slate-400 mt-2">AI-powered design prototyping tool</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-600/20 rounded-lg"><Key className="w-5 h-5 text-indigo-400" /></div>
            <div>
              <h2 className="font-semibold text-white">Set up Gemini API</h2>
              <p className="text-xs text-slate-400">Your key is stored locally only</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Gemini API Key</label>
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="AIza..."
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl py-3 transition flex items-center justify-center gap-2"
            >
              {loading ? 'Verifying Key with Google...' : 'Save & Continue →'}
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="w-full border border-slate-700 text-slate-400 hover:text-white rounded-xl py-2.5 transition text-sm"
              >
                Cancel
              </button>
            )}
          </form>

          <div className="mt-4 pt-4 border-t border-slate-700">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition"
            >
              <ExternalLink className="w-4 h-4" />
              Get a free API key from Google AI Studio
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Your API key is stored only in your browser's localStorage.<br/>
          It is never sent to any server other than Google's API.
        </p>
      </div>
    </div>
  );
}
