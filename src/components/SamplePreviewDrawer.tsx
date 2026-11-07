import React, { useState } from 'react';
import { X, BookOpen, ChevronRight, Lock } from 'lucide-react';
import { ChapterSection } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { BookManager } from '../data/bookRegistry.ts';
import { formatBookText } from '../utils/formatBookText.tsx';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock.ts';

interface SamplePreviewDrawerProps {
  isOpen: boolean;
  sections?: ChapterSection[];
  onClose: () => void;
  onOpenPurchase?: () => void;
  onUnlockFullBook?: () => void;
}

export const SamplePreviewDrawer: React.FC<SamplePreviewDrawerProps> = ({
  isOpen,
  sections,
  onClose,
  onOpenPurchase,
  onUnlockFullBook,
}) => {
  useBodyScrollLock(isOpen);
  const { bookConfig } = useAuth();
  const [activeSectionId, setActiveSectionId] = useState<string>('introduction');

  if (!isOpen) return null;

  // Default sample sections if not passed
  const sampleSections = sections && sections.length > 0 ? sections : BookManager.getPreviewSections();

  const currentSection = sampleSections.find((s) => s.id === activeSectionId) || sampleSections[0];

  const handleUnlock = () => {
    if (onUnlockFullBook) onUnlockFullBook();
    else if (onOpenPurchase) onOpenPurchase();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 lg:p-8 bg-stone-950/70 backdrop-blur-xs overscroll-contain transition-opacity">
      {/* Click outside backdrop to close */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl h-full sm:h-[90vh] sm:max-h-[880px] bg-[#F5F0E8] sm:rounded-md border-0 sm:border border-[#DDD3C2] shadow-2xl flex flex-col overflow-hidden z-10">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E0D2] bg-[#F5EFE4] shrink-0">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-[#7A2638]" />
            <div>
              <h3 className="font-display-serif text-base font-bold text-[#171717]">
                Free Sample Selection
              </h3>
              <p className="font-ui-sans text-[10px] uppercase tracking-wider text-[#8B735F]">
                Dating Wrong • Gerishon Wanyeki
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-sm text-[#78716C] hover:text-[#171717] hover:bg-stone-200/50 transition-colors cursor-pointer"
            title="Close sample preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 py-2.5 border-b border-[#E8E0D2] bg-[#F5F0E8] overflow-x-auto text-xs font-ui-sans shrink-0">
          {sampleSections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSectionId(s.id)}
              className={`px-3 py-1.5 rounded-xs whitespace-nowrap transition-colors cursor-pointer ${
                activeSectionId === s.id
                  ? 'bg-[#7A2638] text-[#F5F0E8] font-semibold shadow-xs'
                  : 'text-[#57534E] hover:bg-[#EFE8DB]'
              }`}
            >
              {s.numberLabel || s.title}
            </button>
          ))}
        </div>

        {/* Reading Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 md:p-12 font-book-serif">
          {currentSection && (
            <div className="max-w-2xl mx-auto">
              {/* Header */}
              <div className="text-center mb-8 pb-6 border-b border-[#EAE2D3]">
                {currentSection.numberLabel && (
                  <p className="font-ui-sans text-xs font-bold uppercase tracking-widest text-[#8B735F] mb-1">
                    {currentSection.numberLabel}
                  </p>
                )}
                <h2 className="font-display-serif text-2xl sm:text-3xl font-bold text-[#171717]">
                  {currentSection.title}
                </h2>
                {currentSection.subtitle && (
                  <p className="font-book-serif italic text-sm text-[#78716C] mt-1">
                    {currentSection.subtitle}
                  </p>
                )}

                {currentSection.epigraph && (
                  <div className="mt-4 max-w-md mx-auto p-3 bg-[#F5EFE4] border-l-2 border-[#8B735F] rounded-r-xs">
                    <p className="italic text-xs text-[#242424]">
                      “{currentSection.epigraph.text}”
                    </p>
                    <p className="text-[10px] font-ui-sans text-[#8B735F] uppercase tracking-wider mt-1 text-right">
                      — {currentSection.epigraph.source}
                    </p>
                  </div>
                )}
              </div>

              {/* Paragraphs */}
              <div className="space-y-4 text-base sm:text-lg text-[#242424] leading-relaxed">
                {currentSection.paragraphs.map((p, idx) => {
                  const trimmed = p.trim();

                  // Scene divider *** as in the book, centrally placed in the page
                  if (trimmed === '***' || trimmed === '* * *' || trimmed === '⁂' || trimmed === '• • •') {
                    return (
                      <div
                        key={idx}
                        className="my-7 sm:my-9 w-full flex items-center justify-center text-center select-none"
                        aria-label="Scene break"
                      >
                        <span className="font-serif tracking-[0.6em] text-base sm:text-lg font-bold text-stone-500">
                          ***
                        </span>
                      </div>
                    );
                  }

                  // THE END terminal marker centrally placed
                  if (trimmed.toUpperCase() === 'THE END') {
                    return (
                      <div key={idx} className="my-10 w-full flex items-center justify-center text-center select-none">
                        <span className="font-display-serif tracking-[0.3em] text-sm sm:text-base font-bold uppercase text-[#78350F]">
                          THE END
                        </span>
                      </div>
                    );
                  }

                  const isHeading = trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length < 120;
                  const shouldDropCap = idx === 0 && currentSection.type === 'chapter' && !isHeading && !trimmed.startsWith('*');

                  return (
                    <p
                      key={idx}
                      className={shouldDropCap ? 'drop-cap' : ''}
                    >
                      {formatBookText(p)}
                    </p>
                  );
                })}
              </div>

              {/* End of Section / Preview Boundary Box */}
              <div className="mt-12 p-6 bg-[#EFE8DB] border border-[#DDD3C2] rounded-xs text-center">
                <p className="font-display-serif text-lg font-bold text-[#171717]">
                  You have reached the end of this sample.
                </p>
                <p className="font-book-serif text-sm text-[#57534E] mt-1">
                  Continue reading Chapter One: <em>The Illusion of Chemistry</em>, all 6 chapters, reflection questions, and the Christian Standard for Dating.
                </p>

                <div className="mt-5 flex justify-center">
                  <button
                    onClick={handleUnlock}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xs bg-[#991B1B] hover:bg-[#7F1D1D] text-[#FAF7F2] font-ui-sans font-semibold text-xs tracking-wider uppercase transition-colors shadow-xs cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Unlock Full Book ({bookConfig.bookPriceKes || 750} KSH)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
