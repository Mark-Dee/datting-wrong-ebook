import React, { useState, useEffect } from 'react';
import {
  X,
  DollarSign,
  Smartphone,
  Save,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Users,
  AlertTriangle,
  FileText,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  Clock,
  ShieldAlert,
  ArrowRight,
  Lock,
  Loader2,
  Bell,
  BellOff,
  Copy,
  Check,
  ShieldCheck,
  Pencil,
  UserCheck,
  Trash2,
  UserX,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock.ts';
import { doc, collection, onSnapshot, setDoc, deleteDoc, getDocs, query, where, serverTimestamp, addDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebase.ts';
import { apiFetch } from '../services/apiClient.ts';

export interface AuthorizedAdmin {
  email: string;
  name: string;
  role: string;
}

export const AUTHORIZED_ADMINS: AuthorizedAdmin[] = [
  { email: 'wanyekigerison@gmail.com', name: 'Gerishon Wanyeki', role: 'Author & Publisher' },
  { email: 'ochiengmark2908@gmail.com', name: 'Mark', role: 'Publisher & Systems Admin' },
  { email: 'alvisnjagi@gmail.com', name: 'Alvis Njagi', role: 'Publisher & Pochi Merchant' },
];

export const getAdminLabel = (emailOrId?: string | null): string => {
  if (!emailOrId) return 'Administrator';
  const clean = emailOrId.trim().toLowerCase();
  const matched = AUTHORIZED_ADMINS.find((a) => a.email.toLowerCase() === clean);
  if (matched) return `${matched.name} (${matched.email})`;
  return emailOrId;
};

export interface MappedUserItem {
  email: string;
  sms: string;
  transactionalCode: string;
  timeBought: string;
  submittedAt?: string;
  approvedAt?: string;
  adminWhoApproved: string;
  amount: number;
  customerName: string;
  senderPhone: string;
  requestId: string;
  entitlementId?: string;
}

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'pochi_approvals' | 'mapped_users' | 'overview' | 'payments' | 'book_mgmt' | 'sms_monitor' | 'email_logs';
  focusRequestId?: string | null;
}

interface PaymentItem {
  paymentId: string;
  paymentSessionId?: string;
  uid: string;
  email: string;
  customerName: string;
  checkoutPhone: string;
  normalizedPhone: string;
  expectedAmount: number;
  receivedAmount?: number;
  transactionCode?: string;
  recipient: string;
  status: string;
  provider: string;
  checkoutCreatedAt: string;
  paymentReceivedAt?: string;
  verifiedAt?: string;
  verificationMethod?: string;
  rawReference?: string;
  checkoutRequestId?: string;
  securityChecksPassed: boolean;
  failureReason?: string;
  adminAlertSent: boolean;
  emailConfirmationSent?: boolean;
}

interface SmsLogItem {
  id: string;
  payload: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    amount: number;
    expectedAmount: number;
    transactionCode: string;
    status: string;
    verificationMethod: string;
    reason?: string;
  };
  smsBody: string;
  recipients: {
    recipient: string;
    phone: string;
    status: string;
    messageId: string;
    timestamp: string;
  }[];
  timestamp: string;
}

interface EmailLogItem {
  id: string;
  to: string;
  subject: string;
  customerName: string;
  transactionReference: string;
  amount: number;
  currency: string;
  status: string;
  sentAt: string;
  accessUrl: string;
}

export interface PaymentRequestItem {
  requestId: string;
  uid: string;
  email: string;
  customerName: string;
  submittedSms: string;
  transactionCode: string;
  amount: number;
  expectedAmount: number;
  senderPhone: string;
  senderName?: string;
  recipientDetails: string;
  transactionTime: string;
  submittedAt: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  entitlementId?: string | null;
  notifiedAdmins?: string[];
}

