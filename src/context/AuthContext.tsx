import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut,
  sendPasswordResetEmail,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { auth, db } from '../services/firebase.ts';
import { UserEntitlement } from '../types.ts';
import { EntitlementService } from '../services/entitlementService.ts';
import { DeviceService } from '../services/deviceService.ts';
import { apiFetch } from '../services/apiClient.ts';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  role: 'reader' | 'admin' | 'author';
  hasAccess: boolean;
}

export interface BookConfigState {
  bookPriceKes: number;
  bookPriceUsd: number;
  currency: string;
  paybillNumber: string;
  accountReference: string;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  entitlement: UserEntitlement | null;
  bookConfig: BookConfigState;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, fullName: string, phone: string) => Promise<void>;
  signInWithGoogle: () => Promise<User>;
  continueWithEmail: (email: string, fullName?: string) => Promise<User | null>;
  checkAndRestoreEmailAccess: (email: string, uid?: string) => Promise<UserEntitlement | null>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateBookConfig: (newConfig: Partial<BookConfigState>) => Promise<void>;
  grantUserEntitlement: (details: {
    name: string;
    phone: string;
    transactionCode: string;
    amount: number;
  }) => Promise<UserEntitlement>;
}

const DEFAULT_BOOK_CONFIG: BookConfigState = {
  bookPriceKes: 750,
  bookPriceUsd: 5.99,
  currency: 'KES',
  paybillNumber: '4089221',
  accountReference: 'DATING-WRONG',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [entitlement, setEntitlement] = useState<UserEntitlement | null>(() => 
    EntitlementService.getCurrentEntitlement()
  );
  const [bookConfig, setBookConfig] = useState<BookConfigState>(DEFAULT_BOOK_CONFIG);
  const [loading, setLoading] = useState(true);

  // 1. Listen for Firestore Book Config (dynamic pricing, paybill)
  useEffect(() => {
    const configDocRef = doc(db, 'config', 'book-settings');
    const unsubscribeConfig = onSnapshot(configDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setBookConfig({
          bookPriceKes: data.bookPriceKes || 750,
          bookPriceUsd: data.bookPriceUsd || 5.99,
          currency: data.currency || 'KES',
          paybillNumber: data.paybillNumber || '4089221',
          accountReference: data.accountReference || 'DATING-WRONG',
        });
      } else {
        // Initialize default config in firestore if not exists
        setDoc(configDocRef, {
          ...DEFAULT_BOOK_CONFIG,
          updatedAt: new Date().toISOString(),
          description: 'Official Dating Wrong Book Settings',
        }).catch((err) => {
          console.warn('Initial config doc creation note:', err.message);
        });
      }
    }, (err) => {
      console.warn('Book config snapshot note:', err.message);
    });

    return () => unsubscribeConfig();
  }, []);

  // 2. Listen for Firebase Auth State Changes
  useEffect(() => {
    let unsubscribeEnt: (() => void) | null = null;
    let unsubscribeBookEnt: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      // Clean up previous user listeners if any
      if (unsubscribeEnt) {
        unsubscribeEnt();
        unsubscribeEnt = null;
      }
      if (unsubscribeBookEnt) {
        unsubscribeBookEnt();
        unsubscribeBookEnt = null;
      }

      setCurrentUser(user);
      if (user) {
        // Fetch or create user document
        const userDocRef = doc(db, 'users', user.uid);
        try {
          const userSnap = await getDoc(userDocRef);
          let profileData: UserProfile;

          // Designated administrator emails strictly matching the approval dispatch contacts (not any other)
          const userEmailClean = (user.email || '').trim().toLowerCase();
          const isAdminEmail = userEmailClean === 'alvisnjagi@gmail.com' || 
                               userEmailClean === 'wanyekigerison@gmail.com' ||
                               userEmailClean === 'ochiengmark2908@gmail.com';

          if (userSnap.exists()) {
            const d = userSnap.data();
            profileData = {
              uid: user.uid,
              email: user.email || '',
              displayName: d.displayName || user.displayName || 'Reader',
              phone: d.phone || '',
              role: isAdminEmail ? 'admin' : (d.role || 'reader'),
              hasAccess: d.hasAccess || false,
            };
          } else {
            profileData = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || 'Reader',
              phone: '',
              role: isAdminEmail ? 'admin' : 'reader',
              hasAccess: false,
            };
            await setDoc(userDocRef, {
              ...profileData,
              createdAt: serverTimestamp(),
              lastLoginAt: serverTimestamp(),
            });
          }
          setUserProfile(profileData);

          // Verify device-aware entitlement restoration with the server (strictly enforcing max 2 exempted devices for admins)
          await checkAndRestoreEmailAccess(userEmailClean, user.uid);

          // 1. Listen for user's primary book entitlement in bookEntitlements/{uid}_dating-wrong
          const bookEntDocRef = doc(db, 'bookEntitlements', `${user.uid}_dating-wrong`);
          unsubscribeBookEnt = onSnapshot(
            bookEntDocRef,
            (snap) => {
              if (snap.exists()) {
                const data = snap.data();
                if (data.status === 'ACTIVE' || data.status === 'active') {
                  const ent: UserEntitlement = {
                    entitlementId: data.paymentId || `ENT-${Date.now()}`,
                    userId: user.uid,
                    name: data.watermark || user.displayName || 'Authorized Reader',
                    phone: '',
                    email: user.email || '',
                    bookId: data.bookId || 'dating-wrong',
                    version: data.bookVersion || 1,
                    grantedAt: data.grantedAt || new Date().toISOString(),
                    paymentMethod: 'mpesa',
                    transactionCode: data.transactionCode || 'VERIFIED',
                    amountPaid: 750,
                    currency: 'KES',
                    status: 'active',
                    watermarkText: data.watermark || `Authorized Digital Edition • ${user.email} • Dating Wrong`,
                  };
                  setEntitlement(ent);
                  EntitlementService.saveEntitlement(ent);
                  setUserProfile((prev) => (prev ? { ...prev, hasAccess: true } : null));
                } else if (data.status === 'REVOKED') {
                  EntitlementService.clearEntitlement();
                  setEntitlement(null);
                  setUserProfile((prev) => (prev ? { ...prev, hasAccess: false } : null));
                }
              } else {
                // Document deleted or does not exist
                if (!isAdminEmail) {
                  EntitlementService.clearEntitlement();
                  setEntitlement(null);
                  setUserProfile((prev) => (prev ? { ...prev, hasAccess: false } : null));
                }
              }
            },
            (err) => {
              console.warn('Book entitlement listener notice:', err.message);
            }
          );

          // 2. Also listen for user's records in entitlements collection
          const entQuery = query(collection(db, 'entitlements'), where('userId', '==', user.uid));
          unsubscribeEnt = onSnapshot(
            entQuery,
            (snapshot) => {
              if (!snapshot.empty) {
                const entDoc = snapshot.docs[0].data() as UserEntitlement;
                if (entDoc.status === 'active' || (entDoc as any).status === 'ACTIVE') {
                  setEntitlement(entDoc);
                  EntitlementService.saveEntitlement(entDoc);
                  setUserProfile((prev) => (prev ? { ...prev, hasAccess: true } : null));
                } else {
                  EntitlementService.clearEntitlement();
                  setEntitlement(null);
                  setUserProfile((prev) => (prev ? { ...prev, hasAccess: false } : null));
                }
              } else {
                if (!isAdminEmail) {
                  // If no server entitlement document exists, clear access
                  EntitlementService.clearEntitlement();
                  setEntitlement(null);
                  setUserProfile((prev) => (prev ? { ...prev, hasAccess: false } : null));
                }
              }
            },
            (err) => {
              console.warn('Entitlements query listener notice:', err.message);
            }
          );

          setLoading(false);
        } catch (error) {
          console.error('Error fetching user document:', error);
          setLoading(false);
        }
      } else {
        setUserProfile(null);
        // Fallback to local entitlement if reader used offline/guest flow
        setEntitlement(EntitlementService.getCurrentEntitlement());
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeEnt) unsubscribeEnt();
      if (unsubscribeBookEnt) unsubscribeBookEnt();
    };
  }, []);

  const checkAndRestoreEmailAccess = async (email: string, uid?: string): Promise<UserEntitlement | null> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const isAdminEmail = cleanEmail === 'alvisnjagi@gmail.com' ||
                           cleanEmail === 'wanyekigerison@gmail.com' ||
                           cleanEmail === 'ochiengmark2908@gmail.com';

      // 1. Query server backend with current device info (enforces 2-device exemption cap for admins)
      const currentDev = DeviceService.getCurrentDevice();
      const res = await apiFetch('/api/entitlements/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          uid,
          deviceId: currentDev.deviceId,
          deviceName: currentDev.deviceName,
          platform: currentDev.platform,
        }),
      });

      if (res.ok) {
        const data = await res.json();

        // Check if device limit reached (especially for admin accounts: maximum 2 devices exempted from payment)
        if (data.deviceLimitReached) {
          console.warn('[Device Limit Enforced]', data.reason);
          EntitlementService.clearEntitlement();
          setEntitlement(null);
          setUserProfile((prev) => (prev ? { ...prev, hasAccess: false, role: isAdminEmail ? 'admin' : prev.role } : null));
          return null;
        }

        if (data.authorized && data.entitlement) {
          const ent: UserEntitlement = {
            entitlementId: data.entitlement.paymentId || `ENT-${Date.now()}`,
            userId: uid || data.entitlement.uid || `USR-${Date.now()}`,
            name: data.entitlement.customerName || (isAdminEmail ? 'Administrator & Publisher' : 'Authorized Reader'),
            phone: data.entitlement.phone || '',
            email: cleanEmail,
            bookId: 'dating-wrong',
            version: 1,
            grantedAt: data.entitlement.grantedAt || new Date().toISOString(),
            paymentMethod: 'mpesa',
            transactionCode: data.entitlement.transactionCode || 'VERIFIED',
            amountPaid: 750,
            currency: 'KES',
            status: 'active',
            watermarkText: data.entitlement.watermark || (isAdminEmail ? `Administrator & Publisher Copy • ${cleanEmail} • Dating Wrong` : `Authorized Digital Edition • ${cleanEmail} • Dating Wrong`),
          };
          EntitlementService.saveEntitlement(ent);
          setEntitlement(ent);
          setUserProfile((prev) => (prev ? { ...prev, hasAccess: true, role: isAdminEmail ? 'admin' : prev.role } : null));
          return ent;
        }
      }

      // 2. Check Firestore collections if user is authenticated
      if (auth.currentUser) {
        try {
          const entQuery = query(collection(db, 'entitlements'), where('email', '==', cleanEmail));
          const snap = await getDocs(entQuery);
          if (!snap.empty) {
            const entDoc = snap.docs[0].data() as UserEntitlement;
            EntitlementService.saveEntitlement(entDoc);
            setEntitlement(entDoc);
            setUserProfile((prev) => prev ? { ...prev, hasAccess: true } : null);
            return entDoc;
          }
        } catch (entErr: any) {
          console.warn('Firestore entitlements check notice:', entErr.message);
        }

        try {
          // Check approved paymentRequests collection
          const approvedQuery = query(
            collection(db, 'paymentRequests'),
            where('email', '==', cleanEmail),
            where('status', '==', 'APPROVED')
          );
          const approvedSnap = await getDocs(approvedQuery);
          if (!approvedSnap.empty) {
            const reqData = approvedSnap.docs[0].data();
            const ent: UserEntitlement = {
              entitlementId: reqData.entitlementId || `ENT-${Date.now()}`,
              userId: uid || reqData.uid || currentUser?.uid || `USR-${Date.now()}`,
              name: reqData.customerName || 'Authorized Reader',
              phone: reqData.senderPhone || '',
              email: cleanEmail,
              bookId: 'dating-wrong',
              version: 1,
              grantedAt: reqData.reviewedAt || new Date().toISOString(),
              paymentMethod: 'mpesa',
              transactionCode: reqData.transactionCode || 'APPROVED',
              amountPaid: reqData.amount || 750,
              currency: 'KES',
              status: 'active',
              watermarkText: `Authorized Digital Edition • ${cleanEmail} • Dating Wrong`,
            };
            EntitlementService.saveEntitlement(ent);
            setEntitlement(ent);
            setUserProfile((prev) => prev ? { ...prev, hasAccess: true } : null);
            return ent;
          }
        } catch (reqErr: any) {
          console.warn('Payment requests check notice:', reqErr.message);
        }
      }

      // If no valid entitlement was verified from server or Firestore
      if (!isAdminEmail) {
        EntitlementService.clearEntitlement();
        setEntitlement(null);
        setUserProfile((prev) => (prev ? { ...prev, hasAccess: false } : null));
      }
    } catch (err) {
      console.warn('Check email access note:', err);
    }
    return null;
  };

  const signInWithGoogle = async (): Promise<User> => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    if (result.user.email) {
      await checkAndRestoreEmailAccess(result.user.email, result.user.uid);
    }
    return result.user;
  };

  const continueWithEmail = async (email: string, fullName?: string): Promise<User | null> => {
    const cleanEmail = email.trim().toLowerCase();
    // Check if this email already has authorization
    await checkAndRestoreEmailAccess(cleanEmail);

    const defaultPassword = `DatingWrong!Reader_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)}99`;
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, defaultPassword);
      return cred.user;
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          const newCred = await createUserWithEmailAndPassword(auth, cleanEmail, defaultPassword);
          if (fullName) {
            await updateProfile(newCred.user, { displayName: fullName });
          }
          return newCred.user;
        } catch (createErr) {
          console.warn('Auto create user note:', createErr);
        }
      }
    }
    return null;
  };

  const signIn = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signUp = async (email: string, pass: string, fullName: string, phone: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: fullName });
    
    const isAdminEmail = email === 'alvisnjagi@gmail.com' || 
                         email === 'wanyekigerison@gmail.com' ||
                         email === 'ochiengmark2908@gmail.com';

    const profileData: UserProfile = {
      uid: cred.user.uid,
      email,
      displayName: fullName,
      phone,
      role: isAdminEmail ? 'admin' : 'reader',
      hasAccess: isAdminEmail ? true : false,
    };

    await setDoc(doc(db, 'users', cred.user.uid), {
      ...profileData,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });

    setUserProfile(profileData);
  };

  const signOut = async () => {
    await fbSignOut(auth);
    setUserProfile(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateBookConfig = async (newConfig: Partial<BookConfigState>) => {
    const configDocRef = doc(db, 'config', 'book-settings');
    await setDoc(configDocRef, {
      ...bookConfig,
      ...newConfig,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.email || 'admin',
    }, { merge: true });
    setBookConfig((prev) => ({ ...prev, ...newConfig }));
  };

  const grantUserEntitlement = async (details: {
    name: string;
    phone: string;
    transactionCode: string;
    amount: number;
  }): Promise<UserEntitlement> => {
    const uid = currentUser?.uid || `GUEST-${Date.now()}`;
    const email = currentUser?.email || userProfile?.email || 'reader@datingwrong.ke';
    const maskedPhone = details.phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2');

    const newEntitlement: UserEntitlement = {
      entitlementId: `ENT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: uid,
      name: details.name,
      phone: details.phone,
      email,
      bookId: 'dating-wrong',
      version: 1,
      grantedAt: new Date().toISOString(),
      paymentMethod: 'mpesa',
      transactionCode: details.transactionCode,
      amountPaid: details.amount,
      currency: 'KES',
      status: 'active',
      watermarkText: `Authorized Digital Edition • ${details.name} (${maskedPhone}) • Dating Wrong`,
    };

    // Save locally
    EntitlementService.saveEntitlement(newEntitlement);
    setEntitlement(newEntitlement);

    // Save to Firestore if user is authenticated or has email
    if (currentUser) {
      try {
        await setDoc(doc(db, 'entitlements', newEntitlement.entitlementId), {
          ...newEntitlement,
          createdAt: serverTimestamp(),
        });

        // Update user profile hasAccess
        await setDoc(doc(db, 'users', currentUser.uid), {
          hasAccess: true,
          phone: details.phone,
        }, { merge: true });

        setUserProfile((prev) => prev ? { ...prev, hasAccess: true, phone: details.phone } : null);
      } catch (err) {
        console.warn('Firestore entitlement sync notice:', err);
      }
    }

    return newEntitlement;
  };

  const normalizedEmail = (currentUser?.email || userProfile?.email || '').trim().toLowerCase();
  const isAdmin = userProfile?.role === 'admin' || 
                  normalizedEmail === 'alvisnjagi@gmail.com' ||
                  normalizedEmail === 'wanyekigerison@gmail.com' ||
                  normalizedEmail === 'ochiengmark2908@gmail.com';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        entitlement,
        bookConfig,
        loading,
        isAdmin,
        signIn,
        signUp,
        signInWithGoogle,
        continueWithEmail,
        checkAndRestoreEmailAccess,
        signOut,
        resetPassword,
        updateBookConfig,
        grantUserEntitlement,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
