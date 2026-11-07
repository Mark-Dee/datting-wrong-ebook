import { BookPage } from '../types.ts';
import { PREVIEW_PAGES } from '../data/publicBook.generated.ts';

/**
 * Book pages are no longer bundled into the browser. Protected pages come from the
 * server (see bookContentService.ts); only the free preview ships with the app.
 */
export function getPreviewPages(): BookPage[] {
  return PREVIEW_PAGES;
}
