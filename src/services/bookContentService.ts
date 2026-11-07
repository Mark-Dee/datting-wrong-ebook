import type { BookPage, ChapterSection } from '../types.ts';
import { PREVIEW_PAGES } from '../data/publicBook.generated.ts';
import { apiFetch } from './apiClient.ts';

export interface LoadedBook {
  pages: BookPage[];
  sections: ChapterSection[];
  /** true when the server confirmed an active entitlement and returned the whole book */
  full: boolean;
}

/**
 * Loads the book from the server. The full manuscript is only ever delivered after the
 * server verifies the caller's Firebase ID token and an ACTIVE entitlement; otherwise the
 * free preview pages (bundled, public) are returned.
 */
export async function loadBookContent(): Promise<LoadedBook> {
  try {
    const res = await apiFetch('/api/book/pages');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.pages) && data.pages.length > 0) {
        return { pages: data.pages as BookPage[], sections: (data.sections || []) as ChapterSection[], full: true };
      }
    }
  } catch {
    /* offline or server unreachable — fall through to preview */
  }
  return { pages: PREVIEW_PAGES, sections: [], full: false };
}
