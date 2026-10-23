import { getApiKey } from '../../utils/storage';
import { GeminiProvider } from './geminiProvider';
import type { AIProvider } from '../../types/ai';

let _instance: AIProvider | null = null;
let _apiKey: string | null = null;

export function getAIProvider(): AIProvider | null {
  const key = getApiKey();
  if (!key) return null;
  if (key !== _apiKey || !_instance) {
    _instance = new GeminiProvider(key);
    _apiKey = key;
  }
  return _instance;
}

export function resetAIProvider(): void {
  _instance = null;
  _apiKey = null;
}
