import React, { useState } from 'react';
import { X, Layers, Check, UploadCloud, FileText, Sparkles, RefreshCw, Key } from 'lucide-react';
import { BookManager, BookVersionRecord } from '../data/bookRegistry.ts';
import { EntitlementService } from '../services/entitlementService.ts';
import { UserEntitlement } from '../types.ts';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock.ts';

interface VersionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEntitlementGranted?: (entitlement: UserEntitlement) => void;
  onSelectVersion?: () => void;
}

export const VersionManagerModal: React.FC<VersionManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  useBodyScrollLock(isOpen);
  if (!isOpen) return null;

  const currentMeta = BookManager.getPublicMetadata();
  const versions = BookManager.getAllVersions();
  const activeVersion = BookManager.getActiveVersionNumber();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-950/70 backdrop-blur-xs overscroll-contain">
      <div className="relative w-full max-w-xl bg-[#FBF9F5] border border-[#DDD3C2] rounded-sm shadow-2xl overflow-hidden font-ui-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E0D2] bg-[#F5EFE4]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#78350F]" />
            <h3 className="font-display-serif text-base font-bold text-[#1C1917]">
              Manuscript Versioning & System Architecture
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-sm text-[#78716C] hover:text-[#1C1917] cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Versioning Architecture Callout */}
          <div className="p-4 bg-[#F5EFE4] border border-[#DDD3C2] rounded-xs text-xs text-[#57534E] leading-relaxed">
            <p className="font-bold text-[#1C1917] mb-1">
              Versioned Content Architecture
            </p>
            <p>
              Book text is modularly separated into versioned structures (<code className="font-mono text-[11px] bg-white px-1 py-0.5 rounded-xs">books/dating-wrong/v1</code>). As specified in the system design, the platform provides verified content delivery tied directly to canonical publication editions.
            </p>
          </div>

          {/* Active Version Specifications */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C6D46]">
              Active Book Metadata (books/{currentMeta.id})
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white border border-[#E0D7C6] rounded-xs">
                <span className="text-[#A8A29E] block text-[10px] uppercase">Edition</span>
                <span className="font-bold text-[#1C1917]">Version {activeVersion}.0</span>
              </div>
              <div className="p-3 bg-white border border-[#E0D7C6] rounded-xs">
                <span className="text-[#A8A29E] block text-[10px] uppercase">Page Count</span>
                <span className="font-bold text-[#1C1917]">{currentMeta.pageCount} Pages</span>
              </div>
              <div className="p-3 bg-white border border-[#E0D7C6] rounded-xs">
                <span className="text-[#A8A29E] block text-[10px] uppercase">Storage Path</span>
                <span className="font-bold text-[#78350F] font-mono text-[10px] truncate block">{currentMeta.storagePath}</span>
              </div>
              <div className="p-3 bg-white border border-[#E0D7C6] rounded-xs">
                <span className="text-[#A8A29E] block text-[10px] uppercase">Publisher</span>
                <span className="font-bold text-[#1C1917]">{currentMeta.publisher}</span>
              </div>
              <div className="p-3 bg-white border border-[#E0D7C6] rounded-xs">
                <span className="text-[#A8A29E] block text-[10px] uppercase">Price</span>
                <span className="font-bold text-[#1C1917]">{currentMeta.price.kes} KSH</span>
              </div>
              <div className="p-3 bg-white border border-[#E0D7C6] rounded-xs">
                <span className="text-[#A8A29E] block text-[10px] uppercase">Release Date</span>
                <span className="font-bold text-[#1C1917]">{currentMeta.publishedAt}</span>
              </div>
            </div>
          </div>

          {/* Versions List - View Only */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C6D46]">
              Canonical Manuscript Edition
            </h4>
            <div className="space-y-2">
              {versions.map((v) => (
                <div
                  key={v.version}
                  className="p-3.5 rounded-xs border bg-[#F2ECE0] border-[#8C6D46] flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display-serif font-bold text-[#1C1917] text-sm">
                        {v.label}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#78350F] text-white text-[10px] font-bold">
                        Active Release
                      </span>
                    </div>
                    <p className="text-xs text-[#78716C] mt-0.5">{v.changeSummary}</p>
                    <span className="text-[10px] text-[#A8A29E]">Official Publication: {v.releasedAt}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[#8C6D46] italic pt-1">
              Note: Version revisions and manuscript publishing are strictly managed by the editorial board through the publisher CMS. Public readers always access the verified canonical edition.
            </p>
          </div>

          {/* Footer Close */}
          <div className="pt-3 border-t border-[#E8E0D2] flex justify-end items-center text-xs">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-[#78350F] hover:bg-[#632B0C] text-white rounded-xs font-semibold cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