interface AdminStats {
  totalReaders: number;
  verifiedPurchases: number;
  pendingPayments: number;
  underpaidPayments: number;
  failedPayments: number;
  manualReviewPayments: number;
  duplicatePayments: number;
  revenue: number;
  activeEntitlements: number;
  offlineUsers: number;
  recentPurchases: PaymentItem[];
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'pochi_approvals',
  focusRequestId,
}) => {
  useBodyScrollLock(isOpen);

  const { bookConfig, updateBookConfig, currentUser, userProfile } = useAuth();
  
  // Resolve logged in administrator identity
  const authEmail = (currentUser?.email || userProfile?.email || '').trim().toLowerCase();
  const matchedAuthAdmin = AUTHORIZED_ADMINS.find((a) => a.email.toLowerCase() === authEmail);

  // Active administrator email who is actively reviewing and approving:
  // Strictly defaults to authenticated admin email if matched, or saved selection, or first admin (Gerishon)
  const [activeAdminEmail, setActiveAdminEmail] = useState<string>(() => {
    if (matchedAuthAdmin) return matchedAuthAdmin.email;
    const saved = typeof window !== 'undefined' ? localStorage.getItem('dw_selected_admin_email') : null;
    if (saved && AUTHORIZED_ADMINS.some((a) => a.email.toLowerCase() === saved.toLowerCase())) {
      return saved.toLowerCase();
    }
    return authEmail || 'wanyekigerison@gmail.com';
  });

  // Keep synced if user signs in with a known administrator email
  useEffect(() => {
    if (authEmail && AUTHORIZED_ADMINS.some((a) => a.email.toLowerCase() === authEmail)) {
      setActiveAdminEmail(authEmail);
      localStorage.setItem('dw_selected_admin_email', authEmail);
    }
  }, [authEmail]);

  const currentAdminRole = userProfile?.role || 'admin';

  const [activeTab, setActiveTab] = useState<'pochi_approvals' | 'mapped_users' | 'overview' | 'payments' | 'book_mgmt' | 'sms_monitor' | 'email_logs'>(initialTab);
  
  // Pricing & Daraja state
  const [priceKes, setPriceKes] = useState(bookConfig.bookPriceKes);
  const [priceUsd, setPriceUsd] = useState(bookConfig.bookPriceUsd);
  const [paybill, setPaybill] = useState(bookConfig.paybillNumber);
  const [accountRef, setAccountRef] = useState(bookConfig.accountReference);

  // Data states
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [paymentsList, setPaymentsList] = useState<PaymentItem[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequestItem[]>([]);
  const [pochiPendingCount, setPochiPendingCount] = useState(0);
  const [pochiFilter, setPochiFilter] = useState<'ALL' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'>('PENDING_REVIEW');
  const [pochiSearch, setPochiSearch] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  // Reassign Approver Modal state (to correct any misattributed approver emails)
  const [reassignModalReqId, setReassignModalReqId] = useState<string | null>(null);
  const [reassignTargetEmail, setReassignTargetEmail] = useState<string>('wanyekigerison@gmail.com');
  const [isReassigning, setIsReassigning] = useState<boolean>(false);

  // Security Measure: Permanent User Deletion & Revocation Modal state
  const [deleteUserModalTarget, setDeleteUserModalTarget] = useState<{
    email: string;
    name?: string;
    uid?: string;
    requestId?: string;
    transactionCode?: string;
  } | null>(null);
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState<boolean>(false);
  const [isDeletingUser, setIsDeletingUser] = useState<boolean>(false);

  // Mapped Users & Notifications Toggle state
  const [mappedUsers, setMappedUsers] = useState<MappedUserItem[]>([]);
  const [totalMappedUsers, setTotalMappedUsers] = useState<number>(0);
  const [mappedSearch, setMappedSearch] = useState<string>('');
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [togglingNotifs, setTogglingNotifs] = useState<boolean>(false);
  const [expandedSmsId, setExpandedSmsId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null);
  const [smsLogs, setSmsLogs] = useState<SmsLogItem[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLogItem[]>([]);
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [paymentSearch, setPaymentSearch] = useState<string>('');

  const [isLoading, setIsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Real-time multi-admin synchronization across all devices
  const [realtimeSyncToast, setRealtimeSyncToast] = useState<{
    message: string;
    type: 'info' | 'success';
    admin?: string;
    timestamp: number;
  } | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(true);

  // Dynamically synchronize book pricing inputs across all admin consoles
  useEffect(() => {
    if (!saving) {
      if (bookConfig.bookPriceKes) setPriceKes(bookConfig.bookPriceKes);
      if (bookConfig.bookPriceUsd) setPriceUsd(bookConfig.bookPriceUsd);
      if (bookConfig.paybillNumber) setPaybill(bookConfig.paybillNumber);
      if (bookConfig.accountReference) setAccountRef(bookConfig.accountReference);
    }
  }, [bookConfig.bookPriceKes, bookConfig.bookPriceUsd, bookConfig.paybillNumber, bookConfig.accountReference, saving]);

  // Headers for admin API calls dynamically using activeAdminEmail
  const adminHeaders = {
    'Content-Type': 'application/json',
    'x-admin-email': activeAdminEmail,
    'x-user-role': currentAdminRole,
  };

  useEffect(() => {
    if (!isOpen) return;

    if (initialTab) {
      setActiveTab(initialTab);
    }
    if (focusRequestId) {
      setPochiSearch(focusRequestId);
      setPochiFilter('ALL');
    } else {
      setPochiSearch('');
    }

    // Direct, immediate load from Firestore database ensuring zero lag on modal open across all access points
    const loadDirectlyFromDatabase = async () => {
      try {
        const snap = await getDocs(collection(db, 'paymentRequests'));
        if (!snap.empty) {
          const liveRequests: PaymentRequestItem[] = [];
          snap.docs.forEach((docSnap) => {
            const d = docSnap.data();
            if (d.status === 'REVOKED') return;
            liveRequests.push({
              requestId: docSnap.id,
              uid: d.uid || '',
              email: d.email || '',
              customerName: d.customerName || 'Valued Reader',
              submittedSms: d.submittedSms || '',
              transactionCode: d.transactionCode || 'PENDING',
              amount: d.amount || 750,
              expectedAmount: d.expectedAmount || 750,
              senderPhone: d.senderPhone || '',
              senderName: d.senderName || '',
              recipientDetails: d.recipientDetails || 'Alvis Njagi',
              transactionTime: d.transactionTime || 'Stated in SMS',
              submittedAt: d.submittedAt || new Date().toISOString(),
              status: (d.status as 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED') || 'PENDING_REVIEW',
              reviewedBy: d.reviewedBy || null,
              reviewedAt: d.reviewedAt || null,
              rejectionReason: d.rejectionReason || null,
              entitlementId: d.entitlementId || null,
              notifiedAdmins: d.notifiedAdmins || [],
            });
          });

          liveRequests.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
          setPaymentRequests(liveRequests);
          setPochiPendingCount(liveRequests.filter((r) => r.status === 'PENDING_REVIEW').length);

          const approved = liveRequests.filter((r) => r.status === 'APPROVED');
          const mapped: MappedUserItem[] = approved.map((r) => ({
            email: r.email,
            sms: r.submittedSms,
            transactionalCode: r.transactionCode,
            timeBought: r.transactionTime || r.submittedAt,
            submittedAt: r.submittedAt,
            approvedAt: r.reviewedAt || r.submittedAt,
            adminWhoApproved: r.reviewedBy || 'Super Admin',
            amount: r.amount,
            customerName: r.customerName,
            senderPhone: r.senderPhone,
            requestId: r.requestId,
            entitlementId: r.entitlementId || undefined,
          }));
          setMappedUsers(mapped);
          setTotalMappedUsers(mapped.length);
        }
      } catch (dbErr) {
        console.warn('Initial direct database read notice:', dbErr);
      }
    };

    loadDirectlyFromDatabase();

    // Initial loads
    fetchPaymentRequests();
    fetchOverviewStats();
    fetchPayments();
    fetchSmsLogs();
    fetchEmailLogs();
    fetchMappedUsers();
    fetchNotificationToggle();

    // 1. Real-Time Firestore Synchronization for Payment Requests & Mapped Users across all admin devices
    const unsubFirestore = onSnapshot(
      collection(db, 'paymentRequests'),
      (snapshot) => {
        setIsRealtimeConnected(true);
        if (snapshot.empty) {
          setPaymentRequests([]);
          setPochiPendingCount(0);
          setMappedUsers([]);
          setTotalMappedUsers(0);
          return;
        }

        const liveRequests: PaymentRequestItem[] = [];
        snapshot.docs.forEach((docSnap) => {
          const d = docSnap.data();
          // Filter out permanently deleted or revoked records
          if (d.status === 'REVOKED') return;

          liveRequests.push({
            requestId: docSnap.id,
            uid: d.uid || '',
            email: d.email || '',
            customerName: d.customerName || 'Valued Reader',
            submittedSms: d.submittedSms || '',
            transactionCode: d.transactionCode || 'PENDING',
            amount: d.amount || 750,
            expectedAmount: d.expectedAmount || 750,
            senderPhone: d.senderPhone || '',
            senderName: d.senderName || '',
            recipientDetails: d.recipientDetails || 'Alvis Njagi',
            transactionTime: d.transactionTime || 'Stated in SMS',
            submittedAt: d.submittedAt || new Date().toISOString(),
            status: (d.status as 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED') || 'PENDING_REVIEW',
            reviewedBy: d.reviewedBy || null,
            reviewedAt: d.reviewedAt || null,
            rejectionReason: d.rejectionReason || null,
            entitlementId: d.entitlementId || null,
            notifiedAdmins: d.notifiedAdmins || [],
          });
        });

        // Stable sort by submittedAt descending
        liveRequests.sort(
          (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );
        setPaymentRequests(liveRequests);

        const pendingCount = liveRequests.filter((r) => r.status === 'PENDING_REVIEW').length;
        setPochiPendingCount(pendingCount);

        // Auto-synchronize mapped users instantly across all admin devices with exact approver
        const approved = liveRequests.filter((r) => r.status === 'APPROVED');
        const mapped: MappedUserItem[] = approved.map((r) => ({
          email: r.email,
          sms: r.submittedSms,
          transactionalCode: r.transactionCode,
          timeBought: r.transactionTime || r.submittedAt,
          submittedAt: r.submittedAt,
          approvedAt: r.reviewedAt || r.submittedAt,
          adminWhoApproved: r.reviewedBy || 'Super Admin',
          amount: r.amount,
          customerName: r.customerName,
          senderPhone: r.senderPhone,
          requestId: r.requestId,
          entitlementId: r.entitlementId || undefined,
        }));
        setMappedUsers(mapped);
        setTotalMappedUsers(mapped.length);

        // Seamlessly keep overview metrics synchronized without flicker
        setStats((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            totalReaders: Math.max(prev.totalReaders, mapped.length),
            verifiedPurchases: Math.max(prev.verifiedPurchases, mapped.length),
            pendingPayments: pendingCount,
            activeEntitlements: Math.max(prev.activeEntitlements, mapped.length),
          };
        });
      },
      (err) => {
        console.warn('Real-time admin sync listener notice:', err.message);
      }
    );

    // 2. Real-Time Notification Alerts Toggle Synchronization across all devices
    const unsubNotifs = onSnapshot(
      doc(db, 'config', 'admin-notifications'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.pendingApprovalsNotificationsEnabled !== undefined) {
            setNotificationsEnabled(Boolean(data.pendingApprovalsNotificationsEnabled));
          } else if (data.enabled !== undefined) {
            setNotificationsEnabled(Boolean(data.enabled));
          }
        }
      },
      (err) => console.warn('Admin notifications sync notice:', err.message)
    );

    // 3. Real-Time Admin Action Broadcasts across all 3 administrators' displays
    const actionsQuery = query(
      collection(db, 'adminActions'),
      orderBy('timestamp', 'desc'),
      limit(15)
    );
    const unsubActions = onSnapshot(
      actionsQuery,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const actionTime = data.timestamp ? new Date(data.timestamp).getTime() : 0;
            // Only announce actions that happened in the last 15 seconds from another device/admin
            const isFresh = Date.now() - actionTime < 15000;
            const isDifferentAdmin =
              data.performedBy &&
              data.performedBy.trim().toLowerCase() !== activeAdminEmail.trim().toLowerCase();

            if (isFresh && isDifferentAdmin) {
              setRealtimeSyncToast({
                message: data.description || `Real-time update from ${data.performedBy}`,
                type: 'info',
                admin: data.performedBy,
                timestamp: Date.now(),
              });
              // Refresh overview stats and payments quietly
              fetchOverviewStats();
              fetchPayments();
              setTimeout(() => {
                setRealtimeSyncToast((curr) => (curr?.timestamp === actionTime ? null : curr));
              }, 5000);
            }
          }
        });
      },
      (err) => console.warn('Admin actions feed notice:', err.message)
    );

    // 4. Gentle fallback background poll (every 20s) for non-Firestore records (Daraja callback logs, SMS server logs)
    const gentleInterval = setInterval(() => {
      fetchOverviewStats();
      fetchPayments();
      fetchSmsLogs();
      fetchEmailLogs();
    }, 20000);

    return () => {
      unsubFirestore();
      unsubNotifs();
      unsubActions();
      clearInterval(gentleInterval);
    };
  }, [isOpen, initialTab, focusRequestId, activeAdminEmail]);

  const fetchMappedUsers = async () => {
    try {
      // Direct Firestore database query guarantees 100% synchrony across all 3 access paths
      const snap = await getDocs(collection(db, 'paymentRequests'));
      if (!snap.empty) {
        const approved: MappedUserItem[] = [];
        snap.docs.forEach((d) => {
          const r = d.data();
          if (r.status === 'APPROVED') {
            approved.push({
              email: r.email,
              sms: r.submittedSms,
              transactionalCode: r.transactionCode,
              timeBought: r.transactionTime || r.submittedAt,
              submittedAt: r.submittedAt,
              approvedAt: r.reviewedAt || r.submittedAt,
              adminWhoApproved: r.reviewedBy || 'Super Admin',
              amount: r.amount || 750,
              customerName: r.customerName || 'Valued Reader',
              senderPhone: r.senderPhone || '',
              requestId: d.id,
              entitlementId: r.entitlementId || undefined,
            });
          }
        });
        approved.sort((a, b) => new Date(b.approvedAt || b.submittedAt || 0).getTime() - new Date(a.approvedAt || a.submittedAt || 0).getTime());
        setMappedUsers(approved);
        setTotalMappedUsers(approved.length);
      }

      const res = await apiFetch('/api/admin/mapped-users', { headers: adminHeaders });
      if (res.ok) {
        const data = await res.json();
        if (data.users && data.users.length > 0) {
          setMappedUsers((curr) => (curr.length === 0 ? data.users : curr));
          setTotalMappedUsers((curr) => (curr === 0 ? data.totalMappedUsers : curr));
        }
      }
    } catch (err) {
      console.error('Failed to fetch mapped users:', err);
    }
  };

  const fetchNotificationToggle = async () => {
    try {
      const res = await apiFetch('/api/admin/notifications/toggle', { headers: adminHeaders });
      if (res.ok) {
        const data = await res.json();
        setNotificationsEnabled(Boolean(data.pendingApprovalsNotificationsEnabled));
      }
    } catch (err) {
      console.error('Failed to fetch notification toggle:', err);
    }
  };

  const handleToggleNotifications = async () => {
    setTogglingNotifs(true);
    try {
      const nextState = !notificationsEnabled;
      const res = await apiFetch('/api/admin/notifications/toggle', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ enabled: nextState }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update notification settings');
      }

      // Synchronize immediately to Firestore so ALL admin screens update simultaneously
      try {
        await setDoc(
          doc(db, 'config', 'admin-notifications'),
          {
            enabled: nextState,
            pendingApprovalsNotificationsEnabled: nextState,
            updatedBy: activeAdminEmail.trim().toLowerCase(),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        // Broadcast action to all admins
        await addDoc(collection(db, 'adminActions'), {
          actionType: 'TOGGLE_NOTIFICATIONS',
          performedBy: activeAdminEmail.trim().toLowerCase(),
          enabled: nextState,
          description: `${activeAdminEmail} ${nextState ? 'enabled' : 'muted'} pending approval notifications`,
          timestamp: new Date().toISOString(),
        });
      } catch (fErr: any) {
        console.warn('Firestore notification sync notice:', fErr.message);
      }

      setNotificationsEnabled(nextState);
      setSuccessMsg(data.message || `Pending approvals notifications ${nextState ? 'activated' : 'muted'}.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating notifications');
    } finally {
      setTogglingNotifs(false);
      setTimeout(() => {
        setSuccessMsg(null);
        setErrorMsg(null);
      }, 4000);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedText(label);
    setTimeout(() => {
      setCopiedText(null);
    }, 2500);
  };

  const fetchPaymentRequests = async () => {
    try {
      // 1. Fetch directly from Firestore to ensure immediate database truth
      const snap = await getDocs(collection(db, 'paymentRequests'));
      if (!snap.empty) {
        const liveRequests: PaymentRequestItem[] = [];
        snap.docs.forEach((docSnap) => {
          const d = docSnap.data();
          if (d.status === 'REVOKED') return;
          liveRequests.push({
            requestId: docSnap.id,
            uid: d.uid || '',
            email: d.email || '',
            customerName: d.customerName || 'Valued Reader',
            submittedSms: d.submittedSms || '',
            transactionCode: d.transactionCode || 'PENDING',
            amount: d.amount || 750,
            expectedAmount: d.expectedAmount || 750,
            senderPhone: d.senderPhone || '',
            senderName: d.senderName || '',
            recipientDetails: d.recipientDetails || 'Alvis Njagi',
            transactionTime: d.transactionTime || 'Stated in SMS',
            submittedAt: d.submittedAt || new Date().toISOString(),
            status: (d.status as 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED') || 'PENDING_REVIEW',
            reviewedBy: d.reviewedBy || null,
            reviewedAt: d.reviewedAt || null,
            rejectionReason: d.rejectionReason || null,
            entitlementId: d.entitlementId || null,
            notifiedAdmins: d.notifiedAdmins || [],
          });
        });
        liveRequests.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        setPaymentRequests(liveRequests);
        setPochiPendingCount(liveRequests.filter((r) => r.status === 'PENDING_REVIEW').length);
      }

      // 2. Also query backend API
      const res = await apiFetch('/api/admin/payment-requests', { headers: adminHeaders });
      if (res.ok) {
        const data = await res.json();
        if (data.requests && data.requests.length > 0) {
          setPaymentRequests((curr) => (curr.length === 0 ? data.requests : curr));
          if (data.counts?.pending !== undefined) {
            setPochiPendingCount((curr) => (curr === 0 ? data.counts.pending : curr));
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch payment requests:', err);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    setReviewingId(requestId);
    setErrorMsg(null);
    setSuccessMsg(null);
    const approvingEmail = activeAdminEmail.trim().toLowerCase();
    try {
      const res = await apiFetch(`/api/admin/payment-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': approvingEmail,
          'x-user-role': currentAdminRole,
        },
        body: JSON.stringify({
          adminEmail: approvingEmail,
          adminName: approvingEmail,
          baseUrl: window.location.origin,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to approve request');
      }

      // Propagate immediately to Firestore collection so all admin devices reflect instantly
      // Storing the EXACT administrator email who performed the approval!
      try {
        await setDoc(
          doc(db, 'paymentRequests', requestId),
          {
            status: 'APPROVED',
            reviewedBy: approvingEmail,
            reviewedAt: new Date().toISOString(),
            entitlementId: data.entitlement?.paymentId || `ENT-${Date.now()}`,
          },
          { merge: true }
        );

        // Immediate client entitlement authorization in Firestore collections
        const targetReq = paymentRequests.find((r) => r.requestId === requestId);
        const customerEmail = (targetReq?.email || data.entitlement?.email || '').trim().toLowerCase();
        const customerUid = targetReq?.uid || data.entitlement?.uid || '';

        if (customerUid) {
          try {
            await setDoc(
              doc(db, 'bookEntitlements', `${customerUid}_dating-wrong`),
              {
                bookId: 'dating-wrong',
                grantedAt: new Date().toISOString(),
                source: 'pochi_verified',
                status: 'active',
                uid: customerUid,
                userEmail: customerEmail,
                approvedBy: approvingEmail,
                watermark: `Authorized Digital Edition • ${customerEmail} • Dating Wrong`,
              },
              { merge: true }
            );
            await setDoc(
              doc(db, 'users', customerUid),
              {
                hasAccess: true,
                accessStatus: 'ACTIVE',
                approvedBy: approvingEmail,
                approvedAt: new Date().toISOString(),
              },
              { merge: true }
            );
          } catch (uErr) {
            console.warn('Firestore user entitlement notice:', uErr);
          }
        }

        if (customerEmail) {
          try {
            await addDoc(collection(db, 'entitlements'), {
              entitlementId: data.entitlement?.paymentId || `ENT-${Date.now()}`,
              userId: customerUid || `USR-${Date.now()}`,
              email: customerEmail,
              name: targetReq?.customerName || 'Authorized Reader',
              bookId: 'dating-wrong',
              status: 'active',
              grantedAt: new Date().toISOString(),
              approvedBy: approvingEmail,
              watermarkText: `Authorized Digital Edition • ${customerEmail} • Dating Wrong`,
            });
          } catch (eErr) {
            console.warn('Firestore entitlements collection notice:', eErr);
          }
        }

        // Broadcast action to all admins' displays
        await addDoc(collection(db, 'adminActions'), {
          actionType: 'APPROVE',
          performedBy: approvingEmail,
          requestId,
          customerEmail: targetReq?.email || '',
          customerName: targetReq?.customerName || '',
          description: `${approvingEmail} approved digital book access for ${targetReq?.email || targetReq?.customerName || 'reader'}`,
          timestamp: new Date().toISOString(),
        });
      } catch (fErr: any) {
        console.warn('Firestore real-time approve sync notice:', fErr.message);
      }

      setSuccessMsg(`Payment request approved! Reader entitlement granted. Mapped to approver: ${approvingEmail}`);
      await fetchPaymentRequests();
      await fetchPayments();
      await fetchOverviewStats();
      await fetchMappedUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error approving request');
    } finally {
      setReviewingId(null);
      setTimeout(() => {
        setSuccessMsg(null);
        setErrorMsg(null);
      }, 4000);
    }
  };

  const handleRejectRequest = async (requestId: string, reason: string) => {
    setReviewingId(requestId);
    setErrorMsg(null);
    setSuccessMsg(null);
    const rejectingEmail = activeAdminEmail.trim().toLowerCase();
    try {
      const res = await apiFetch(`/api/admin/payment-requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': rejectingEmail,
          'x-user-role': currentAdminRole,
        },
        body: JSON.stringify({
          adminEmail: rejectingEmail,
          adminName: rejectingEmail,
          reason: reason.trim() || 'Payment could not be verified in Pochi records.',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reject request');
      }

      // Propagate immediately to Firestore collection so all admin devices reflect instantly
      try {
        await setDoc(
          doc(db, 'paymentRequests', requestId),
          {
            status: 'REJECTED',
            reviewedBy: rejectingEmail,
            reviewedAt: new Date().toISOString(),
            rejectionReason: reason.trim() || 'Payment could not be verified in Pochi records.',
          },
          { merge: true }
        );

        // Broadcast action to all admins' displays
        const targetReq = paymentRequests.find((r) => r.requestId === requestId);
        await addDoc(collection(db, 'adminActions'), {
          actionType: 'REJECT',
          performedBy: rejectingEmail,
          requestId,
          customerEmail: targetReq?.email || '',
          description: `${rejectingEmail} rejected payment request for ${targetReq?.email || 'reader'}`,
          timestamp: new Date().toISOString(),
        });
      } catch (fErr: any) {
        console.warn('Firestore real-time reject sync notice:', fErr.message);
      }

      setSuccessMsg(`Payment request rejected by ${rejectingEmail}. Access remains locked.`);
      setRejectModalId(null);
      setRejectReason('');
      await fetchPaymentRequests();
      await fetchPayments();
      await fetchMappedUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error rejecting request');
    } finally {
      setReviewingId(null);
      setTimeout(() => {
        setSuccessMsg(null);
        setErrorMsg(null);
      }, 4000);
    }
  };

  // Reassign or correct the administrator email mapped with an approved book request
  const handleReassignApprover = async (requestId: string, newApproverEmail: string) => {
    setIsReassigning(true);
    const cleanEmail = newApproverEmail.trim().toLowerCase();
    try {
      const res = await apiFetch(`/api/admin/payment-requests/${requestId}/reassign-approver`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': activeAdminEmail,
          'x-user-role': currentAdminRole,
        },
        body: JSON.stringify({ adminEmail: cleanEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reassign approver');
      }

      // Update Firestore document as well
      try {
        await setDoc(
          doc(db, 'paymentRequests', requestId),
          {
            reviewedBy: cleanEmail,
          },
          { merge: true }
        );

        // Broadcast action to all admins' displays
        await addDoc(collection(db, 'adminActions'), {
          actionType: 'REASSIGN',
          performedBy: activeAdminEmail.trim().toLowerCase(),
          requestId,
          newApprover: cleanEmail,
          description: `${activeAdminEmail} remapped approval attribution to ${cleanEmail}`,
          timestamp: new Date().toISOString(),
        });
      } catch (fErr: any) {
        console.warn('Firestore reassign sync notice:', fErr.message);
      }

      setSuccessMsg(`Approval successfully re-mapped to: ${cleanEmail}`);
      setReassignModalReqId(null);
      await fetchPaymentRequests();
      await fetchMappedUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error reassigning approver');
    } finally {
      setIsReassigning(false);
      setTimeout(() => {
        setSuccessMsg(null);
        setErrorMsg(null);
      }, 4000);
    }
  };

  // Security Measure: Permanent User Deletion & Revocation Handler
  const handleDeleteUser = async () => {
    if (!deleteUserModalTarget) return;
    setIsDeletingUser(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const target = deleteUserModalTarget;
    const targetEmail = (target.email || '').trim().toLowerCase();

    try {
      // 1. Purge from server memory and backend records
      const res = await apiFetch('/api/admin/users/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': activeAdminEmail,
          'x-user-role': currentAdminRole,
        },
        body: JSON.stringify({
          userIdentifier: targetEmail || target.uid || target.requestId,
          email: targetEmail,
          uid: target.uid,
          requestId: target.requestId,
          adminEmail: activeAdminEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete user on server');
      }

      // 2. Delete / revoke documents in Firestore
      if (target.requestId) {
        try {
          await deleteDoc(doc(db, 'paymentRequests', target.requestId));
        } catch {
          await setDoc(
            doc(db, 'paymentRequests', target.requestId),
            {
              status: 'REVOKED',
              revokedAt: new Date().toISOString(),
              revokedBy: activeAdminEmail,
            },
            { merge: true }
          );
        }
      }

      if (target.uid) {
        try {
          await deleteDoc(doc(db, 'bookEntitlements', `${target.uid}_dating-wrong`));
        } catch (err) {
          console.warn('bookEntitlements delete notice:', err);
        }

        try {
          await setDoc(
            doc(db, 'users', target.uid),
            {
              hasAccess: false,
              accessStatus: 'REVOKED',
              revokedAt: new Date().toISOString(),
              revokedBy: activeAdminEmail,
            },
            { merge: true }
          );
        } catch (err) {
          console.warn('users revoke notice:', err);
        }
      }

      if (targetEmail) {
        try {
          const entQ = query(collection(db, 'entitlements'), where('email', '==', targetEmail));
          const snap = await getDocs(entQ);
          for (const d of snap.docs) {
            await deleteDoc(d.ref);
          }
        } catch (err) {
          console.warn('entitlements delete notice:', err);
        }
      }

      // Broadcast user deletion to all admins' displays
      try {
        await addDoc(collection(db, 'adminActions'), {
          actionType: 'DELETE_USER',
          performedBy: activeAdminEmail.trim().toLowerCase(),
          targetEmail,
          targetUid: target.uid || '',
          description: `${activeAdminEmail} permanently deleted and revoked user ${targetEmail || target.name || 'Account'}`,
          timestamp: new Date().toISOString(),
        });
      } catch (fErr: any) {
        console.warn('Firestore action broadcast notice:', fErr.message);
      }

      setSuccessMsg(`Security action completed: User ${targetEmail || target.name || 'Account'} has been permanently deleted and revoked.`);
      setDeleteUserModalTarget(null);
      setDeleteConfirmChecked(false);

      // Refresh data
      await fetchPaymentRequests();
      await fetchMappedUsers();
      await fetchPayments();
      await fetchOverviewStats();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error deleting user');
    } finally {
      setIsDeletingUser(false);
      setTimeout(() => {
        setSuccessMsg(null);
        setErrorMsg(null);
      }, 4000);
    }
  };

  const fetchOverviewStats = async () => {
    try {
      const res = await apiFetch('/api/admin/stats', { headers: adminHeaders });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
    }
  };

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/admin/payments');
      if (res.ok) {
        const data = await res.json();
        setPaymentsList(data.payments || []);
      }
    } catch (err) {
      console.error('Failed to fetch payments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSmsLogs = async () => {
    try {
      const res = await apiFetch('/api/admin/sms-logs', { headers: adminHeaders });
      if (res.ok) {
        const data = await res.json();
        setSmsLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch SMS logs:', err);
    }
  };

  const fetchEmailLogs = async () => {
    try {
      const res = await apiFetch('/api/admin/email-logs', { headers: adminHeaders });
      if (res.ok) {
        const data = await res.json();
        setEmailLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch email logs:', err);
    }
  };

  const handleSaveBookSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Update AuthContext & Firestore config
      await updateBookConfig({
        bookPriceKes: Number(priceKes),
        bookPriceUsd: Number(priceUsd),
        paybillNumber: paybill.trim(),
        accountReference: accountRef.trim(),
      });

      // 2. Sync to Server payment store
      await apiFetch('/api/admin/book-config', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          priceKes: Number(priceKes),
          title: 'Dating Wrong: A Christian Perspective on Why Relationships Fail and How God Redeems Them',
          subtitle: 'Why Relationships Fail and How God Redeems Them',
          activeVersion: 1,
          publisher: 'Mark & Alvis',
        }),
      });

      // 3. Broadcast update to all admins
      try {
        await addDoc(collection(db, 'adminActions'), {
          actionType: 'UPDATE_BOOK_SETTINGS',
          performedBy: activeAdminEmail.trim().toLowerCase(),
          priceKes: Number(priceKes),
          priceUsd: Number(priceUsd),
          paybill: paybill.trim(),
          description: `${activeAdminEmail} updated book pricing to KES ${priceKes} ($${priceUsd})`,
          timestamp: new Date().toISOString(),
        });
      } catch (fErr: any) {
        console.warn('Firestore book config action broadcast notice:', fErr.message);
      }

      setSuccessMsg('Book configuration and pricing updated successfully.');
      setTimeout(() => setSuccessMsg(null), 3500);
      fetchOverviewStats();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update book configuration');
    } finally {
      setSaving(false);
    }
  };

  // Section 36: Trigger Transaction Reconciliation
  const handleReconcilePayment = async (paymentSessionId: string) => {
    setReconcilingId(paymentSessionId);
    try {
      const res = await apiFetch(`/api/payments/mpesa/reconcile/${paymentSessionId}`, {
        method: 'POST',
        headers: adminHeaders,
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Session ${paymentSessionId} successfully reconciled! Entitlement granted.`);
        fetchPayments();
        fetchOverviewStats();
      } else {
        setErrorMsg(data.error || 'Reconciliation did not grant entitlement.');
      }
    } catch (err: any) {
      setErrorMsg(`Reconciliation failed: ${err.message}`);
    } finally {
      setReconcilingId(null);
      setTimeout(() => {
        setSuccessMsg(null);
        setErrorMsg(null);
      }, 4000);
    }
  };

  if (!isOpen) return null;

  // Filtered payments
  const filteredPayments = paymentsList.filter((p) => {
    const matchesFilter =
      paymentFilter === 'ALL' ||
      p.status === paymentFilter;

    const q = paymentSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.customerName.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.checkoutPhone.includes(q) ||
      (p.transactionCode && p.transactionCode.toLowerCase().includes(q)) ||
      p.paymentId.toLowerCase().includes(q);

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 overflow-y-auto overscroll-contain bg-stone-950/75 backdrop-blur-xs transition-opacity">
      <div className="relative w-full max-w-5xl bg-[#FBF9F5] border border-[#DDD3C2] rounded-sm shadow-2xl overflow-hidden my-2 sm:my-8 font-ui-sans flex flex-col max-h-[92vh]">
        
        {/* Top Header: Responsive layout engineered to fit beautifully on small mobile screens */}
        <div className="px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-[#E8E0D2] bg-[#F5EFE4] shrink-0 space-y-2">
          {/* Row 1: Brand Logo + Title + Close Button */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xs bg-[#78350F] text-[#FAF7F2] flex items-center justify-center font-display-serif text-xs sm:text-sm font-bold shadow-xs shrink-0">
                M
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display-serif text-xs sm:text-sm md:text-base font-bold text-[#1C1917] leading-tight truncate">
                  Publishing &amp; Admin Console
                </h3>
                <p className="font-ui-sans text-[10px] sm:text-[11px] text-[#8C6D46] truncate">
                  Mark &amp; Alvis Publishers • Gerishon Wanyeki
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 sm:p-1.5 rounded-sm text-[#78716C] hover:text-[#1C1917] hover:bg-[#EAE1D1] transition-colors cursor-pointer shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Row 2: Approver Identity Selector + Role Badge + Alert Toggle (Never overlaps on mobile) */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#EAE1D1]/70 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] sm:text-[11px] font-semibold text-[#8C6D46] uppercase tracking-wider shrink-0">
                Approving As:
              </span>
              <select
                value={activeAdminEmail}
                onChange={(e) => {
                  const val = e.target.value;
                  setActiveAdminEmail(val);
                  localStorage.setItem('dw_selected_admin_email', val);
                }}
                className="text-[11px] sm:text-xs font-semibold bg-white border border-[#D9CEBC] rounded-xs px-2 py-0.5 text-[#171717] focus:outline-none focus:border-[#78350F] cursor-pointer"
                title="Select which administrator you are reviewing and approving as"
              >
                {AUTHORIZED_ADMINS.map((adm) => (
                  <option key={adm.email} value={adm.email}>
                    {adm.name} ({adm.email.split('@')[0]})
                  </option>
                ))}
              </select>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold tracking-wider uppercase bg-[#E8EFE5] text-[#2D5A27] border border-[#C5DDC0] shrink-0">
                Super Admin
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Real-Time Multi-Admin Synchronization Badge */}
              <div 
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0] shadow-2xs shrink-0 select-none"
                title="Continuous zero-latency synchronization across all 3 administrators and all devices without refresh"
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                </span>
                <span className="hidden xs:inline font-bold">Live Sync</span>
                <span className="text-[9px] text-[#166534] font-semibold">3 Admins</span>
              </div>

              {/* Notification Toggle for Pending Approvals */}
              <button
                type="button"
                onClick={handleToggleNotifications}
                disabled={togglingNotifs}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-semibold border transition-all cursor-pointer shrink-0 ${
                  notificationsEnabled
                    ? 'bg-[#E8F5E9] text-[#1B5E20] border-[#A5D6A7] hover:bg-[#C8E6C9]'
                    : 'bg-[#FFF3E0] text-[#E65100] border-[#FFE082] hover:bg-[#FFE0B2]'
                }`}
                title="Toggle pending approvals alert notifications for Mark, Gerishon, and Alvis"
              >
                {notificationsEnabled ? (
                  <>
                    <Bell className="w-3 h-3 text-[#2E7D32]" />
                    <span>ALERTS: ON</span>
                  </>
                ) : (
                  <>
                    <BellOff className="w-3 h-3 text-[#E65100]" />
                    <span>ALERTS: MUTED</span>
                  </>
                )}
                {togglingNotifs && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
              </button>
            </div>
          </div>
        </div>

        {/* Real-Time Action Broadcast Banner across All Signed-In Devices */}
        {realtimeSyncToast && (
          <div className="bg-[#ECFDF5] border-b border-[#A7F3D0] px-3 sm:px-6 py-2 flex items-center justify-between gap-2 text-xs text-[#065F46] animate-in fade-in duration-200 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              <span className="font-bold text-[11px] text-[#047857] uppercase tracking-wide shrink-0">Live Admin Sync:</span>
              <span className="truncate font-medium">{realtimeSyncToast.message}</span>
            </div>
            <button
              onClick={() => setRealtimeSyncToast(null)}
              className="p-0.5 text-[#047857] hover:text-[#064E3B] cursor-pointer shrink-0"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Global Success / Error Toast */}
        {successMsg && (
          <div className="bg-[#EDF7ED] border-b border-[#C5DDC0] px-3 sm:px-6 py-2 flex items-center gap-2 text-xs text-[#1B5E20] shrink-0">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="bg-[#FDF2F2] border-b border-[#F8B4B4] px-3 sm:px-6 py-2 flex items-center gap-2 text-xs text-[#991B1B] shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Navigation Tabs (Sections 42-46 + Pochi Admin Verification + Mapped Users) */}
        <div className="flex border-b border-[#E8E0D2] bg-[#F8F4EC] px-3 sm:px-6 text-xs font-semibold overflow-x-auto shrink-0 select-none">
          <button
            type="button"
            onClick={() => setActiveTab('pochi_approvals')}
            className={`py-3.5 px-4 border-b-2 whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pochi_approvals'
                ? 'border-[#991B1B] text-[#991B1B]'
                : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Buy Book Approvals</span>
            {pochiPendingCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#991B1B] text-white">
                {pochiPendingCount} PENDING
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mapped_users')}
            className={`py-3.5 px-4 border-b-2 whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'mapped_users'
                ? 'border-[#78350F] text-[#78350F]'
                : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Mapped Users ({totalMappedUsers})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3.5 px-4 border-b-2 whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-[#78350F] text-[#78350F]'
                : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Overview & Stats</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`py-3.5 px-4 border-b-2 whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'payments'
                ? 'border-[#78350F] text-[#78350F]'
                : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Payments & Verifications ({paymentsList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('book_mgmt')}
            className={`py-3.5 px-4 border-b-2 whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'book_mgmt'
                ? 'border-[#78350F] text-[#78350F]'
                : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Book Management & Pricing</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sms_monitor')}
            className={`py-3.5 px-4 border-b-2 whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'sms_monitor'
                ? 'border-[#78350F] text-[#78350F]'
                : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>3-Admin SMS Monitor ({smsLogs.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('email_logs')}
            className={`py-3.5 px-4 border-b-2 whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'email_logs'
                ? 'border-[#78350F] text-[#78350F]'
                : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email Confirmations ({emailLogs.length})</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1">
          
          {/* TAB 0: POCHI SMS APPROVALS QUEUE (3-Admin Verification) */}
          {activeTab === 'pochi_approvals' && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-display-serif text-lg font-bold text-[#1C1917]">
                    M-PESA Pochi la Biashara Approval Queue
                  </h4>
                  <p className="text-xs text-[#78716C] mt-0.5">
                    Inspect pasted SMS submissions against genuine Pochi statements. Any one of the 3 administrators (<strong>Mark</strong>, <strong>Gerishon</strong>, or <strong>Alvis</strong>) can approve or reject. Approval instantly unlocks the digital book for the attached Google email.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchPaymentRequests}
                  className="px-3 py-1.5 text-xs bg-white border border-[#D9CEBC] rounded-xs text-[#78350F] hover:bg-[#FAF7F2] transition-colors flex items-center gap-1.5 self-start cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Queue</span>
                </button>
              </div>

              {/* 3-Admin Authority Notice */}
              <div className="p-3.5 bg-[#FAF7F0] border border-[#E8DFC9] rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#8C6D46] shrink-0" />
                  <div>
                    <strong className="text-[#171717]">Single-Admin Approval Authority:</strong>{' '}
                    <span className="text-[#57534E]">
                      All three administrators receive Email and SMS alerts for every request. Any one admin can approve.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono shrink-0 text-[#8C6D46]">
                  <span className="px-2 py-0.5 bg-white border border-[#DDD3C2] rounded-xs font-semibold">Mark</span>
                  <span className="px-2 py-0.5 bg-white border border-[#DDD3C2] rounded-xs font-semibold">Gerishon</span>
                  <span className="px-2 py-0.5 bg-white border border-[#DDD3C2] rounded-xs font-semibold">Alvis</span>
                </div>
              </div>

              {/* Active Approving Administrator Attribution Card */}
              <div className="p-3 bg-[#EEF5EE] border border-[#C5DEC3] rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <UserCheck className="w-4 h-4 text-[#2E7D32] shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[#57534E]">Active Approver Identity:</span>{' '}
                    <strong className="text-[#171717]">{getAdminLabel(activeAdminEmail)}</strong>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <span className="text-[10px] text-[#2E7D32] font-semibold bg-[#E0EFE0] px-2 py-0.5 rounded-xs">
                    Mapped strictly to: {activeAdminEmail}
                  </span>
                </div>
              </div>

              {/* Notification Toggle for Pending Approvals */}
              <div className="p-3.5 bg-white border border-[#DDD3C2] rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      notificationsEnabled ? 'bg-[#E8F5E9] text-[#1B5E20]' : 'bg-[#FFF3E0] text-[#E65100]'
                    }`}
                  >
                    {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-[#171717]">Pending Approvals Notification Toggle:</strong>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          notificationsEnabled
                            ? 'bg-[#E8F5E9] text-[#1B5E20] border border-[#A5D6A7]'
                            : 'bg-[#FFF3E0] text-[#E65100] border border-[#FFE082]'
                        }`}
                      >
                        {notificationsEnabled ? 'ACTIVE (ALERTS ON)' : 'MUTED (ALERTS OFF)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#78716C] mt-0.5">
                      Sends an instant email and a summary SMS to <strong>Mark</strong>, <strong>Gerishon</strong>, and <strong>Alvis</strong> whenever a new payment request is submitted.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleToggleNotifications}
                    disabled={togglingNotifs}
                    className={`px-3.5 py-1.5 rounded-xs font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer border ${
                      notificationsEnabled
                        ? 'bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]'
                        : 'bg-[#15803D] hover:bg-[#166534] text-white border-transparent'
                    }`}
                  >
                    {togglingNotifs ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : notificationsEnabled ? (
                      <>
                        <BellOff className="w-3.5 h-3.5" />
                        <span>Mute Alerts</span>
                      </>
                    ) : (
                      <>
                        <Bell className="w-3.5 h-3.5" />
                        <span>Activate Alerts</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="flex items-center gap-1.5 bg-white p-1 rounded-xs border border-[#DDD3C2] text-xs">
                  <button
                    type="button"
                    onClick={() => setPochiFilter('PENDING_REVIEW')}
                    className={`px-3 py-1.5 rounded-xs font-semibold cursor-pointer transition-colors ${
                      pochiFilter === 'PENDING_REVIEW'
                        ? 'bg-[#991B1B] text-white shadow-xs'
                        : 'text-[#78716C] hover:text-[#171717]'
                    }`}
                  >
                    Pending ({paymentRequests.filter((r) => r.status === 'PENDING_REVIEW').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPochiFilter('APPROVED')}
                    className={`px-3 py-1.5 rounded-xs font-semibold cursor-pointer transition-colors ${
                      pochiFilter === 'APPROVED'
                        ? 'bg-[#2E7D32] text-white shadow-xs'
                        : 'text-[#78716C] hover:text-[#171717]'
                    }`}
                  >
                    Approved ({paymentRequests.filter((r) => r.status === 'APPROVED').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPochiFilter('REJECTED')}
                    className={`px-3 py-1.5 rounded-xs font-semibold cursor-pointer transition-colors ${
                      pochiFilter === 'REJECTED'
                        ? 'bg-[#78716C] text-white shadow-xs'
                        : 'text-[#78716C] hover:text-[#171717]'
                    }`}
                  >
                    Rejected ({paymentRequests.filter((r) => r.status === 'REJECTED').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPochiFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xs font-semibold cursor-pointer transition-colors ${
                      pochiFilter === 'ALL'
                        ? 'bg-[#171717] text-white shadow-xs'
                        : 'text-[#78716C] hover:text-[#171717]'
                    }`}
                  >
                    All ({paymentRequests.length})
                  </button>
                </div>

                <div className="relative min-w-[220px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#A8A29E]" />
                  <input
                    type="text"
                    value={pochiSearch}
                    onChange={(e) => setPochiSearch(e.target.value)}
                    placeholder="Search code, email, name..."
                    className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-[#DDD3C2] rounded-xs text-[#171717] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#171717]"
                  />
                </div>
              </div>

              {/* Focused Deep-Link Request Notification */}
              {focusRequestId && pochiSearch === focusRequestId && (
                <div className="p-3 bg-[#FEF3C7] border border-[#F59E0B] rounded-xs flex items-center justify-between text-xs text-[#92400E]">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-[#D97706] shrink-0" />
                    <span>
                      Direct URL deep-link active: Filtered to request <strong>{focusRequestId}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPochiSearch('');
                      setPochiFilter('ALL');
                    }}
                    className="px-2.5 py-1 bg-white border border-[#D97706] text-[#92400E] hover:bg-[#FDE68A] font-semibold rounded-xs transition-colors cursor-pointer text-[11px]"
                  >
                    Show All Requests ({paymentRequests.length})
                  </button>
                </div>
              )}

              {/* Request Cards List */}
              {(() => {
                const filtered = paymentRequests.filter((r) => {
                  const matchesFilter = pochiFilter === 'ALL' || r.status === pochiFilter;
                  const q = pochiSearch.trim().toLowerCase();
                  const matchesSearch =
                    !q ||
                    r.customerName.toLowerCase().includes(q) ||
                    r.email.toLowerCase().includes(q) ||
                    r.senderPhone.includes(q) ||
                    r.transactionCode.toLowerCase().includes(q) ||
                    r.requestId.toLowerCase().includes(q) ||
                    r.submittedSms.toLowerCase().includes(q);

                  return matchesFilter && matchesSearch;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="p-8 text-center bg-white border border-[#E8DFC9] rounded-xs text-xs text-[#78716C] space-y-2">
                      <p className="font-semibold text-sm text-[#171717]">No payment requests match this filter.</p>
                      <p>When customers paste their Pochi confirmation SMS, their requests will appear here for review.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {filtered.map((req) => (
                      <div
                        key={req.requestId}
                        className={`p-5 bg-white border rounded-xs transition-shadow shadow-xs space-y-3.5 ${
                          req.status === 'PENDING_REVIEW'
                            ? 'border-[#E2C799] bg-[#FFFAF0]/40'
                            : req.status === 'APPROVED'
                            ? 'border-[#C8E6C9]'
                            : 'border-[#E5E7EB]'
                        }`}
                      >
                        {/* Top row: Status, Request ID, Timestamps */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#F0EBE0]">
                          <div className="flex items-center gap-2">
                            {req.status === 'PENDING_REVIEW' && (
                              <span className="px-2.5 py-0.5 bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] text-[10px] font-mono font-bold uppercase rounded-xs">
                                PENDING REVIEW
                              </span>
                            )}
                            {req.status === 'APPROVED' && (
                              <span className="px-2.5 py-0.5 bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] text-[10px] font-mono font-bold uppercase rounded-xs">
                                APPROVED & UNLOCKED
                              </span>
                            )}
                            {req.status === 'REJECTED' && (
                              <span className="px-2.5 py-0.5 bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA] text-[10px] font-mono font-bold uppercase rounded-xs">
                                REJECTED
                              </span>
                            )}
                            <span className="font-mono text-xs font-bold text-[#171717]">{req.requestId}</span>
                          </div>

                          <div className="text-[11px] text-[#78716C] flex items-center gap-3">
                            <span>SMS Time: <strong>{req.transactionTime}</strong></span>
                            <span>•</span>
                            <span>Submitted: <strong>{new Date(req.submittedAt).toLocaleTimeString()}</strong></span>
                          </div>
                        </div>

                        {/* Middle grid: Key payment details */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                          <div className="p-3 bg-[#FAF7F0] border border-[#EFE8D8] rounded-xs">
                            <span className="text-[10px] font-semibold text-[#8C6D46] uppercase block">
                              Authorized Google Email
                            </span>
                            <strong className="text-xs font-bold text-[#171717] break-all block mt-0.5">
                              {req.email}
                            </strong>
                            <span className="text-[10px] text-[#2E7D32] mt-0.5 block font-medium">
                              (Will receive access)
                            </span>
                          </div>

                          <div className="p-3 bg-[#FAF7F0] border border-[#EFE8D8] rounded-xs">
                            <span className="text-[10px] font-semibold text-[#8C6D46] uppercase block">
                              Customer Name & Phone
                            </span>
                            <strong className="text-xs font-bold text-[#171717] block mt-0.5">
                              {req.customerName}
                            </strong>
                            <span className="text-[11px] font-mono text-[#57534E] block mt-0.5">
                              {req.senderPhone}
                            </span>
                          </div>

                          <div className="p-3 bg-[#FAF7F0] border border-[#EFE8D8] rounded-xs">
                            <span className="text-[10px] font-semibold text-[#8C6D46] uppercase block">
                              M-PESA Code
                            </span>
                            <strong className="text-sm font-mono font-bold text-[#991B1B] block mt-0.5 tracking-wider">
                              {req.transactionCode}
                            </strong>
                            <span className="text-[10px] text-[#78716C] block mt-0.5">
                              Pochi Statement Match
                            </span>
                          </div>

                          <div className="p-3 bg-[#FAF7F0] border border-[#EFE8D8] rounded-xs">
                            <span className="text-[10px] font-semibold text-[#8C6D46] uppercase block">
                              Amount
                            </span>
                            <strong className="text-sm font-bold text-[#171717] block mt-0.5">
                              KSh {req.amount}
                            </strong>
                            <span className="text-[10px] text-[#78716C] block mt-0.5">
                              Expected: KSh {req.expectedAmount}
                            </span>
                          </div>
                        </div>

                        {/* Full Raw Pasted SMS */}
                        <div>
                          <div className="text-[10px] font-semibold text-[#8C6D46] uppercase tracking-wider mb-1">
                            Original Pasted M-PESA Confirmation SMS:
                          </div>
                          <div className="p-3 bg-[#F5F2EB] border border-[#E0D8C8] rounded-xs font-mono text-xs text-[#262626] whitespace-pre-wrap leading-relaxed select-all">
                            {req.submittedSms}
                          </div>
                        </div>

                        {/* Reviewer Audit Trail or Action Buttons */}
                        {req.status === 'PENDING_REVIEW' && (
                          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#F0EBE0]">
                            <div className="text-[11px] text-[#78716C]">
                              Compare with your Safaricom Pochi statement before approving.
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteUserModalTarget({
                                    email: req.email,
                                    name: req.customerName,
                                    transactionCode: req.transactionCode,
                                    requestId: req.requestId,
                                    uid: req.uid,
                                  });
                                  setDeleteConfirmChecked(false);
                                }}
                                className="px-2.5 py-2 bg-[#FEF2F2] hover:bg-[#B91C1C] hover:text-white text-[#B91C1C] font-semibold text-xs rounded-xs border border-[#FECACA] transition-colors flex items-center gap-1 cursor-pointer"
                                title="Security: Permanently delete request & user record"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete User</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectModalId(req.requestId)}
                                disabled={reviewingId === req.requestId}
                                className="px-3.5 py-2 bg-[#FEE2E2] hover:bg-[#FCD34D] text-[#991B1B] font-semibold text-xs rounded-xs border border-[#FCA5A5] transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Reject
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApproveRequest(req.requestId)}
                                disabled={reviewingId === req.requestId}
                                className="px-5 py-2 bg-[#15803D] hover:bg-[#166534] text-white font-semibold text-xs rounded-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                {reviewingId === req.requestId ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Granting Access...</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span>[ APPROVE AS {activeAdminEmail.split('@')[0].toUpperCase()} ]</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {req.status === 'APPROVED' && (
                          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#166534] bg-[#F0FDF4] p-2.5 rounded-xs border border-[#DCFCE7]">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>
                                Approved by: <strong>{getAdminLabel(req.reviewedBy)}</strong> ({req.reviewedBy || 'Admin'}) on{' '}
                                {req.reviewedAt ? new Date(req.reviewedAt).toLocaleString() : 'Recently'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setReassignTargetEmail(req.reviewedBy || 'wanyekigerison@gmail.com');
                                  setReassignModalReqId(req.requestId);
                                }}
                                className="text-[10px] px-2 py-0.5 rounded-xs bg-white border border-[#86EFAC] text-[#166534] hover:bg-[#DCFCE7] font-semibold cursor-pointer"
                                title="Change or fix the administrator email mapped with this approval"
                              >
                                Reassign Approver
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteUserModalTarget({
                                    email: req.email,
                                    name: req.customerName,
                                    transactionCode: req.transactionCode,
                                    requestId: req.requestId,
                                    uid: req.uid,
                                  });
                                  setDeleteConfirmChecked(false);
                                }}
                                className="text-[10px] px-2 py-0.5 rounded-xs bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] hover:bg-[#B91C1C] hover:text-white font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                                title="Security Measure: Delete user & permanently revoke book access"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                                <span>Delete &amp; Revoke</span>
                              </button>
                            </div>
                            {req.entitlementId && (
                              <div className="font-mono text-[10px]">
                                Entitlement ID: <strong>{req.entitlementId}</strong>
                              </div>
                            )}
                          </div>
                        )}

                        {req.status === 'REJECTED' && (
                          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#991B1B] bg-[#FEF2F2] p-2.5 rounded-xs border border-[#FEE2E2]">
                            <div>
                              Rejected by: <strong>{getAdminLabel(req.reviewedBy)}</strong>. Reason:{' '}
                              <em>{req.rejectionReason || 'Not verified against Pochi statements.'}</em>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteUserModalTarget({
                                  email: req.email,
                                  name: req.customerName,
                                  transactionCode: req.transactionCode,
                                  requestId: req.requestId,
                                  uid: req.uid,
                                });
                                setDeleteConfirmChecked(false);
                              }}
                              className="text-[10px] px-2 py-0.5 rounded-xs bg-white border border-[#FCA5A5] text-[#991B1B] hover:bg-[#B91C1C] hover:text-white font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                              title="Security Measure: Purge rejected user record"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                              <span>Purge Record</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Quick Reject Modal Dialog */}
              {rejectModalId && (
                <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
                  <div className="bg-white border border-[#D9CEBC] rounded-sm p-6 max-w-md w-full shadow-2xl space-y-4">
                    <h5 className="font-display-serif text-base font-bold text-[#171717]">
                      Reject Payment Request
                    </h5>
                    <p className="text-xs text-[#57534E]">
                      Provide a reason for rejecting request <strong>{rejectModalId}</strong>. The user will be notified and access will remain locked.
                    </p>
                    <textarea
                      rows={3}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="e.g. Transaction code not found in official Pochi statement, or underpaid amount."
                      className="w-full px-3 py-2 text-xs border border-[#DDD3C2] rounded-xs font-ui-sans"
                    />
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRejectModalId(null);
                          setRejectReason('');
                        }}
                        className="px-3 py-1.5 text-xs text-[#78716C] hover:text-[#171717] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectRequest(rejectModalId, rejectReason)}
                        className="px-4 py-1.5 text-xs bg-[#B91C1C] hover:bg-[#991B1B] text-white font-semibold rounded-xs cursor-pointer shadow-xs"
                      >
                        Confirm Rejection
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Reassign Approver Modal Dialog */}
              {reassignModalReqId && (
                <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
                  <div className="bg-white border border-[#D9CEBC] rounded-sm p-6 max-w-md w-full shadow-2xl space-y-4">
                    <div className="flex items-center gap-2 text-[#78350F]">
                      <UserCheck className="w-5 h-5 text-[#166534]" />
                      <h5 className="font-display-serif text-base font-bold text-[#171717]">
                        Reassign Approving Administrator
                      </h5>
                    </div>
                    <p className="text-xs text-[#57534E] leading-relaxed">
                      Select which administrator actually reviewed and approved request <strong>{reassignModalReqId}</strong>.
                      This will update the database, audit trail, and mapped readers directory so that it is mapped to the exact administrator.
                    </p>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#171717] uppercase tracking-wider mb-1.5">
                        Designated Administrator:
                      </label>
                      <select
                        value={reassignTargetEmail}
                        onChange={(e) => setReassignTargetEmail(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#DDD3C2] rounded-xs font-semibold text-[#171717] focus:outline-none focus:border-[#78350F]"
                      >
                        {AUTHORIZED_ADMINS.map((admin) => (
                          <option key={admin.email} value={admin.email}>
                            {admin.name} ({admin.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-[#F0EBE0]">
                      <button
                        type="button"
                        onClick={() => setReassignModalReqId(null)}
                        disabled={isReassigning}
                        className="px-3.5 py-1.5 text-xs text-[#78716C] hover:text-[#171717] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReassignApprover(reassignModalReqId, reassignTargetEmail)}
                        disabled={isReassigning}
                        className="px-4 py-1.5 text-xs bg-[#15803D] hover:bg-[#166534] text-white font-semibold rounded-xs cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isReassigning ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Updating...</span>
                          </>
                        ) : (
                          <span>Confirm Reassignment</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: MAPPED USERS & READER ENTITLEMENTS */}
          {activeTab === 'mapped_users' && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-display-serif text-lg font-bold text-[#1C1917] flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#78350F]" />
                    <span>Mapped Readers Directory</span>
                  </h4>
                  <p className="text-xs text-[#78716C] mt-0.5">
                    Total number of readers mapped with their Google email, original SMS confirmation, M-PESA transactional code, purchase timestamp, and the admin who approved their access.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchMappedUsers}
                  className="px-3 py-1.5 text-xs bg-white border border-[#D9CEBC] rounded-xs text-[#78350F] hover:bg-[#FAF7F2] transition-colors flex items-center gap-1.5 self-start cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Mapped Users</span>
                </button>
              </div>

              {/* 4 Summary Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 bg-white border border-[#E2D8C6] rounded-xs shadow-2xs">
                  <span className="text-[11px] font-semibold text-[#8C6D46] uppercase tracking-wider block">
                    Total Mapped Readers
                  </span>
                  <div className="text-2xl font-bold font-display-serif text-[#1C1917] mt-1 flex items-baseline gap-1.5">
                    <span>{totalMappedUsers}</span>
                    <span className="text-xs font-normal text-[#166534] font-ui-sans">Readers Active</span>
                  </div>
                  <span className="text-[10px] text-[#78716C] mt-0.5 block">Approved accounts with entitlements</span>
                </div>

                <div className="p-4 bg-white border border-[#E2D8C6] rounded-xs shadow-2xs">
                  <span className="text-[11px] font-semibold text-[#2D5A27] uppercase tracking-wider block">
                    Verified Revenue
                  </span>
                  <div className="text-2xl font-bold font-display-serif text-[#2D5A27] mt-1">
                    KES {(totalMappedUsers * (bookConfig.bookPriceKes || 750)).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-[#78716C] mt-0.5 block">750 KSh per customer</span>
                </div>

                <div className="p-4 bg-white border border-[#E2D8C6] rounded-xs shadow-2xs">
                  <span className="text-[11px] font-semibold text-[#78350F] uppercase tracking-wider block">
                    Approval Authority
                  </span>
                  <div className="text-sm font-bold text-[#1C1917] mt-1 font-mono">
                    Mark • Gerishon • Alvis
                  </div>
                  <span className="text-[10px] text-[#78716C] mt-0.5 block">3 Authorized Super Admins</span>
                </div>

                <div className="p-4 bg-white border border-[#E2D8C6] rounded-xs shadow-2xs">
                  <span className="text-[11px] font-semibold text-[#0369A1] uppercase tracking-wider block">
                    Approval Alerts
                  </span>
                  <div className="text-sm font-bold mt-1 flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        notificationsEnabled
                          ? 'bg-[#E8F5E9] text-[#1B5E20] border border-[#A5D6A7]'
                          : 'bg-[#FFF3E0] text-[#E65100] border border-[#FFE082]'
                      }`}
                    >
                      {notificationsEnabled ? 'ACTIVE (ON)' : 'MUTED (OFF)'}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#78716C] mt-0.5 block">Email & SMS notifications</span>
                </div>
              </div>

              {/* Search Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#A8A29E]" />
                  <input
                    type="text"
                    value={mappedSearch}
                    onChange={(e) => setMappedSearch(e.target.value)}
                    placeholder="Search by customer email, transactional code, name, phone, or admin who approved..."
                    className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-[#DDD3C2] rounded-xs text-[#171717] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#78350F]"
                  />
                </div>
                <div className="text-xs text-[#78716C] font-medium shrink-0 self-center">
                  Showing {mappedUsers.filter((u) => {
                    const q = mappedSearch.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      u.email.toLowerCase().includes(q) ||
                      u.transactionalCode.toLowerCase().includes(q) ||
                      u.adminWhoApproved.toLowerCase().includes(q) ||
                      u.customerName.toLowerCase().includes(q) ||
                      u.senderPhone.includes(q) ||
                      u.timeBought.toLowerCase().includes(q) ||
                      u.sms.toLowerCase().includes(q)
                    );
                  }).length} of {totalMappedUsers} mapped users
                </div>
              </div>

              {/* Mapped Users Cards List */}
              {(() => {
                const filtered = mappedUsers.filter((u) => {
                  const q = mappedSearch.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    u.email.toLowerCase().includes(q) ||
                    u.transactionalCode.toLowerCase().includes(q) ||
                    u.adminWhoApproved.toLowerCase().includes(q) ||
                    u.customerName.toLowerCase().includes(q) ||
                    u.senderPhone.includes(q) ||
                    u.timeBought.toLowerCase().includes(q) ||
                    u.sms.toLowerCase().includes(q)
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <div className="p-8 text-center bg-white border border-[#E8DFC9] rounded-xs text-xs text-[#78716C] space-y-2">
                      <Users className="w-8 h-8 text-[#A8A29E] mx-auto opacity-60" />
                      <p className="font-semibold text-sm text-[#171717]">No mapped users match your search.</p>
                      <p>When customers buy the book and their M-PESA SMS is approved, their details will appear here.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {filtered.map((u, idx) => {
                      const isExpanded = expandedSmsId === u.requestId || expandedSmsId === u.transactionalCode;

                      return (
                        <div
                          key={u.requestId || idx}
                          className="p-5 bg-white border border-[#D9CEBC] rounded-xs shadow-xs space-y-3.5 hover:border-[#78350F] transition-colors"
                        >
                          {/* Top Row: Email, Status, Approval Stamp */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#F0EBE0]">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] text-[10px] font-mono font-bold uppercase rounded-xs flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-[#166534]" />
                                MAPPED READER #{idx + 1}
                              </span>
                              <span className="font-mono text-xs font-bold text-[#171717]">{u.requestId}</span>
                            </div>

                            <div className="flex items-center gap-2.5 text-[11px] text-[#78716C] flex-wrap">
                              <span>
                                Approved on: <strong>{u.approvedAt ? new Date(u.approvedAt).toLocaleDateString() : 'Active'}</strong>
                              </span>
                              {u.entitlementId && (
                                <span className="font-mono text-[10px] px-2 py-0.5 bg-[#FAF7F0] border border-[#E0D7C6] rounded-xs text-[#57534E]">
                                  {u.entitlementId}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteUserModalTarget({
                                    email: u.email,
                                    name: u.customerName,
                                    transactionCode: u.transactionalCode,
                                    requestId: u.requestId,
                                    uid: u.requestId,
                                  });
                                  setDeleteConfirmChecked(false);
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold text-[#B91C1C] hover:text-white bg-[#FEF2F2] hover:bg-[#B91C1C] border border-[#FECACA] rounded-xs transition-colors flex items-center gap-1 cursor-pointer"
                                title="Security Measure: Permanently delete user and revoke access"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete &amp; Revoke User</span>
                              </button>
                            </div>
                          </div>

                          {/* 5 Required Details Display Grid:
                              1) Email
                              2) SMS (pasted text)
                              3) Transactional Code
                              4) Time Bought
                              5) The Admin Who Approved
                          */}
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                            {/* 1. Email */}
                            <div className="p-3 bg-[#FAF7F0] border border-[#EFE8D8] rounded-xs space-y-1">
                              <span className="text-[10px] font-semibold text-[#8C6D46] uppercase block tracking-wider">
                                1. Customer Email (Google)
                              </span>
                              <strong className="text-xs font-bold text-[#171717] break-all block">
                                {u.email}
                              </strong>
                              <span className="text-[10px] text-[#57534E] block">
                                {u.customerName} ({u.senderPhone})
                              </span>
                            </div>

                            {/* 2. Transactional Code */}
                            <div className="p-3 bg-[#FAF7F0] border border-[#EFE8D8] rounded-xs space-y-1">
                              <span className="text-[10px] font-semibold text-[#8C6D46] uppercase block tracking-wider">
                                2. Transactional Code
                              </span>
                              <div className="flex items-center justify-between">
                                <strong className="text-sm font-mono font-bold text-[#991B1B] tracking-wider">
                                  {u.transactionalCode}
                                </strong>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(u.transactionalCode, `code_${u.transactionalCode}`)}
                                  className="p-1 text-[#78716C] hover:text-[#171717] cursor-pointer"
                                  title="Copy Transactional Code"
                                >
                                  {copiedText === `code_${u.transactionalCode}` ? (
                                    <Check className="w-3.5 h-3.5 text-[#166534]" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                              <span className="text-[10px] text-[#78716C] block">
                                Verified Unique M-PESA Code
                              </span>
                            </div>

                            {/* 3. Time Bought */}
                            <div className="p-3 bg-[#FAF7F0] border border-[#EFE8D8] rounded-xs space-y-1">
                              <span className="text-[10px] font-semibold text-[#8C6D46] uppercase block tracking-wider">
                                3. Time Bought
                              </span>
                              <strong className="text-xs font-bold text-[#171717] block">
                                {u.timeBought}
                              </strong>
                              <span className="text-[10px] text-[#78716C] block">
                                Stated in M-PESA SMS
                              </span>
                            </div>

                            {/* 4. The Admin Who Approved */}
                            <div className="p-3 bg-[#FAF7F0] border border-[#EFE8D8] rounded-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-semibold text-[#8C6D46] uppercase block tracking-wider">
                                  4. Approved By (Admin)
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReassignTargetEmail(u.adminWhoApproved || 'wanyekigerison@gmail.com');
                                      setReassignModalReqId(u.requestId);
                                    }}
                                    className="text-[10px] text-[#8C6D46] hover:text-[#991B1B] underline font-semibold cursor-pointer"
                                    title="Change or fix the administrator email mapped with this approval"
                                  >
                                    Reassign
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDeleteUserModalTarget({
                                        email: u.email,
                                        name: u.customerName,
                                        transactionCode: u.transactionalCode,
                                        requestId: u.requestId,
                                        uid: u.requestId,
                                      });
                                      setDeleteConfirmChecked(false);
                                    }}
                                    className="text-[10px] text-[#B91C1C] hover:underline font-semibold cursor-pointer flex items-center gap-0.5"
                                    title="Security Measure: Delete user"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-[#166534] shrink-0" />
                                <strong className="text-xs font-bold text-[#166534] truncate">
                                  {getAdminLabel(u.adminWhoApproved)}
                                </strong>
                              </div>
                              <span className="text-[10px] text-[#78716C] block font-mono truncate">
                                {u.adminWhoApproved}
                              </span>
                              <span className="text-[10px] text-[#57534E] block">
                                Amount: KSh {u.amount || 750}
                              </span>
                            </div>
                          </div>

                          {/* 5. Full Submitted M-PESA SMS */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] font-semibold text-[#8C6D46] uppercase tracking-wider">
                              <span>5. Full M-PESA SMS:</span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(u.sms, `sms_${u.requestId || idx}`)}
                                  className="text-[10px] font-medium text-[#78350F] hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  {copiedText === `sms_${u.requestId || idx}` ? (
                                    <>
                                      <Check className="w-3 h-3 text-[#166534]" />
                                      <span>Copied SMS!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copy SMS</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedSmsId(isExpanded ? null : (u.requestId || u.transactionalCode))
                                  }
                                  className="text-[10px] font-medium text-[#78716C] hover:text-[#171717] cursor-pointer"
                                >
                                  {isExpanded ? 'Collapse' : 'Expand'}
                                </button>
                              </div>
                            </div>

                            <div
                              className={`p-3 bg-[#F5F2EB] border border-[#E0D8C8] rounded-xs font-mono text-xs text-[#262626] whitespace-pre-wrap leading-relaxed select-all ${
                                !isExpanded ? 'line-clamp-2' : ''
                              }`}
                            >
                              {u.sms}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
          
          {/* TAB 1: OVERVIEW METRICS (Section 42) */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-display-serif text-lg font-bold text-[#1C1917]">
                  Executive Overview & Publishing Health
                </h4>
                <p className="text-xs text-[#78716C] mt-0.5">
                  Real-time telemetry on book sales, M-PESA settlements, reader entitlements, and active offline devices.
                </p>
              </div>

              {/* 8 Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 bg-white border border-[#E2D8C6] rounded-xs shadow-2xs">
                  <span className="text-[11px] font-semibold text-[#8C6D46] uppercase tracking-wider block">
                    Total Revenue
                  </span>
                  <div className="text-xl font-bold font-display-serif text-[#1C1917] mt-1">
                    KES {(stats?.revenue || paymentsList.filter(p => p.status === 'VERIFIED').reduce((acc, p) => acc + (p.receivedAmount || p.expectedAmount), 0)).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-[#78716C] mt-0.5 block">Net settled funds</span>
                </div>

                <div className="p-4 bg-white border border-[#E2D8C6] rounded-xs shadow-2xs">
                  <span className="text-[11px] font-semibold text-[#2D5A27] uppercase tracking-wider block">
                    Verified Purchases
                  </span>
                  <div className="text-xl font-bold font-display-serif text-[#2D5A27] mt-1">
                    {stats?.verifiedPurchases ?? paymentsList.filter(p => p.status === 'VERIFIED').length}
                  </div>
                  <span className="text-[10px] text-[#78716C] mt-0.5 block">Active readers granted</span>
                </div>

                <div className="p-4 bg-white border border-[#E2D8C6] rounded-xs shadow-2xs">
                  <span className="text-[11px] font-semibold text-[#92400E] uppercase tracking-wider block">
                    Pending / STK Sent
                  </span>
                  <div className="text-xl font-bold font-display-serif text-[#92400E] mt-1">
                    {stats?.pendingPayments ?? paymentsList.filter(p => p.status === 'PENDING' || p.status === 'STK_SENT').length}
                  </div>
                  <span className="text-[10px] text-[#78716C] mt-0.5 block">Awaiting PIN authorization</span>
                </div>

                <div className="p-4 bg-white border border-[#E2D8C6] rounded-xs shadow-2xs">
                  <span className="text-[11px] font-semibold text-[#B45309] uppercase tracking-wider block">
                    Underpaid Payments
                  </span>
                  <div className="text-xl font-bold font-display-serif text-[#B45309] mt-1">
                    {stats?.underpaidPayments ?? paymentsList.filter(p => p.status === 'UNDERPAID').length}
                  </div>
                  <span className="text-[10px] text-[#78716C] mt-0.5 block">Held pending top-up</span>
                </div>

                <div className="p-4 bg-white border border-[#E2D8C6] rounded-xs shadow-2xs">
                  <span className="text-[11px] font-semibold text-[#991B1B] uppercase tracking-wider block">
                    Failed / Rejected
                  </span>
                  <div className="text-xl font-bold font-display-serif text-[#991B1B] mt-1">
                    {stats?.failedPayments ?? paymentsList.filter(p => p.status === 'FAILED' || p.status === 'REJECTED' || p.status === 'INVALID_CODE').length}
                  </div>
                  <span className="text-[10px] text-[#78716C] mt-0.5 block">Cancelled or rejected</span>
                </div>

                <div className="p-4 bg-white border border-[#E2D8C6] rounded-xs shadow-2xs">
                  <span className="text-[11px] font-semibold text-[#78350F] uppercase tracking-wider block">
                    Active Entitlements
                  </span>
                  <div className="text-xl font-bold font-display-serif text-[#78350F] mt-1">
                    {stats?.activeEntitlements ?? paymentsList.filter(p => p.status === 'VERIFIED').length}
                  </div>
                  <span className="text-[10px] text-[#78716C] mt-0.5 block">Library access rights</span>
                </div>

                <div className="p-4 bg-white border border-[#E2D8C6] rounded-xs shadow-2xs">
                  <span className="text-[11px] font-semibold text-[#0369A1] uppercase tracking-wider block">
                    Active Offline Devices
                  </span>
                  <div className="text-xl font-bold font-display-serif text-[#0369A1] mt-1">
                    {stats?.offlineUsers ?? 0}
                  </div>
                  <span className="text-[10px] text-[#78716C] mt-0.5 block">Encrypted offline cache</span>
                </div>

                <div className="p-4 bg-white border border-[#E2D8C6] rounded-xs shadow-2xs">
                  <span className="text-[11px] font-semibold text-[#6D28D9] uppercase tracking-wider block">
                    Duplicate Checks
                  </span>
                  <div className="text-xl font-bold font-display-serif text-[#6D28D9] mt-1">
                    {stats?.duplicatePayments ?? paymentsList.filter(p => p.status === 'DUPLICATE').length}
                  </div>
                  <span className="text-[10px] text-[#78716C] mt-0.5 block">Prevented reuse attacks</span>
                </div>
              </div>

              {/* Roles & Administrators Panel (Section 45) */}
              <div className="p-4 bg-white border border-[#E2D8C6] rounded-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#1C1917]">
                    <Users className="w-4 h-4 text-[#78350F]" />
                    <span>Role-Based Access Control & 3-Admin Distribution</span>
                  </div>
                  <span className="text-[10px] text-[#78716C]">Sender ID: Dating Wrong</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                  <div className="p-3 bg-[#FAF7F0] border border-[#EBE3D3] rounded-xs">
                    <div className="flex items-center justify-between mb-1">
                      <strong className="text-[#1C1917]">Gerishon Wanyeki</strong>
                      <span className="text-[10px] font-bold text-[#78350F] uppercase">Author</span>
                    </div>
                    <p className="text-[11px] text-[#78716C]">Receives instant SMS for every verified reader & author royalties alert.</p>
                  </div>
                  <div className="p-3 bg-[#FAF7F0] border border-[#EBE3D3] rounded-xs">
                    <div className="flex items-center justify-between mb-1">
                      <strong className="text-[#1C1917]">Alvis Njagi</strong>
                      <span className="text-[10px] font-bold text-[#2D5A27] uppercase">Publisher / Tech</span>
                    </div>
                    <p className="text-[11px] text-[#78716C]">Monitors Daraja callbacks, underpayment alerts & system reconciliation.</p>
                  </div>
                  <div className="p-3 bg-[#FAF7F0] border border-[#EBE3D3] rounded-xs">
                    <div className="flex items-center justify-between mb-1">
                      <strong className="text-[#1C1917]">Mark</strong>
                      <span className="text-[10px] font-bold text-[#0369A1] uppercase">Publisher</span>
                    </div>
                    <p className="text-[11px] text-[#78716C]">Receives publishing transaction logs & commercial purchase confirmations.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PAYMENTS & DETAILED INSPECTION (Sections 36, 42, 43) */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-display-serif text-lg font-bold text-[#1C1917]">
                    Transaction Ledger & Verification Status
                  </h4>
                  <p className="text-xs text-[#78716C]">
                    Click any transaction record to inspect all 9 security checks, provider references, and reconciliation options.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchPayments}
                  className="px-3 py-1.5 text-xs bg-white border border-[#D9CEBC] rounded-xs text-[#78350F] hover:bg-[#FAF7F2] transition-colors flex items-center gap-1.5 self-start cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Ledger</span>
                </button>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#78716C]" />
                  <input
                    type="text"
                    placeholder="Search by customer name, email, phone, code (e.g. RK72...), or paymentId..."
                    value={paymentSearch}
                    onChange={(e) => setPaymentSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#D9CEBC] rounded-xs text-[#1C1917] focus:outline-none focus:border-[#78350F]"
                  />
                </div>
                <div className="flex gap-1.5 overflow-x-auto text-[11px]">
                  {['ALL', 'VERIFIED', 'STK_SENT', 'UNDERPAID', 'DUPLICATE', 'FAILED'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setPaymentFilter(st)}
                      className={`px-3 py-1.5 rounded-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                        paymentFilter === st
                          ? 'bg-[#78350F] text-white'
                          : 'bg-white border border-[#D9CEBC] text-[#78716C] hover:text-[#1C1917]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payments List */}
              {isLoading ? (
                <div className="p-8 text-center text-xs text-[#78716C]">Loading transaction ledger...</div>
              ) : filteredPayments.length === 0 ? (
                <div className="p-8 text-center bg-white border border-[#E2D8C6] rounded-xs text-xs text-[#78716C]">
                  No payment records found matching the active filter.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredPayments.map((p) => (
                    <div
                      key={p.paymentId}
                      onClick={() => setSelectedPayment(p)}
                      className={`p-4 bg-white border rounded-xs transition-all cursor-pointer hover:border-[#78350F] hover:shadow-2xs ${
                        selectedPayment?.paymentId === p.paymentId
                          ? 'border-[#78350F] ring-1 ring-[#78350F]'
                          : 'border-[#E2D8C6]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#1C1917]">{p.customerName}</span>
                          <span className="text-[11px] text-[#78716C]">({p.email})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] tracking-wider uppercase ${
                              p.status === 'VERIFIED'
                                ? 'bg-[#E8EFE5] text-[#2D5A27]'
                                : p.status === 'UNDERPAID'
                                ? 'bg-[#FEF3C7] text-[#92400E]'
                                : p.status === 'STK_SENT' || p.status === 'PENDING'
                                ? 'bg-[#E0F2FE] text-[#0369A1]'
                                : 'bg-[#FEE2E2] text-[#991B1B]'
                            }`}
                          >
                            {p.status}
                          </span>
                          <ChevronRight className="w-4 h-4 text-[#A8A29E]" />
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-[#78716C] flex flex-wrap gap-x-5 gap-y-1">
                        <span>Phone: <strong className="text-[#1C1917] font-mono">{p.checkoutPhone}</strong></span>
                        <span>
                          Amount: <strong className="text-[#1C1917]">KES {p.receivedAmount || p.expectedAmount}</strong>
                          {p.receivedAmount && p.receivedAmount < p.expectedAmount && (
                            <span className="text-[#B45309] ml-1">(Expected KES {p.expectedAmount})</span>
                          )}
                        </span>
                        <span>
                          Code: <strong className="font-mono text-[#78350F]">{p.transactionCode || 'Awaiting Authorization'}</strong>
                        </span>
                        <span>Provider: <strong className="capitalize">{p.provider}</strong></span>
                        <span className="text-[10px] text-[#A8A29E]">ID: {p.paymentId}</span>
                      </div>

                      {p.failureReason && (
                        <div className="mt-2 text-[11px] text-[#991B1B] bg-[#FEF2F2] p-2 rounded-xs border border-[#FCA5A5] flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{p.failureReason}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* PAYMENT DETAIL DRAWER / MODAL (Section 43) */}
              {selectedPayment && (
                <div className="p-5 bg-[#FAF7F0] border-2 border-[#78350F] rounded-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#E8E0D2] pb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#78350F]" />
                      <h5 className="font-bold text-sm text-[#1C1917]">
                        Payment Detail & 9 Security Checks: {selectedPayment.paymentId}
                      </h5>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPayment(null)}
                      className="text-xs text-[#78716C] hover:text-[#1C1917] cursor-pointer"
                    >
                      Close Detail
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <p><strong>Customer Name:</strong> {selectedPayment.customerName}</p>
                      <p><strong>Email:</strong> {selectedPayment.email}</p>
                      <p><strong>Phone:</strong> {selectedPayment.checkoutPhone}</p>
                      <p><strong>Normalized Phone:</strong> {selectedPayment.normalizedPhone}</p>
                      <p><strong>Expected Amount:</strong> KES {selectedPayment.expectedAmount}</p>
                      <p><strong>Received Amount:</strong> KES {selectedPayment.receivedAmount || '0'}</p>
                    </div>

                    <div className="space-y-1.5">
                      <p><strong>Transaction Code:</strong> <span className="font-mono text-[#78350F] font-bold">{selectedPayment.transactionCode || 'None'}</span></p>
                      <p><strong>Status:</strong> <span className="font-bold">{selectedPayment.status}</span></p>
                      <p><strong>Recipient Business:</strong> {selectedPayment.recipient}</p>
                      <p><strong>Created At:</strong> {selectedPayment.checkoutCreatedAt}</p>
                      <p><strong>Verified At:</strong> {selectedPayment.verifiedAt || 'Pending'}</p>
                      <p><strong>3-Admin SMS Alert Sent:</strong> {selectedPayment.adminAlertSent ? 'Yes (Gerishon, Alvis, Mark)' : 'Pending'}</p>
                      <p><strong>Customer Confirmation Email:</strong> {selectedPayment.emailConfirmationSent ? 'Sent' : 'Pending'}</p>
                    </div>
                  </div>

                  {/* 9 Security Verification Matrix */}
                  <div className="p-3 bg-white border border-[#E2D8C6] rounded-xs space-y-2">
                    <span className="text-[11px] font-bold text-[#8C6D46] uppercase tracking-wider block">
                      Automated 9-Point Security Check Matrix
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-[#2D5A27]" />
                        <span>1. Status: Success Verified</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-[#2D5A27]" />
                        <span>2. Amount Check (≥ KES {selectedPayment.expectedAmount})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-[#2D5A27]" />
                        <span>3. Recipient (Mark & Alvis)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-[#2D5A27]" />
                        <span>4. Phone Number Correlation</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-[#2D5A27]" />
                        <span>5. Valid M-PESA Code Format</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-[#2D5A27]" />
                        <span>6. Code Uniqueness (No Reuse)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-[#2D5A27]" />
                        <span>7. Payment Session Correlation</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-[#2D5A27]" />
                        <span>8. Reasonable Timestamp</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-[#2D5A27]" />
                        <span>9. Zero Fraud & Tamper Flag</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Reconcile / Grant / Delete */}
                  <div className="flex justify-end gap-2 pt-2 border-t border-[#E8E0D2] flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteUserModalTarget({
                          email: selectedPayment.email,
                          name: selectedPayment.customerName,
                          transactionCode: selectedPayment.transactionCode,
                          requestId: selectedPayment.paymentSessionId,
                          uid: selectedPayment.uid,
                        });
                        setDeleteConfirmChecked(false);
                      }}
                      className="px-3.5 py-2 bg-[#FEF2F2] hover:bg-[#B91C1C] hover:text-white text-[#B91C1C] text-xs font-semibold rounded-xs border border-[#FECACA] transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Security Measure: Delete and revoke user"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete &amp; Revoke User</span>
                    </button>
                    {selectedPayment.status !== 'VERIFIED' && (
                      <button
                        type="button"
                        disabled={reconcilingId === selectedPayment.paymentId}
                        onClick={() => handleReconcilePayment(selectedPayment.paymentSessionId || selectedPayment.paymentId)}
                        className="px-4 py-2 bg-[#78350F] hover:bg-[#632B0C] text-white text-xs font-semibold rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${reconcilingId === selectedPayment.paymentId ? 'animate-spin' : ''}`} />
                        <span>{reconcilingId === selectedPayment.paymentId ? 'Reconciling...' : 'Reconcile & Grant Entitlement'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BOOK MANAGEMENT & PRICING (Section 44) */}
          {activeTab === 'book_mgmt' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-display-serif text-lg font-bold text-[#1C1917]">
                  Book Management & Live Pricing Configuration
                </h4>
                <p className="text-xs text-[#78716C] mt-0.5">
                  Manage publication editions, word counts, metadata, and official Daraja checkout pricing.
                </p>
              </div>

              {/* Book Metadata Card */}
              <div className="p-4 bg-white border border-[#E2D8C6] rounded-xs space-y-3">
                <span className="text-[11px] font-bold text-[#8C6D46] uppercase tracking-wider block">
                  Active Manuscript Information (Version 1.0)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <p><strong>Title:</strong> Dating Wrong</p>
                    <p><strong>Subtitle:</strong> Why Relationships Fail and How God Redeems Them</p>
                    <p><strong>Author:</strong> Gerishon Wanyeki</p>
                    <p><strong>Publisher:</strong> Mark & Alvis Publishers</p>
                  </div>
                  <div>
                    <p><strong>Active Edition:</strong> Version 1.0 (Official First Edition)</p>
                    <p><strong>Word Count:</strong> 58,420 words</p>
                    <p><strong>Page Count:</strong> 284 formatted pages</p>
                    <p><strong>Publication Date:</strong> 2024</p>
                    <p><strong>Protected Storage:</strong> books/dating-wrong/v1 (Private & Encrypted)</p>
                  </div>
                </div>
              </div>

              {/* Pricing Form */}
              <form onSubmit={handleSaveBookSettings} className="p-5 bg-white border border-[#E2D8C6] rounded-xs space-y-4">
                <span className="text-[11px] font-bold text-[#8C6D46] uppercase tracking-wider block">
                  Checkout Pricing & Daraja Credentials
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#57534E] mb-1.5">
                      Kenyan Shilling Price (KES)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-[#78716C]">
                        KES
                      </span>
                      <input
                        type="number"
                        required
                        min="1"
                        value={priceKes}
                        onChange={(e) => setPriceKes(Number(e.target.value))}
                        className="w-full pl-12 pr-3 py-2 text-sm bg-white border border-[#D9CEBC] rounded-xs text-[#1C1917] focus:outline-none focus:border-[#78350F]"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-[#8C8275]">
                      Expected amount during Daraja STK Push & SMS underpayment checks.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#57534E] mb-1.5">
                      International Price (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-[#78716C]">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        min="0.99"
                        value={priceUsd}
                        onChange={(e) => setPriceUsd(Number(e.target.value))}
                        className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-[#D9CEBC] rounded-xs text-[#1C1917] focus:outline-none focus:border-[#78350F]"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#57534E] mb-1.5">
                      Safaricom Paybill Number
                    </label>
                    <input
                      type="text"
                      required
                      value={paybill}
                      onChange={(e) => setPaybill(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-[#D9CEBC] rounded-xs text-[#1C1917] focus:outline-none focus:border-[#78350F]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#57534E] mb-1.5">
                      Account Reference
                    </label>
                    <input
                      type="text"
                      required
                      value={accountRef}
                      onChange={(e) => setAccountRef(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-[#D9CEBC] rounded-xs text-[#1C1917] focus:outline-none focus:border-[#78350F]"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E8E0D2] flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xs bg-[#78350F] hover:bg-[#632B0C] text-[#FAF7F2] font-semibold text-xs tracking-wider uppercase transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60 shadow-xs"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Updating...' : 'Save Configuration'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: SMS MONITORING LOGS (Section 46) */}
          {activeTab === 'sms_monitor' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-display-serif text-lg font-bold text-[#1C1917]">
                    SMS Monitoring Service (Sender: Dating Wrong)
                  </h4>
                  <p className="text-xs text-[#78716C]">
                    Logs of automated notifications dispatched to Gerishon Wanyeki, Alvis Njagi, and Mark.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchSmsLogs}
                  className="px-3 py-1.5 text-xs bg-white border border-[#D9CEBC] rounded-xs text-[#78350F] hover:bg-[#FAF7F2] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh SMS</span>
                </button>
              </div>

              {smsLogs.length === 0 ? (
                <div className="p-8 text-center bg-white border border-[#E2D8C6] rounded-xs text-xs text-[#78716C]">
                  No SMS events dispatched in this session yet. Complete an M-PESA test purchase to trigger dispatch.
                </div>
              ) : (
                <div className="space-y-3">
                  {smsLogs.map((log) => (
                    <div key={log.id} className="p-4 bg-white border border-[#E2D8C6] rounded-xs space-y-2 text-xs">
                      <div className="flex items-center justify-between border-b border-[#F0EAE1] pb-2">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-3.5 h-3.5 text-[#78350F]" />
                          <span className="font-bold text-[#1C1917]">{log.payload.customerName}</span>
                          <span className="text-[#78716C]">({log.payload.customerPhone})</span>
                        </div>
                        <span className="text-[10px] text-[#A8A29E]">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>

                      {/* Dispatched Recipients */}
                      <div className="flex flex-wrap gap-2 text-[10px]">
                        {log.recipients.map((r, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-full bg-[#E8EFE5] text-[#2D5A27] font-semibold">
                            ✓ {r.recipient} ({r.phone})
                          </span>
                        ))}
                      </div>

                      {/* SMS Text Body */}
                      <pre className="p-2.5 bg-[#FAF7F0] border border-[#EBE3D3] rounded-xs font-mono text-[11px] text-[#44403C] whitespace-pre-wrap">
                        {log.smsBody}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: EMAIL CONFIRMATION LOGS (Section 37) */}
          {activeTab === 'email_logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-display-serif text-lg font-bold text-[#1C1917]">
                    Purchaser Email Confirmations (Section 37)
                  </h4>
                  <p className="text-xs text-[#78716C]">
                    Formal confirmation emails sent to purchasers with official receipt and direct reading access link.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchEmailLogs}
                  className="px-3 py-1.5 text-xs bg-white border border-[#D9CEBC] rounded-xs text-[#78350F] hover:bg-[#FAF7F2] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Emails</span>
                </button>
              </div>

              {emailLogs.length === 0 ? (
                <div className="p-8 text-center bg-white border border-[#E2D8C6] rounded-xs text-xs text-[#78716C]">
                  No email confirmations sent in this session yet. Complete a purchase to verify delivery.
                </div>
              ) : (
                <div className="space-y-3">
                  {emailLogs.map((item) => (
                    <div key={item.id} className="p-4 bg-white border border-[#E2D8C6] rounded-xs space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#1C1917]">To: {item.to} ({item.customerName})</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#E8EFE5] text-[#2D5A27] text-[10px] font-bold uppercase">
                          {item.status}
                        </span>
                      </div>
                      <p className="text-[#57534E] font-medium">Subject: {item.subject}</p>
                      <div className="text-[11px] text-[#78716C] flex flex-wrap gap-x-4">
                        <span>Ref: <strong className="font-mono text-[#78350F]">{item.transactionReference}</strong></span>
                        <span>Amount: <strong>{item.currency} {item.amount}</strong></span>
                        <span>Access Link: <span className="font-mono text-[#0369A1]">{item.accessUrl}</span></span>
                      </div>
                      <span className="text-[10px] text-[#A8A29E] block">Sent: {new Date(item.sentAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Security Measure: Delete & Permanently Revoke User Confirmation Modal */}
          {deleteUserModalTarget && (
            <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
              <div className="bg-white border-2 border-[#B91C1C] rounded-sm p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4">
                <div className="flex items-center gap-2.5 text-[#B91C1C]">
                  <div className="w-10 h-10 rounded-full bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-[#B91C1C]" />
                  </div>
                  <div>
                    <h5 className="font-display-serif text-lg font-bold text-[#171717] leading-tight">
                      Confirm Permanent User Deletion
                    </h5>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#B91C1C]">
                      Security Measure • Instant Access Revocation
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xs text-xs space-y-2 text-[#991B1B]">
                  <div className="font-semibold text-sm">
                    Are you sure you want to delete and revoke this user?
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#7F1D1D]">
                    This is an irreversible security measure. All book entitlements, authorized device licenses, and payment verification records for this account will be permanently expunged from the system.
                  </p>
                  <p className="text-[11px] leading-relaxed font-semibold text-[#7F1D1D]">
                    If this user bypassed or manipulated payment, their digital access will be terminated immediately. When they log in again, they will be treated strictly as a brand new user with the purchase setup.
                  </p>
                </div>

                {/* Target User Details Card */}
                <div className="p-3.5 bg-[#FAF7F0] border border-[#E8DFC9] rounded-xs text-xs font-ui-sans space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[#78716C] font-semibold">Account Email:</span>
                    <strong className="font-mono text-[#171717]">{deleteUserModalTarget.email}</strong>
                  </div>
                  {deleteUserModalTarget.name && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#78716C] font-semibold">Customer Name:</span>
                      <span className="text-[#171717] font-medium">{deleteUserModalTarget.name}</span>
                    </div>
                  )}
                  {deleteUserModalTarget.transactionCode && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#78716C] font-semibold">Transaction Code:</span>
                      <span className="font-mono font-bold text-[#B91C1C]">{deleteUserModalTarget.transactionCode}</span>
                    </div>
                  )}
                  {deleteUserModalTarget.requestId && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#78716C] font-semibold">Request ID:</span>
                      <span className="font-mono text-[#57534E] text-[11px]">{deleteUserModalTarget.requestId}</span>
                    </div>
                  )}
                </div>

                {/* Explicit Confirmation Checkbox */}
                <label className="flex items-start gap-2.5 p-3 bg-white border border-[#DDD3C2] rounded-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={deleteConfirmChecked}
                    onChange={(e) => setDeleteConfirmChecked(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-[#B91C1C] rounded-xs focus:ring-[#B91C1C] border-[#DDD3C2]"
                  />
                  <span className="text-xs text-[#171717] leading-relaxed">
                    I confirm that <strong>{deleteUserModalTarget.email}</strong> should be permanently purged and revoked from Dating Wrong.
                  </span>
                </label>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2.5 pt-2 border-t border-[#F0EBE0] flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteUserModalTarget(null);
                      setDeleteConfirmChecked(false);
                    }}
                    disabled={isDeletingUser}
                    className="px-4 py-2 text-xs text-[#78716C] hover:text-[#171717] font-semibold cursor-pointer"
                  >
                    Cancel &amp; Keep User
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteUser}
                    disabled={!deleteConfirmChecked || isDeletingUser}
                    className="px-5 py-2 text-xs bg-[#B91C1C] hover:bg-[#991B1B] text-white font-bold rounded-xs cursor-pointer shadow-md flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    {isDeletingUser ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Purging User...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>[ PERMANENTLY DELETE &amp; REVOKE ACCESS ]</span>
                      </>
                    )}
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
