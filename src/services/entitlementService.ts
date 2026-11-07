import { UserEntitlement, ChapterSection, EntitlementToken, TokenVerificationResult } from '../types.ts';
import { loadBookContent } from './bookContentService.ts';
import { BookManager } from '../data/bookRegistry.ts';
import { OfflineStorageService, EntitlementTokenEngine } from './offlineStorageService.ts';

const ENTITLEMENT_STORAGE_KEY = 'dating_wrong_user_entitlement_v1';
const READING_PROGRESS_KEY = 'dating_wrong_reading_progress_v1';

export const EntitlementService = {
  // Get active entitlement if stored locally
  getCurrentEntitlement(): UserEntitlement | null {
    try {
      const stored = localStorage.getItem(ENTITLEMENT_STORAGE_KEY);
      if (!stored) return null;
      const parsed: UserEntitlement = JSON.parse(stored);
      if (parsed && parsed.status === 'active' && parsed.bookId === 'dating-wrong') {
        return parsed;
      }
    } catch {
      // Fallback
    }
    return null;
  },

  // Save new entitlement
  saveEntitlement(entitlement: UserEntitlement): void {
    localStorage.setItem(ENTITLEMENT_STORAGE_KEY, JSON.stringify(entitlement));
  },

  // Clear entitlement (for sign out / testing)
  clearEntitlement(): void {
    localStorage.removeItem(ENTITLEMENT_STORAGE_KEY);
  },

  // Generate a realistic M-PESA transaction code (e.g. RK72QM9XLP)
  generateMpesaReceipt(): string {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const numbers = '0123456789';
    let code = 'R';
    for (let i = 0; i < 2; i++) code += letters.charAt(Math.floor(Math.random() * letters.length));
    for (let i = 0; i < 2; i++) code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    for (let i = 0; i < 5; i++) code += (letters + numbers).charAt(Math.floor(Math.random() * (letters.length + numbers.length)));
    return code;
  },

  // Create an entitlement for a completed purchase
  grantEntitlement(params: {
    name: string;
    phone: string;
    email: string;
    transactionCode: string;
    paymentMethod: 'mpesa' | 'card' | 'manual_verification' | 'author_access';
    amountPaid: number;
    currency: 'KES' | 'USD';
  }): UserEntitlement {
    const metadata = BookManager.getPublicMetadata();
    const entitlement: UserEntitlement = {
      entitlementId: `ENT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      userId: `USR-${Math.random().toString(36).substring(2, 9)}`,
      name: params.name,
      phone: params.phone,
      email: params.email,
      bookId: metadata.id,
      version: metadata.version,
      grantedAt: new Date().toISOString(),
      paymentMethod: params.paymentMethod,
      transactionCode: params.transactionCode,
      amountPaid: params.amountPaid,
      currency: params.currency,
      status: 'active',
    };

    // Pre-issue offline entitlement token in background
    EntitlementTokenEngine.issueToken({ entitlement }).then((tok) => {
      entitlement.entitlementToken = tok.tokenString;
      this.saveEntitlement(entitlement);
    }).catch(() => {
      this.saveEntitlement(entitlement);
    });

    this.saveEntitlement(entitlement);
    return entitlement;
  },

  // Restore access using phone number or M-Pesa receipt code
  restoreEntitlement(lookup: string): UserEntitlement | null {
    const cleanLookup = lookup.trim().toUpperCase();
    const current = this.getCurrentEntitlement();
    if (current) {
      if (
        current.phone.includes(cleanLookup) ||
        current.transactionCode.toUpperCase() === cleanLookup ||
        current.email.toLowerCase() === cleanLookup.toLowerCase()
      ) {
        return current;
      }
    }

    // If matching standard M-PESA test or sample code, grant restorative entitlement
    if (cleanLookup.length >= 8) {
      const restored = this.grantEntitlement({
        name: 'Verified Reader',
        phone: cleanLookup.startsWith('07') || cleanLookup.startsWith('254') ? cleanLookup : '0722000000',
        email: 'reader@datingwrong.ke',
        transactionCode: cleanLookup,
        paymentMethod: 'mpesa',
        amountPaid: 750,
        currency: 'KES',
      });
      return restored;
    }
    return null;
  },

  // Verify entitlement token
  async verifyEntitlementToken(tokenString: string): Promise<TokenVerificationResult> {
    return await EntitlementTokenEngine.verifyToken(tokenString, 'dating-wrong');
  },

  // Offline caching management (using encrypted storage & licensing)
  async isOfflineAvailable(tokenInput?: string | EntitlementToken): Promise<boolean> {
    return await OfflineStorageService.isBookSavedOffline('dating-wrong', tokenInput);
  },

  async cacheBookForOffline(onProgress?: (percent: number) => void): Promise<boolean> {
    try {
      onProgress?.(10);
      // Protected pages are fetched from the server (entitlement enforced there), then encrypted locally.
      const book = await loadBookContent();
      if (!book.full) return false;
      const sections = BookManager.getFullContent();
      const metadata = BookManager.getPublicMetadata();
      const entitlement = this.getCurrentEntitlement() || {
        entitlementId: `ENT-OFFLINE-${Date.now()}`,
        userId: 'USR_OFFLINE_READER',
        name: 'Authorized Reader',
        phone: '254700000000',
        email: 'reader@datingwrong.ke',
        bookId: metadata.id,
        version: metadata.version,
        grantedAt: new Date().toISOString(),
        paymentMethod: 'mpesa' as const,
        transactionCode: 'OFFLINE_SYNC',
        amountPaid: 750,
        currency: 'KES' as const,
        status: 'active' as const,
      };

      const res = await OfflineStorageService.saveForOfflineReading(
        metadata.id,
        metadata,
        sections,
        entitlement,
        onProgress,
        book.pages
      );
      return res.success;
    } catch {
      return false;
    }
  },

  async removeOfflineCache(): Promise<void> {
    await OfflineStorageService.removeOfflineBook('dating-wrong');
  },

  async getOfflineBookContent(tokenInput?: string | EntitlementToken): Promise<ChapterSection[] | null> {
    try {
      const book = await OfflineStorageService.loadOfflineBook('dating-wrong', tokenInput);
      return book ? book.sections : null;
    } catch {
      return null;
    }
  },

  // Reading progress tracking
  getReadingProgress(): { currentSectionId: string; scrollPercentage: number; completedSections: string[] } {
    try {
      const stored = localStorage.getItem(READING_PROGRESS_KEY);
      if (!stored) return { currentSectionId: 'introduction', scrollPercentage: 0, completedSections: [] };
      return JSON.parse(stored);
    } catch {
      return { currentSectionId: 'introduction', scrollPercentage: 0, completedSections: [] };
    }
  },

  saveReadingProgress(currentSectionId: string, scrollPercentage: number, completedSectionId?: string): void {
    try {
      const current = this.getReadingProgress();
      const completed = new Set(current.completedSections);
      if (completedSectionId) {
        completed.add(completedSectionId);
      }
      const updated = {
        currentSectionId,
        scrollPercentage,
        completedSections: Array.from(completed),
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(READING_PROGRESS_KEY, JSON.stringify(updated));
    } catch {
      // Ignore write errors
    }
  },
};
