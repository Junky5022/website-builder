import { getApiKey, getOAuthConfig } from '../../utils/storage';
import { GeminiProvider } from './geminiProvider';
import type { AIProvider } from '../../types/ai';

let _instance: AIProvider | null = null;
let _authSignature: string | null = null;

export function getAIProvider(): AIProvider | null {
  const oauth = getOAuthConfig();
  if (oauth && oauth.accessToken) {
    const sig = `oauth:${oauth.accessToken}:${oauth.projectId || ''}`;
    if (sig !== _authSignature || !_instance) {
      _instance = new GeminiProvider(oauth);
      _authSignature = sig;
    }
    return _instance;
  }

  const key = getApiKey();
  if (!key) return null;
  const sig = `key:${key}`;
  if (sig !== _authSignature || !_instance) {
    _instance = new GeminiProvider(key);
    _authSignature = sig;
  }
  return _instance;
}

export function resetAIProvider(): void {
  _instance = null;
  _authSignature = null;
}
