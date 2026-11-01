import { useState, useRef } from 'react';
import {
  LogIn,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Upload,
  Terminal,
  Key,
  ChevronDown,
  ChevronUp,
  LogOut,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import {
  setApiKey,
  getApiKey,
  clearApiKey,
  setCachedModel,
  getOAuthConfig,
  setOAuthConfig,
  clearOAuthConfig,
  type GeminiOAuthConfig,
} from '../../utils/storage';
import { resetAIProvider } from '../../services/ai/aiProvider';
import { createOAuthFetch } from '../../services/ai/geminiProvider';
import { GoogleGenAI } from '@google/genai';

interface Props {
  onKeySet: () => void;
  onCancel?: () => void;
}

const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-3-flash-preview',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
];

const SAVED_OAUTH_CLIENT_KEY = 'vds:google-oauth-client';

interface SavedOAuthClient {
  clientId: string;
  clientSecret?: string;
  projectId?: string;
}

function getSavedOAuthClient(): SavedOAuthClient {
  try {
    const raw = localStorage.getItem(SAVED_OAUTH_CLIENT_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { clientId: '', clientSecret: '', projectId: '' };
}

function saveOAuthClient(client: SavedOAuthClient) {
  localStorage.setItem(SAVED_OAUTH_CLIENT_KEY, JSON.stringify(client));
}

export default function ApiKeySetup({ onKeySet, onCancel }: Props) {
  const existingOAuth = getOAuthConfig();
  const savedClient = getSavedOAuthClient();

  const [authTab, setAuthTab] = useState<'google-oauth' | 'oauth-token'>('google-oauth');
  const [clientId, setClientId] = useState(existingOAuth?.clientId || savedClient.clientId || '');
  const [clientSecret, setClientSecret] = useState(existingOAuth?.clientSecret || savedClient.clientSecret || '');
  const [projectId, setProjectId] = useState(existingOAuth?.projectId || savedClient.projectId || '');
  const [showClientConfig, setShowClientConfig] = useState(false);

  // Direct OAuth token state
  const [manualAccessToken, setManualAccessToken] = useState(existingOAuth?.accessToken || '');
  const [manualProjectId, setManualProjectId] = useState(existingOAuth?.projectId || '');

  // Legacy API Key collapsible fallback
  const [showLegacyKey, setShowLegacyKey] = useState(false);
  const [legacyKey, setLegacyKey] = useState(() => getApiKey() || '');

  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isElectron = Boolean((window as any).electronAPI?.isElectron);

  const verifyAndSaveOAuth = async (config: GeminiOAuthConfig) => {
    setStatusMsg('Verifying Gemini OAuth access with Google...');
    const ai = new GoogleGenAI({
      apiKey: 'OAUTH_BEARER_MODE',
      httpOptions: {
        fetch: createOAuthFetch(config),
      },
    });

    let verifiedModel: string | null = null;
    let lastErrMessage = '';

    for (const candidate of CANDIDATE_MODELS) {
      try {
        await ai.models.generateContent({
          model: candidate,
          contents: 'ping',
        });
        verifiedModel = candidate;
        break;
      } catch (testErr: any) {
        lastErrMessage = testErr?.message || String(testErr);
      }
    }

    if (!verifiedModel) {
      throw new Error(lastErrMessage || 'No supported Gemini model responded with this OAuth account.');
    }

    setOAuthConfig(config);
    setCachedModel(verifiedModel);
    resetAIProvider();
    setLoading(false);
    setStatusMsg('');
    onKeySet();
  };

  // 1. Primary Sign in with Google handler
  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    const win = window as any;

    try {
      // Step A: If in Electron and no custom Client ID is forced open, try automatic local Google ADC / gcloud session first
      if (win.electronAPI?.getGcloudToken && (!clientId.trim() || !showClientConfig)) {
        setStatusMsg('Checking local Google Account credentials...');
        const adcResult = await win.electronAPI.getGcloudToken();
        if (adcResult?.accessToken) {
          const config: GeminiOAuthConfig = {
            accessToken: adcResult.accessToken,
            projectId: projectId.trim() || adcResult.projectId,
            email: adcResult.email,
            name: adcResult.name,
            picture: adcResult.picture,
            expiresAt: Date.now() + 50 * 60 * 1000,
            source: 'adc',
          };
          await verifyAndSaveOAuth(config);
          return;
        }
      }

      // Step B: If Client ID is provided, run interactive Google OAuth 2.0 browser flow
      const trimmedClientId = clientId.trim();
      if (!trimmedClientId) {
        setShowClientConfig(true);
        setLoading(false);
        setStatusMsg('');
        setError(
          isElectron
            ? 'No local Google credentials detected. Upload your client_secret.json or enter a Google OAuth Client ID below (or sign in via Google Cloud CLI).'
            : 'Please upload your Google OAuth client_secret.json or enter your OAuth Client ID below to launch Google Sign-In.'
        );
        return;
      }

      saveOAuthClient({
        clientId: trimmedClientId,
        clientSecret: clientSecret.trim() || undefined,
        projectId: projectId.trim() || undefined,
      });

      if (win.electronAPI?.startGoogleOAuth) {
        setStatusMsg('Waiting for Google Sign-In in your browser...');
        const oauthResult = await win.electronAPI.startGoogleOAuth({
          clientId: trimmedClientId,
          clientSecret: clientSecret.trim() || undefined,
          projectId: projectId.trim() || undefined,
        });

        const config: GeminiOAuthConfig = {
          accessToken: oauthResult.accessToken,
          refreshToken: oauthResult.refreshToken,
          expiresAt: oauthResult.expiresAt,
          clientId: oauthResult.clientId,
          clientSecret: oauthResult.clientSecret,
          projectId: oauthResult.projectId || projectId.trim() || undefined,
          email: oauthResult.email,
          name: oauthResult.name,
          picture: oauthResult.picture,
          source: 'google-oauth',
        };
        await verifyAndSaveOAuth(config);
        return;
      }

      // Step C: Web browser OAuth 2.0 implicit popup flow
      setStatusMsg('Opening Google Sign-In popup...');
      const redirectUri = window.location.origin + window.location.pathname;
      const scope = [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/generative-language.retriever',
      ].join(' ');

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', trimmedClientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'token');
      authUrl.searchParams.set('scope', scope);
      authUrl.searchParams.set('include_granted_scopes', 'true');
      authUrl.searchParams.set('prompt', 'consent select_account');

      const popup = window.open(authUrl.toString(), 'google-oauth-popup', 'width=520,height=640');
      if (!popup) {
        throw new Error('Popup blocked by browser. Please allow popups for this site.');
      }

      const tokenData = await new Promise<{ accessToken: string; expiresIn: number }>((resolve, reject) => {
        const timer = setInterval(() => {
          try {
            if (popup.closed) {
              clearInterval(timer);
              reject(new Error('Google Sign-In window was closed before completing authentication.'));
              return;
            }
            if (popup.location.origin === window.location.origin && popup.location.hash) {
              const hashParams = new URLSearchParams(popup.location.hash.substring(1));
              const accessToken = hashParams.get('access_token');
              const errParam = hashParams.get('error');
              if (errParam) {
                clearInterval(timer);
                popup.close();
                reject(new Error(`Google OAuth error: ${errParam}`));
                return;
              }
              if (accessToken) {
                const expiresIn = Number(hashParams.get('expires_in') || 3600);
                clearInterval(timer);
                popup.close();
                resolve({ accessToken, expiresIn });
              }
            }
          } catch {
            // Cross-origin while on accounts.google.com — ignore until redirected back
          }
        }, 400);
      });

      // Fetch user info
      let userProfile: { email?: string; name?: string; picture?: string } = {};
      try {
        const uRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenData.accessToken}` },
        });
        if (uRes.ok) {
          userProfile = await uRes.json();
        }
      } catch {
        // non-fatal
      }

      const config: GeminiOAuthConfig = {
        accessToken: tokenData.accessToken,
        expiresAt: Date.now() + tokenData.expiresIn * 1000,
        clientId: trimmedClientId,
        projectId: projectId.trim() || undefined,
        email: userProfile.email,
        name: userProfile.name,
        picture: userProfile.picture,
        source: 'google-oauth',
      };

      await verifyAndSaveOAuth(config);
    } catch (err: any) {
      console.error('Google OAuth failed:', err);
      setLoading(false);
      setStatusMsg('');
      const msg = err?.message || String(err);
      if (msg.includes('USER_PROJECT_DENIED') || msg.includes('x-goog-user-project') || msg.includes('quota_project_id')) {
        setError('Google Cloud Project ID is required for your OAuth account. Please enter your Project ID below and try again.');
        setShowClientConfig(true);
      } else {
        setError(msg.slice(0, 220));
      }
    }
  };

  // Handle uploading client_secret.json from Google Cloud Console
  const handleClientSecretFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const block = json.installed || json.web || json;
      if (block.client_id) {
        setClientId(block.client_id);
        if (block.client_secret) setClientSecret(block.client_secret);
        if (block.project_id) setProjectId(block.project_id);
        saveOAuthClient({
          clientId: block.client_id,
          clientSecret: block.client_secret,
          projectId: block.project_id,
        });
        setError('');
        setStatusMsg('Loaded OAuth credentials from client_secret.json! Click "Sign in with Google" to continue.');
      } else if (json.type === 'authorized_user' && json.refresh_token && json.client_id) {
        // They uploaded an application_default_credentials.json directly!
        setLoading(true);
        setStatusMsg('Exchanging authorized_user refresh token for access token...');
        const body = new URLSearchParams({
          client_id: json.client_id,
          client_secret: json.client_secret || '',
          refresh_token: json.refresh_token,
          grant_type: 'refresh_token',
        });
        const res = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        });
        const tokenData = await res.json();
        if (!res.ok || !tokenData.access_token) {
          throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange refresh token');
        }
        const config: GeminiOAuthConfig = {
          accessToken: tokenData.access_token,
          refreshToken: json.refresh_token,
          clientId: json.client_id,
          clientSecret: json.client_secret,
          projectId: json.quota_project_id || projectId.trim() || undefined,
          expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
          source: 'adc',
        };
        await verifyAndSaveOAuth(config);
      } else {
        setError('Could not find client_id in the uploaded JSON file.');
      }
    } catch (err: any) {
      setLoading(false);
      setError(`Invalid JSON file: ${err?.message || 'Unable to parse'}`);
    }
  };

  // 2. Direct OAuth Bearer Token submit
  const handleManualTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = manualAccessToken.trim().replace(/^Bearer\s+/i, '');
    if (!token) {
      setError('Please enter an OAuth 2.0 Access Token (starts with ya29...).');
      return;
    }
    setLoading(true);
    setError('');
    try {
      let userProfile: { email?: string; name?: string; picture?: string } = {};
      try {
        const uRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (uRes.ok) userProfile = await uRes.json();
      } catch {
        // ignore
      }

      const config: GeminiOAuthConfig = {
        accessToken: token,
        projectId: manualProjectId.trim() || undefined,
        email: userProfile.email,
        name: userProfile.name,
        picture: userProfile.picture,
        expiresAt: Date.now() + 55 * 60 * 1000,
        source: 'google-oauth',
      };
      await verifyAndSaveOAuth(config);
    } catch (err: any) {
      setLoading(false);
      setStatusMsg('');
      setError(`OAuth token verification failed: ${(err?.message || '').slice(0, 180)}`);
    }
  };

  // 3. Legacy API key fallback submit
  const handleLegacyKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = legacyKey.trim();
    if (!trimmed) {
      setError('Please enter your Gemini API key.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const ai = new GoogleGenAI({ apiKey: trimmed });
      let verifiedModel: string | null = null;
      let lastErrMessage = '';

      for (const candidate of CANDIDATE_MODELS) {
        try {
          await ai.models.generateContent({ model: candidate, contents: 'ping' });
          verifiedModel = candidate;
          break;
        } catch (testErr: any) {
          lastErrMessage = testErr?.message || '';
        }
      }

      if (!verifiedModel) {
        throw new Error(lastErrMessage || 'No supported Gemini model responded.');
      }

      clearOAuthConfig();
      setApiKey(trimmed);
      setCachedModel(verifiedModel);
      resetAIProvider();
      setLoading(false);
      onKeySet();
    } catch (err: any) {
      setLoading(false);
      setError(`Verification failed: ${(err?.message || '').slice(0, 140)}`);
    }
  };

  const handleSignOut = () => {
    clearOAuthConfig();
    clearApiKey();
    resetAIProvider();
    setManualAccessToken('');
    setStatusMsg('Signed out of Google OAuth session.');
  };

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 mb-3 shadow-lg shadow-indigo-600/30">
            <span className="text-3xl">✨</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Vibe Design Studio</h1>
          <p className="text-slate-400 mt-1 text-sm">Sign in with Google OAuth to use your Gemini subscription & account</p>
        </div>

        {/* Active OAuth Account Banner if already signed in */}
        {existingOAuth?.accessToken && (
          <div className="bg-emerald-950/50 border border-emerald-500/40 rounded-2xl p-4 mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {existingOAuth.picture ? (
                <img src={existingOAuth.picture} alt="" className="w-10 h-10 rounded-full border border-emerald-400/50" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-300 font-bold">
                  {(existingOAuth.name || existingOAuth.email || 'G')[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm font-semibold text-white truncate">
                    {existingOAuth.name || existingOAuth.email || 'Google OAuth Connected'}
                  </span>
                </div>
                <p className="text-xs text-emerald-300/80 truncate">
                  {existingOAuth.email ? `${existingOAuth.email} • ` : ''}
                  {existingOAuth.source === 'adc' ? 'Local Google Account (ADC)' : 'OAuth 2.0 Bearer Session'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={onKeySet}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition"
              >
                Continue →
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-slate-800/95 border border-slate-700 rounded-2xl p-6 shadow-2xl">
          {/* Mode Tabs */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700/80 mb-5">
            <button
              type="button"
              onClick={() => { setAuthTab('google-oauth'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                authTab === 'google-oauth'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign in with Google
            </button>
            <button
              type="button"
              onClick={() => { setAuthTab('oauth-token'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                authTab === 'oauth-token'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              OAuth Token / CLI
            </button>
          </div>

          {authTab === 'google-oauth' ? (
            <div className="space-y-4">
              {/* Google Sign-In Primary Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full bg-white hover:bg-slate-100 disabled:opacity-60 text-slate-900 font-semibold rounded-xl py-3.5 px-4 transition flex items-center justify-center gap-3 shadow-md"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>{loading ? 'Connecting to Google...' : 'Continue with Google OAuth'}</span>
              </button>

              {/* Upload client_secret.json or Configure OAuth Client */}
              <div className="bg-slate-900/70 border border-slate-700/80 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowClientConfig(!showClientConfig)}
                    className="flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white transition"
                  >
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    <span>
                      {clientId
                        ? 'Google OAuth Client Configured'
                        : 'Configure Google OAuth Client / Upload JSON'}
                    </span>
                    {showClientConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleClientSecretFile}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-2.5 py-1.5 rounded-lg transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload JSON
                  </button>
                </div>

                {showClientConfig && (
                  <div className="space-y-2.5 pt-2 border-t border-slate-800">
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Upload your <code className="text-indigo-300">client_secret.json</code> (or{' '}
                      <code className="text-indigo-300">application_default_credentials.json</code>) or enter your OAuth 2.0 Client ID from{' '}
                      <a
                        href="https://console.cloud.google.com/apis/credentials"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:underline inline-flex items-center gap-0.5"
                      >
                        Google Cloud Console <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                      .
                    </p>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        OAuth 2.0 Client ID
                      </label>
                      <input
                        type="text"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        placeholder="123456789-abc...apps.googleusercontent.com"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    {isElectron && (
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">
                          Client Secret <span className="text-slate-600">(Desktop OAuth apps)</span>
                        </label>
                        <input
                          type="password"
                          value={clientSecret}
                          onChange={(e) => setClientSecret(e.target.value)}
                          placeholder="GOCSPX-..."
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Google Cloud Project ID <span className="text-slate-600">(Optional quota project)</span>
                      </label>
                      <input
                        type="text"
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                        placeholder="my-gemini-project-123"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Tab 2: Direct OAuth Token or Google Cloud CLI login */
            <form onSubmit={handleManualTokenSubmit} className="space-y-4">
              <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300">
                    Option A: One-command Google OAuth Login (CLI)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyCommand(
                        'gcloud auth application-default login --scopes="openid,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/generative-language.retriever"'
                      )
                    }
                    className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
                  >
                    {copiedCmd ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedCmd ? 'Copied!' : 'Copy command'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Run this in PowerShell/Terminal to sign in with your Google account in your browser. In the desktop app, clicking{' '}
                  <strong className="text-slate-200">Continue with Google OAuth</strong> will automatically pick up your signed-in account!
                </p>
                {isElectron && (
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full mt-1 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold py-2 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Auto-Detect Local Google Account Now
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Option B: Paste OAuth 2.0 Access Token
                  </label>
                  <input
                    type="password"
                    value={manualAccessToken}
                    onChange={(e) => setManualAccessToken(e.target.value)}
                    placeholder="ya29.a0AXooCgv..."
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Generate with <code className="text-slate-400">gcloud auth print-access-token</code> or Google OAuth Playground.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Google Cloud Project ID <span className="text-slate-500">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={manualProjectId}
                    onChange={(e) => setManualProjectId(e.target.value)}
                    placeholder="my-gcp-project-id"
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl py-3 transition text-sm"
                >
                  {loading ? 'Verifying OAuth Token...' : 'Verify & Connect OAuth Token →'}
                </button>
              </div>
            </form>
          )}

          {/* Status & Error Messages */}
          {statusMsg && !error && (
            <div className="mt-4 flex items-center gap-2 text-indigo-300 text-xs bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-3.5 py-2.5">
              <RefreshCw className={`w-4 h-4 flex-shrink-0 ${loading ? 'animate-spin' : ''}`} />
              <span>{statusMsg}</span>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2 text-red-400 text-xs bg-red-400/10 border border-red-500/20 rounded-xl px-3.5 py-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full mt-4 border border-slate-700 text-slate-400 hover:text-white rounded-xl py-2.5 transition text-sm"
            >
              Cancel
            </button>
          )}

          {/* Collapsible Legacy API Key Fallback */}
          <div className="mt-5 pt-4 border-t border-slate-700/70">
            <button
              type="button"
              onClick={() => setShowLegacyKey(!showLegacyKey)}
              className="flex items-center justify-between w-full text-xs text-slate-400 hover:text-slate-200 transition"
            >
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                Or use a legacy Gemini API Key instead
              </span>
              {showLegacyKey ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showLegacyKey && (
              <form onSubmit={handleLegacyKeySubmit} className="mt-3 space-y-2.5">
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={legacyKey}
                    onChange={(e) => setLegacyKey(e.target.value)}
                    placeholder="AIza..."
                    className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
                  >
                    Save Key
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-5">
          Your OAuth tokens are stored locally on your device and sent directly to Google's Gemini API using Bearer authentication.
        </p>
      </div>
    </div>
  );
}
