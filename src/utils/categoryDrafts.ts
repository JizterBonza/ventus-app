import { CategoryContent, CategoryPage } from './categoryPages';

export interface CategoryDraft { content: CategoryContent; existing?: CategoryPage }

export const readCategoryDraft = (key: string): CategoryDraft | null => {
  try {
    const draft = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (!draft || !Array.isArray(draft.content?.hotels) || typeof draft.content?.title !== 'string') return null;
    return draft;
  } catch { return null; }
};

export const writeCategoryDraft = (key: string, draft: CategoryDraft) => {
  try { sessionStorage.setItem(key, JSON.stringify(draft)); } catch { /* Navigation confirmation still protects edits when storage is unavailable. */ }
};

export const clearCategoryDraft = (key: string) => {
  try { sessionStorage.removeItem(key); } catch { /* Storage may be unavailable. */ }
};
