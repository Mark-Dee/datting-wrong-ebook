import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  List,
  Type,
  CheckCircle2,
  Bookmark,
  Search,
  X,
  Feather,
  CloudCheck,
  HardDriveDownload,
  Share2,
} from 'lucide-react';
import {
  ChapterSection,
  UserEntitlement,
  ReaderSettings,
  ReaderTheme,
  ReaderFontSize,
  ReaderFontFamily,
  ReadingProgress,
  BookPage,
} from '../types.ts';
import { BookManager } from '../data/bookRegistry.ts';
import { loadBookContent } from '../services/bookContentService.ts';
import { BookPageItem } from './BookPageItem.tsx';
import { OfflineStorageService } from '../services/offlineStorageService.ts';
import { EntitlementService } from '../services/entitlementService.ts';
import { apiFetch } from '../services/apiClient.ts';

interface ReaderViewProps {
  sections: ChapterSection[];
  initialSectionId?: string;
  entitlement: UserEntitlement | null;
  onExit: () => void;
  /** Pages supplied from the encrypted offline cache. When absent they are fetched from the server. */
  offlinePages?: BookPage[];
}

/**
 * Loads the protected pages from the server (entitlement enforced server-side) and then
 * renders the reader. The manuscript is never shipped inside the JavaScript bundle.
 */
export const ReaderView: React.FC<ReaderViewProps> = (props) => {
  const [loaded, setLoaded] = useState<BookPage[] | null>(props.offlinePages && props.offlinePages.length ? props.offlinePages : null);
  const [isPreviewOnly, setIsPreviewOnly] = useState(false);

  useEffect(() => {
    if (loaded) return;
    let cancelled = false;
    loadBookContent().then((r) => {
      if (cancelled) return;
      setIsPreviewOnly(!r.full);
      setLoaded(r.pages);
    });
    return () => {
      cancelled = true;
    };
  }, [loaded]);

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F2E8] text-[#241E1A]">
        <p className="text-sm tracking-wide">Opening your book…</p>
      </div>
    );
  }
  return <ReaderViewInner {...props} pages={loaded} previewOnly={isPreviewOnly} />;
};

