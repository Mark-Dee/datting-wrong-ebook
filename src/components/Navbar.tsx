import React from 'react';
import { BookOpen, CheckCircle, KeyRound, User, Shield } from 'lucide-react';
import { UserEntitlement } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import officialCoverThumbnail from '../assets/images/dating_wrong_book_cover_1790602540354.jpg';

interface NavbarProps {
  entitlement: UserEntitlement | null;
  onOpenPurchase: () => void;
  onOpenReader: () => void;
  onOpenRestore: () => void;
  onOpenVersions?: () => void;
  onOpenAuth?: () => void;
  onOpenAccount: () => void;
  onOpenAdmin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  entitlement,
  onOpenPurchase,
  onOpenReader,
  onOpenRestore,
  onOpenAccount,
  onOpenAdmin,
}) => {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const hasAccess = Boolean(entitlement || userProfile?.hasAccess);

  return (
    <header id="top" className="sticky top-0 z-40 bg-[#FAF6F0] border-b border-[#E5DAC6] transition-colors shadow-2xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
        {/* Left: For admins, Dating Wrong is clickable to open Admin console without visible pulsing badges or extra labels */}
        {isAdmin ? (
          <button
            type="button"
            onClick={onOpenAdmin}
            className="flex items-center gap-2.5 select-none hover:opacity-90 transition-opacity cursor-pointer text-left border-none bg-transparent"
            title="Dating Wrong"
            aria-label="Dating Wrong"
          >
            <img
              src={officialCoverThumbnail}
              alt="Dating Wrong Book Cover"
              className="w-7 h-9.5 object-cover rounded-[2px] shadow-xs border border-[#141110]/20"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/dating_wrong_front_cover.jpg';
              }}
            />
            <span className="font-display-serif text-lg sm:text-xl font-bold text-[#141110] tracking-tight">
              Dating <span className="text-[#991B1B]">Wrong</span>
            </span>
          </button>
        ) : (
          <a
            href="#top"
            className="flex items-center gap-2.5 select-none hover:opacity-90 transition-opacity"
          >
            <img
              src={officialCoverThumbnail}
              alt="Dating Wrong Book Cover"
              className="w-7 h-9.5 object-cover rounded-[2px] shadow-xs border border-[#141110]/20"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/dating_wrong_front_cover.jpg';
              }}
            />
            <span className="font-display-serif text-lg sm:text-xl font-bold text-[#141110] tracking-tight">
              Dating <span className="text-[#991B1B]">Wrong</span>
            </span>
          </a>
        )}

        {/* Center: In-page Navigation */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-ui-sans font-medium text-[#574C43]">
          <a href="#" className="hover:text-[#991B1B] transition-colors">
            The Book
          </a>
          <a href="#chapters" className="hover:text-[#991B1B] transition-colors">
            Chapters
          </a>
          <a href="#author" className="hover:text-[#991B1B] transition-colors">
            Author
          </a>
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {hasAccess ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xs text-xs font-ui-sans font-semibold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] shadow-2xs">
                <CheckCircle className="w-3.5 h-3.5 text-[#059669]" />
                Authorized
              </span>
              <button
                onClick={onOpenReader}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xs bg-[#0F0D0C] text-[#FAF7F2] text-xs font-ui-sans font-semibold tracking-wider uppercase hover:bg-[#251F1C] transition-all shadow-xs cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#D97706]" />
                Open Reader
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenPurchase}
                className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 rounded-xs bg-[#991B1B] text-[#FAF7F2] text-xs font-ui-sans font-semibold tracking-wider uppercase hover:bg-[#7F1D1D] active:translate-y-0.5 transition-all shadow-xs cursor-pointer"
              >
                Read the Book
              </button>
            </div>
          )}

          {/* User profile in top bar: hidden on phone devices to avoid clogged top bar, visible on tablet/desktop */}
          {currentUser && (
            <button
              onClick={onOpenAccount}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-ui-sans font-medium text-[#241E1A] bg-[#FAF4EA] hover:bg-[#EFE7D8] border border-[#D9CDB8] shadow-2xs transition-colors cursor-pointer"
              title="Account & Reader Profile"
            >
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-[#B45309] text-white flex items-center justify-center text-[10px] font-bold uppercase">
                  {(userProfile?.displayName || currentUser.displayName || currentUser.email || 'U').charAt(0)}
                </div>
              )}
              <span className="hidden sm:inline max-w-[110px] truncate text-stone-800 font-medium">
                {userProfile?.displayName || currentUser.displayName || currentUser.email?.split('@')[0] || 'Profile'}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
