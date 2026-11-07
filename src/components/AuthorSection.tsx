import React, { useState } from 'react';
import { Feather, MessageCircle, ArrowUpRight } from 'lucide-react';
import { BookMetadata } from '../types.ts';
import { PopReveal } from './PopReveal.tsx';
import { WhatsAppContactModal } from './WhatsAppContactModal.tsx';

interface AuthorSectionProps {
  metadata: BookMetadata;
}

export const AuthorSection: React.FC<AuthorSectionProps> = ({ metadata }) => {
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);

  return (
    <section id="author" className="py-20 sm:py-28 bg-[#FAF6F0] border-b border-[#E5DAC6]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column: Author Bio & Reflections */}
          <div className="lg:col-span-7">
            <PopReveal yOffset={30}>
              <div className="inline-flex items-center gap-2 text-xs font-ui-sans font-semibold uppercase tracking-[0.2em] text-[#991B1B] mb-3">
                <Feather className="w-4 h-4" />
                <span>About the Author</span>
              </div>

              <h2 className="font-display-serif text-3xl sm:text-4xl font-bold text-[#141110]">
                {metadata.author}
              </h2>

              <p className="mt-2 font-book-serif italic text-lg text-[#B45309]">
                Writer, Speaker, and Pastoral Voice for Relationship Sobriety
              </p>
            </PopReveal>

            <PopReveal delayMs={120} yOffset={25}>
              <div className="mt-6 space-y-4 font-book-serif text-base text-[#473D35] leading-relaxed">
                <p>
                  Gerishon Wanyeki was born and raised in Nyeri county in Kenya in a close-knit pastoral family. Deeply shaped by his upbringing, he developed a passion for life, people and the lessons that come from real experiences.
                </p>
                <p>
                  Having counseled hundreds of young men and women navigating the turbulence of modern dating and from his real life experiences, Gerishon observed a recurring grief: sincere believers repeatedly investing years of emotional and spiritual capital into relationships destined for mutual diminishment.
                </p>
                <p>
                  <em>Dating Wrong</em> represents the distillation of these crucial pastoral encounters. It is crafted not to condemn, but to illuminate—providing the discerning framework necessary to distinguish between what feels electric in the moment and what endures in covenant before God.
                </p>
              </div>
            </PopReveal>

            {/* Author's direct statement */}
            <PopReveal delayMs={240} yOffset={30}>
              <div className="mt-8 p-6 bg-[#F5EFE4] border-l-2 border-[#8C6D46] rounded-r-xs shadow-2xs">
                <p className="font-book-serif italic text-sm sm:text-base text-[#241E1A] leading-relaxed">
                  “If we do not teach our hearts to love what God loves, we will continually sacrifice our peace on the altar of temporary validation. Discernment is the highest form of self-respect.”
                </p>
                <p className="mt-2 font-ui-sans text-xs font-bold uppercase tracking-wider text-[#8C6D46]">
                  — Gerishon Wanyeki
                </p>
              </div>
            </PopReveal>
          </div>

          {/* Right Column: Publishing Colophon (Mark & Alvis) */}
          <div className="lg:col-span-5">
            <PopReveal delayMs={180} yOffset={40}>
              <div className="bg-[#F5EDE1] border border-[#D9CBB4] p-6 sm:p-8 rounded-xs shadow-2xs">
                <div className="flex items-center gap-3 pb-5 border-b border-[#DFD3BF]">
                  <div className="w-10 h-10 rounded-xs bg-[#171413] text-[#FAF7F2] flex items-center justify-center font-display-serif font-bold text-lg shadow-xs">
                    M&A
                  </div>
                  <div>
                    <h3 className="font-display-serif text-lg font-bold text-[#141110]">
                      Mark & Alvis Publishers
                    </h3>
                    <p className="font-ui-sans text-xs text-[#786C5E] tracking-wide uppercase">
                      Nairobi, Kenya • Est. 2026
                    </p>
                  </div>
                </div>

                <p className="mt-5 font-book-serif text-sm text-[#574C43] leading-relaxed">
                  Mark & Alvis is a technology-driven creative partnership combining software engineering, information technology, and digital publishing. We turn ideas into polished digital experiences through thoughtful design, technical precision, and purposeful storytelling.
                </p>

                {/* Colophon Details */}
                <div className="mt-6 pt-5 border-t border-[#DFD3BF] space-y-3 font-ui-sans text-xs">
                  <div className="flex justify-between text-[#6B5E52]">
                    <span className="text-[#968779]">First Edition:</span>
                    <span className="font-medium text-[#1F1A17]">2026</span>
                  </div>
                  <div className="flex justify-between text-[#6B5E52]">
                    <span className="text-[#968779]">Copyright:</span>
                    <span className="font-medium text-[#1F1A17]">© 2026 by Gerishon Wanyeki</span>
                  </div>
                  <div className="flex justify-between text-[#6B5E52]">
                    <span className="text-[#968779]">All Rights:</span>
                    <span className="font-medium text-[#1F1A17]">Reserved</span>
                  </div>
                  <div className="flex justify-between text-[#6B5E52]">
                    <span className="text-[#968779]">ISBN:</span>
                    <span className="font-medium text-[#1F1A17]">{metadata.isbn}</span>
                  </div>
                  <div className="flex justify-between text-[#6B5E52]">
                    <span className="text-[#968779]">Location:</span>
                    <span className="font-medium text-[#1F1A17]">Nairobi, Kenya</span>
                  </div>
                </div>

                {/* Clickable link to Mark & Alvis Publishers with WhatsApp access */}
                <div className="mt-6 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsWhatsAppOpen(true)}
                    className="w-full p-3.5 bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 text-[#14532D] rounded-xs font-ui-sans text-xs flex items-center justify-between transition-all group cursor-pointer shadow-2xs hover:shadow-xs active:translate-y-0.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-2xs">
                        <MessageCircle className="w-4 h-4 fill-current" />
                      </div>
                      <div className="text-left">
                        <span className="font-semibold text-[#14532D] block text-xs">Talk to Mark & Alvis Publishers</span>
                        <span className="text-[10px] text-[#4A5D4E] block">Connect with Mark or Alvis on WhatsApp</span>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#15803D] uppercase tracking-wider group-hover:translate-x-0.5 transition-transform">
                      <span>WhatsApp</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                </div>
              </div>
            </PopReveal>
          </div>
        </div>
      </div>

      <WhatsAppContactModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
      />
    </section>
  );
};

export default AuthorSection;
