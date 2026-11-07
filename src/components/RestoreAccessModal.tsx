import React, { useState, useEffect } from 'react';
import {
  X,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Smartphone,
  Mail,
  FileText,
  UserCheck,
} from 'lucide-react';
import { UserEntitlement } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { parseMpesaSms } from '../utils/mpesaSmsParser.ts';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock.ts';
import { apiFetch } from '../services/apiClient.ts';

interface RestoreAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEntitlementRestored?: (entitlement: UserEntitlement) => void;
  onRestored?: (entitlement: UserEntitlement) => void;
  onRedirectToPurchase?: (data: {
    smsText?: string;
    email?: string;
    senderPhone?: string;
    senderName?: string;
    fromRestoreRedirect?: boolean;
    reason?: string;
  }) => void;
}

export const RestoreAccessModal: React.FC<RestoreAccessModalProps> = ({
  isOpen,
  onClose,
  onEntitlementRestored,
  onRestored,
  onRedirectToPurchase,
}) => {
  useBodyScrollLock(isOpen);
  const { currentUser, grantUserEntitlement, signInWithGoogle } = useAuth();

  const [emailInput, setEmailInput] = useState('');
  const [pastedSms, setPastedSms] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [redirectNotice, setRedirectNotice] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Sync email input with logged-in user
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setRedirectNotice(null);
      setSuccessMsg(null);
      if (currentUser?.email) {
        setEmailInput(currentUser.email);
      }
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  // Real-time live SMS parse preview
  const parsedPreview = pastedSms.trim().length > 15 ? parseMpesaSms(pastedSms) : null;
  const activeEmail = (currentUser?.email || emailInput).trim().toLowerCase();

  const handleGoogleSignInClick = async () => {
    setIsSigningIn(true);
    setErrorMsg(null);
    try {
      const user = await signInWithGoogle();
      if (user.email) {
        setEmailInput(user.email);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Google Sign-In failed.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setRedirectNotice(null);

    if (!activeEmail || !activeEmail.includes('@')) {
      setErrorMsg('Please enter or sign in with your Google account email.');
      return;
    }

    if (!pastedSms.trim() || pastedSms.trim().length < 15) {
      setErrorMsg('Please paste the complete Safaricom M-PESA confirmation SMS.');
      return;
    }

    setIsVerifying(true);

    try {
      // Query database of approved accounts via backend endpoint
      const res = await apiFetch('/api/payments/pochi/restore-by-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: activeEmail,
          smsText: pastedSms.trim(),
          uid: currentUser?.uid,
        }),
      });

      const data = await res.json();

      // Case 1: Approved account found and mapped in database!
      if (res.ok && data.approved && data.entitlement) {
        const ent = await grantUserEntitlement({
          name: currentUser?.displayName || data.parsedDetails?.senderName || 'Authorized Reader',
          phone: data.parsedDetails?.senderPhone || '0701870142',
          transactionCode: data.parsedDetails?.transactionCode || parsedPreview?.transactionCode || 'APPROVED',
          amount: data.parsedDetails?.amount || 750,
        });

        setSuccessMsg(`Approved! Verified purchase matched for ${activeEmail}. Digital edition access unlocked.`);
        setTimeout(() => {
          if (onEntitlementRestored) onEntitlementRestored(ent);
          if (onRestored) onRestored(ent);
          onClose();
        }, 1200);
        return;
      }

      // Case 2: Not found in database of approved accounts (or email mismatch)
      // Redirect to buying page: from sign-in to payment instruction & admin approval
      const reason = data.reason || data.message || 'No approved purchase found matching this SMS and email in our database.';
      setRedirectNotice(`${reason} Redirecting you to the official buying page to submit your payment request to the administrators...`);

      setTimeout(() => {
        if (onRedirectToPurchase) {
          onRedirectToPurchase({
            smsText: pastedSms.trim(),
            email: activeEmail,
            senderPhone: data.parsedDetails?.senderPhone || parsedPreview?.senderPhone,
            senderName: data.parsedDetails?.senderName || parsedPreview?.senderName,
            fromRestoreRedirect: true,
            reason,
          });
        }
      }, 1800);
    } catch (err: any) {
      console.error('Error during restoration lookup:', err);
      setErrorMsg(err.message || 'Could not verify M-PESA records with the server.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleManualRedirect = () => {
    if (onRedirectToPurchase) {
      onRedirectToPurchase({
        smsText: pastedSms.trim() || undefined,
        email: activeEmail || undefined,
        senderPhone: parsedPreview?.senderPhone,
        senderName: parsedPreview?.senderName,
        fromRestoreRedirect: true,
        reason: 'Proceed to buying page',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-950/70 backdrop-blur-xs overflow-y-auto overscroll-contain">
      <div className="relative w-full max-w-lg bg-[#FBF9F5] border border-[#DDD3C2] rounded-sm shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E0D2] bg-[#F5EFE4]">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#991B1B]" />
            <div>
              <h3 className="font-display-serif text-base font-bold text-[#1C1917]">
                Restore Reader Access
              </h3>
              <p className="font-ui-sans text-[10px] text-[#8C6D46] uppercase tracking-wider">
                Database Verification of Approved Purchases
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-sm text-[#78716C] hover:text-[#1C1917] hover:bg-[#EAE1D1] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-5">
          <p className="font-book-serif text-xs text-[#57534E] leading-relaxed">
            If you previously purchased <span className="italic font-bold text-[#171717]">Dating Wrong</span> via M-PESA, enter your account email and paste the confirmation SMS below. We will check the database of approved accounts to immediately restore your access.
          </p>

          {/* Success Banner */}
          {successMsg && (
            <div className="p-3.5 rounded-[2px] bg-[#EEF5EE] border-l-3 border-[#2E7D32] flex items-start gap-2.5 text-xs text-[#1E5D24] font-ui-sans">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#2E7D32]" />
              <div>
                <strong className="block font-bold">Approved & Verified!</strong>
                <span>{successMsg}</span>
              </div>
            </div>
          )}

          {/* Redirect Notice Banner (When Not Found) */}
          {redirectNotice && (
            <div className="p-3.5 rounded-[2px] bg-[#FFFBEB] border-l-3 border-[#D97706] flex items-start gap-2.5 text-xs text-[#92400E] font-ui-sans">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#D97706]" />
              <div>
                <strong className="block font-bold">Unapproved Transaction Notice</strong>
                <span>{redirectNotice}</span>
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={handleManualRedirect}
                    className="font-semibold underline text-[#B45309] hover:text-[#78350F] cursor-pointer"
                  >
                    Click here to open buying page immediately &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-[2px] bg-[#FBEAE8] border-l-3 border-[#B91C1C] flex items-start gap-2 text-xs text-[#991B1B] font-ui-sans">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleRestore} className="space-y-4">
            {/* Account Email Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-ui-sans text-[11px] font-semibold uppercase tracking-wider text-[#38332E]">
                  Account Email (Initiating Restoration)
                </label>
                {currentUser?.email && (
                  <span className="text-[10px] text-[#2E7D32] font-semibold flex items-center gap-1">
                    <UserCheck className="w-3 h-3" /> Signed in
                  </span>
                )}
              </div>

              {currentUser?.email ? (
                <div className="px-3.5 py-2.5 bg-[#FAF7F0] border border-[#DDD3C2] rounded-[2px] flex items-center justify-between text-xs font-mono text-[#171717]">
                  <span className="font-semibold">{currentUser.email}</span>
                  <span className="text-[10px] uppercase font-bold text-[#8C6D46] bg-[#F2E8D7] px-2 py-0.5 rounded-xs">
                    Verified Google ID
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="e.g. name@gmail.com"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D9CEBC] rounded-[2px] text-xs font-ui-sans text-[#171717] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#171717]"
                  />
                  <div className="flex items-center justify-between text-[11px] text-[#78716C]">
                    <span>Or sign in with Google:</span>
                    <button
                      type="button"
                      onClick={handleGoogleSignInClick}
                      disabled={isSigningIn}
                      className="text-[#991B1B] font-semibold hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {isSigningIn ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                      <span>Sign in with Google</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Pasted SMS Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-ui-sans text-[11px] font-semibold uppercase tracking-wider text-[#38332E]">
                  Paste M-PESA Confirmation SMS
                </label>
                <span className="text-[10px] text-[#8C6D46] font-semibold">
                  Required for verification
                </span>
              </div>
              <textarea
                rows={3}
                required
                value={pastedSms}
                onChange={(e) => setPastedSms(e.target.value)}
                placeholder="e.g. QGH7K92ABC Confirmed. Ksh750.00 sent to Alvis Njagi 0701870142 on 11/9/26 at 10:42 AM. New M-PESA balance is Ksh1,240.00..."
                className="w-full px-3.5 py-2.5 bg-white border border-[#D9CEBC] rounded-[2px] text-xs font-mono text-[#171717] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#171717] leading-relaxed shadow-2xs"
              />
              <p className="text-[10px] text-[#78716C] mt-1">
                Paste the original SMS received from Safaricom. The system extracts transaction code, amount, sender details, and timestamp.
              </p>
            </div>

            {/* Live Detected Details Card */}
            {parsedPreview && (
              <div className="p-3 bg-[#FAF7F0] border border-[#E8DFC9] rounded-[2px] space-y-1 text-xs font-ui-sans">
                <div className="text-[10px] uppercase font-bold tracking-wider text-[#8C6D46] flex items-center justify-between pb-1 border-b border-[#E8DFC9]">
                  <span>SMS Transaction Mapping</span>
                  <span className="text-[#2E7D32]">Detected</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-[#78716C]">Code:</span>{' '}
                    <strong className="font-mono text-[#171717]">
                      {parsedPreview.transactionCode || 'Detecting...'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#78716C]">Amount:</span>{' '}
                    <strong className="text-[#171717]">
                      {parsedPreview.amount ? `KSh ${parsedPreview.amount}` : 'KSh 750'}
                    </strong>
                  </div>
                  {parsedPreview.senderPhone && (
                    <div>
                      <span className="text-[#78716C]">Phone:</span>{' '}
                      <span className="font-mono text-[#171717]">{parsedPreview.senderPhone}</span>
                    </div>
                  )}
                  {parsedPreview.senderName && (
                    <div>
                      <span className="text-[#78716C]">Sender:</span>{' '}
                      <span className="text-[#171717]">{parsedPreview.senderName}</span>
                    </div>
                  )}
                  <div className="col-span-2">
                    <span className="text-[#78716C]">Date & Time:</span>{' '}
                    <span className="text-[#171717]">{parsedPreview.dateTimeStr || 'Stated in SMS'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Primary Action Button: Restore Access */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isVerifying || Boolean(successMsg)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-[2px] bg-[#991B1B] hover:bg-[#7F1D1D] text-[#FAF7F2] font-ui-sans font-semibold text-xs tracking-wider uppercase transition-colors shadow-xs disabled:opacity-60 cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Checking Approved Accounts Database...</span>
                  </>
                ) : (
                  <>
                    <span>Restore Access</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Bottom helper link: redirect to buying flow */}
          <div className="pt-3 border-t border-[#EAE2D3] flex items-center justify-between text-[11px] font-ui-sans text-[#78716C]">
            <span>Haven't purchased yet?</span>
            <button
              type="button"
              onClick={handleManualRedirect}
              className="text-[#991B1B] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Buy Dating Wrong (KSh 750)</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
