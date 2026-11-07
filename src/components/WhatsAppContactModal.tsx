import React from 'react';
import { X, MessageCircle, ArrowUpRight, Phone } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock.ts';

interface WhatsAppContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppContactModal: React.FC<WhatsAppContactModalProps> = ({ isOpen, onClose }) => {
  useBodyScrollLock(isOpen);
  if (!isOpen) return null;

  const markPhoneRaw = (import.meta as any).env?.VITE_WHATSAPP_MARK_PHONE || '254100597740';
  const alvisPhoneRaw = (import.meta as any).env?.VITE_WHATSAPP_ALVIS_PHONE || '254701870142';

  const markMsg = encodeURIComponent("Hello Mark, I am reaching out to Mark & Alvis Publishers regarding Dating Wrong.");
  const alvisMsg = encodeURIComponent("Hello Alvis, I am reaching out to Mark & Alvis Publishers regarding Dating Wrong.");

  const markUrl = `https://wa.me/${markPhoneRaw}?text=${markMsg}`;
  const alvisUrl = `https://wa.me/${alvisPhoneRaw}?text=${alvisMsg}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overscroll-contain animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-[#FAF7F2] border border-[#DCD0BE] rounded-xs shadow-2xl p-6 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E5DAC6]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-xs">
              <MessageCircle className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-display-serif text-lg font-bold text-[#141110]">
                Mark & Alvis Publishers
              </h3>
              <p className="font-ui-sans text-xs text-[#786C5E]">
                Connect on WhatsApp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xs hover:bg-[#EBE2D3] text-[#786C5E] hover:text-[#141110] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <p className="mt-4 font-book-serif text-sm text-[#473D35] leading-relaxed">
          Reach our publishing partnership directly on WhatsApp. Select an option below to chat with Mark or Alvis:
        </p>

        {/* Options */}
        <div className="mt-5 space-y-3 font-ui-sans">
          {/* Option 1: First Mark */}
          <div className="p-4 bg-[#F5EDE1] border border-[#DFD3BF] rounded-xs hover:border-[#16A34A]/50 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#E7DAC4] text-[#78350F] rounded-2xs mb-1">
                  Option 1 • Publisher
                </span>
                <h4 className="font-bold text-sm text-[#141110]">Mark</h4>
                <p className="text-xs text-[#6B5E52] mt-0.5">
                  Publishing, Creative Strategy & Commercial Inquiries
                </p>
                <p className="text-[11px] font-mono text-[#786C5E] mt-1 flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-[#16A34A]" />
                  <span>+254 100 597740</span>
                </p>
              </div>
            </div>

            <a
              href={markUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3.5 w-full py-2.5 px-3 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold text-xs rounded-xs flex items-center justify-center gap-2 transition-colors shadow-2xs cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-current" />
              <span>Chat with Mark on WhatsApp</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Option 2: Second Mine (Alvis) */}
          <div className="p-4 bg-[#F5EDE1] border border-[#DFD3BF] rounded-xs hover:border-[#16A34A]/50 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#E7DAC4] text-[#14532D] rounded-2xs mb-1">
                  Option 2 • Tech & Publishing
                </span>
                <h4 className="font-bold text-sm text-[#141110]">Alvis</h4>
                <p className="text-xs text-[#6B5E52] mt-0.5">
                  Software Engineering, Platform Architecture & Technology
                </p>
                <p className="text-[11px] font-mono text-[#786C5E] mt-1 flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-[#16A34A]" />
                  <span>+254 1136 13448</span>
                </p>
              </div>
            </div>

            <a
              href={alvisUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3.5 w-full py-2.5 px-3 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold text-xs rounded-xs flex items-center justify-center gap-2 transition-colors shadow-2xs cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-current" />
              <span>Chat with Alvis on WhatsApp</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-[#E5DAC6] flex items-center justify-between text-[11px] font-ui-sans text-[#786C5E]">
          <span>Nairobi, Kenya</span>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-[#141110] hover:text-[#991B1B] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
