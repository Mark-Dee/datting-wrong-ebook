import React from 'react';
import { BookPage, ReaderTheme, ReaderFontSize, ReaderFontFamily } from '../types.ts';
import { Bookmark } from 'lucide-react';
import { formatBookText } from '../utils/formatBookText.tsx';

interface BookPageItemProps {
  page: BookPage;
  theme: ReaderTheme;
  fontSize: ReaderFontSize;
  fontFamily: ReaderFontFamily;
  lineSpacing?: 'normal' | 'relaxed';
  isBookmarked: boolean;
  onToggleBookmark: (pageNumber: number, sectionId: string, snippet: string) => void;
}

export const BookPageItem: React.FC<BookPageItemProps> = ({
  page,
  theme,
  fontSize,
  fontFamily,
  lineSpacing = 'relaxed',
  isBookmarked,
  onToggleBookmark,
}) => {
  // Theme page styles with guaranteed high contrast across all devices
  const pageThemeStyles: Record<
    ReaderTheme,
    {
      pageBg: string;
      pageText: string;
      headingText: string;
      strongText: string;
      subtext: string;
      mutedText: string;
      accent: string;
      border: string;
      shadow: string;
      ornamentColor: string;
      boxBg: string;
      boxBorder: string;
      divider: string;
      calloutBg: string;
    }
  > = {
    paper: {
      pageBg: 'bg-[#FCFAF6]',
      pageText: 'text-[#231F1C]',
      headingText: 'text-[#171412]',
      strongText: 'text-[#120F0D]',
      subtext: 'text-[#574E44]',
      mutedText: 'text-[#6B6154]',
      accent: 'text-[#78350F]',
      border: 'border-[#E4DACB]',
      shadow: 'shadow-[0_8px_30px_rgba(40,30,20,0.06)]',
      ornamentColor: '#8C6D46',
      boxBg: 'bg-[#F4ECE0]/80',
      boxBorder: 'border-[#D4C5AE]',
      divider: 'border-[#E4DACB]',
      calloutBg: 'bg-[#F2EAE0]/70',
    },
    sepia: {
      pageBg: 'bg-[#F5ECD7]',
      pageText: 'text-[#2D2319]',
      headingText: 'text-[#1E160E]',
      strongText: 'text-[#19110A]',
      subtext: 'text-[#5A4938]',
      mutedText: 'text-[#6E5C48]',
      accent: 'text-[#692E0C]',
      border: 'border-[#DFD3BA]',
      shadow: 'shadow-[0_8px_30px_rgba(50,35,15,0.08)]',
      ornamentColor: '#7A5B36',
      boxBg: 'bg-[#EADDC2]/85',
      boxBorder: 'border-[#CFBEA1]',
      divider: 'border-[#DFD3BA]',
      calloutBg: 'bg-[#E5D8BC]/80',
    },
    dark: {
      pageBg: 'bg-[#1C1A18]',
      pageText: 'text-[#ECE6DE]',
      headingText: 'text-[#FAF7F2]',
      strongText: 'text-[#FFFFFF]',
      subtext: 'text-[#BDB2A3]',
      mutedText: 'text-[#A39786]',
      accent: 'text-[#E0A96D]',
      border: 'border-[#332F2B]',
      shadow: 'shadow-[0_8px_30px_rgba(0,0,0,0.45)]',
      ornamentColor: '#C49760',
      boxBg: 'bg-[#252220]',
      boxBorder: 'border-[#4A433D]',
      divider: 'border-[#332F2B]',
      calloutBg: 'bg-[#24211F]',
    },
  };

  const currentStyles = pageThemeStyles[theme];

  // Dynamic font class mapping for body reading and display headings
  const bodyFontClass = (() => {
    switch (fontFamily) {
      case 'garamond':
        return 'font-book-garamond';
      case 'sans':
        return 'font-book-sans';
      case 'clean':
        return 'font-book-clean';
      case 'serif':
      default:
        return 'font-book-serif';
    }
  })();

  const headingFontClass = (() => {
    switch (fontFamily) {
      case 'garamond':
        return 'font-book-garamond';
      case 'sans':
        return 'font-book-sans';
      case 'clean':
        return 'font-book-clean';
      case 'serif':
      default:
        return 'font-display-serif';
    }
  })();

  const bodySizeClasses: Record<ReaderFontSize, string> = {
    sm: lineSpacing === 'relaxed' ? 'text-[15px] leading-[1.85]' : 'text-[15px] leading-[1.7]',
    base: lineSpacing === 'relaxed' ? 'text-[17px] leading-[1.95]' : 'text-[17px] leading-[1.8]',
    lg: lineSpacing === 'relaxed' ? 'text-[19px] leading-[2.0]' : 'text-[19px] leading-[1.85]',
    xl: lineSpacing === 'relaxed' ? 'text-[21px] leading-[2.1]' : 'text-[21px] leading-[1.95]',
  };

  const getSnippet = () => {
    if (page.content.paragraphs.length > 0) {
      return page.content.paragraphs[0].slice(0, 100) + '...';
    }
    if (page.chapterTitle) return page.chapterTitle;
    return `Page ${page.pageNumber}`;
  };

  // Centered scene break, 'THE END' marker, and standard paragraph rendering
  const renderParagraph = (para: string, idx: number, isFirst: boolean = false) => {
    const trimmed = para.trim();

    // Scene divider *** as in the book, centrally placed in the page
    if (trimmed === '***' || trimmed === '* * *' || trimmed === '⁂' || trimmed === '• • •') {
      return (
        <div
          key={idx}
          className="my-7 sm:my-9 w-full flex items-center justify-center text-center select-none"
          aria-label="Scene break"
        >
          <span className={`tracking-[0.6em] text-base sm:text-lg font-bold ${bodyFontClass} ${currentStyles.mutedText}`}>
            ***
          </span>
        </div>
      );
    }

    // THE END terminal marker centrally placed
    if (trimmed.toUpperCase() === 'THE END') {
      return (
        <div key={idx} className="my-10 w-full flex items-center justify-center text-center select-none">
          <span className={`tracking-[0.3em] text-sm sm:text-base font-bold uppercase ${headingFontClass} ${currentStyles.accent}`}>
            THE END
          </span>
        </div>
      );
    }

    const isHeading = trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length < 120;
    if (isHeading) {
      const headingContent = trimmed.slice(2, -2);
      return (
        <h3
          key={idx}
          className={`${headingFontClass} text-xl sm:text-2xl font-bold tracking-tight mt-6 mb-3 ${currentStyles.headingText}`}
        >
          {headingContent}
        </h3>
      );
    }

    const shouldDropCap = isFirst && !trimmed.startsWith('*') && !trimmed.startsWith('“') && !trimmed.startsWith('"');

    return (
      <p key={idx} className={`${shouldDropCap ? 'drop-cap' : ''} leading-relaxed ${bodyFontClass} ${currentStyles.pageText}`}>
        {formatBookText(para, currentStyles.strongText)}
      </p>
    );
  };

  return (
    <article
      id={`book-page-${page.pageNumber}`}
      data-page-number={page.pageNumber}
      data-section-id={page.sectionId}
      className={`relative w-full max-w-[720px] min-h-[780px] sm:min-h-[920px] mx-auto my-6 sm:my-10 px-6 sm:px-14 py-10 sm:py-14 rounded-xs border ${currentStyles.border} ${currentStyles.pageBg} ${currentStyles.pageText} ${currentStyles.shadow} transition-colors flex flex-col justify-between select-text`}
      style={{ boxSizing: 'border-box' }}
    >
      {/* Top Running Header (Omitted on Page 1 / Title-page as in standard book design and PDF) */}
      {page.pageNumber !== 1 && page.type !== 'title-page' ? (
        <header className={`flex items-center justify-between pb-6 mb-6 border-b ${currentStyles.divider} font-ui-sans text-[11px] tracking-[0.18em] uppercase ${currentStyles.mutedText} select-none`}>
          <span className="truncate max-w-[80%] font-medium">
            {page.runningHeader || 'DATING WRONG · GERISHON WANYEKI'}
          </span>
          <button
            onClick={() => onToggleBookmark(page.pageNumber, page.sectionId, getSnippet())}
            className="p-1 rounded-xs hover:opacity-80 transition-opacity cursor-pointer"
            title={isBookmarked ? 'Remove Bookmark' : 'Bookmark this page'}
          >
            <Bookmark
              className={`w-3.5 h-3.5 ${
                isBookmarked ? 'fill-[#78350F] text-[#78350F]' : (theme === 'dark' ? 'text-stone-500' : 'text-stone-400')
              }`}
            />
          </button>
        </header>
      ) : (
        /* Discreet bookmark button on title page that does not distort layout */
        <button
          onClick={() => onToggleBookmark(page.pageNumber, page.sectionId, getSnippet())}
          className="absolute top-5 right-5 sm:top-7 sm:right-7 p-1.5 rounded-xs transition-opacity cursor-pointer opacity-30 hover:opacity-100 z-10 select-none"
          title={isBookmarked ? 'Remove Bookmark' : 'Bookmark this page'}
        >
          <Bookmark
            className={`w-3.5 h-3.5 ${
              isBookmarked ? 'fill-[#78350F] text-[#78350F]' : (theme === 'dark' ? 'text-stone-500' : 'text-stone-400')
            }`}
          />
        </button>
      )}

      {/* Page Body Content */}
      <div className={`flex-1 flex flex-col justify-center ${bodyFontClass}`}>
        {/* HALF-TITLE PAGE */}
        {page.type === 'half-title' && (
          <div className="text-center py-20 my-auto">
            <h1 className={`${headingFontClass} text-3xl sm:text-4xl tracking-[0.2em] font-semibold uppercase mb-4 ${currentStyles.accent}`}>
              Dating Wrong
            </h1>
            <p className={`${bodyFontClass} italic text-base sm:text-lg max-w-md mx-auto ${currentStyles.subtext}`}>
              Why We Choose the Wrong People and Repeat the Same Relationships
            </p>
            <div className={`w-16 h-px mx-auto my-10 ${currentStyles.divider} border-t`} />
            <p className={`font-ui-sans text-xs tracking-widest uppercase ${currentStyles.mutedText}`}>
              Gerishon Wanyeki
            </p>
          </div>
        )}

        {/* FULL TITLE PAGE (Page i / PDF 1 - Exact PDF Layout and Design) */}
        {page.type === 'title-page' && (
          <div className="text-center py-10 sm:py-16 my-auto flex flex-col items-center justify-between min-h-[580px] sm:min-h-[660px]">
            {/* Title & Subtitle */}
            <div className="space-y-4 max-w-lg mx-auto pt-4 sm:pt-6">
              <h1 className={`${headingFontClass} text-4xl sm:text-5xl lg:text-[3.25rem] font-bold tracking-[0.14em] ${currentStyles.headingText} uppercase leading-tight`}>
                DATING WRONG
              </h1>
              <p className={`${bodyFontClass} italic text-lg sm:text-xl max-w-md mx-auto leading-relaxed pt-1 ${currentStyles.subtext}`}>
                Why We Choose the Wrong People and Repeat the Same Relationships
              </p>
            </div>

            {/* Author */}
            <div className="my-10 sm:my-12 space-y-2.5">
              <p className={`font-ui-sans text-xs tracking-[0.3em] uppercase font-semibold ${currentStyles.mutedText}`}>
                By
              </p>
              <p className={`${headingFontClass} text-2xl sm:text-3xl lg:text-[2rem] font-bold tracking-[0.12em] ${currentStyles.accent} uppercase`}>
                GERISHON WANYEKI
              </p>
            </div>

            {/* Author Epigraph / Quote */}
            <div className={`my-8 max-w-md mx-auto px-6 sm:px-8 py-4 sm:py-5 border-y ${currentStyles.boxBorder}`}>
              <blockquote className={`${bodyFontClass} italic text-base sm:text-lg leading-relaxed ${currentStyles.pageText}`}>
                “Not every person we love is the person we should choose.”
              </blockquote>
              <p className={`mt-2.5 font-ui-sans text-[11px] uppercase tracking-[0.22em] font-semibold ${currentStyles.accent}`}>
                — Gerishon Wanyeki
              </p>
            </div>

            {/* Imprint at bottom - authentic publisher typography matching the PDF */}
            <div className="mt-auto pt-8 pb-2 text-center">
              <p className={`font-ui-sans text-xs sm:text-sm tracking-[0.28em] font-bold uppercase ${currentStyles.headingText} opacity-90`}>
                PUBLISHED BY MARK & ALVIS
              </p>
              <p className={`mt-3 font-ui-sans text-[11px] tracking-[0.2em] uppercase font-medium ${currentStyles.mutedText}`}>
                Page i · Title Page
              </p>
            </div>
          </div>
        )}

        {/* COPYRIGHT PAGE (Folio ii) */}
        {page.type === 'copyright' && (
          <div className={`my-auto py-10 space-y-4 text-xs font-ui-sans max-w-md mx-auto leading-relaxed ${currentStyles.subtext}`}>
            <h2 className={`${headingFontClass} text-lg font-bold mb-4 text-center ${currentStyles.headingText}`}>
              Copyright & Publication Notice
            </h2>
            {page.content.paragraphs.map((para, idx) => (
              <p key={idx} className={idx === 0 ? `font-semibold ${currentStyles.headingText}` : ''}>
                {formatBookText(para, currentStyles.strongText)}
              </p>
            ))}
          </div>
        )}

        {/* DEDICATION PAGE (Folio iii) */}
        {page.type === 'dedication' && (
          <div className="my-auto py-12 text-center max-w-lg mx-auto space-y-8">
            <h2 className={`font-ui-sans text-xs tracking-[0.25em] uppercase font-bold ${currentStyles.accent}`}>
              Dedication
            </h2>
            {page.content.epigraph && (
              <div className={`p-4 rounded-xs border-l-2 ${currentStyles.boxBorder} ${currentStyles.calloutBg} text-left`}>
                <blockquote className={`${bodyFontClass} italic text-base sm:text-lg leading-relaxed ${currentStyles.accent}`}>
                  “{page.content.epigraph.text}”
                </blockquote>
                <p className={`text-right font-ui-sans text-xs font-bold uppercase tracking-wider ${currentStyles.accent} mt-2`}>
                  — {page.content.epigraph.source}
                </p>
              </div>
            )}
            <div className={`space-y-5 text-base sm:text-lg leading-relaxed ${bodyFontClass} ${currentStyles.pageText}`}>
              {page.content.paragraphs.map((para, idx) => renderParagraph(para, idx, false))}
            </div>
          </div>
        )}

        {/* AUTHOR'S NOTE (Folio iv) */}
        {page.type === 'authors-note' && (
          <div className="space-y-6">
            <div className="text-center pb-4 mb-2">
              <p className={`font-ui-sans text-xs tracking-[0.25em] uppercase font-bold ${currentStyles.accent}`}>
                Preface
              </p>
              <h2 className={`${headingFontClass} text-2xl sm:text-3xl font-bold mt-1 ${currentStyles.headingText}`}>
                Author’s Note
              </h2>
            </div>
            <div className={`space-y-5 ${bodySizeClasses[fontSize]} ${currentStyles.pageText}`}>
              {page.content.paragraphs.map((para, idx) => renderParagraph(para, idx, idx === 0))}
            </div>
          </div>
        )}

        {/* TABLE OF CONTENTS PAGE (Page 7 / PDF 7 / Folio vii) */}
        {page.type === 'contents' && (
          <div className="py-4 sm:py-6 space-y-5">
            <div className={`text-center pb-4 border-b ${currentStyles.divider}`}>
              <h2 className={`${headingFontClass} text-2xl sm:text-3xl font-bold tracking-tight uppercase ${currentStyles.headingText}`}>
                Contents
              </h2>
              <div className="w-12 h-px bg-[#8C6D46]/40 mx-auto mt-2" />
            </div>

            <div className="space-y-3 font-ui-sans text-xs sm:text-[13px]">
              {/* Frontmatter items with crystal clear roman numerals */}
              <div className={`space-y-2.5 ${currentStyles.subtext}`}>
                <div className={`flex justify-between items-baseline border-b border-dotted ${currentStyles.divider} pb-1`}>
                  <span className={`${bodyFontClass} italic ${currentStyles.pageText}`}>Copyright & Publication Notice</span>
                  <span className={`font-bold ${currentStyles.headingText}`}>II</span>
                </div>
                <div className={`flex justify-between items-baseline border-b border-dotted ${currentStyles.divider} pb-1`}>
                  <span className={`${bodyFontClass} italic ${currentStyles.pageText}`}>Dedication</span>
                  <span className={`font-bold ${currentStyles.headingText}`}>III</span>
                </div>
                <div className={`flex justify-between items-baseline border-b border-dotted ${currentStyles.divider} pb-1`}>
                  <span className={`${bodyFontClass} italic ${currentStyles.pageText}`}>Author’s Note</span>
                  <span className={`font-bold ${currentStyles.headingText}`}>IV</span>
                </div>
                <div className={`flex justify-between items-baseline border-b border-dotted ${currentStyles.divider} pb-1`}>
                  <div>
                    <span className={`${headingFontClass} font-semibold ${currentStyles.headingText}`}>
                      Introduction: When Love Becomes the Wrong Choice
                    </span>
                    <span className={`block text-[11px] ${bodyFontClass} italic ${currentStyles.accent}`}>
                      Proverbs 14:12
                    </span>
                  </div>
                  <span className={`font-bold ${currentStyles.headingText}`}>V</span>
                </div>
              </div>

              {/* Chapters with First Titles & Biblical Verses */}
              <div className="pt-2 space-y-2.5">
                <div className={`flex justify-between items-baseline border-b border-dotted ${currentStyles.divider} pb-1.5`}>
                  <div className="pr-4">
                    <span className={`font-ui-sans text-[10px] font-bold uppercase tracking-wider ${currentStyles.accent} block`}>
                      Chapter One
                    </span>
                    <span className={`${headingFontClass} font-bold ${currentStyles.headingText}`}>
                      The Weight of Hesitation & The Phantom Rival
                    </span>
                    <span className={`block text-[11px] ${bodyFontClass} italic ${currentStyles.accent}`}>
                      Proverbs 4:23
                    </span>
                  </div>
                  <span className={`font-bold ${currentStyles.headingText} shrink-0`}>1</span>
                </div>

                <div className={`flex justify-between items-baseline border-b border-dotted ${currentStyles.divider} pb-1.5`}>
                  <div className="pr-4">
                    <span className={`font-ui-sans text-[10px] font-bold uppercase tracking-wider ${currentStyles.accent} block`}>
                      Chapter Two
                    </span>
                    <span className={`${headingFontClass} font-bold ${currentStyles.headingText}`}>
                      Cultural Collision & The Illusion of Acting
                    </span>
                    <span className={`block text-[11px] ${bodyFontClass} italic ${currentStyles.accent}`}>
                      Amos 3:3
                    </span>
                  </div>
                  <span className={`font-bold ${currentStyles.headingText} shrink-0`}>20</span>
                </div>

                <div className={`flex justify-between items-baseline border-b border-dotted ${currentStyles.divider} pb-1.5`}>
                  <div className="pr-4">
                    <span className={`font-ui-sans text-[10px] font-bold uppercase tracking-wider ${currentStyles.accent} block`}>
                      Chapter Three
                    </span>
                    <span className={`${headingFontClass} font-bold ${currentStyles.headingText}`}>
                      The Rebound Prop & The Church Tribunal
                    </span>
                    <span className={`block text-[11px] ${bodyFontClass} italic ${currentStyles.accent}`}>
                      Proverbs 28:26
                    </span>
                  </div>
                  <span className={`font-bold ${currentStyles.headingText} shrink-0`}>36</span>
                </div>

                <div className={`flex justify-between items-baseline border-b border-dotted ${currentStyles.divider} pb-1.5`}>
                  <div className="pr-4">
                    <span className={`font-ui-sans text-[10px] font-bold uppercase tracking-wider ${currentStyles.accent} block`}>
                      Chapter Four
                    </span>
                    <span className={`${headingFontClass} font-bold ${currentStyles.headingText}`}>
                      Unexamined Scars & The Circle of Betrayal
                    </span>
                    <span className={`block text-[11px] ${bodyFontClass} italic ${currentStyles.accent}`}>
                      Proverbs 18:19
                    </span>
                  </div>
                  <span className={`font-bold ${currentStyles.headingText} shrink-0`}>53</span>
                </div>

                <div className={`flex justify-between items-baseline border-b border-dotted ${currentStyles.divider} pb-1.5`}>
                  <div className="pr-4">
                    <span className={`font-ui-sans text-[10px] font-bold uppercase tracking-wider ${currentStyles.accent} block`}>
                      Chapter Five
                    </span>
                    <span className={`${headingFontClass} font-bold ${currentStyles.headingText}`}>
                      The Dream Mirror & The Blueprint of Becoming
                    </span>
                    <span className={`block text-[11px] ${bodyFontClass} italic ${currentStyles.accent}`}>
                      Proverbs 13:12
                    </span>
                  </div>
                  <span className={`font-bold ${currentStyles.headingText} shrink-0`}>73</span>
                </div>

                <div className={`flex justify-between items-baseline border-b border-dotted ${currentStyles.divider} pb-1.5`}>
                  <div className="pr-4">
                    <span className={`font-ui-sans text-[10px] font-bold uppercase tracking-wider ${currentStyles.accent} block`}>
                      Chapter Six
                    </span>
                    <span className={`${headingFontClass} font-bold ${currentStyles.headingText}`}>
                      The Lessons We Learned & The Christian Standard for Dating
                    </span>
                    <span className={`block text-[11px] ${bodyFontClass} italic ${currentStyles.accent}`}>
                      Jeremiah 17:9
                    </span>
                  </div>
                  <span className={`font-bold ${currentStyles.headingText} shrink-0`}>89</span>
                </div>

                {/* Subsections of Chapter Six */}
                <div className={`pl-6 space-y-1 text-xs ${currentStyles.subtext}`}>
                  <div className="flex justify-between items-baseline">
                    <span className={`${bodyFontClass} italic ${currentStyles.pageText}`}>Part I: The Lessons We Learned</span>
                    <span className={`font-semibold ${currentStyles.headingText}`}>89</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className={`${bodyFontClass} italic ${currentStyles.pageText}`}>Part II: The Christian Standard for Dating</span>
                    <span className={`font-semibold ${currentStyles.headingText}`}>102</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CHAPTER START PAGE */}
        {page.type === 'chapter-start' && (
          <div className="space-y-6">
            {/* Chapter Header Ornament */}
            <div className={`text-center pt-2 pb-6 border-b ${currentStyles.divider}`}>
              {page.chapterNumberLabel && (
                <p className={`font-ui-sans text-xs font-bold uppercase tracking-[0.3em] ${currentStyles.accent} mb-2`}>
                  {page.chapterNumberLabel}
                </p>
              )}
              <h2 className={`${headingFontClass} text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight ${currentStyles.headingText}`}>
                {page.chapterTitle}
              </h2>

              {/* Epigraph */}
              {page.content.epigraph && (
                <div className={`mt-6 max-w-md mx-auto p-4 rounded-xs border-l-2 ${currentStyles.boxBorder} ${currentStyles.calloutBg} text-left`}>
                  <blockquote className={`${bodyFontClass} italic text-sm sm:text-base leading-relaxed ${currentStyles.pageText}`}>
                    “{page.content.epigraph.text}”
                  </blockquote>
                  <p className={`mt-2 text-right font-ui-sans text-[11px] font-bold uppercase tracking-wider ${currentStyles.accent}`}>
                    — {page.content.epigraph.source}
                  </p>
                </div>
              )}
            </div>

            {/* Opener Body */}
            <div className={`space-y-6 pt-2 ${bodySizeClasses[fontSize]} ${currentStyles.pageText}`}>
              {page.content.paragraphs.map((para, idx) => renderParagraph(para, idx, idx === 0))}
            </div>
          </div>
        )}

        {/* CHAPTER BODY CONTINUATION PAGE (Including Introduction folios v & vi) */}
        {page.type === 'chapter-body' && (
          <div className={`space-y-6 py-2 ${bodySizeClasses[fontSize]} ${currentStyles.pageText}`}>
            {page.content.paragraphs.map((para, idx) => renderParagraph(para, idx, false))}
          </div>
        )}

        {/* REFLECTION & BIBLICAL ANCHOR PAGE */}
        {page.type === 'reflection' && (
          <div className="space-y-8 my-auto py-4">
            {page.content.biblicalAnchor && (
              <div className={`p-6 sm:p-7 rounded-xs border ${currentStyles.boxBorder} ${currentStyles.boxBg}`}>
                <p className={`font-ui-sans text-xs font-bold uppercase tracking-[0.2em] ${currentStyles.accent} mb-2`}>
                  Biblical Anchor · {page.content.biblicalAnchor.verse}
                </p>
                <p className={`${bodyFontClass} text-base sm:text-lg italic leading-relaxed ${currentStyles.headingText}`}>
                  “{page.content.biblicalAnchor.text}”
                </p>
              </div>
            )}

            {page.content.reflectionQuestions && (
              <div className={`p-6 sm:p-7 rounded-xs border ${currentStyles.boxBorder} ${currentStyles.calloutBg}`}>
                <h3 className={`${headingFontClass} text-lg font-bold mb-4 ${currentStyles.accent}`}>
                  Questions for Heart Examination
                </h3>
                <ol className={`space-y-4 ${bodyFontClass} text-sm sm:text-base list-decimal list-inside leading-relaxed ${currentStyles.pageText}`}>
                  {page.content.reflectionQuestions.map((q, idx) => (
                    <li key={idx} className="pl-1">
                      {q}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Running Footer: Exact Book Folio Number and PDF Page Alignment (Omitted on Title-Page / Page i as in the PDF) */}
      {page.pageNumber !== 1 && page.type !== 'title-page' ? (
        <footer className={`pt-6 mt-6 border-t ${currentStyles.divider} flex items-center justify-between font-ui-sans text-[11px] ${currentStyles.mutedText} select-none`}>
          <span className="truncate max-w-[50%] font-medium">
            {page.chapterNumberLabel || page.chapterTitle || 'Dating Wrong'}
          </span>
          <div className="flex items-center gap-2 font-semibold tracking-wider">
            <span className={`font-bold ${currentStyles.headingText}`}>
              Page {page.folioLabel || page.pageNumber}
            </span>
            <span className={`text-[10px] font-medium ${currentStyles.mutedText}`}>
              (PDF {page.pdfPageNumber || page.pageNumber} of {page.totalNumberedPages || 122})
            </span>
          </div>
        </footer>
      ) : null}
    </article>
  );
};
