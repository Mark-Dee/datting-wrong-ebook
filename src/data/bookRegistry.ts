import { BookMetadata, BookVersionData, ChapterSection } from '../types.ts';
import { PUBLIC_BOOK as MANUSCRIPT_V1 } from './publicBook.generated.ts';

export interface BookVersionRecord {
  version: number;
  label: string;
  releasedAt: string;
  changeSummary: string;
  data: BookVersionData;
}

// In-memory / stored version registry to support versioning and administrative updates
const VERSION_REGISTRY: Record<string, BookVersionRecord[]> = {
  'dating-wrong': [
    {
      version: 1,
      label: 'Version 1.0 (Official First Edition)',
      releasedAt: '2026-01-15',
      changeSummary: 'Final manuscript release: Copyright, Dedication, Author’s Note, Introduction, Chapters 1–6, Lessons Learned, and The Christian Standard.',
      data: MANUSCRIPT_V1,
    },
  ],
};

let activeVersionNumber = 1;

export const BookManager = {
  getBookId(): string {
    return 'dating-wrong';
  },

  getAllVersions(bookId = 'dating-wrong'): BookVersionRecord[] {
    return VERSION_REGISTRY[bookId] || [];
  },

  getActiveVersionNumber(): number {
    return activeVersionNumber;
  },

  setActiveVersionNumber(version: number): boolean {
    const versions = this.getAllVersions();
    const found = versions.some((v) => v.version === version);
    if (found) {
      activeVersionNumber = version;
      return true;
    }
    return false;
  },

  getActiveBook(): BookVersionData {
    const versions = this.getAllVersions();
    const current = versions.find((v) => v.version === activeVersionNumber);
    return current ? current.data : MANUSCRIPT_V1;
  },

  getPublicMetadata(): BookMetadata {
    return this.getActiveBook().metadata;
  },

  // Free preview sections: Dedication, Author's Note, and Introduction preview
  getPreviewSections(): ChapterSection[] {
    const book = this.getActiveBook();
    return book.sections.filter((s) =>
      ['copyright', 'dedication', 'authors-note', 'introduction'].includes(s.id)
    );
  },

  // Table of Contents for display and previewing
  getTableOfContents(): { id: string; numberLabel?: string; title: string; subtitle?: string; readingMinutes: number; isFreePreview: boolean; type: string }[] {
    const book = this.getActiveBook();
    return book.sections.map((s) => ({
      id: s.id,
      numberLabel: s.numberLabel,
      title: s.title,
      subtitle: s.subtitle,
      readingMinutes: s.readingMinutes,
      isFreePreview: ['copyright', 'dedication', 'authors-note', 'introduction'].includes(s.id),
      type: s.type,
    }));
  },

  // Section outline (titles only). Protected chapter text is NOT in the browser bundle —
  // it is fetched from /api/book/pages for entitled readers (see bookContentService.ts).
  getFullContent(): ChapterSection[] {
    return this.getActiveBook().sections;
  },

  // Admin capability: register a new manuscript revision dynamically
  registerNewVersion(record: BookVersionRecord): void {
    if (!VERSION_REGISTRY['dating-wrong']) {
      VERSION_REGISTRY['dating-wrong'] = [];
    }
    VERSION_REGISTRY['dating-wrong'].push(record);
    activeVersionNumber = record.version;
  },
};