const ReaderViewInner: React.FC<ReaderViewProps & { pages: BookPage[]; previewOnly: boolean }> = ({
  sections,
  initialSectionId = 'title-page',
  entitlement,
  onExit,
  pages,
}) => {
  const metadata = BookManager.getPublicMetadata();

  // Current reading position
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(1);
  const [currentChapterInfo, setCurrentChapterInfo] = useState<{ title: string; label?: string }>({
    title: 'Dating Wrong',
    label: 'Authorized Edition',
  });
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  // Minimal UI overlays
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [isJumpOpen, setIsJumpOpen] = useState(false);
  const [jumpInput, setJumpInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const curPageObj = useMemo(() => {
    return pages.find((p) => p.pageNumber === currentPageNumber) || pages[0];
  }, [pages, currentPageNumber]);

  // Offline status & state
  const [isOfflineSaved, setIsOfflineSaved] = useState(false);
  const [isSavingOffline, setIsSavingOffline] = useState(false);
  const [offlineMessage, setOfflineMessage] = useState<string | null>(null);

  // Bookmarks state
  const [bookmarks, setBookmarks] = useState<ReadingProgress['bookmarks']>(() => {
    try {
      const saved = localStorage.getItem('dating_wrong_bookmarks_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Reader typography and theme settings
  const [settings, setSettings] = useState<ReaderSettings>(() => {
    try {
      const saved = localStorage.getItem('dating_wrong_reader_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      theme: 'paper',
      fontSize: 'base',
      fontFamily: 'serif',
      lineSpacing: 'relaxed',
    };
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLElement>>(new Map());

  // Check offline status on mount
  useEffect(() => {
    OfflineStorageService.isBookSavedOffline(metadata.id, entitlement?.entitlementToken).then((saved) => {
      setIsOfflineSaved(saved);
    });
  }, [metadata.id, entitlement?.entitlementToken]);

  // Save settings when modified
  useEffect(() => {
    localStorage.setItem('dating_wrong_reader_settings', JSON.stringify(settings));
  }, [settings]);

  // Save bookmarks
  useEffect(() => {
    localStorage.setItem('dating_wrong_bookmarks_v1', JSON.stringify(bookmarks));
  }, [bookmarks]);

  // Prevent document window scrolling so reader top bar is never pushed off-screen
  useEffect(() => {
    const origBodyOverflow = document.body.style.overflow;
    const origHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    window.scrollTo(0, 0);

    return () => {
      document.body.style.overflow = origBodyOverflow;
      document.documentElement.style.overflow = origHtmlOverflow;
    };
  }, []);

  // Load server reading progress & bookmarks on mount if user is authenticated (Sections 39-40)
  useEffect(() => {
    if (!entitlement?.userId) return;

    apiFetch(`/api/reading-progress/${entitlement.userId}/dating-wrong`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.currentPage && data.currentPage > 1 && !initialSectionId) {
          setTimeout(() => {
            scrollToPage(data.currentPage, false);
          }, 80);
        }
      })
      .catch(() => {});

    apiFetch(`/api/bookmarks/${entitlement.userId}/dating-wrong`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.bookmarks) && data.bookmarks.length > 0) {
          setBookmarks((prev) => {
            const map = new Map();
            prev.forEach((b) => map.set(b.pageNumber, b));
            data.bookmarks.forEach((b: any) => {
              map.set(b.page, {
                pageNumber: b.page,
                sectionId: b.chapter,
                textSnippet: b.note || `Bookmark on page ${b.page}`,
                createdAt: b.createdAt,
              });
            });
            return Array.from(map.values());
          });
        }
      })
      .catch(() => {});
  }, [entitlement?.userId]);

  // Jump to initial section if specified
  useEffect(() => {
    if (initialSectionId) {
      const targetPage = pages.find((p) => p.sectionId === initialSectionId);
      if (targetPage) {
        const timer = setTimeout(() => {
          scrollToPage(targetPage.pageNumber, false);
        }, 60);
        return () => clearTimeout(timer);
      }
    }
  }, [initialSectionId]);

  // Monitor scroll for current page, chapter title, and thin progress line
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const progress = Math.min(100, Math.max(0, (scrollTop / (scrollHeight - clientHeight)) * 100));
    setScrollProgress(progress);

    // Calculate current visible page based on viewport center
    const viewportCenter = scrollTop + clientHeight / 2;
    for (const page of pages) {
      const element = document.getElementById(`book-page-${page.pageNumber}`);
      if (element) {
        const top = element.offsetTop;
        const bottom = top + element.offsetHeight;
        if (viewportCenter >= top && viewportCenter <= bottom) {
          if (currentPageNumber !== page.pageNumber) {
            setCurrentPageNumber(page.pageNumber);
            setCurrentChapterInfo({
              title: page.chapterTitle || 'Dating Wrong',
              label: page.chapterNumberLabel,
            });
            // Record reading progress quietly
            EntitlementService.saveReadingProgress(page.sectionId, progress, page.sectionId);
            if (entitlement?.userId) {
              apiFetch('/api/reading-progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  uid: entitlement.userId,
                  bookId: 'dating-wrong',
                  currentPage: page.pageNumber,
                  percentage: Math.round(progress),
                }),
              }).catch(() => {});
            }
          }
          break;
        }
      }
    }
  };

  const scrollToPage = (pageNumber: number, smooth: boolean = true) => {
    const el = document.getElementById(`book-page-${pageNumber}`);
    const container = containerRef.current;
    if (el && container) {
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const relativeTop = elRect.top - containerRect.top + container.scrollTop;

      container.scrollTo({
        top: Math.max(0, relativeTop - 8),
        behavior: smooth ? 'smooth' : 'auto',
      });
      setCurrentPageNumber(pageNumber);
    } else if (el) {
      setCurrentPageNumber(pageNumber);
    }
  };

  const scrollToSection = (sectionId: string) => {
    const target = pages.find((p) => p.sectionId === sectionId);
    if (target) {
      scrollToPage(target.pageNumber);
      setIsTocOpen(false);
    }
  };

  const handleJumpToPage = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    // Check Roman numerals (e.g. I, II, III, IV, V, VI, VII)
    const romanUpper = trimmed.toUpperCase();
    const folioMatch = pages.find(
      (p) => p.folioLabel?.toUpperCase() === romanUpper || p.folioLabel === trimmed
    );
    if (folioMatch) {
      scrollToPage(folioMatch.pageNumber);
      setIsJumpOpen(false);
      setJumpInput('');
      return;
    }

    const num = parseInt(trimmed, 10);
    if (!isNaN(num)) {
      // If user typed a book page number e.g. 86
      const bookFolioMatch = pages.find((p) => p.folioLabel === String(num));
      const isExplicitPdf = trimmed.toUpperCase().startsWith('PDF') || num > 115;
      if (isExplicitPdf) {
        const targetPdfNum = Math.min(122, Math.max(1, num));
        const pdfMatch = pages.find((p) => p.pdfPageNumber === targetPdfNum || p.pageNumber === targetPdfNum);
        if (pdfMatch) {
          scrollToPage(pdfMatch.pageNumber);
          setIsJumpOpen(false);
          setJumpInput('');
          return;
        }
      }

      if (bookFolioMatch) {
        scrollToPage(bookFolioMatch.pageNumber);
        setIsJumpOpen(false);
        setJumpInput('');
        return;
      }

      const pdfMatch = pages.find((p) => p.pdfPageNumber === num || p.pageNumber === num);
      if (pdfMatch) {
        scrollToPage(pdfMatch.pageNumber);
        setIsJumpOpen(false);
        setJumpInput('');
        return;
      }
    }
  };

  // Toggle bookmark for page
  const handleToggleBookmark = (pageNumber: number, sectionId: string, snippet: string) => {
    const exists = bookmarks.some((b) => b.pageNumber === pageNumber);
    if (exists) {
      setBookmarks(bookmarks.filter((b) => b.pageNumber !== pageNumber));
      if (entitlement?.userId) {
        apiFetch(`/api/bookmarks/${entitlement.userId}/dating-wrong/${pageNumber}`, { method: 'DELETE' }).catch(() => {});
      }
    } else {
      setBookmarks([
        ...bookmarks,
        {
          pageNumber,
          sectionId,
          textSnippet: snippet,
          createdAt: new Date().toISOString(),
        },
      ]);
      if (entitlement?.userId) {
        apiFetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: entitlement.userId,
            bookId: 'dating-wrong',
            page: pageNumber,
            chapter: sectionId,
            note: snippet,
          }),
        }).catch(() => {});
      }
    }
  };

  // Handle Save for Offline Reading (Section 26 & 27: never "Download PDF")
  const handleToggleOffline = async () => {
    if (isSavingOffline) return;

    if (isOfflineSaved) {
      await OfflineStorageService.removeOfflineBook(metadata.id);
      setIsOfflineSaved(false);
      setOfflineMessage('Offline package removed from private device storage.');
      setTimeout(() => setOfflineMessage(null), 3000);
    } else {
      setIsSavingOffline(true);
      setOfflineMessage('Encrypting and saving book to private storage...');

      // Mock or active entitlement
      const effectiveEntitlement: UserEntitlement = entitlement || {
        entitlementId: `ENT-OFFLINE-${Date.now()}`,
        userId: 'USR_VERIFIED_READER',
        name: 'Verified Reader',
        phone: '254700000000',
        email: 'reader@datingwrong.ke',
        bookId: metadata.id,
        version: metadata.version,
        grantedAt: new Date().toISOString(),
        paymentMethod: 'mpesa',
        transactionCode: 'RK72QM9XLP',
        amountPaid: 750,
        currency: 'KES',
        status: 'active',
      };

      try {
        const res = await OfflineStorageService.saveForOfflineReading(
          metadata.id,
          metadata,
          sections,
          effectiveEntitlement,
          undefined,
          pages
        );

        setIsSavingOffline(false);
        if (res.success) {
          setIsOfflineSaved(true);
          setOfflineMessage('Available offline: Book securely encrypted in browser storage.');
        } else {
          setOfflineMessage('Unable to cache offline on this device.');
        }
      } catch (err: any) {
        setIsSavingOffline(false);
        console.error('Error saving book offline:', err);
        setOfflineMessage(`Unable to save offline: ${err?.message || 'Storage error'}`);
      }
      setTimeout(() => setOfflineMessage(null), 4000);
    }
  };

  // Search matches
  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.trim().length < 2) return [];
    const q = searchQuery.toLowerCase();
    const results: { pageNumber: number; chapterTitle: string; snippet: string }[] = [];

    for (const page of pages) {
      for (const p of page.content.paragraphs) {
        const idx = p.toLowerCase().indexOf(q);
        if (idx !== -1) {
          const start = Math.max(0, idx - 40);
          const end = Math.min(p.length, idx + q.length + 60);
          const snippet = (start > 0 ? '...' : '') + p.slice(start, end) + (end < p.length ? '...' : '');
          results.push({
            pageNumber: page.pageNumber,
            chapterTitle: page.chapterTitle || 'Dating Wrong',
            snippet,
          });
          if (results.length >= 20) return results;
          break;
        }
      }
    }
    return results;
  }, [searchQuery, pages]);

  // Environment Backgrounds with high contrast and device-independent readability
  const environmentThemeStyles: Record<
    ReaderTheme,
    {
      envBg: string;
      headerBg: string;
      border: string;
      text: string;
      headingText: string;
      subtext: string;
      mutedText: string;
      popoverBg: string;
      accent: string;
      btnHover: string;
      cardHover: string;
      inputBg: string;
      inputText: string;
      divider: string;
      trackBg: string;
      progressFill: string;
    }
  > = {
    paper: {
      envBg: 'bg-[#F5F2EA]', // Warm ivory environment
      headerBg: 'bg-[#F5F2EA]',
      border: 'border-[#E2D7C5]',
      text: 'text-[#201D1A]',
      headingText: 'text-[#171412]',
      subtext: 'text-[#574E44]',
      mutedText: 'text-[#6B6154]',
      popoverBg: 'bg-[#FBF9F5]',
      accent: 'text-[#78350F]',
      btnHover: 'hover:bg-[#EBE4D5]',
      cardHover: 'hover:bg-[#EFE8DA]',
      inputBg: 'bg-white',
      inputText: 'text-[#201D1A]',
      divider: 'border-[#E2D7C5]',
      trackBg: 'bg-stone-300/40',
      progressFill: 'bg-[#78350F]',
    },
    sepia: {
      envBg: 'bg-[#EDE2CA]',
      headerBg: 'bg-[#EDE2CA]',
      border: 'border-[#D9CBB0]',
      text: 'text-[#2F251B]',
      headingText: 'text-[#1E160E]',
      subtext: 'text-[#5A4938]',
      mutedText: 'text-[#6E5C48]',
      popoverBg: 'bg-[#F5ECD7]',
      accent: 'text-[#692E0C]',
      btnHover: 'hover:bg-[#E2D4B8]',
      cardHover: 'hover:bg-[#E7DABE]',
      inputBg: 'bg-[#FCFAF6]',
      inputText: 'text-[#2F251B]',
      divider: 'border-[#D9CBB0]',
      trackBg: 'bg-[#D0BF9E]/50',
      progressFill: 'bg-[#692E0C]',
    },
    dark: {
      envBg: 'bg-[#121110]',
      headerBg: 'bg-[#121110]',
      border: 'border-[#262320]',
      text: 'text-[#ECE6DE]',
      headingText: 'text-[#FAF7F2]',
      subtext: 'text-[#BDB2A3]',
      mutedText: 'text-[#A39786]',
      popoverBg: 'bg-[#1C1A18]',
      accent: 'text-[#E0A96D]',
      btnHover: 'hover:bg-[#252220]',
      cardHover: 'hover:bg-[#262320]',
      inputBg: 'bg-[#252220]',
      inputText: 'text-[#ECE6DE]',
      divider: 'border-[#262320]',
      trackBg: 'bg-stone-800/60',
      progressFill: 'bg-[#E0A96D]',
    },
  };

  const curEnv = environmentThemeStyles[settings.theme];

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${curEnv.envBg} ${curEnv.text} transition-colors select-text`}>
      {/* 1. THIN READING PROGRESS INDICATOR (Section 24) */}
      <div className={`fixed top-0 left-0 right-0 h-[3px] ${curEnv.trackBg} z-50`}>
        <div
          className={`h-full ${curEnv.progressFill} transition-all duration-150 ease-out`}
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* 2. SOLID TOP NAVIGATION BAR (Always solid, always visible, never hidden on scroll) */}
      <header
        className={`shrink-0 w-full z-40 flex items-center justify-between px-2 sm:px-6 md:px-8 h-14 border-b ${curEnv.border} ${curEnv.headerBg} shadow-xs transition-colors select-none`}
      >
        {/* Left: Exit to Library, Table of Contents, and Phone In-Motion Title leaning left */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 max-w-[55%] sm:max-w-none">
          <button
            onClick={onExit}
            className={`flex items-center gap-1 text-xs font-ui-sans font-medium hover:opacity-75 transition-opacity cursor-pointer shrink-0 ${curEnv.subtext}`}
            title="Back to Book Library"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Library</span>
          </button>

          <div className={`h-3.5 w-px border-r ${curEnv.divider} mx-0.5 shrink-0`} />

          <button
            onClick={() => setIsTocOpen(true)}
            className={`flex items-center gap-1 text-xs font-ui-sans font-medium hover:opacity-75 transition-opacity cursor-pointer shrink-0 ${curEnv.subtext}`}
            title="Table of Contents"
          >
            <List className={`w-4 h-4 ${curEnv.accent}`} />
            <span className="hidden md:inline">Contents</span>
          </button>

          {/* Title in motion leaning on left side for phone devices to create room for typography and background button */}
          <div className="sm:hidden min-w-0 overflow-hidden relative ml-1 max-w-[125px] xs:max-w-[165px]">
            <button
              onClick={() => setIsJumpOpen(!isJumpOpen)}
              className={`text-left py-0.5 px-1 ${curEnv.btnHover} rounded-xs transition-colors cursor-pointer flex items-center overflow-hidden w-full`}
              title="Click to jump to page"
            >
              <span className={`animate-title-motion text-[11px] font-ui-sans font-semibold tracking-wider ${curEnv.accent} uppercase inline-flex items-center whitespace-nowrap`}>
                <span>{currentChapterInfo.label || 'Dating Wrong'}</span>
                <span className={`mx-1 ${curEnv.mutedText} font-normal`}>•</span>
                <span className={`font-bold ${curEnv.headingText}`}>
                  p. {curPageObj?.folioLabel || currentPageNumber}
                </span>
              </span>
            </button>
          </div>
        </div>

        {/* Center: Tablet and Desktop Page & Chapter Indicator with Click-to-Jump */}
        <div className="hidden sm:block relative">
          <button
            onClick={() => setIsJumpOpen(!isJumpOpen)}
            className={`text-center px-3 max-w-[260px] sm:max-w-md truncate ${curEnv.btnHover} py-1 rounded-xs transition-colors cursor-pointer group`}
            title="Click to jump to any Book Page or PDF Page"
          >
            <span className={`font-ui-sans text-[11px] font-semibold tracking-wider ${curEnv.accent} uppercase mr-2`}>
              {currentChapterInfo.label || 'Dating Wrong'}
            </span>
            <span className={`font-ui-sans text-xs font-bold ${curEnv.headingText}`}>
              Page {curPageObj?.folioLabel || currentPageNumber}
            </span>
            <span className={`font-ui-sans text-[11px] ${curEnv.mutedText} ml-1.5 hidden sm:inline font-normal`}>
              (PDF {currentPageNumber} of {pages.length})
            </span>
          </button>
        </div>

        {/* Jump to Page Popover (Positioned responsively for both phone and desktop) */}
        {isJumpOpen && (
          <div className={`absolute top-14 left-2 sm:left-1/2 sm:-translate-x-1/2 z-50 w-72 sm:w-80 max-w-[calc(100vw-1rem)] p-4 rounded-sm border ${curEnv.border} ${curEnv.popoverBg} shadow-2xl font-ui-sans text-xs space-y-3`}>
            <div className={`flex justify-between items-center pb-2 border-b ${curEnv.divider}`}>
              <span className={`font-bold uppercase tracking-wider text-[10px] ${curEnv.accent}`}>
                Go to Exact Page
              </span>
              <button onClick={() => setIsJumpOpen(false)} className={`${curEnv.mutedText} hover:${curEnv.headingText} cursor-pointer`}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className={`text-[11px] ${curEnv.subtext}`}>
              Enter Book Page (e.g. <span className={`font-semibold ${curEnv.accent}`}>86</span>, <span className={`font-semibold ${curEnv.accent}`}>I</span>) or PDF Page (e.g. <span className={`font-semibold ${curEnv.accent}`}>120</span>):
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleJumpToPage(jumpInput);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                autoFocus
                placeholder="e.g. 86, 120, I, 102"
                value={jumpInput}
                onChange={(e) => setJumpInput(e.target.value)}
                className={`flex-1 px-3 py-1.5 rounded-xs border ${curEnv.border} ${curEnv.inputBg} ${curEnv.inputText} text-xs font-semibold focus:outline-hidden`}
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xs bg-[#78350F] text-white font-bold text-xs uppercase hover:bg-[#632B0C] cursor-pointer"
              >
                Go
              </button>
            </form>
            <div className={`pt-2 border-t ${curEnv.divider} flex flex-wrap gap-1 text-[10px]`}>
              <button onClick={() => handleJumpToPage('I')} className={`px-1.5 py-0.5 rounded-2xs border ${curEnv.border} ${curEnv.subtext} ${curEnv.btnHover} cursor-pointer`}>Page I</button>
              <button onClick={() => handleJumpToPage('1')} className={`px-1.5 py-0.5 rounded-2xs border ${curEnv.border} ${curEnv.subtext} ${curEnv.btnHover} cursor-pointer`}>Ch 1 (p. 1)</button>
              <button onClick={() => handleJumpToPage('20')} className={`px-1.5 py-0.5 rounded-2xs border ${curEnv.border} ${curEnv.subtext} ${curEnv.btnHover} cursor-pointer`}>Ch 2 (p. 20)</button>
              <button onClick={() => handleJumpToPage('86')} className={`px-1.5 py-0.5 rounded-2xs border ${curEnv.border} ${curEnv.accent} font-bold ${curEnv.btnHover} cursor-pointer`}>Page 86</button>
              <button onClick={() => handleJumpToPage('102')} className={`px-1.5 py-0.5 rounded-2xs border ${curEnv.border} ${curEnv.subtext} ${curEnv.btnHover} cursor-pointer`}>p. 102</button>
              <button onClick={() => handleJumpToPage('120')} className={`px-1.5 py-0.5 rounded-2xs border ${curEnv.border} ${curEnv.accent} font-bold ${curEnv.btnHover} cursor-pointer`}>PDF 120</button>
            </div>
          </div>
        )}

        {/* Right: Minimal Utility Icons (Search, Bookmarks, Offline, Typography & Background Button) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Search Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className={`p-1.5 sm:p-2 rounded-xs ${curEnv.btnHover} transition-colors cursor-pointer ${curEnv.subtext}`}
            title="Search Manuscript"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Bookmarks Drawer Toggle */}
          <button
            onClick={() => setIsBookmarksOpen(true)}
            className={`p-1.5 sm:p-2 rounded-xs ${curEnv.btnHover} transition-colors cursor-pointer ${
              bookmarks.length > 0 ? curEnv.accent : curEnv.mutedText
            }`}
            title={`Bookmarks (${bookmarks.length})`}
          >
            <Bookmark className="w-3.5 h-3.5" />
          </button>

          {/* Offline Reading Toggle (Section 26: SAVE FOR OFFLINE READING, NOT DOWNLOAD PDF) */}
          <button
            onClick={handleToggleOffline}
            disabled={isSavingOffline}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xs text-[11px] font-ui-sans font-medium transition-colors cursor-pointer border ${
              isOfflineSaved
                ? 'bg-emerald-950/20 text-emerald-400 border-emerald-500/30'
                : `${curEnv.subtext} border ${curEnv.border} ${curEnv.btnHover}`
            }`}
            title={isOfflineSaved ? 'Available offline in secure private storage' : 'Save for offline reading'}
          >
            {isSavingOffline ? (
              <span className="animate-spin text-xs">●</span>
            ) : isOfflineSaved ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <HardDriveDownload className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">
              {isOfflineSaved ? 'Available Offline' : 'Save Offline'}
            </span>
          </button>

          {/* Appearance / Typography & Background button */}
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`p-1.5 sm:p-2 rounded-xs ${curEnv.btnHover} transition-colors cursor-pointer ${curEnv.subtext}`}
            title="Typography and background settings"
          >
            <Type className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Offline Status Banner / Toast if message active */}
      {offlineMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-sm bg-[#1C1917] text-[#FAF7F2] text-xs font-ui-sans shadow-lg border border-stone-700 transition-all flex items-center gap-2">
          <CloudCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{offlineMessage}</span>
        </div>
      )}

      {/* 3. SETTINGS POPOVER (Minimal Appearance Controls - Seamless Execution on All Devices) */}
      {isSettingsOpen && (
        <div
          className={`absolute top-14 right-2 sm:right-6 md:right-8 z-50 w-72 max-w-[calc(100vw-1rem)] p-4 sm:p-5 rounded-sm border ${curEnv.border} ${curEnv.popoverBg} shadow-2xl font-ui-sans text-xs space-y-4`}
        >
          <div className={`flex justify-between items-center pb-2 border-b ${curEnv.divider}`}>
            <span className={`font-semibold uppercase tracking-wider ${curEnv.accent}`}>
              Reading Environment
            </span>
            <button
              onClick={() => setIsSettingsOpen(false)}
              className={`${curEnv.mutedText} hover:${curEnv.headingText} cursor-pointer`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Theme Selector */}
          <div>
            <label className={`block text-[10px] font-bold ${curEnv.mutedText} uppercase tracking-wider mb-1.5`}>
              Page Tone
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setSettings({ ...settings, theme: 'paper' })}
                className={`py-1.5 px-2 rounded-xs border text-center transition-colors cursor-pointer ${
                  settings.theme === 'paper'
                    ? 'border-[#78350F] ring-1 ring-[#78350F] bg-[#FCFAF6] text-[#201D1A] font-bold shadow-xs'
                    : 'border-[#E2D7C5] bg-[#FCFAF6] text-[#4A4237]'
                }`}
              >
                Ivory Paper
              </button>
              <button
                onClick={() => setSettings({ ...settings, theme: 'sepia' })}
                className={`py-1.5 px-2 rounded-xs border text-center transition-colors cursor-pointer ${
                  settings.theme === 'sepia'
                    ? 'border-[#692E0C] ring-1 ring-[#692E0C] bg-[#F5ECD7] text-[#2F251B] font-bold shadow-xs'
                    : 'border-[#DFD3BA] bg-[#F5ECD7] text-[#554433]'
                }`}
              >
                Warm Sepia
              </button>
              <button
                onClick={() => setSettings({ ...settings, theme: 'dark' })}
                className={`py-1.5 px-2 rounded-xs border text-center transition-colors cursor-pointer ${
                  settings.theme === 'dark'
                    ? 'border-amber-500 ring-1 ring-amber-500 bg-[#1C1A18] text-[#FAF7F2] font-bold shadow-xs'
                    : 'border-[#332F2B] bg-[#1C1A18] text-[#B5A898]'
                }`}
              >
                Night Dark
              </button>
            </div>
          </div>

          {/* Font Size Selector */}
          <div>
            <label className={`block text-[10px] font-bold ${curEnv.mutedText} uppercase tracking-wider mb-1.5`}>
              Type Scale
            </label>
            <div className="flex gap-1">
              {(['sm', 'base', 'lg', 'xl'] as ReaderFontSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => setSettings({ ...settings, fontSize: size })}
                  className={`flex-1 py-1 text-center rounded-xs border uppercase tracking-wider transition-colors cursor-pointer ${
                    settings.fontSize === size
                      ? 'border-[#78350F] bg-[#78350F] text-white font-bold'
                      : `border ${curEnv.border} ${curEnv.text} ${curEnv.btnHover}`
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Typeface Selector */}
          <div>
            <label className={`block text-[10px] font-bold ${curEnv.mutedText} uppercase tracking-wider mb-1.5`}>
              Typeface
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setSettings({ ...settings, fontFamily: 'serif' })}
                className={`py-1.5 px-2.5 rounded-xs border font-book-serif text-center transition-colors cursor-pointer text-xs ${
                  settings.fontFamily === 'serif'
                    ? `border-[#78350F] font-bold bg-[#78350F]/15 ${curEnv.headingText}`
                    : `border ${curEnv.border} ${curEnv.text} ${curEnv.btnHover}`
                }`}
                title="Newsreader book serif"
              >
                Classic Serif
              </button>
              <button
                onClick={() => setSettings({ ...settings, fontFamily: 'garamond' })}
                className={`py-1.5 px-2.5 rounded-xs border font-book-garamond text-center transition-colors cursor-pointer text-xs ${
                  settings.fontFamily === 'garamond'
                    ? `border-[#78350F] font-bold bg-[#78350F]/15 ${curEnv.headingText}`
                    : `border ${curEnv.border} ${curEnv.text} ${curEnv.btnHover}`
                }`}
                title="Cormorant Garamond renaissance serif"
              >
                Garamond
              </button>
              <button
                onClick={() => setSettings({ ...settings, fontFamily: 'sans' })}
                className={`py-1.5 px-2.5 rounded-xs border font-book-sans text-center transition-colors cursor-pointer text-xs ${
                  settings.fontFamily === 'sans'
                    ? `border-[#78350F] font-bold bg-[#78350F]/15 ${curEnv.headingText}`
                    : `border ${curEnv.border} ${curEnv.text} ${curEnv.btnHover}`
                }`}
                title="Plus Jakarta Sans modern sans-serif"
              >
                Modern Sans
              </button>
              <button
                onClick={() => setSettings({ ...settings, fontFamily: 'clean' })}
                className={`py-1.5 px-2.5 rounded-xs border font-book-clean text-center transition-colors cursor-pointer text-xs ${
                  settings.fontFamily === 'clean'
                    ? `border-[#78350F] font-bold bg-[#78350F]/15 ${curEnv.headingText}`
                    : `border ${curEnv.border} ${curEnv.text} ${curEnv.btnHover}`
                }`}
                title="Inter clean reading sans-serif"
              >
                Clean Sans
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. TABLE OF CONTENTS DRAWER */}
      {isTocOpen && (
        <div className="fixed inset-0 z-50 flex bg-stone-950/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-sm h-full ${curEnv.popoverBg} ${curEnv.text} border-r ${curEnv.border} p-6 overflow-y-auto flex flex-col shadow-2xl`}
          >
            <div className={`flex justify-between items-center pb-4 border-b ${curEnv.divider} mb-4`}>
              <div>
                <h3 className={`font-display-serif text-lg font-bold ${curEnv.headingText}`}>Contents</h3>
                <p className={`font-ui-sans text-[10px] uppercase tracking-wider ${curEnv.accent}`}>
                  Dating Wrong · Mark & Alvis
                </p>
              </div>
              <button
                onClick={() => setIsTocOpen(false)}
                className={`p-1 ${curEnv.mutedText} hover:${curEnv.headingText} cursor-pointer`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`divide-y ${curEnv.divider} flex-1 overflow-y-auto`}>
              {sections.map((sec, idx) => {
                const targetPage = pages.find((p) => p.sectionId === sec.id);
                const pageNum = targetPage?.pageNumber || idx + 1;
                const folio = targetPage?.folioLabel || pageNum;
                const pdfNum = targetPage?.pdfPageNumber || pageNum;
                return (
                  <div key={sec.id} className="py-1">
                    <button
                      onClick={() => scrollToSection(sec.id)}
                      className={`w-full text-left py-3 px-2.5 rounded-xs transition-colors flex items-start justify-between gap-3 ${curEnv.cardHover} cursor-pointer`}
                    >
                      <div>
                        {sec.numberLabel && (
                          <p className={`font-ui-sans text-[10px] uppercase tracking-wider ${curEnv.accent} font-semibold`}>
                            {sec.numberLabel}
                          </p>
                        )}
                        <p className={`font-display-serif text-sm font-bold leading-snug ${curEnv.headingText}`}>
                          {sec.title}
                        </p>
                        {sec.epigraph && (
                          <p className={`font-book-serif text-[11px] ${curEnv.accent} italic mt-0.5 max-w-xs line-clamp-2`}>
                            “{sec.epigraph.text}” — {sec.epigraph.source}
                          </p>
                        )}
                        <p className={`font-ui-sans text-[10px] ${curEnv.mutedText} mt-0.5`}>
                          {sec.readingMinutes} min read
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`font-ui-sans text-xs ${curEnv.headingText} font-bold block`}>
                          Page {folio}
                        </span>
                        <span className={`font-ui-sans text-[10px] ${curEnv.mutedText} block`}>
                          PDF {pdfNum}
                        </span>
                      </div>
                    </button>
                    {/* Chapter Six Subsections */}
                    {sec.id === 'chapter-six' && (
                      <div className="pl-3 pr-2 pb-2 space-y-1 text-xs">
                        <button
                          onClick={() => {
                            scrollToPage(96);
                            setIsTocOpen(false);
                          }}
                          className={`w-full text-left py-1.5 px-2 rounded-2xs ${curEnv.btnHover} flex justify-between items-center ${curEnv.accent} cursor-pointer`}
                        >
                          <span className="font-book-serif font-medium">Part I: The Lessons We Learned</span>
                          <span className={`font-ui-sans text-[10px] font-semibold ${curEnv.headingText}`}>Page 89 · PDF 96</span>
                        </button>
                        <button
                          onClick={() => {
                            scrollToPage(109);
                            setIsTocOpen(false);
                          }}
                          className={`w-full text-left py-1.5 px-2 rounded-2xs ${curEnv.btnHover} flex justify-between items-center ${curEnv.accent} cursor-pointer`}
                        >
                          <span className="font-book-serif font-medium">Part II: The Christian Standard</span>
                          <span className={`font-ui-sans text-[10px] font-semibold ${curEnv.headingText}`}>Page 102 · PDF 109</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsTocOpen(false)} />
        </div>
      )}

      {/* 5. SEARCH IN MANUSCRIPT MODAL */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-stone-950/60 backdrop-blur-xs">
          <div className={`w-full max-w-lg ${curEnv.popoverBg} border ${curEnv.border} rounded-sm shadow-2xl p-6 font-ui-sans`}>
            <div className={`flex justify-between items-center pb-3 border-b ${curEnv.divider} mb-4`}>
              <div className="flex items-center gap-2">
                <Search className={`w-4 h-4 ${curEnv.accent}`} />
                <h3 className={`font-display-serif text-base font-bold ${curEnv.headingText}`}>Search in Book</h3>
              </div>
              <button
                onClick={() => setIsSearchOpen(false)}
                className={`${curEnv.mutedText} hover:${curEnv.headingText} cursor-pointer`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative mb-4">
              <input
                type="text"
                autoFocus
                placeholder="Search words, Bible verses, themes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xs border ${curEnv.border} ${curEnv.inputBg} ${curEnv.inputText} text-sm focus:outline-hidden`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`absolute right-3 top-3 ${curEnv.mutedText} hover:${curEnv.headingText}`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Page Jump suggestion if query is entered */}
            {searchQuery.trim() && (
              <div className={`p-2.5 mb-3 rounded-xs border ${curEnv.border} ${curEnv.cardHover} flex items-center justify-between gap-2`}>
                <span className={`text-xs ${curEnv.text}`}>
                  Go directly to page <strong>“{searchQuery.trim()}”</strong>
                </span>
                <button
                  onClick={() => {
                    handleJumpToPage(searchQuery);
                    setIsSearchOpen(false);
                  }}
                  className="px-2.5 py-1 rounded-2xs bg-[#78350F] text-white text-[11px] font-semibold hover:bg-[#632B0C] cursor-pointer shrink-0"
                >
                  Jump to Page
                </button>
              </div>
            )}

            {/* Results list */}
            <div className={`max-h-72 overflow-y-auto divide-y ${curEnv.divider} text-xs`}>
              {searchQuery.length >= 2 && searchResults.length === 0 && (
                <p className={`py-6 text-center ${curEnv.mutedText} italic font-book-serif`}>
                  No passages found matching “{searchQuery}”
                </p>
              )}
              {searchResults.map((res, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    scrollToPage(res.pageNumber);
                    setIsSearchOpen(false);
                  }}
                  className={`w-full text-left py-3 px-2 rounded-xs ${curEnv.cardHover} transition-colors cursor-pointer space-y-1`}
                >
                  <div className={`flex justify-between items-center text-[11px] ${curEnv.accent} font-semibold`}>
                    <span>{res.chapterTitle}</span>
                    <span className={curEnv.headingText}>Page {res.pageNumber}</span>
                  </div>
                  <p className={`font-book-serif ${curEnv.text} leading-relaxed italic`}>
                    “{res.snippet}”
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. BOOKMARKS DRAWER */}
      {isBookmarksOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-stone-950/60 backdrop-blur-xs">
          <div className="flex-1" onClick={() => setIsBookmarksOpen(false)} />
          <div
            className={`w-full max-w-sm h-full ${curEnv.popoverBg} ${curEnv.text} border-l ${curEnv.border} p-6 overflow-y-auto flex flex-col shadow-2xl font-ui-sans`}
          >
            <div className={`flex justify-between items-center pb-4 border-b ${curEnv.divider} mb-4`}>
              <div className="flex items-center gap-2">
                <Bookmark className={`w-4 h-4 ${curEnv.accent} fill-current`} />
                <h3 className={`font-display-serif text-lg font-bold ${curEnv.headingText}`}>Saved Bookmarks</h3>
              </div>
              <button
                onClick={() => setIsBookmarksOpen(false)}
                className={`p-1 ${curEnv.mutedText} hover:${curEnv.headingText} cursor-pointer`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bookmarks.length === 0 ? (
              <div className={`my-auto text-center py-12 space-y-2 ${curEnv.mutedText}`}>
                <Bookmark className="w-8 h-8 mx-auto stroke-1" />
                <p className="text-xs">No bookmarks saved yet.</p>
                <p className="text-[11px]">Click the ribbon at the top of any page to bookmark it.</p>
              </div>
            ) : (
              <div className={`divide-y ${curEnv.divider} flex-1 overflow-y-auto`}>
                {bookmarks.map((b, idx) => (
                  <div
                    key={idx}
                    className={`py-3 px-2 flex items-start justify-between gap-2 ${curEnv.cardHover} rounded-xs transition-colors`}
                  >
                    <button
                      onClick={() => {
                        scrollToPage(b.pageNumber);
                        setIsBookmarksOpen(false);
                      }}
                      className="text-left flex-1 cursor-pointer"
                    >
                      <p className={`text-xs font-semibold ${curEnv.accent}`}>
                        Page {b.pageNumber}
                      </p>
                      <p className={`font-book-serif text-xs italic ${curEnv.subtext} mt-1 line-clamp-2`}>
                        “{b.textSnippet}”
                      </p>
                    </button>
                    <button
                      onClick={() =>
                        setBookmarks(bookmarks.filter((item) => item.pageNumber !== b.pageNumber))
                      }
                      className={`${curEnv.mutedText} hover:text-red-600 p-1 cursor-pointer`}
                      title="Remove Bookmark"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. MAIN VERTICAL SCROLLING READING COLUMN (Section 23) */}
      <main
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-2 sm:px-6 md:px-12 py-6 sm:py-12 scroll-smooth focus:outline-hidden"
      >
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          {pages.map((page) => {
            const isBookmarked = bookmarks.some((b) => b.pageNumber === page.pageNumber);
            return (
              <BookPageItem
                key={page.pageNumber}
                page={page}
                theme={settings.theme}
                fontSize={settings.fontSize}
                fontFamily={settings.fontFamily}
                lineSpacing={settings.lineSpacing}
                isBookmarked={isBookmarked}
                onToggleBookmark={handleToggleBookmark}
              />
            );
          })}

          {/* End of Book Finishing Leaf */}
          <div className={`w-full max-w-[720px] text-center my-12 py-12 border-t ${curEnv.divider}`}>
            <div className={`w-10 h-10 rounded-full border ${curEnv.border} flex items-center justify-center mx-auto ${curEnv.accent} font-display-serif text-sm font-bold mb-4`}>
              M&A
            </div>
            <h4 className={`font-display-serif text-xl font-bold mb-2 ${curEnv.headingText}`}>
              End of First Edition
            </h4>
            <p className={`font-book-serif italic text-sm ${curEnv.mutedText} max-w-sm mx-auto mb-6`}>
              May the Lord grant you wisdom, sobriety, and courage in every decision of the heart.
            </p>
            <button
              onClick={onExit}
              className="px-6 py-2.5 rounded-xs bg-[#78350F] hover:bg-[#632B0C] text-[#FAF7F2] text-xs font-ui-sans font-semibold uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
            >
              Return to Library
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
