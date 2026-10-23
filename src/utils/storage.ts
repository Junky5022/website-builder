// Simplified storage without async import issues
import { DEFAULT_TOKENS } from '../types/design-tokens';
import type { Project } from '../types/project';
import type { SectionDataMap } from '../types/sections';
import type { ChatMessage } from '../types/ai';

const PROJECTS_INDEX_KEY = 'vds:projects';
const PROJECT_KEY_PREFIX = 'vds:project:';
const API_KEY_STORAGE = 'vds:gemini-api-key';
const ACTIVE_PROJECT_KEY = 'vds:active-project';
const WORKING_MODEL_KEY = 'vds:gemini-working-model';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE);
}
export function setApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE, key);
}
export function clearApiKey(): void {
  localStorage.removeItem(API_KEY_STORAGE);
}

export function getCachedModel(): string | null {
  return localStorage.getItem(WORKING_MODEL_KEY);
}
export function setCachedModel(model: string): void {
  localStorage.setItem(WORKING_MODEL_KEY, model);
}

export function getActiveProjectId(): string | null {
  return localStorage.getItem(ACTIVE_PROJECT_KEY);
}
export function setActiveProjectId(id: string | null): void {
  if (id) localStorage.setItem(ACTIVE_PROJECT_KEY, id);
  else localStorage.removeItem(ACTIVE_PROJECT_KEY);
}

export function listProjects(): Project[] {
  const raw = localStorage.getItem(PROJECTS_INDEX_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as Project[]; } catch { return []; }
}

function saveIndex(projects: Project[]): void {
  // Only store meta fields to keep the index small
  const metas = projects.map(({ id, name, createdAt, updatedAt, thumbnail }) => ({
    id, name, createdAt, updatedAt, thumbnail,
  }));
  localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify(metas));
}

export function loadProject(id: string): Project | null {
  const raw = localStorage.getItem(PROJECT_KEY_PREFIX + id);
  if (!raw) return null;
  try { return JSON.parse(raw) as Project; } catch { return null; }
}

export function saveProject(project: Project): void {
  const now = Date.now();
  const updated = { ...project, updatedAt: now };
  try {
    localStorage.setItem(PROJECT_KEY_PREFIX + project.id, JSON.stringify(updated));

    // Update index
    const raw = localStorage.getItem(PROJECTS_INDEX_KEY);
    let metas: Array<{ id: string; name: string; createdAt: number; updatedAt: number; thumbnail?: string }> = [];
    try { metas = JSON.parse(raw || '[]'); } catch { metas = []; }
    const idx = metas.findIndex((m) => m.id === project.id);
    const meta = { id: project.id, name: project.name, createdAt: project.createdAt, updatedAt: now, thumbnail: project.thumbnail };
    if (idx === -1) metas.push(meta); else metas[idx] = meta;
    localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify(metas));
  } catch (err) {
    console.warn('Storage save failed (quota exceeded or storage unavailable):', err);
  }
}

export function deleteProject(id: string): void {
  localStorage.removeItem(PROJECT_KEY_PREFIX + id);
  const raw = localStorage.getItem(PROJECTS_INDEX_KEY);
  let metas: Array<{ id: string }> = [];
  try { metas = JSON.parse(raw || '[]'); } catch { metas = []; }
  localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify(metas.filter((m) => m.id !== id)));
  if (getActiveProjectId() === id) setActiveProjectId(null);
}

export function listProjectMetas(): Array<{ id: string; name: string; createdAt: number; updatedAt: number; thumbnail?: string }> {
  const raw = localStorage.getItem(PROJECTS_INDEX_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export function createBlankProject(name: string): Project {
  const now = Date.now();
  return {
    id: generateId(),
    name,
    createdAt: now,
    updatedAt: now,
    tokens: { ...DEFAULT_TOKENS },
    nodes: [],
    edges: [],
    sectionData: {} as SectionDataMap,
    chatHistory: [] as ChatMessage[],
    sourceInfo: { type: 'none' },
  };
}
