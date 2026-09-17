import defaults from '../data/homepageContent.json';
import { InterestCategory } from '../types/interests';
import { getAuthToken } from './authService';

export interface HomepageSlide {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  href: string;
}

export interface HomepageContent {
  slider: HomepageSlide[];
  cards: InterestCategory[];
}

const backendBase = process.env.REACT_APP_AUTH_API_URL
  ? process.env.REACT_APP_AUTH_API_URL.replace(/\/auth\/?$/, '')
  : process.env.NODE_ENV === 'production'
    ? 'https://ventus-backend.onrender.com/api'
    : '/api';
const cacheKey = 'ventus:homepage-content:v1';

export class HomepageEditorVerificationRequired extends Error {
  constructor() { super('Verify your account email to edit the homepage'); }
}

export const defaultHomepageContent: HomepageContent = defaults;

const isHomepageContent = (value: any): value is HomepageContent =>
  value && Array.isArray(value.slider) && value.slider.length > 0 &&
  Array.isArray(value.cards) && value.cards.length > 0;

export const readCachedHomepageContent = (): HomepageContent => {
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
    if (cached && Date.now() - cached.savedAt < 24 * 60 * 60 * 1000 && isHomepageContent(cached.content)) {
      return cached.content;
    }
  } catch { /* use bundled defaults */ }
  return defaultHomepageContent;
};

const cacheHomepageContent = (content: HomepageContent) => {
  try { localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), content })); }
  catch { /* storage is optional */ }
};

const readJson = async (response: Response) => {
  const data = await response.json().catch(() => null);
  if (response.status === 403 && data?.code === 'EDITOR_VERIFICATION_REQUIRED') {
    throw new HomepageEditorVerificationRequired();
  }
  if (!response.ok) throw new Error(data?.error || `Homepage request failed (${response.status})`);
  return data;
};

export const fetchHomepageContent = async (): Promise<HomepageContent> => {
  const response = await fetch(`${backendBase}/homepage`);
  const data = await readJson(response);
  if (!isHomepageContent(data.content)) throw new Error('Invalid homepage content');
  cacheHomepageContent(data.content);
  return data.content;
};

const editorHeaders = () => {
  const token = getAuthToken();
  if (!token) throw new Error('Sign in to edit the homepage');
  return { Authorization: `Bearer ${token}` };
};

export const fetchHomepageForEditor = async (): Promise<{ content: HomepageContent; version: number }> => {
  const response = await fetch(`${backendBase}/homepage/admin`, { headers: editorHeaders(), cache: 'no-store' });
  const data = await readJson(response);
  if (!isHomepageContent(data.content)) throw new Error('Invalid homepage content');
  return { content: data.content, version: data.version };
};

export const saveHomepageContent = async (content: HomepageContent, version: number) => {
  const response = await fetch(`${backendBase}/homepage/admin`, {
    method: 'PUT',
    headers: { ...editorHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, version }),
  });
  const data = await readJson(response);
  cacheHomepageContent(data.content);
  return { content: data.content as HomepageContent, version: data.version as number };
};

export const requestHomepageEditorCode = async (): Promise<void> => {
  const response = await fetch(`${backendBase}/homepage/admin/verification-code`, {
    method: 'POST', headers: editorHeaders(),
  });
  await readJson(response);
};

export const verifyHomepageEditorCode = async (code: string): Promise<void> => {
  const response = await fetch(`${backendBase}/homepage/admin/verify-email`, {
    method: 'POST',
    headers: { ...editorHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  await readJson(response);
};

export const uploadHomepageImage = async (file: File): Promise<string> => {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024) {
    throw new Error('Choose a JPEG, PNG, or WebP image under 4 MB');
  }
  const response = await fetch(`${backendBase}/homepage/admin/images`, {
    method: 'POST',
    headers: { ...editorHeaders(), 'Content-Type': file.type },
    body: file,
  });
  const data = await readJson(response);
  return `${backendBase.replace(/\/api$/, '')}${data.path}`;
};
