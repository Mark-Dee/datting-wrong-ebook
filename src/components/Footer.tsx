import React from 'react';
import { KeyRound, SlidersHorizontal, ArrowUp } from 'lucide-react';
import { BookMetadata } from '../types.ts';
import { PopReveal } from './PopReveal.tsx';

interface FooterProps {
  metadata: BookMetadata;
  onOpenRestore: () => void;
  onOpenVersions: () => void;
  onOpenPurchase: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  metadata,
  onOpenRestore,
  onOpenVersions,
  onOpenPurchase,
}) => {
  return (
    <footer className="bg-[#0F0D0C] text-[#FAF7F2] border-t border-[#29221F]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-12">
        <PopReveal yOffset={30}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#29221F]">
            {/* Col 1: Brand & Quote */}
            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xs bg-[#991B1B] text-[#FAF7F2] flex items-center justify-center font-display-serif font-bold text-base shadow-sm">
                  M
                </div>
                <div>
                  <p className="font-ui-sans text-[10px] tracking-[0.25em] uppercase font-bold text-[#F59E0B]">
                    Mark & Alvis
                  </p>
                  <p className="font-display-serif text-lg font-bold text-[#FAF7F2]">
                    Dating <span className="text-[#DC2626]">Wrong</span>
                  </p>
                </div>
              </div>

              <p className="font-book-serif italic text-sm text-[#E5D8C5] max-w-sm leading-relaxed">
                “Not every person we love is the person we should choose.”
              </p>
              <p className="font-ui-sans text-xs uppercase tracking-wider text-[#A89884]">
                — Gerishon Wanyeki
              </p>
            </div>

            {/* Col 2: Publication Specs */}
            <div className="md:col-span-4 space-y-2 font-ui-sans text-xs text-[#A89884]">
              <p className="text-[#F59E0B] font-semibold uppercase tracking-wider mb-2">
                Publication Provenance
              </p>
              <p className="text-[#EDE3D2]">First Edition, 2026</p>
              <p>{metadata.copyright}</p>
              <p>Published by Mark & Alvis Publishers</p>
              <p>Nairobi, Kenya</p>
              <p className="text-[11px] text-[#786C5E]">ISBN: {metadata.isbn}</p>
            </div>

            {/* Col 3: Platform Navigation */}
            <div className="md:col-span-3 space-y-3 font-ui-sans text-xs">
              <p className="text-[#F59E0B] font-semibold uppercase tracking-wider mb-2">
                Reader Access
              </p>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={onOpenPurchase}
                    className="text-[#EDE3D2] hover:text-[#DC2626] transition-colors cursor-pointer text-left"
                  >
                    Purchase Digital Edition (750 KSH)
                  </button>
                </li>
                <li>
                  <button
                    onClick={onOpenRestore}
                    className="text-[#EDE3D2] hover:text-[#DC2626] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-[#F59E0B]" />
                    <span>Restore Device License</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={onOpenVersions}
                    className="text-[#EDE3D2] hover:text-[#DC2626] transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="View Version Architecture"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#F59E0B]" />
                    <span>Version Architecture</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </PopReveal>

        {/* Bottom Colophon Bar & Back to Top */}
        <PopReveal delayMs={100} yOffset={20}>
          <div className="pt-8 flex flex-col items-center justify-center gap-3.5 text-center text-xs font-ui-sans text-[#786C5E]">
            <p>Copyright © 2026 by Gerishon Wanyeki. All rights reserved. Published by Mark & Alvis.</p>
            
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#181412] hover:bg-[#251F1C] border border-[#2B231F] hover:border-[#F59E0B]/50 text-[#A89884] hover:text-[#FAF7F2] text-xs font-ui-sans transition-all group cursor-pointer shadow-xs"
              title="Back to top"
            >
              <span>Back to top</span>
              <div className="w-5 h-5 rounded-full bg-[#29221F] group-hover:bg-[#F59E0B] text-[#A89884] group-hover:text-[#0F0D0C] flex items-center justify-center transition-colors">
                <ArrowUp className="w-3 h-3 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </a>
          </div>
        </PopReveal>
      </div>
    </footer>
  );
};

export default Footer;
