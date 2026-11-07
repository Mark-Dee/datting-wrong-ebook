import React from 'react';
import { Lock, BookOpen, ChevronRight, Check } from 'lucide-react';
import { ChapterSection, UserEntitlement } from '../types.ts';
import { PopReveal } from './PopReveal.tsx';

interface ManuscriptBreakdownProps {
  sections: ChapterSection[];
  entitlement: UserEntitlement | null;
  onSelectSection: (sectionId: string, isPreview: boolean) => void;
  onUnlockAll: () => void;
}

export const ManuscriptBreakdown: React.FC<ManuscriptBreakdownProps> = ({
  sections,
  entitlement,
  onSelectSection,
  onUnlockAll,
}) => {
  const freePreviewIds = ['copyright', 'dedication', 'authors-note', 'introduction'];

  return (
    <section id="chapters" className="py-20 sm:py-28 bg-[#F6F1E7] border-b border-[#E5DAC6]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Section Header popping from down */}
        <PopReveal yOffset={35}>
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="font-ui-sans text-xs font-bold uppercase tracking-[0.25em] text-[#991B1B]">
              The Complete Manuscript
            </p>
            <h2 className="mt-2 font-display-serif text-3xl sm:text-4xl font-bold text-[#141110]">
              Table of Contents
            </h2>
            <p className="mt-3 font-book-serif text-base text-[#574C43]">
              Each chapter represents a deliberate stage of diagnostic honesty, emotional sobriety, and biblical restoration.
            </p>
          </div>
        </PopReveal>

        {/* Chapters List popping dynamically as user scrolls down */}
        <div className="bg-[#FAF7F2] border border-[#DDD0BC] rounded-xs divide-y divide-[#EAE0CF] shadow-xs overflow-hidden">
          {sections.map((section, idx) => {
            const isFree = freePreviewIds.includes(section.id);
            const isUnlocked = Boolean(entitlement) || isFree;

            return (
              <PopReveal
                key={section.id}
                delayMs={Math.min(idx * 45, 300)}
                yOffset={25}
                scaleInitial={0.97}
              >
                <div
                  onClick={() => onSelectSection(section.id, isFree)}
                  className={`group p-5 sm:p-6 transition-all duration-200 flex items-start sm:items-center justify-between gap-4 cursor-pointer ${
                    isUnlocked
                      ? 'hover:bg-[#F3ECE0]'
                      : 'hover:bg-[#EFE7D8]/80'
                  }`}
                >
                  <div className="flex items-start gap-4 sm:gap-6">
                    {/* Order Number / Page badge */}
                    <div className="w-10 h-10 rounded-xs bg-[#EFE6D6] border border-[#D9CDB8] flex flex-col items-center justify-center shrink-0 font-ui-sans group-hover:border-[#991B1B] group-hover:bg-[#F8EFE2] transition-colors">
                      {section.type === 'chapter' ? (
                        <>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#991B1B]">
                            CH
                          </span>
                          <span className="text-xs font-bold text-[#141110]">
                            {String(idx - 3)}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs font-bold uppercase text-[#991B1B]">
                          {section.title.charAt(0)}
                        </span>
                      )}
                    </div>

                    {/* Chapter Titles & Details */}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {section.numberLabel && (
                          <span className="font-ui-sans text-xs font-bold tracking-wider uppercase text-[#B45309]">
                            {section.numberLabel}
                          </span>
                        )}
                        {/* Page indicator */}
                        <span className="font-ui-sans text-[11px] font-semibold text-[#8C6D46] bg-[#EFE6D6]/70 px-2 py-0.5 rounded-2xs border border-[#D9CDB8]/60">
                          {section.id === 'title-page' && 'Page I · PDF 1'}
                          {section.id === 'copyright' && 'Page II · PDF 2'}
                          {section.id === 'dedication' && 'Page III · PDF 3'}
                          {section.id === 'authors-note' && 'Page IV · PDF 4'}
                          {section.id === 'introduction' && 'Page V · PDF 5'}
                          {section.id === 'chapter-one' && 'Page 1 · PDF 8'}
                          {section.id === 'chapter-two' && 'Page 20 · PDF 27'}
                          {section.id === 'chapter-three' && 'Page 36 · PDF 43'}
                          {section.id === 'chapter-four' && 'Page 53 · PDF 60'}
                          {section.id === 'chapter-five' && 'Page 73 · PDF 80'}
                          {section.id === 'chapter-six' && 'Page 89 · PDF 96'}
                        </span>
                        {isFree && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-2xs text-[10px] font-ui-sans font-semibold uppercase tracking-wider bg-[#E7EFE4] text-[#245920] border border-[#CADBC6]">
                            Free Preview
                          </span>
                        )}
                      </div>

                      <h3 className="font-display-serif text-lg sm:text-xl font-bold text-[#171413] group-hover:text-[#991B1B] transition-colors mt-0.5">
                        {section.title}
                      </h3>

                      {section.subtitle && (
                        <p className="font-book-serif italic text-sm text-[#665A50] mt-0.5">
                          {section.subtitle}
                        </p>
                      )}

                      {/* Bible Verse / Epigraph Anchor */}
                      {section.epigraph && (
                        <div className="mt-1.5 p-2.5 rounded-xs bg-[#F4ECE0]/80 border-l-2 border-[#991B1B] max-w-2xl">
                          <p className="font-book-serif text-xs sm:text-sm text-[#4A3E36] italic leading-relaxed">
                            “{section.epigraph.text}”
                          </p>
                          <p className="font-ui-sans text-[10px] font-bold uppercase tracking-wider text-[#991B1B] mt-1 text-right sm:text-left">
                            — {section.epigraph.source}
                          </p>
                        </div>
                      )}

                      {/* Chapter Six Section Breakdown */}
                      {section.id === 'chapter-six' && (
                        <div className="mt-2.5 flex flex-wrap gap-2 text-xs font-ui-sans">
                          <span className="px-2 py-0.5 rounded-2xs bg-[#EFE6D6] text-[#78350F] border border-[#D9CDB8]">
                            Part I: The Lessons We Learned (Page 89)
                          </span>
                          <span className="px-2 py-0.5 rounded-2xs bg-[#EFE6D6] text-[#78350F] border border-[#D9CDB8]">
                            Part II: The Christian Standard for Dating (Page 102)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Status / Action */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="hidden sm:inline font-ui-sans text-xs text-[#968779]">
                      {section.readingMinutes} min read
                    </span>

                    {isUnlocked ? (
                      <div className="flex items-center gap-1 text-xs font-ui-sans font-medium text-[#991B1B]">
                        <span className="hidden md:inline font-semibold">Read</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-[#EDE4D2] text-[#6B5E52] text-xs font-ui-sans font-medium border border-[#D5C7AF]">
                        <Lock className="w-3 h-3 text-[#968779]" />
                        <span className="hidden sm:inline">Protected</span>
                      </div>
                    )}
                  </div>
                </div>
              </PopReveal>
            );
          })}
        </div>

        {/* Bottom Banner for Unlock popping from down */}
        {!entitlement && (
          <PopReveal yOffset={35} delayMs={100}>
            <div className="mt-8 p-6 sm:p-8 bg-[#EFE7D8] border border-[#D9CBB4] rounded-xs flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left shadow-2xs">
              <div>
                <h4 className="font-display-serif text-xl font-bold text-[#141110]">
                  Unlock the Full 122-Page Manuscript
                </h4>
                <p className="font-book-serif text-sm text-[#574C43] mt-1">
                  Immediate activation via M-PESA. Includes encrypted offline storage, token verification, reading progress synchronization, and lifetime access to future editions.
                </p>
              </div>
              <button
                onClick={onUnlockAll}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xs bg-[#991B1B] text-[#FAF7F2] text-xs font-ui-sans font-semibold tracking-wider uppercase hover:bg-[#7F1D1D] transition-colors shrink-0 shadow-sm cursor-pointer"
              >
                <span>Unlock for 750 KSH</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </PopReveal>
        )}
      </div>
    </section>
  );
};

export default ManuscriptBreakdown;
