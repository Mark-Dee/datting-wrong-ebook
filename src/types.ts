export interface BookMetadata {
  id: string;
  version: number;
  title: string;
  subtitle: string;
  author: string;
  quote: string;
  quoteAttribution: string;
  copyright: string;
  edition: string;
  publisher: string;
  isbn: string;
  printedIn: string;
  price: {
    kes: number;
    usd: number;
  };
  active: boolean;
  storagePath: string;
  pageCount: number;
  wordCount: number;
  estimatedReadingHours: number;
  publishedAt: string;
  summary: string;
  themes: string[];
}

export interface ChapterSection {
  id: string;
  order: number;
  type: 'frontmatter' | 'chapter' | 'conclusion' | 'backmatter';
  numberLabel?: string; // e.g. "Chapter One", "Introduction"
  title: string;
  subtitle?: string;
  epigraph?: {
    text: string;
    source: string;
  };
  paragraphs: string[];
  reflectionQuestions?: string[];
  biblicalAnchor?: {
    verse: string;
    text: string;
  };
  readingMinutes: number;
}

export interface BookVersionData {
  metadata: BookMetadata;
  sections: ChapterSection[];
}

export interface UserEntitlement {
  entitlementId: string;
  userId: string;
  name: string;
  phone: string;
  email: string;
  bookId: string;
  version: number;
  grantedAt: string;
  paymentMethod: 'mpesa' | 'card' | 'manual_verification' | 'author_access';
  transactionCode: string;
  amountPaid: number;
  currency: 'KES' | 'USD';
  status: 'active' | 'revoked';
  watermarkText?: string;
  entitlementToken?: string;
}

export interface EntitlementTokenPayload {
  tokenId: string;
  entitlementId: string;
  userId: string;
  bookId: string;
  bookVersion: number;
  deviceId: string;
  transactionCode: string;
  scope: 'read:offline';
  issuedAt: string;
  expiresAt: string;
  status: 'active' | 'revoked';
  watermarkText?: string;
}

export interface EntitlementToken {
  tokenId?: string;
  tokenString: string;
  payload: EntitlementTokenPayload;
  signature: string;
}

export interface TokenVerificationResult {
  valid: boolean;
  payload?: EntitlementTokenPayload;
  error?: string;
  reasonCode?: 'EXPIRED' | 'DEVICE_MISMATCH' | 'USER_MISMATCH' | 'INVALID_SIGNATURE' | 'REVOKED' | 'MALFORMED' | 'BOOK_MISMATCH';
}

export interface EncryptedOfflineBookRecord {
  bookId: string;
  version: number;
  encryptedData: {
    iv: number[];
    ciphertext: number[];
  };
  checksum: string;
  savedAt: string;
  tokenId: string;
  userId: string;
  pageCount: number;
  totalSections: number;
}

export interface AuthorizedDevice {
  deviceId: string;
  userId: string;
  deviceName: string;
  platform: 'desktop' | 'mobile' | 'tablet';
  authorizedAt: string;
  lastSeenAt: string;
  status: 'active' | 'revoked';
}

export interface OfflineLicense {
  licenseId: string;
  userId: string;
  bookId: string;
  bookVersion: number;
  issuedAt: string;
  expiresAt: string;
  authorizedDevice: {
    deviceId: string;
    deviceName: string;
    platform: string;
  };
  offlineEnabled: boolean;
  licenseVersion: number;
  signature: string;
}

export interface BookPage {
  pageNumber: number;
  folioLabel?: string; // e.g. "i", "ii", "1", "86", "115"
  pdfPageNumber?: number; // 1 to 122
  totalNumberedPages?: number;
  chapterNumberLabel?: string;
  chapterTitle?: string;
  sectionId: string;
  type:
    | 'cover'
    | 'half-title'
    | 'title-page'
    | 'copyright'
    | 'dedication'
    | 'authors-note'
    | 'contents'
    | 'chapter-start'
    | 'chapter-body'
    | 'reflection'
    | 'conclusion'
    | 'backmatter';
  runningHeader?: string;
  content: {
    epigraph?: { text: string; source: string };
    paragraphs: string[];
    biblicalAnchor?: { verse: string; text: string };
    reflectionQuestions?: string[];
  };
}

export type ReaderTheme = 'paper' | 'sepia' | 'dark';
export type ReaderFontSize = 'sm' | 'base' | 'lg' | 'xl';
export type ReaderFontFamily = 'serif' | 'garamond' | 'sans' | 'clean';

export interface ReaderSettings {
  theme: ReaderTheme;
  fontSize: ReaderFontSize;
  fontFamily: ReaderFontFamily;
  lineSpacing: 'normal' | 'relaxed';
}

export interface ReadingProgress {
  currentSectionId: string;
  currentPageNumber?: number;
  scrollPercentage: number;
  completedSectionIds: string[];
  lastReadAt: string;
  bookmarks: {
    pageNumber: number;
    sectionId: string;
    paragraphIndex?: number;
    textSnippet: string;
    createdAt: string;
  }[];
}
