import React, { useState, useEffect } from 'react';
import { BookManager } from './data/bookRegistry.ts';
import { EntitlementService } from './services/entitlementService.ts';
import { UserEntitlement } from './types.ts';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { HeroSection } from './components/HeroSection.tsx';
import { ManuscriptBreakdown } from './components/ManuscriptBreakdown.tsx';
import { AuthorSection } from './components/AuthorSection.tsx';
import { PurchaseModal } from './components/PurchaseModal.tsx';
import { RestoreAccessModal } from './components/RestoreAccessModal.tsx';
import { SamplePreviewDrawer } from './components/SamplePreviewDrawer.tsx';
import { VersionManagerModal } from './components/VersionManagerModal.tsx';
import { AdminDashboardModal } from './components/AdminDashboardModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { AccountModal } from './components/AccountModal.tsx';
import { ReaderView } from './components/ReaderView.tsx';
import { Footer } from './components/Footer.tsx';
import { WifiOff, ShieldAlert } from 'lucide-react';
import { OfflineStorageService } from './services/offlineStorageService.ts';
import { apiFetch } from './services/apiClient.ts';

function DatingWrongApp() {
  const { currentUser, userProfile, entitlement, bookConfig, checkAndRestoreEmailAccess } = useAuth();
  const [bookData, setBookData] = useState(() => BookManager.getActiveBook());
  const [offlinePages, setOfflinePages] = useState<import('./types.ts').BookPage[] | undefined>(undefined);
  
  // Modals state
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [prefillPurchaseData, setPrefillPurchaseData] = useState<{
    smsText?: string;
    email?: string;
    senderPhone?: string;
    senderName?: string;
    fromRestoreRedirect?: boolean;
    reason?: string;
  } | null>(null);
  const [isSampleOpen, setIsSampleOpen] = useState(false);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [adminInitialTab, setAdminInitialTab] = useState<'pochi_approvals' | 'mapped_users' | 'overview' | 'payments' | 'book_mgmt' | 'sms_monitor' | 'email_logs'>('pochi_approvals');
  const [adminFocusRequestId, setAdminFocusRequestId] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [securityNotice, setSecurityNotice] = useState<string | null>(null);

  // Reader state
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [readerSectionId, setReaderSectionId] = useState('introduction');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Cryptographic OTP Access Link Verification & URL Sanitization:
  // 1. Admin link with single-use ticket: /?admin=true&tab=pochi_approvals&requestId=REQ-...&ticket=...&authAdmin=...
  // 2. Customer reader link with single-use ticket: /?reader=true&email=...&ticket=...
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash.toLowerCase();
      const pathname = window.location.pathname.toLowerCase();

      const ticketParam = params.get('ticket');
      const authAdminParam = params.get('authAdmin') || params.get('adminEmail');
      const isAdminQuery = params.get('admin') === 'true' || pathname.startsWith('/admin') || hash === '#admin';
      const tabQuery = params.get('tab');
      const reqId = params.get('requestId');
      const isReaderQuery = params.get('reader') === 'true' || pathname.startsWith('/read') || pathname.startsWith('/reader') || hash === '#reader';
      const emailQuery = params.get('email');

      // 1. Handle Admin Access with Single-Use OTP Nonce
      if (isAdminQuery || tabQuery === 'pochi_approvals' || reqId) {
        if (ticketParam) {
          apiFetch('/api/access-tickets/verify-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ticket: ticketParam,
              authAdmin: authAdminParam,
              currentAuthEmail: currentUser?.email,
              requestId: reqId,
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              // Sanitize browser address bar immediately (removes ticket & secret query parameters)
              try {
                window.history.replaceState({}, document.title, window.location.pathname);
              } catch {
                // ignore
              }

              if (data.success) {
                if (data.targetAdmin) {
                  localStorage.setItem('dw_selected_admin_email', data.targetAdmin.toLowerCase());
                }
                if (tabQuery) setAdminInitialTab(tabQuery as any);
                else setAdminInitialTab('pochi_approvals');
                setAdminFocusRequestId(reqId || null);
                setIsAdminOpen(true);
              } else {
                setSecurityNotice(data.error || 'Unauthorized: Invalid or already consumed administrative link.');
              }
            })
            .catch(() => {
              try {
                window.history.replaceState({}, document.title, window.location.pathname);
              } catch {
                // ignore
              }
              setSecurityNotice('Network error while verifying administrative access token.');
            });
        } else {
          // Standard admin check if opened without token (must match one of the 3 admin emails)
          const adminEmails = ['wanyekigerison@gmail.com', 'ochiengmark2908@gmail.com', 'alvisnjagi@gmail.com'];
          const userEmail = (currentUser?.email || '').trim().toLowerCase();
          if (adminEmails.includes(userEmail) || userProfile?.role === 'admin') {
            if (tabQuery) setAdminInitialTab(tabQuery as any);
            else setAdminInitialTab('pochi_approvals');
            setAdminFocusRequestId(reqId || null);
            setIsAdminOpen(true);
          } else {
            setSecurityNotice('Administrator privileges required. Please sign in with an authorized publisher account.');
          }
        }
      }

      // 2. Handle Customer Reader Access with Single-Use OTP Ticket
      if (isReaderQuery) {
        const cleanEmail = emailQuery ? emailQuery.trim().toLowerCase() : '';
        const userHasAccess = Boolean(entitlement || userProfile?.hasAccess);

        if (ticketParam) {
          // Customer is redeeming a single-use cryptographic reader ticket (burn on redemption)
          apiFetch('/api/access-tickets/consume-reader', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ticket: ticketParam,
              email: cleanEmail,
              uid: currentUser?.uid,
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              // Sanitize address bar immediately so secret tokens are never exposed or reused
              try {
                window.history.replaceState({}, document.title, window.location.pathname);
              } catch {
                // ignore
              }

              if (data.success && data.entitlement) {
                EntitlementService.saveEntitlement(data.entitlement);
                const progress = EntitlementService.getReadingProgress();
                setReaderSectionId(progress.currentSectionId || 'introduction');
                setIsReaderOpen(true);
              } else {
                setSecurityNotice(data.error || 'This one-time book access link has already been used or expired.');
                if (cleanEmail) {
                  setPrefillPurchaseData({
                    email: cleanEmail,
                    reason: 'approval_link',
                  });
                  setIsPurchaseOpen(true);
                }
              }
            })
            .catch(() => {
              try {
                window.history.replaceState({}, document.title, window.location.pathname);
              } catch {
                // ignore
              }
              setSecurityNotice('Error verifying access ticket. Please sign in with your authorized Google account.');
            });
        } else if (userHasAccess) {
          const progress = EntitlementService.getReadingProgress();
          setReaderSectionId(progress.currentSectionId || 'introduction');
          setIsReaderOpen(true);
        } else if (cleanEmail) {
          // No ticket in URL: check verified database records
          checkAndRestoreEmailAccess(cleanEmail)
            .then((restoredEnt) => {
              if (restoredEnt) {
                const progress = EntitlementService.getReadingProgress();
                setReaderSectionId(progress.currentSectionId || 'introduction');
                setIsReaderOpen(true);
              } else {
                setPrefillPurchaseData({
                  email: cleanEmail,
                  reason: 'approval_link',
                });
                setIsPurchaseOpen(true);
              }
            })
            .catch(() => {
              setPrefillPurchaseData({
                email: cleanEmail,
                reason: 'approval_link',
              });
              setIsPurchaseOpen(true);
            });
        } else {
          const currentEnt = EntitlementService.getCurrentEntitlement();
          if (currentEnt && currentEnt.status === 'active') {
            const progress = EntitlementService.getReadingProgress();
            setReaderSectionId(progress.currentSectionId || 'introduction');
            setIsReaderOpen(true);
          } else {
            setIsPurchaseOpen(true);
          }
        }
      }
    } catch (e) {
      console.warn('URL deep link parse warning:', e);
    }
  }, [entitlement, userProfile?.hasAccess, currentUser?.email]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const hasAccess = Boolean(entitlement || userProfile?.hasAccess);

  // Flow: "Read the Book" -> Check if authenticated or has access
  const handleReadBook = async () => {
    if (hasAccess) {
      const progress = EntitlementService.getReadingProgress();
      setReaderSectionId(progress.currentSectionId || 'introduction');
      setIsReaderOpen(true);
      return;
    }

    // Check if device holds an authorized offline license and verified token
    const isSavedOffline = await OfflineStorageService.isBookSavedOffline(bookData.metadata.id, entitlement?.entitlementToken);
    if (isSavedOffline) {
      const offlineContent = await OfflineStorageService.loadOfflineBook(bookData.metadata.id, entitlement?.entitlementToken);
      if (offlineContent) {
        setBookData({
          metadata: offlineContent.metadata,
          sections: offlineContent.sections,
        });
        setOfflinePages(offlineContent.pages);
        const progress = EntitlementService.getReadingProgress();
        setReaderSectionId(progress.currentSectionId || 'introduction');
        setIsReaderOpen(true);
        return;
      }
    }

    // User needs to sign in or complete payment -> open embedded purchase flow
    setIsPurchaseOpen(true);
  };

  // When section clicked in Table of Contents
  const handleSelectSection = (sectionId: string, isPreview: boolean) => {
    if (hasAccess) {
      setReaderSectionId(sectionId);
      setIsReaderOpen(true);
    } else if (isPreview) {
      setIsSampleOpen(true);
    } else {
      handleReadBook();
    }
  };

  // If reader is open, display full-screen literary reading sanctuary
  if (isReaderOpen) {
    return (
      <ReaderView
        sections={bookData.sections}
        offlinePages={offlinePages}
        initialSectionId={readerSectionId}
        entitlement={entitlement}
        onExit={() => setIsReaderOpen(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F2E8] text-[#241E1A] flex flex-col font-ui-sans selection:bg-[#991B1B]/20 selection:text-[#141110]">
      {/* Offline Notification Bar */}
      {isOffline && (
        <div className="bg-[#991B1B] text-[#FAF6F0] px-4 py-2 text-xs text-center flex items-center justify-center gap-2 font-medium">
          <WifiOff className="w-3.5 h-3.5" />
          <span>You are reading in offline mode. Cached chapters remain fully accessible.</span>
        </div>
      )}

      {/* Security Alert Banner (For unauthorized or expired ticket access attempts) */}
      {securityNotice && (
        <div className="bg-[#FEF2F2] border-b border-[#FCA5A5] px-4 py-2.5 text-xs text-[#991B1B] flex items-center justify-between gap-3 font-medium animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#DC2626] shrink-0" />
            <span>{securityNotice}</span>
          </div>
          <button
            onClick={() => setSecurityNotice(null)}
            className="text-[#991B1B] hover:text-[#7F1D1D] font-bold text-base px-1.5 cursor-pointer leading-none"
            aria-label="Dismiss notice"
          >
            &times;
          </button>
        </div>
      )}

      {/* Primary Literary Navbar */}
      <Navbar
        entitlement={entitlement}
        onOpenPurchase={handleReadBook}
        onOpenReader={() => {
          const progress = EntitlementService.getReadingProgress();
          setReaderSectionId(progress.currentSectionId || 'introduction');
          setIsReaderOpen(true);
        }}
        onOpenRestore={() => setIsRestoreOpen(true)}
        onOpenVersions={() => setIsVersionsOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenAccount={() => setIsAccountOpen(true)}
        onOpenAdmin={() => {
          setAdminFocusRequestId(null);
          setAdminInitialTab('pochi_approvals');
          setIsAdminOpen(true);
        }}
      />

      {/* Main Experience */}
      <main className="flex-1">
        <HeroSection
          metadata={{
            ...bookData.metadata,
            price: {
              kes: bookConfig.bookPriceKes,
              usd: bookConfig.bookPriceUsd,
            },
          }}
          entitlement={entitlement}
          onReadBook={handleReadBook}
          onOpenSample={() => setIsSampleOpen(true)}
        />

        {/* Detailed Table of Contents */}
        <ManuscriptBreakdown
          sections={bookData.sections}
          entitlement={entitlement}
          onSelectSection={handleSelectSection}
          onUnlockAll={handleReadBook}
        />

        {/* Author Bio & Publisher Colophon */}
        <AuthorSection metadata={bookData.metadata} />
      </main>

      {/* Footer with colophon & restore shortcuts */}
      <Footer
        metadata={bookData.metadata}
        onOpenPurchase={handleReadBook}
        onOpenRestore={() => setIsRestoreOpen(true)}
        onOpenVersions={() => setIsVersionsOpen(true)}
      />

      {/* Modals & Drawers */}
      <PurchaseModal
        isOpen={isPurchaseOpen}
        metadata={{
          ...bookData.metadata,
          price: {
            kes: bookConfig.bookPriceKes,
            usd: bookConfig.bookPriceUsd,
          },
        }}
        initialData={prefillPurchaseData}
        onClose={() => {
          setIsPurchaseOpen(false);
          setPrefillPurchaseData(null);
        }}
        onEntitlementGranted={(newEntitlement) => {
          // Handled via AuthContext
        }}
        onOpenReader={() => {
          const progress = EntitlementService.getReadingProgress();
          setReaderSectionId(progress.currentSectionId || 'introduction');
          setIsReaderOpen(true);
        }}
        onRequireAuth={() => setIsAuthOpen(true)}
        onOpenRestore={() => {
          setIsPurchaseOpen(false);
          setIsRestoreOpen(true);
        }}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => {
          // After auth, if user was trying to read, proceed to purchase or reader
          if (!hasAccess) {
            setIsPurchaseOpen(true);
          }
        }}
      />

      <AccountModal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
        onOpenReader={() => {
          const progress = EntitlementService.getReadingProgress();
          setReaderSectionId(progress.currentSectionId || 'introduction');
          setIsReaderOpen(true);
        }}
        onOpenPurchase={() => setIsPurchaseOpen(true)}
        onOpenAdmin={() => {
          setIsAccountOpen(false);
          setAdminFocusRequestId(null);
          setAdminInitialTab('pochi_approvals');
          setIsAdminOpen(true);
        }}
      />

      <AdminDashboardModal
        isOpen={isAdminOpen}
        onClose={() => {
          setIsAdminOpen(false);
          setAdminFocusRequestId(null);
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete('admin');
            url.searchParams.delete('tab');
            url.searchParams.delete('requestId');
            if (url.hash === '#admin') url.hash = '';
            const searchStr = url.searchParams.toString() ? `?${url.searchParams.toString()}` : '';
            window.history.replaceState({}, document.title, url.pathname + searchStr + url.hash);
          } catch (e) {
            // ignore
          }
        }}
        initialTab={adminInitialTab}
        focusRequestId={adminFocusRequestId}
      />

      <RestoreAccessModal
        isOpen={isRestoreOpen}
        onClose={() => setIsRestoreOpen(false)}
        onEntitlementRestored={() => {
          setIsRestoreOpen(false);
          const progress = EntitlementService.getReadingProgress();
          setReaderSectionId(progress.currentSectionId || 'introduction');
          setIsReaderOpen(true);
        }}
        onRedirectToPurchase={(data) => {
          setPrefillPurchaseData(data);
          setIsRestoreOpen(false);
          setIsPurchaseOpen(true);
        }}
      />

      <SamplePreviewDrawer
        isOpen={isSampleOpen}
        sections={BookManager.getPreviewSections()}
        onClose={() => setIsSampleOpen(false)}
        onUnlockFullBook={handleReadBook}
      />

      <VersionManagerModal
        isOpen={isVersionsOpen}
        onClose={() => setIsVersionsOpen(false)}
        onSelectVersion={() => {
          setBookData(BookManager.getActiveBook());
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DatingWrongApp />
    </AuthProvider>
  );
}
