import { GoogleGenAI } from '@google/genai';
import type { AIProvider, ChatMessage, PageAnalysis, DesignContext, AIChange } from '../../types/ai';
import { generateId, getCachedModel, setCachedModel } from '../../utils/storage';
import { ANALYSIS_SYSTEM_PROMPT, CHAT_SYSTEM_PROMPT, buildAnalysisPrompt, buildChatPrompt } from './prompts';

// Only include current active v1beta models (gemini-1.5-* are retired on v1beta)
const FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-3-flash-preview',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
];

function isNotFoundError(err: any): boolean {
  const msg = String(err?.message || err || '').toLowerCase();
  const status = err?.status || err?.code || 0;
  return status === 404 || msg.includes('404') || msg.includes('not found') || msg.includes('not_found');
}

function isTransientError(err: any): boolean {
  const msg = String(err?.message || err || '').toLowerCase();
  const status = err?.status || err?.code || 0;
  return (
    status === 503 ||
    status === 429 ||
    msg.includes('503') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('resource_exhausted') ||
    msg.includes('429')
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class GeminiProvider implements AIProvider {
  private ai: GoogleGenAI;
  private model: string;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
    const cached = getCachedModel();
    // Ignore stale retired 1.5 models if previously cached
    this.model = cached && !cached.includes('1.5') ? cached : 'gemini-2.5-flash';
  }

  private getModelQueue(): string[] {
    const cached = getCachedModel();
    const validCached = cached && !cached.includes('1.5') ? [cached] : [];
    const list = [
      ...validCached,
      this.model,
      ...FALLBACK_MODELS,
    ];
    return Array.from(new Set(list));
  }

  private async executeWithFallback<R>(fn: (model: string) => Promise<R>): Promise<R> {
    const models = this.getModelQueue();
    let lastTransientError: any = null;
    let lastError: any = null;

    for (let i = 0; i < models.length; i++) {
      const m = models[i];
      // Up to 3 attempts per model with exponential backoff for 503/429 spikes
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const result = await fn(m);
          if (this.model !== m) {
            this.model = m;
            setCachedModel(m);
          }
          return result;
        } catch (err: any) {
          lastError = err;

          if (isNotFoundError(err)) {
            // Model doesn't exist on v1beta, skip immediately to next model
            break;
          }

          if (isTransientError(err)) {
            lastTransientError = err;
            // Exponential backoff: 1s, 2s, 3s
            await sleep(1000 * (attempt + 1));
            continue;
          }

          // Non-transient error (e.g., invalid API key or bad request) -> throw immediately
          throw err;
        }
      }
    }

    throw (
      lastTransientError ||
      lastError ||
      new Error('Google Gemini servers are currently experiencing high demand (503). Please try again in a few seconds.')
    );
  }

  private async generateJson<T>(prompt: string, images?: Array<{ base64: string; mimeType: string }>): Promise<T> {
    const contents: any[] = [];

    if (images?.length) {
      for (const img of images) {
        contents.push({ inlineData: { data: img.base64, mimeType: img.mimeType } });
      }
    }
    contents.push(prompt);

    const response = await this.executeWithFallback((model) =>
      this.ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: ANALYSIS_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          temperature: 0.0,
        },
      })
    );

    const text = response.text ?? '';
    // Strip markdown fences if present
    const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    try {
      return JSON.parse(cleaned) as T;
    } catch {
      // If parsing fails directly, attempt to extract the first balanced JSON object
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]) as T;
        } catch {
          // ignore
        }
      }
      return { sections: [] } as unknown as T;
    }
  }

  async analyzeUrl(
    html: string,
    url: string,
    images?: Array<{ base64: string; mimeType: string }>
  ): Promise<PageAnalysis> {
    const prompt = buildAnalysisPrompt('url', html, url);
    return this.generateJson<PageAnalysis>(prompt, images);
  }

  async analyzeHtml(html: string): Promise<PageAnalysis> {
    const prompt = buildAnalysisPrompt('html', html);
    return this.generateJson<PageAnalysis>(prompt);
  }

  async analyzeImages(images: Array<{ base64: string; mimeType: string }>): Promise<PageAnalysis> {
    const prompt = buildAnalysisPrompt('images');
    return this.generateJson<PageAnalysis>(prompt, images);
  }

  async chat(
    messages: ChatMessage[],
    context: DesignContext
  ): Promise<{ explanation: string; changes: AIChange[] }> {
    const systemPrompt = CHAT_SYSTEM_PROMPT + '\n\n' + buildChatPrompt(context);

    // Build conversation history
    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const lastMsg = messages[messages.length - 1];
    const lastParts: any[] = [];

    if (lastMsg.images?.length) {
      for (const img of lastMsg.images) {
        const [header, data] = img.split(',');
        const mimeType = header.match(/data:([^;]+)/)?.[1] ?? 'image/png';
        lastParts.push({ inlineData: { data, mimeType } });
      }
    }
    lastParts.push({ text: lastMsg.content });

    const response = await this.executeWithFallback(async (model) => {
      const chat = this.ai.chats.create({
        model,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          temperature: 0.5,
        },
        history,
      });
      return chat.sendMessage({ message: lastParts });
    });

    const text = response.text ?? '';
    const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    let parsed: { explanation: string; changes: any[] };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { explanation: text, changes: [] };
    }

    const changes: AIChange[] = (parsed.changes ?? []).map((c: any) => ({
      ...c,
      id: generateId(),
      status: 'pending' as const,
      timestamp: Date.now(),
    }));

    return { explanation: parsed.explanation ?? '', changes };
  }
}
