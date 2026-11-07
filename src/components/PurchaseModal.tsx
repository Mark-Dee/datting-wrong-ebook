import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Download,
  AlertCircle,
  FileText,
  Copy,
  Check,
  Clock,
  UserCheck,
  Mail,
  Shield,
  ExternalLink,
} from 'lucide-react';
import { BookMetadata, UserEntitlement } from '../types.ts';
import { EntitlementService } from '../services/entitlementService.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { parseMpesaSms } from '../utils/mpesaSmsParser.ts';
import { doc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase.ts';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock.ts';
import { apiFetch } from '../services/apiClient.ts';

interface PurchaseModalProps {
  isOpen: boolean;
  metadata: BookMetadata;
  onClose: () => void;
  onEntitlementGranted: (entitlement: UserEntitlement) => void;
  onOpenReader: () => void;
  onRequireAuth: () => void;
  initialData?: {
    smsText?: string;
    email?: string;
    senderPhone?: string;
    senderName?: string;
    fromRestoreRedirect?: boolean;
    reason?: string;
  } | null;
  onOpenRestore?: () => void;
}

type ModalStep =
  | 'google_sign_in'
  | 'pochi_instructions_and_sms'
  | 'pending_approval'
  | 'approval_success';

interface PochiConfig {
  pochiPhone: string;
  pochiName: string;
  priceKes: number;
  instructions: string;
}

interface SubmittedRequestInfo {
  requestId: string;
  transactionCode: string;
  amount: number;
  email: string;
  customerName: string;
  senderPhone: string;
  transactionTime: string;
  submittedAt: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string | null;
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({
  isOpen,
  metadata,
  onClose,
  onEntitlementGranted,
  onOpenReader,
  initialData,
  onOpenRestore,
}) => {
  useBodyScrollLock(isOpen);

  const {
    currentUser,
    userProfile,
    bookConfig,
    grantUserEntitlement,
    signInWithGoogle,
    continueWithEmail,
    checkAndRestoreEmailAccess,
  } = useAuth();

  const [step, setStep] = useState<ModalStep>('google_sign_in');
  const [pochiConfig, setPochiConfig] = useState<PochiConfig>({
    pochiPhone: '0701870142',
    pochiName: 'Alvis Njagi',
    priceKes: 750,
    instructions:
      '1. Open M-PESA on your phone.\n2. Select Lipa na M-PESA -> Pochi la Biashara.\n3. Enter Phone Number: 0701 870 142.\n4. Enter Amount: KSh 750.\n5. Enter your M-PESA PIN and press OK.\n6. Copy and paste the confirmation SMS below.',
  });

  // User input states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pastedSms, setPastedSms] = useState('');
  const [emailInput, setEmailInput] = useState('');

  // UI state
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSubmittingSms, setIsSubmittingSms] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);
  const [accessRestoredMessage, setAccessRestoredMessage] = useState<string | null>(null);
  const [redirectNotice, setRedirectNotice] = useState<string | null>(null);

  // Active payment request being monitored
  const [activeRequest, setActiveRequest] = useState<SubmittedRequestInfo | null>(null);
  const [isPollingStatus, setIsPollingStatus] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  // Handle incoming prefill data from Restore Access redirect or Customer Approval Email Link
  useEffect(() => {
    if (isOpen && initialData) {
      if (initialData.smsText) setPastedSms(initialData.smsText);
      if (initialData.email) setEmailInput(initialData.email);
      if (initialData.senderPhone) setPhone(initialData.senderPhone);
      if (initialData.senderName) setName(initialData.senderName);
      if (initialData.fromRestoreRedirect) {
        setRedirectNotice(
          initialData.reason ||
            'No approved purchase record was found in the database. Please proceed through the official buying steps: sign in, view Pochi instructions, submit your payment request, and wait for administrator approval.'
        );
      } else if (initialData.reason === 'approval_link') {
        setAccessRestoredMessage(
          `Your payment request for Dating Wrong has been approved! Sign in below to begin reading immediately.`
        );
      }
    } else if (!isOpen) {
      setRedirectNotice(null);
    }
  }, [isOpen, initialData]);

  // Success & Entitlement State
  const [grantedEntitlement, setGrantedEntitlement] = useState<UserEntitlement | null>(null);
  const [isDownloadingOffline, setIsDownloadingOffline] = useState(false);
  const [offlineCached, setOfflineCached] = useState(false);

  // Polling ref to clear interval
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch live Pochi configuration
  useEffect(() => {
    if (isOpen) {
      apiFetch('/api/config/pochi')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setPochiConfig(data);
          }
        })
        .catch(() => {
          // Fallback to defaults
        });
    }
  }, [isOpen]);

  // Initial step determination based on Google Authentication
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setAccessRestoredMessage(null);
      setOfflineCached(EntitlementService.isOfflineAvailable());

      if (currentUser && currentUser.email) {
        // User already signed in with Google
        setName(userProfile?.displayName || currentUser.displayName || '');
        if (userProfile?.phone) {
          setPhone(userProfile.phone);
        }

        // Check if user already has an active entitlement
        checkAndRestoreEmailAccess(currentUser.email, currentUser.uid).then((ent) => {
          if (ent) {
            setGrantedEntitlement(ent);
            setAccessRestoredMessage(`Welcome back! Digital book access is active for ${currentUser.email}.`);
            onEntitlementGranted(ent);
            setStep('approval_success');
            return;
          }

          // Check if user already has a pending Pochi request
          apiFetch(`/api/payments/pochi/user-requests?uid=${currentUser.uid}&email=${encodeURIComponent(currentUser.email!)}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (data?.requests && data.requests.length > 0) {
                const latest = data.requests[0];
                if (latest.status === 'PENDING_REVIEW') {
                  setActiveRequest({
                    requestId: latest.requestId,
                    transactionCode: latest.transactionCode,
                    amount: latest.amount,
                    email: latest.email,
                    customerName: latest.customerName,
                    senderPhone: latest.senderPhone,
                    transactionTime: latest.transactionTime,
                    submittedAt: latest.submittedAt,
                    status: latest.status,
                  });
                  setStep('pending_approval');
                  return;
                } else if (latest.status === 'APPROVED') {
                  handleRequestApproved(latest);
                  return;
                }
              }
              setStep('pochi_instructions_and_sms');
            })
            .catch(() => {
              setStep('pochi_instructions_and_sms');
            });
        });
      } else {
        // Must sign in with Google first before viewing payment guidelines
        setStep('google_sign_in');
      }
    } else {
      // Clear polling when modal closes
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }
  }, [isOpen, currentUser]);

  // Continuous Real-Time Firestore listener + auto-polling effect when on 'pending_approval' step
  useEffect(() => {
    if (step === 'pending_approval' && activeRequest?.requestId) {
      const requestId = activeRequest.requestId;

      // 1. Instant zero-latency Firestore listener for approval / rejection
      const unsub = onSnapshot(
        doc(db, 'paymentRequests', requestId),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data.status === 'APPROVED') {
              if (pollTimerRef.current) {
                clearInterval(pollTimerRef.current);
                pollTimerRef.current = null;
              }
              handleRequestApproved(data);
            } else if (data.status === 'REJECTED') {
              if (pollTimerRef.current) {
                clearInterval(pollTimerRef.current);
                pollTimerRef.current = null;
              }
              setActiveRequest((prev) =>
                prev ? { ...prev, status: 'REJECTED', rejectionReason: data.rejectionReason } : null
              );
              const targetEmail = activeRequest?.email || currentUser?.email || emailInput || 'your Google account';
              setPendingNotice(null);
              setRedirectNotice(null);
              setErrorMsg(
                `Transaction code ${activeRequest?.transactionCode || ''} could not be verified: ${data.rejectionReason || 'Transaction code not found in our accounts.'} A formal notification email has been sent to ${targetEmail}.`
              );
            }
          }
        },
        (err) => console.warn('Request listener note:', err.message)
      );

      // 2. Immediate check & fallback interval
      checkRequestStatus(requestId);
      pollTimerRef.current = setInterval(() => {
        checkRequestStatus(requestId);
      }, 4000);

      return () => {
        unsub();
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      };
    }
  }, [step, activeRequest?.requestId]);

  // Background auto-polling request status
  const checkRequestStatus = async (requestId: string) => {
    setPollCount((prev) => prev + 1);
    try {
      const res = await apiFetch(`/api/payments/pochi/request-status/${requestId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'APPROVED') {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          await handleRequestApproved(data.request);
        } else if (data.status === 'REJECTED') {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          setActiveRequest((prev) =>
            prev ? { ...prev, status: 'REJECTED', rejectionReason: data.request.rejectionReason } : null
          );
          const targetEmail = activeRequest?.email || currentUser?.email || emailInput || 'your Google account';
          setPendingNotice(null);
          setRedirectNotice(null);
          setErrorMsg(
            `Transaction code ${activeRequest?.transactionCode || ''} could not be verified: ${data.request.rejectionReason || 'Transaction code not found in our accounts.'} A formal notification email has been sent to ${targetEmail}.`
          );
        }
      }
    } catch (err) {
      console.warn('Status poll warning:', err);
    }
  };

  // Manual click on "CHECK STATUS NOW" button
  const handleCheckStatusNow = async (requestId: string) => {
    setIsPollingStatus(true);
    setPendingNotice(null);
    setErrorMsg(null);
    setRedirectNotice(null);

    try {
      const res = await apiFetch(`/api/payments/pochi/request-status/${requestId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'APPROVED') {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          await handleRequestApproved(data.request);
        } else if (data.status === 'REJECTED') {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          setActiveRequest((prev) =>
            prev ? { ...prev, status: 'REJECTED', rejectionReason: data.request.rejectionReason } : null
          );
          const reason = data.request.rejectionReason || 'Transaction code not found in our accounts.';
          const targetEmail = activeRequest?.email || currentUser?.email || emailInput || 'your Google account';
          setPendingNotice(null);
          setRedirectNotice(null);
          setErrorMsg(
            `Transaction code ${activeRequest?.transactionCode || ''} could not be verified: ${reason} A rejection notification email has been sent to ${targetEmail}.`
          );
          // Single verification notice on top with target email where email notification was dispatched
          // (No external mailto app redirect triggered)
        } else {
          // Status is waiting for approval
          setErrorMsg(null);
          setRedirectNotice(null);
          setPendingNotice(
            "Please be patient as you wait for admin approval and redirect. Once completed we'll notify you immediately, thank you."
          );
        }
      } else {
        setErrorMsg(null);
        setRedirectNotice(null);
        setPendingNotice(
          "Please be patient as you wait for admin approval and redirect. Once completed we'll notify you immediately, thank you."
        );
      }
    } catch (err) {
      console.warn('Check status now error:', err);
      setErrorMsg(null);
      setRedirectNotice(null);
      setPendingNotice(
        "Please be patient as you wait for admin approval and redirect. Once completed we'll notify you immediately, thank you."
      );
    } finally {
      setIsPollingStatus(false);
    }
  };

  // Handle transition when admin approves
  const handleRequestApproved = async (request: any) => {
    try {
      const ent = await grantUserEntitlement({
        name: request.customerName || currentUser?.displayName || 'Authorized Reader',
        phone: request.senderPhone || '0722000000',
        transactionCode: request.transactionCode,
        amount: request.amount || pochiConfig.priceKes,
      });

      setGrantedEntitlement(ent);
      onEntitlementGranted(ent);
      setStep('approval_success');
    } catch (err: any) {
      console.error('Error applying approved entitlement:', err);
      // Still show success with active entitlement
      const fallbackEnt: UserEntitlement = {
        entitlementId: `ENT-${Date.now()}`,
        userId: currentUser?.uid || `USR-${Date.now()}`,
        name: request.customerName || 'Authorized Reader',
        phone: request.senderPhone || '',
        email: currentUser?.email || request.email,
        bookId: 'dating-wrong',
        version: 1,
        grantedAt: new Date().toISOString(),
        paymentMethod: 'mpesa',
        transactionCode: request.transactionCode,
        amountPaid: request.amount || pochiConfig.priceKes,
        currency: 'KES',
        status: 'active',
        watermarkText: `Authorized Digital Edition • ${currentUser?.email || request.email} • Dating Wrong`,
      };
      setGrantedEntitlement(fallbackEnt);
      onEntitlementGranted(fallbackEnt);
      setStep('approval_success');
    }
  };

  // Google Sign-In Handler (Mandatory first step)
  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setErrorMsg(null);
    setAccessRestoredMessage(null);
    try {
      const user = await signInWithGoogle();
      if (user.email) {
        setEmailInput(user.email);
        setName(user.displayName || '');

        // Check if existing access exists
        const ent = await checkAndRestoreEmailAccess(user.email, user.uid);
        if (ent) {
          setAccessRestoredMessage(`Welcome back! Digital book access is active for ${user.email}.`);
          setGrantedEntitlement(ent);
          onEntitlementGranted(ent);
          setTimeout(() => {
            onClose();
            onOpenReader();
          }, 1200);
          return;
        }

        const isAdmin = ['alvisnjagi@gmail.com', 'wanyekigerison@gmail.com', 'ochiengmark2908@gmail.com'].includes(user.email.toLowerCase().trim());
        if (isAdmin) {
          setErrorMsg(
            'Admin Device Exemption Cap Reached (Max 2 Devices). Two devices are already authorized with direct payment exemption for this administrator account. To unlock on this device, either revoke an unused device in your Account Profile or submit a payment verification request.'
          );
        }
      }
      setStep('pochi_instructions_and_sms');
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      setErrorMsg(err.message || 'Google Sign-In could not be completed.');
    } finally {
      setIsSigningIn(false);
    }
  };

  // Optional email sign in fallback if popup blocked
  const handleEmailFallback = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid Google email address.');
      return;
    }

    setIsSigningIn(true);
    setErrorMsg(null);
    try {
      const ent = await checkAndRestoreEmailAccess(cleanEmail);
      if (ent) {
        setAccessRestoredMessage(`Welcome back! Digital book access is active for ${cleanEmail}.`);
        setGrantedEntitlement(ent);
        onEntitlementGranted(ent);
        setTimeout(() => {
          onClose();
          onOpenReader();
        }, 1200);
        return;
      }

      const isAdmin = ['alvisnjagi@gmail.com', 'wanyekigerison@gmail.com', 'ochiengmark2908@gmail.com'].includes(cleanEmail);
      if (isAdmin) {
        setErrorMsg(
          'Admin Device Exemption Cap Reached (Max 2 Devices). Two devices are already authorized with direct payment exemption for this administrator account. To unlock on this device, either revoke an unused device in your Account Profile or submit a payment verification request.'
        );
      }

      await continueWithEmail(cleanEmail, name.trim());
      setStep('pochi_instructions_and_sms');
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not verify email session.');
    } finally {
      setIsSigningIn(false);
    }
  };

  // Copy Pochi Phone Number to Clipboard
  const handleCopyPhone = () => {
    const rawNumber = pochiConfig.pochiPhone.replace(/\s+/g, '');
    navigator.clipboard.writeText(rawNumber).then(() => {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2500);
    });
  };

  // Submit Pasted SMS for 3-Admin Approval
  const handleSubmitSms = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    let activeUser = currentUser;
    let activeEmail = (activeUser?.email || emailInput).trim().toLowerCase();

    // Map Google email into user session if entered directly without popup
    if (!activeUser && activeEmail) {
      try {
        activeUser = await continueWithEmail(activeEmail, name.trim());
      } catch (sessionErr) {
        console.warn('Auto continue with email session notice:', sessionErr);
      }
    }

    if (!activeEmail || !activeEmail.includes('@')) {
      setErrorMsg('Please enter a valid Google email address before submitting your payment SMS.');
      setStep('google_sign_in');
      return;
    }

    if (!pastedSms.trim() || pastedSms.trim().length < 15) {
      setErrorMsg('Please paste the complete confirmation SMS you received from Safaricom M-PESA.');
      return;
    }

    const uid = activeUser?.uid || currentUser?.uid || `usr_${activeEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

    setIsSubmittingSms(true);

    try {
      const res = await apiFetch('/api/payments/pochi/submit-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          email: activeEmail,
          customerName: name.trim() || activeUser?.displayName || currentUser?.displayName || 'Valued Reader',
          submittedSms: pastedSms.trim(),
          senderPhone: phone.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit SMS for verification.');
      }

      // If user was already entitled on server
      if (data.alreadyAuthorized && data.entitlement) {
        await handleRequestApproved(data.request || { transactionCode: data.entitlement.transactionCode });
        return;
      }

      const reqId = data.requestId || data.request?.requestId || `REQ-${Date.now()}`;

      // Store in Firestore 'paymentRequests' collection as PENDING_REVIEW
      try {
        await setDoc(doc(db, 'paymentRequests', reqId), {
          requestId: reqId,
          uid,
          email: activeEmail,
          customerName: name.trim() || activeUser?.displayName || currentUser?.displayName || 'Valued Reader',
          submittedSms: pastedSms.trim(),
          transactionCode: data.parsedDetails?.transactionCode || 'PENDING',
          amount: data.parsedDetails?.amount || pochiConfig.priceKes,
          expectedAmount: pochiConfig.priceKes,
          senderPhone: data.parsedDetails?.senderPhone || phone,
          senderName: data.parsedDetails?.senderName || name.trim() || '',
          recipientDetails: pochiConfig.pochiName || 'Alvis Njagi',
          transactionTime: data.parsedDetails?.transactionTime || 'Stated in SMS',
          submittedAt: new Date().toISOString(),
          status: 'PENDING_REVIEW',
          reviewedBy: null,
          reviewedAt: null,
          rejectionReason: null,
          entitlementId: null,
          notifiedAdmins: ['Mark', 'Gerishon Wanyeki', 'Alvis Njagi'],
          createdAt: serverTimestamp(),
        });
      } catch (firestoreErr) {
        console.warn('Firestore paymentRequests write notice:', firestoreErr);
      }

      // Set active request and enter pending approval state
      setActiveRequest({
        requestId: reqId,
        transactionCode: data.parsedDetails?.transactionCode || 'PENDING',
        amount: data.parsedDetails?.amount || pochiConfig.priceKes,
        email: activeEmail,
        customerName: name.trim() || currentUser.displayName || 'Valued Reader',
        senderPhone: data.parsedDetails?.senderPhone || phone,
        transactionTime: data.parsedDetails?.transactionTime || 'Stated in SMS',
        submittedAt: new Date().toISOString(),
        status: 'PENDING_REVIEW',
      });

      setStep('pending_approval');
    } catch (err: any) {
      console.error('Error submitting SMS for approval:', err);
      setErrorMsg(err.message || 'Error submitting confirmation message.');
    } finally {
      setIsSubmittingSms(false);
    }
  };

  // Cache for offline reading
  const handleCacheOffline = async () => {
    setIsDownloadingOffline(true);
    await EntitlementService.cacheBookForOffline();
    setIsDownloadingOffline(false);
    setOfflineCached(true);
  };

  if (!isOpen) return null;

  // Real-time parsing of pasted SMS for live visual feedback
  const parsedPreview = pastedSms.trim().length > 15 ? parseMpesaSms(pastedSms) : null;
  const currentPrice = pochiConfig.priceKes || bookConfig.bookPriceKes || 750;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto overscroll-contain bg-stone-950/70 backdrop-blur-xs transition-opacity">
      <div className="relative w-full max-w-lg bg-[#FBF9F5] border border-[#DDD3C2] rounded-sm shadow-2xl overflow-hidden my-8">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E0D2] bg-[#F5EFE4]">
          <div className="flex items-center gap-2.5">
            <img
              src="/dating_wrong_front_cover.jpg"
              alt="Dating Wrong"
              className="w-6 h-8.5 object-cover rounded-[2px] border border-[#DDD2BE] shadow-2xs"
            />
            <div>
              <h3 className="font-display-serif text-base font-bold text-[#1C1917]">
                Dating <span className="text-[#991B1B]">Wrong</span>
              </h3>
              <p className="font-ui-sans text-[10px] uppercase tracking-wider text-[#8C6D46] -mt-0.5">
                Official Digital Edition
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

        {/* Modal Body: Sequential Steps */}
        <div className="p-6 sm:p-8">
          {/* Top Verification / Status Banner (Strict mutual exclusion: exactly one notice displayed at any time) */}
          {errorMsg ? (
            <div className="mb-5 p-4 bg-[#FBF0EE] border-l-3 border-[#B91C1C] rounded-r-xs flex items-start gap-3 text-xs text-[#991B1B]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Verification Notice</strong>
                <span>{errorMsg}</span>
              </div>
            </div>
          ) : pendingNotice ? (
            <div className="mb-5 p-4 bg-[#FFFBEB] border-l-3 border-[#D97706] rounded-r-xs flex items-start gap-3 text-xs text-[#92400E]">
              <Clock className="w-4 h-4 shrink-0 mt-0.5 text-[#D97706]" />
              <div>
                <strong className="block font-semibold">Verification Notice</strong>
                <span>{pendingNotice}</span>
              </div>
            </div>
          ) : accessRestoredMessage ? (
            <div className="mb-5 p-4 bg-[#EDF7ED] border-l-3 border-[#2E7D32] rounded-r-xs flex items-start gap-3 text-xs text-[#1B5E20]">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#2E7D32]" />
              <div>
                <strong className="block font-semibold">Authorized Access Active</strong>
                <span>{accessRestoredMessage}</span>
              </div>
            </div>
          ) : redirectNotice ? (
            <div className="mb-5 p-4 bg-[#FFFBEB] border-l-3 border-[#D97706] rounded-r-xs flex items-start gap-3 text-xs text-[#92400E]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#D97706]" />
              <div>
                <strong className="block font-semibold">Redirected to Buying Process</strong>
                <span>{redirectNotice}</span>
              </div>
            </div>
          ) : null}

          {/* ================================================================= */}
          {/* STEP 1: MANDATORY GOOGLE SIGN-IN                                  */}
          {/* Must sign in with Google before payment guidelines are visible    */}
          {/* ================================================================= */}
          {step === 'google_sign_in' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-[#FAF3E8] border border-[#E6D5BD] flex items-center justify-center mx-auto text-[#991B1B]">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="font-display-serif text-xl font-bold text-[#171717]">
                  {initialData?.reason === 'approval_link' ? 'Sign In to Read Your Book' : 'Sign In with Google to Continue'}
                </h4>
                <p className="text-xs text-[#6B6358] max-w-sm mx-auto leading-relaxed">
                  {initialData?.reason === 'approval_link'
                    ? 'Your purchase for Dating Wrong was approved! Sign in with your Google account below to begin reading your authorized digital edition immediately.'
                    : 'Before viewing the M-PESA Pochi payment guidelines, please sign in with Google. Your verified Google email address will be permanently attached to your payment verification request and authorized for digital book access upon admin review.'}
                </p>
              </div>

              {initialData?.reason === 'approval_link' && (
                <div className="p-3.5 bg-[#EDF7ED] border border-[#A5D6A7] rounded-xs text-xs text-[#1B5E20] space-y-1 text-left">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-[#2E7D32] shrink-0" />
                    <span>Purchase Verified by Publishers</span>
                  </div>
                  <p className="text-[11px] text-[#2E7D32]/90 leading-relaxed">
                    Access is approved for <strong>{initialData.email || 'your account'}</strong>. Sign in below to enter the reader sanctuary.
                  </p>
                </div>
              )}

              {/* Primary Google Sign-In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="w-full py-3.5 px-4 rounded-[2px] bg-white border border-[#D9CEBC] hover:bg-[#FAF6F0] text-[#171717] font-ui-sans font-semibold text-xs tracking-wide transition-all shadow-xs flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
              >
                {isSigningIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#991B1B]" />
                    <span>Signing in with Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Sign in with Google Account</span>
                  </>
                )}
              </button>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-[#E5DAC6] w-full" />
                <span className="bg-[#FBF9F5] px-3 text-[10px] uppercase font-bold tracking-widest text-[#A89884] shrink-0">
                  Or enter your Google email
                </span>
              </div>

              {/* Direct Email Fallback */}
              <form onSubmit={handleEmailFallback} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-ui-sans font-semibold text-[#242424] uppercase tracking-wider mb-1">
                    Google Account Email
                  </label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="e.g. name@gmail.com"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D9CEBC] rounded-[2px] text-[#171717] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#171717]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSigningIn}
                  className="w-full py-2.5 px-4 rounded-[2px] bg-[#171717] hover:bg-[#262626] text-[#FAF7F2] font-ui-sans font-semibold text-xs tracking-wider uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSigningIn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Continue &rarr;</span>}
                </button>
              </form>

              <div className="p-3 bg-[#F5EFE4] border border-[#E3D8C6] rounded-[2px] text-[11px] text-[#6B6358] space-y-1">
                <div className="font-semibold text-[#171717] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#2E7D32]" />
                  <span>Why Google Sign-In is required:</span>
                </div>
                <p>
                  1. Locks your digital book license strictly to your verified Google identity.
                </p>
                <p>
                  2. Allows the 3 administrators (Mark, Gerishon, and Alvis) to verify and authorize your account.
                </p>
                <p>
                  3. Enables instant access restoration across up to 3 authorized devices without needing a password.
                </p>
              </div>

              {onOpenRestore && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={onOpenRestore}
                    className="text-[11px] font-ui-sans font-semibold text-[#8C6D46] hover:text-[#991B1B] underline cursor-pointer"
                  >
                    Already paid via M-PESA? Restore access with your SMS &rarr;
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 2: POCHI LA BIASHARA PAYMENT GUIDELINES & SMS SUBMISSION      */}
          {/* ================================================================= */}
          {step === 'pochi_instructions_and_sms' && (currentUser || emailInput.trim()) && (
            <div className="space-y-5">
              {/* Authorized Account Banner */}
              <div className="p-3 bg-[#EEF5EE] border border-[#C5DEC3] rounded-xs flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <UserCheck className="w-4 h-4 text-[#2E7D32] shrink-0" />
                  <div className="truncate">
                    <span className="text-[#57534E]">Authorized Account:</span>{' '}
                    <strong className="text-[#171717] truncate">{currentUser?.email || emailInput.trim()}</strong>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2E7D32] bg-[#E0EFE0] px-2 py-0.5 rounded-xs shrink-0">
                  Attached
                </span>
              </div>

              {/* Official Pochi la Biashara Payment Details Box */}
              <div className="p-4 bg-[#F5EFE4] border border-[#E3D8C6] rounded-[2px] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E3D8C6]">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#8C6D46]">
                      Official Payment Channel
                    </span>
                    <h4 className="font-display-serif text-base font-bold text-[#171717]">
                      M-PESA Pochi la Biashara
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="font-ui-sans text-xl font-bold text-[#991B1B]">
                      {currentPrice} KSH
                    </span>
                    <span className="block text-[10px] text-[#8C6D46] uppercase font-semibold">
                      Book Price
                    </span>
                  </div>
                </div>

                {/* Recipient & Phone Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-ui-sans">
                  <div className="p-2.5 bg-white border border-[#DDD3C2] rounded-[2px]">
                    <span className="block text-[10px] uppercase tracking-wider text-[#78716C] font-semibold">
                      Recipient / Account
                    </span>
                    <strong className="block text-xs text-[#171717] mt-0.5 font-bold">
                      {pochiConfig.pochiName}
                    </strong>
                  </div>

                  <div className="p-2.5 bg-white border border-[#DDD3C2] rounded-[2px] flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-[#78716C] font-semibold">
                        Pochi Phone Number
                      </span>
                      <strong className="block text-sm font-mono font-bold text-[#171717] mt-0.5">
                        {pochiConfig.pochiPhone}
                      </strong>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyPhone}
                      className="px-2.5 py-1.5 bg-[#FAF3E8] hover:bg-[#F2E5D0] border border-[#D9CEBC] rounded-xs text-[11px] font-semibold text-[#8C6D46] flex items-center gap-1 transition-colors cursor-pointer"
                      title="Copy Pochi phone number"
                    >
                      {copiedPhone ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#2E7D32]" />
                          <span className="text-[#2E7D32]">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Payment Guidelines List */}
                <div className="pt-2 text-xs text-[#57534E] space-y-1">
                  <div className="font-semibold text-[#171717] text-[11px] uppercase tracking-wider">
                    How to Pay via M-PESA:
                  </div>
                  <ol className="list-decimal list-inside space-y-0.5 text-[11px] leading-relaxed">
                    <li>Open <strong>M-PESA</strong> on your phone</li>
                    <li>
                      Select <strong>Lipa na M-PESA</strong> &rarr; <strong>Pochi la Biashara</strong>
                    </li>
                    <li>
                      Enter Phone Number: <strong>{pochiConfig.pochiPhone}</strong>
                    </li>
                    <li>
                      Enter Amount: <strong>KSh {currentPrice}</strong>
                    </li>
                    <li>Enter your M-PESA PIN and press OK</li>
                    <li>Copy the confirmation SMS received from Safaricom and paste below</li>
                  </ol>
                </div>
              </div>

              {/* Paste Confirmation SMS Form */}
              <form onSubmit={handleSubmitSms} className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-ui-sans font-semibold text-[#242424] uppercase tracking-wider">
                      Paste M-PESA Confirmation SMS
                    </label>
                    <span className="text-[10px] text-[#8C6D46] font-semibold">
                      Full SMS Required
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    required
                    value={pastedSms}
                    onChange={(e) => setPastedSms(e.target.value)}
                    placeholder="e.g. QGH7K92ABC Confirmed. Ksh750.00 sent to Alvis Njagi 0701870142 on 11/9/26 at 10:42 AM. New M-PESA balance is Ksh1,240.00..."
                    className="w-full px-3.5 py-2.5 text-xs font-mono bg-white border border-[#D9CEBC] rounded-[2px] text-[#171717] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#171717] leading-relaxed shadow-2xs"
                  />
                  <p className="text-[11px] text-[#78716C] mt-1">
                    Copy the entire message received from Safaricom and paste it here.
                  </p>
                </div>

                {/* Live Parsed Preview Card (Shows customer what will be submitted) */}
                {parsedPreview && (
                  <div className="p-3 bg-[#FAF7F0] border border-[#E8DFC9] rounded-[2px] space-y-1.5 text-xs font-ui-sans">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-[#8C6D46] flex items-center justify-between">
                      <span>Detected Transaction Details</span>
                      <span className="text-[#2E7D32]">Parsed from SMS</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-[#78716C]">Transaction Code:</span>{' '}
                        <strong className="font-mono text-[#171717]">
                          {parsedPreview.transactionCode || 'Detecting...'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[#78716C]">Amount:</span>{' '}
                        <strong className="text-[#171717]">
                          {parsedPreview.amount ? `KSh ${parsedPreview.amount}` : `KSh ${currentPrice}`}
                        </strong>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[#78716C]">SMS Time:</span>{' '}
                        <span className="text-[#171717]">
                          {parsedPreview.dateTimeStr || 'Stated in SMS'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-ui-sans font-semibold text-[#242424] uppercase tracking-wider mb-1">
                      Your Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Peter Mwangi"
                      className="w-full px-3 py-2 text-xs bg-white border border-[#D9CEBC] rounded-[2px] text-[#171717] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#171717]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-ui-sans font-semibold text-[#242424] uppercase tracking-wider mb-1">
                      M-PESA Sender Phone
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 0712 345 678"
                      className="w-full px-3 py-2 text-xs bg-white border border-[#D9CEBC] rounded-[2px] text-[#171717] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#171717]"
                    />
                  </div>
                </div>

                {/* Primary Submission Button */}
                <button
                  type="submit"
                  disabled={isSubmittingSms}
                  className="w-full py-3.5 px-4 rounded-[2px] bg-[#991B1B] hover:bg-[#7F1D1D] text-[#FAF7F2] font-ui-sans font-semibold text-xs tracking-wider uppercase transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingSms ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting to Administrators...</span>
                    </>
                  ) : (
                    <span>[ SUBMIT M-PESA SMS FOR ADMIN APPROVAL ]</span>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 3: PENDING ADMIN APPROVAL (Awaiting Mark, Gerishon, or Alvis) */}
          {/* ================================================================= */}
          {step === 'pending_approval' && activeRequest && (
            <div className="text-center space-y-6">
              {/* Animated Status Beacon */}
              <div className="w-16 h-16 rounded-full bg-[#FAF3E8] border border-[#E6D5BD] flex items-center justify-center mx-auto text-[#8C6D46] animate-pulse">
                <Clock className="w-8 h-8" />
              </div>

              <div>
                <span className="inline-block px-3 py-1 bg-[#FAF3E8] border border-[#D9CEBC] text-[#8C6D46] text-[11px] font-mono font-bold tracking-wider uppercase rounded-xs mb-2">
                  STATUS: PENDING ADMIN APPROVAL
                </span>
                <h4 className="font-display-serif text-xl sm:text-2xl font-bold text-[#171717]">
                  Payment Verification Request Submitted
                </h4>
                <p className="mt-2 font-book-serif text-xs text-[#57534E] max-w-sm mx-auto leading-relaxed">
                  All three administrators (<strong>Mark</strong>, <strong>Gerishon</strong>, and{' '}
                  <strong>Alvis</strong>) have received Email and SMS notifications with your
                  transaction details. Access will be unlocked as soon as one admin approves.
                </p>
              </div>

              {/* Request Details Inspection Card */}
              <div className="p-4 bg-[#F5EFE4] border border-[#E3D8C6] rounded-[2px] text-left text-xs font-ui-sans space-y-2 max-w-sm mx-auto">
                <div className="flex justify-between items-center pb-1.5 border-b border-[#E3D8C6]">
                  <span className="text-[#78716C]">Request ID:</span>
                  <span className="font-mono font-bold text-[#171717] text-[11px]">
                    {activeRequest.requestId}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#78716C]">Authorized Account:</span>
                  <span className="font-medium text-[#171717] truncate max-w-[190px]">
                    {activeRequest.email}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#78716C]">Transaction Code:</span>
                  <span className="font-mono font-bold text-[#991B1B]">
                    {activeRequest.transactionCode}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#78716C]">Amount:</span>
                  <span className="font-bold text-[#171717]">KSh {activeRequest.amount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#78716C]">SMS Time:</span>
                  <span className="text-[#57534E]">{activeRequest.transactionTime}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#78716C]">Submitted At:</span>
                  <span className="text-[#57534E]">
                    {new Date(activeRequest.submittedAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              {/* Auto-Polling Live Status Indicator: animates continuously while waiting for review, automatically stops once a verification notice of reject is displayed or approval is given */}
              <div className="p-3 bg-white border border-[#DDD3C2] rounded-[2px] max-w-sm mx-auto flex items-center justify-center gap-2.5 text-xs text-[#57534E]">
                {Boolean(errorMsg || activeRequest.status === 'REJECTED') ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-[#B91C1C] shrink-0" />
                    <span className="text-[#991B1B] font-semibold">Verification rejected — Notice displayed above</span>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#8C6D46] shrink-0" />
                    <span>Checking for administrator approval in real time...</span>
                  </>
                )}
              </div>

              {/* Action buttons */}
              <div className="space-y-2 max-w-sm mx-auto">
                <button
                  type="button"
                  onClick={() => handleCheckStatusNow(activeRequest.requestId)}
                  disabled={isPollingStatus}
                  className="w-full py-2.5 px-4 rounded-[2px] bg-[#171717] hover:bg-[#262626] text-[#FAF7F2] font-ui-sans font-semibold text-xs tracking-wider uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isPollingStatus ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Checking Status...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Check Status Now</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('pochi_instructions_and_sms')}
                  className="text-xs text-[#8C6D46] hover:underline cursor-pointer pt-1"
                >
                  &larr; Re-submit SMS or edit details
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 4: APPROVAL SUCCESS & ENTITLEMENT GRANTED                     */}
          {/* ================================================================= */}
          {step === 'approval_success' && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-[#EDF7ED] border border-[#C6D8C4] flex items-center justify-center mx-auto text-[#2D5A27]">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="inline-block px-3 py-1 bg-[#E8F5E9] border border-[#C8E6C9] text-[#2E7D32] text-[11px] font-mono font-bold tracking-wider uppercase rounded-xs mb-2">
                  VERIFIED & AUTHORIZED
                </span>
                <h4 className="font-display-serif text-2xl font-bold text-[#171717]">
                  Your copy of Dating Wrong is unlocked.
                </h4>
                <p className="mt-1 font-book-serif text-sm text-[#57534E]">
                  Approved by administrator. Full digital reader access granted.
                </p>
              </div>

              {/* CTAs */}
              <div className="space-y-2.5">
                <button
                  onClick={() => {
                    onClose();
                    onOpenReader();
                  }}
                  className="w-full py-3.5 px-6 rounded-[2px] bg-[#171717] hover:bg-[#262626] text-[#F5F0E8] font-ui-sans font-semibold text-xs tracking-wider uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <span>[ READ THE BOOK ]</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleCacheOffline}
                  disabled={offlineCached || isDownloadingOffline}
                  className="w-full py-3 px-6 rounded-[2px] bg-transparent hover:bg-black/5 text-[#171717] border border-[#171717] font-ui-sans font-semibold text-xs tracking-wider uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {offlineCached ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[#2D5A27]" />
                      <span>[ SAVED FOR OFFLINE READING ]</span>
                    </>
                  ) : isDownloadingOffline ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving 122 pages locally...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>[ SAVE FOR OFFLINE READING ]</span>
                    </>
                  )}
                </button>
              </div>

              {/* License Details */}
              <div className="pt-4 border-t border-[#E8E0D2] text-left font-ui-sans text-[11px] text-[#57534E] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#8B735F]">Authorized Google Account:</span>
                  <span className="font-bold text-[#171717]">{currentUser?.email}</span>
                </div>
                {grantedEntitlement?.transactionCode && (
                  <div className="flex justify-between">
                    <span className="text-[#8B735F]">Transaction Code:</span>
                    <span className="font-mono font-bold text-[#171717]">
                      {grantedEntitlement.transactionCode}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#8B735F]">Edition & Access:</span>
                  <span>Unabridged First Edition • Protected Web Reader</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
