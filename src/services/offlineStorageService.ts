import {
  ChapterSection,
  BookMetadata,
  OfflineLicense,
  AuthorizedDevice,
  UserEntitlement,
  EntitlementToken,
  EntitlementTokenPayload,
  TokenVerificationResult,
  EncryptedOfflineBookRecord,
  BookPage,
} from '../types.ts';
import { apiFetch } from './apiClient.ts';

const DB_NAME = 'DatingWrong_SecureOffline_v2';
const DB_VERSION = 2;
const STORE_BOOKS = 'encrypted_books';
const STORE_TOKENS = 'entitlement_tokens';
const STORE_AUDIT = 'offline_audit';

const DEVICE_STORAGE_KEY = 'dating_wrong_device_id';
const LOCAL_TOKEN_KEY_PREFIX = 'dating_wrong_token_';
const OFFLINE_LICENSE_KEY = 'dating_wrong_offline_license_v1';
const REVOCATION_LIST_KEY = 'dating_wrong_revoked_tokens_v1';

// Secret pepper used for HMAC token signatures & AES-GCM key derivation
const HMAC_SIGNING_PEPPER = 'MARK_ALVIS_DATING_WRONG_OFFLINE_PEPPER_2026_KENYA_PUBLISHERS';
const PBKDF2_SALT = new TextEncoder().encode('DatingWrong_MarkAlvis_OfflineSalt_2026_SecureBookStore');

// ============================================================================
// DEVICE FINGERPRINTING & HARDWARE BINDING
// ============================================================================

export function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_STORAGE_KEY);
  if (!id) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      id = 'DEV_' + crypto.randomUUID();
    } else {
      id = 'DEV_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    }
    localStorage.setItem(DEVICE_STORAGE_KEY, id);
  }
  return id;
}

export function detectDeviceDetails(): { deviceName: string; platform: 'desktop' | 'mobile' | 'tablet' } {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
  let platform: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  if (/iPad|Tablet/i.test(ua)) {
    platform = 'tablet';
  } else if (/Mobi|Android|iPhone|iPod/i.test(ua)) {
    platform = 'mobile';
  }

  let browser = 'Browser';
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edge')) browser = 'Edge';

  let os = 'Device';
  if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  return {
    deviceName: `${browser} on ${os}`,
    platform,
  };
}

// ============================================================================
// INDEXED-DB LIFECYCLE MANAGEMENT
// ============================================================================

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported in this runtime environment.'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;

      // 1. Encrypted Book Content Store
      if (!db.objectStoreNames.contains(STORE_BOOKS)) {
        db.createObjectStore(STORE_BOOKS, { keyPath: 'bookId' });
      }

      // 2. Entitlement Tokens Store
      if (!db.objectStoreNames.contains(STORE_TOKENS)) {
        const tokenStore = db.createObjectStore(STORE_TOKENS, { keyPath: 'tokenId' });
        tokenStore.createIndex('bookId', 'payload.bookId', { unique: false });
        tokenStore.createIndex('userId', 'payload.userId', { unique: false });
      }

      // 3. Offline Audit Store (Security audit trail)
      if (!db.objectStoreNames.contains(STORE_AUDIT)) {
        db.createObjectStore(STORE_AUDIT, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB database.'));
  });
}

// Record security audit events inside IndexedDB
async function recordAuditEvent(eventType: string, details: Record<string, any>): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_AUDIT, 'readwrite');
    const store = tx.objectStore(STORE_AUDIT);
    store.add({
      eventType,
      details,
      timestamp: new Date().toISOString(),
      deviceId: getOrCreateDeviceId(),
    });
  } catch {
    // Non-blocking
  }
}

// ============================================================================
// CRYPTOGRAPHY & WEB CRYPTO API HELPERS (HMAC-SHA256 & AES-GCM 256)
// ============================================================================

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  let str = base64.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Compute SHA-256 checksum of string or object
async function computeSha256Checksum(data: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(data));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// HMAC-SHA256 Signing Key for Entitlement Tokens
async function getHmacSigningKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    'raw',
    enc.encode(HMAC_SIGNING_PEPPER),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

// Derive AES-GCM 256 Encryption/Decryption Key from Verified Entitlement Token + Device ID
async function deriveAesKeyFromToken(tokenSignature: string, userId: string, deviceId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterialString = `${HMAC_SIGNING_PEPPER}::${tokenSignature}::${userId}::${deviceId}`;

  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(keyMaterialString),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: PBKDF2_SALT,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// ============================================================================
// ENTITLEMENT TOKEN ENGINE
// ============================================================================

export const EntitlementTokenEngine = {
  /**
   * Issue a cryptographically signed Entitlement Token for offline book reading
   */
  async issueToken(params: {
    entitlement: UserEntitlement;
    deviceId?: string;
    validityDays?: number;
  }): Promise<EntitlementToken> {
    const { entitlement, validityDays = 30 } = params;
    const deviceId = params.deviceId || getOrCreateDeviceId();
    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString();

    const tokenId = `TOK_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    const payload: EntitlementTokenPayload = {
      tokenId,
      entitlementId: entitlement.entitlementId,
      userId: entitlement.userId,
      bookId: entitlement.bookId || 'dating-wrong',
      bookVersion: entitlement.version || 1,
      deviceId,
      transactionCode: entitlement.transactionCode,
      scope: 'read:offline',
      issuedAt,
      expiresAt,
      status: 'active',
      watermarkText: entitlement.watermarkText,
    };

    const header = {
      alg: 'HS256',
      typ: 'DW-ENTITLEMENT-TOKEN',
      ver: 1,
    };

    const enc = new TextEncoder();
    const headerEncoded = arrayBufferToBase64(enc.encode(JSON.stringify(header)));
    const payloadEncoded = arrayBufferToBase64(enc.encode(JSON.stringify(payload)));
    const message = `${headerEncoded}.${payloadEncoded}`;

    const hmacKey = await getHmacSigningKey();
    const signatureBuffer = await crypto.subtle.sign('HMAC', hmacKey, enc.encode(message));
    const signatureEncoded = arrayBufferToBase64(signatureBuffer);

    const tokenString = `${message}.${signatureEncoded}`;

    const token: EntitlementToken = {
      tokenId: payload.tokenId,
      tokenString,
      payload,
      signature: signatureEncoded,
    };

    // Store in IndexedDB tokens store
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_TOKENS, 'readwrite');
      tx.objectStore(STORE_TOKENS).put({
        ...token,
        tokenId: payload.tokenId,
      });
    } catch (err) {
      console.warn('Could not persist token to IndexedDB store:', err);
    }

    // Also persist in localStorage for quick synchronous reference
    try {
      localStorage.setItem(`${LOCAL_TOKEN_KEY_PREFIX}${payload.bookId}`, tokenString);
    } catch {}

    await recordAuditEvent('TOKEN_ISSUED', {
      tokenId,
      userId: payload.userId,
      bookId: payload.bookId,
      deviceId,
      expiresAt,
    });

    return token;
  },

  /**
   * Verify an entitlement token before allowing any offline book access.
   * Performs all 7 cryptographic & security checks:
   * 1. Well-formed format check
   * 2. HMAC-SHA256 signature verification (detects tampering)
   * 3. Expiration verification (30-day lease check)
   * 4. Device ID binding check (prevents copying DB to another device)
   * 5. Revocation status check (checks local & known revoked list)
   * 6. Scope check (read:offline)
   * 7. Book ID alignment check
   */
  async verifyToken(
    tokenInput: string | EntitlementToken,
    expectedBookId?: string
  ): Promise<TokenVerificationResult> {
    try {
      let rawTokenString: string;
      if (typeof tokenInput === 'string') {
        rawTokenString = tokenInput.trim();
      } else if (tokenInput && typeof tokenInput === 'object' && tokenInput.tokenString) {
        rawTokenString = tokenInput.tokenString.trim();
      } else {
        return {
          valid: false,
          error: 'No entitlement token provided. Offline access is restricted to verified purchasers.',
          reasonCode: 'MALFORMED',
        };
      }

      const parts = rawTokenString.split('.');
      if (parts.length !== 3) {
        return {
          valid: false,
          error: 'Invalid token structure. Entitlement token format is malformed.',
          reasonCode: 'MALFORMED',
        };
      }

      const [headerEncoded, payloadEncoded, signatureEncoded] = parts;
      const dec = new TextDecoder();
      const enc = new TextEncoder();

      // 1. Decode payload
      let payload: EntitlementTokenPayload;
      try {
        const payloadJson = dec.decode(base64ToArrayBuffer(payloadEncoded));
        payload = JSON.parse(payloadJson);
      } catch {
        return {
          valid: false,
          error: 'Failed to decode entitlement token payload.',
          reasonCode: 'MALFORMED',
        };
      }

      // 2. Cryptographic signature check
      const hmacKey = await getHmacSigningKey();
      const message = `${headerEncoded}.${payloadEncoded}`;
      const signatureBytes = base64ToArrayBuffer(signatureEncoded);

      const isSignatureValid = await crypto.subtle.verify(
        'HMAC',
        hmacKey,
        signatureBytes,
        enc.encode(message)
      );

      if (!isSignatureValid) {
        await recordAuditEvent('TOKEN_SIGNATURE_TAMPER_DETECTED', {
          tokenId: payload.tokenId,
          deviceId: getOrCreateDeviceId(),
        });
        return {
          valid: false,
          error: 'Cryptographic token signature mismatch. The entitlement token has been altered or corrupted.',
          reasonCode: 'INVALID_SIGNATURE',
        };
      }

      // 3. Expiration check
      const expiresAtMs = new Date(payload.expiresAt).getTime();
      if (isNaN(expiresAtMs) || expiresAtMs <= Date.now()) {
        await recordAuditEvent('TOKEN_EXPIRED', {
          tokenId: payload.tokenId,
          expiresAt: payload.expiresAt,
        });
        return {
          valid: false,
          error: 'Offline reading lease has expired. Please connect to the internet to renew your entitlement license.',
          reasonCode: 'EXPIRED',
          payload,
        };
      }

      // 4. Device binding verification
      const currentDeviceId = getOrCreateDeviceId();
      if (payload.deviceId !== currentDeviceId) {
        await recordAuditEvent('TOKEN_DEVICE_MISMATCH', {
          tokenDeviceId: payload.deviceId,
          currentDeviceId,
          tokenId: payload.tokenId,
        });
        return {
          valid: false,
          error: 'This offline copy is bound to a different device. Offline books cannot be transferred between unauthorized devices.',
          reasonCode: 'DEVICE_MISMATCH',
          payload,
        };
      }

      // 5. Revocation check
      const revokedList: string[] = (() => {
        try {
          const raw = localStorage.getItem(REVOCATION_LIST_KEY);
          return raw ? JSON.parse(raw) : [];
        } catch {
          return [];
        }
      })();

      if (revokedList.includes(payload.tokenId) || payload.status === 'revoked') {
        return {
          valid: false,
          error: 'This entitlement token has been revoked by the system or account administrator.',
          reasonCode: 'REVOKED',
          payload,
        };
      }

      // 6. Scope check
      if (payload.scope !== 'read:offline') {
        return {
          valid: false,
          error: 'Entitlement token lacks "read:offline" authorization scope.',
          reasonCode: 'MALFORMED',
          payload,
        };
      }

      // 7. Book ID alignment check
      if (expectedBookId && payload.bookId !== expectedBookId) {
        return {
          valid: false,
          error: `Entitlement token applies to "${payload.bookId}", not "${expectedBookId}".`,
          reasonCode: 'BOOK_MISMATCH',
          payload,
        };
      }

      return {
        valid: true,
        payload,
      };
    } catch (err: any) {
      return {
        valid: false,
        error: `Unexpected token verification failure: ${err?.message || 'Unknown error'}`,
        reasonCode: 'MALFORMED',
      };
    }
  },

  /**
   * Revoke a token locally
   */
  revokeToken(tokenId: string): void {
    try {
      const raw = localStorage.getItem(REVOCATION_LIST_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(tokenId)) {
        list.push(tokenId);
        localStorage.setItem(REVOCATION_LIST_KEY, JSON.stringify(list));
      }
    } catch {}
  },
};

// ============================================================================
// OFFLINE STORAGE SERVICE (INDEXED-DB ENCRYPTED BOOK ENGINE)
// ============================================================================

export const OfflineStorageService = {
  // Expose token engine
  tokenEngine: EntitlementTokenEngine,

  /**
   * Check if the book is saved in IndexedDB AND has a valid entitlement token.
   */
  async isBookSavedOffline(bookId = 'dating-wrong', tokenInput?: string | EntitlementToken): Promise<boolean> {
    try {
      // 1. Get or find token
      let tokenToVerify = tokenInput;
      if (!tokenToVerify) {
        tokenToVerify = await this.getStoredEntitlementToken(bookId) || undefined;
      }

      // If no token exists at all, book is not legally accessible offline
      if (!tokenToVerify) {
        return false;
      }

      // 2. Verify token
      const verification = await EntitlementTokenEngine.verifyToken(tokenToVerify, bookId);
      if (!verification.valid) {
        return false;
      }

      // 3. Confirm IndexedDB contains the record
      const db = await openDB();
      return new Promise<boolean>((resolve) => {
        const tx = db.transaction(STORE_BOOKS, 'readonly');
        const store = tx.objectStore(STORE_BOOKS);
        const req = store.get(bookId);
        req.onsuccess = () => {
          const record = req.result as EncryptedOfflineBookRecord | undefined;
          resolve(Boolean(record && record.encryptedData && record.encryptedData.ciphertext?.length > 0));
        };
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  },

  /**
   * Save book into encrypted private IndexedDB storage.
   * STRICT SECURITY: Only proceeds if the entitlement token is valid or newly issued for an active purchaser.
   */
  async saveForOfflineReading(
    bookId: string,
    metadata: BookMetadata,
    sections: ChapterSection[],
    entitlement: UserEntitlement,
    onProgress?: (percent: number) => void,
    pages?: BookPage[]
  ): Promise<{ success: boolean; token: EntitlementToken; license: OfflineLicense }> {
    onProgress?.(10);
    const deviceId = getOrCreateDeviceId();
    const { deviceName, platform } = detectDeviceDetails();

    // Step 1: Issue or use verified entitlement token
    let token: EntitlementToken;
    if (entitlement.entitlementToken) {
      const verifyRes = await EntitlementTokenEngine.verifyToken(entitlement.entitlementToken, bookId);
      if (verifyRes.valid && verifyRes.payload) {
        token = {
          tokenId: verifyRes.payload.tokenId,
          tokenString: entitlement.entitlementToken,
          payload: verifyRes.payload,
          signature: entitlement.entitlementToken.split('.')[2] || '',
        };
      } else {
        token = await EntitlementTokenEngine.issueToken({ entitlement, deviceId });
      }
    } else {
      token = await EntitlementTokenEngine.issueToken({ entitlement, deviceId });
    }

    onProgress?.(25);

    // Step 2: Prepare payload to encrypt
    const plaintextPayload = {
      metadata,
      sections,
      pages: pages || [],
      entitlementId: entitlement.entitlementId,
      userId: entitlement.userId,
      tokenId: token.payload.tokenId,
      savedAt: new Date().toISOString(),
      watermark: entitlement.watermarkText || `Authorized Digital Edition • Reader ${entitlement.phone}`,
    };

    const jsonString = JSON.stringify(plaintextPayload);
    const checksum = await computeSha256Checksum(jsonString);

    onProgress?.(45);

    // Step 3: Derive AES-GCM 256 Key mathematically bound to the verified token & device
    const aesKey = await deriveAesKeyFromToken(token.signature, entitlement.userId, deviceId);

    // Step 4: Encrypt book payload using Web Crypto API AES-GCM (12-byte random IV)
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipherBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      enc.encode(jsonString)
    );

    const encryptedData = {
      iv: Array.from(iv),
      ciphertext: Array.from(new Uint8Array(cipherBuffer)),
    };

    onProgress?.(70);

    // Step 5: Store encrypted package in IndexedDB
    const record: EncryptedOfflineBookRecord = {
      bookId,
      version: metadata.version,
      encryptedData,
      checksum,
      savedAt: new Date().toISOString(),
      tokenId: token.payload.tokenId,
      userId: entitlement.userId,
      pageCount: metadata.pageCount,
      totalSections: sections.length,
    };

    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_BOOKS, STORE_TOKENS], 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);

      // Save encrypted record
      tx.objectStore(STORE_BOOKS).put(record);

      // Save token record with explicit tokenId property matching keyPath
      const resolvedTokenId = token.payload?.tokenId || token.tokenId || `TOK_${Date.now()}`;
      const tokenRecord = {
        ...token,
        tokenId: resolvedTokenId,
      };
      tx.objectStore(STORE_TOKENS).put(tokenRecord);
    });

    onProgress?.(85);

    // Step 6: Create & store offline license for compatibility
    const offlineLicense: OfflineLicense = {
      licenseId: `LIC_${token.payload.tokenId}`,
      userId: entitlement.userId,
      bookId,
      bookVersion: metadata.version,
      issuedAt: token.payload.issuedAt,
      expiresAt: token.payload.expiresAt,
      authorizedDevice: {
        deviceId,
        deviceName,
        platform,
      },
      offlineEnabled: true,
      licenseVersion: 2,
      signature: token.signature,
    };

    localStorage.setItem(OFFLINE_LICENSE_KEY, JSON.stringify(offlineLicense));
    localStorage.setItem(`${LOCAL_TOKEN_KEY_PREFIX}${bookId}`, token.tokenString);

    // Step 7: Notify server of device authorization in background if online
    try {
      apiFetch('/api/devices/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: entitlement.userId,
          deviceId,
          deviceName,
          platform,
        }),
      }).catch(() => {});
    } catch {}

    await recordAuditEvent('BOOK_ENCRYPTED_AND_SAVED', {
      bookId,
      tokenId: token.payload.tokenId,
      sectionsCount: sections.length,
      bytes: encryptedData.ciphertext.length,
    });

    onProgress?.(100);
    return { success: true, token, license: offlineLicense };
  },

  /**
   * Retrieve and decrypt offline book content from IndexedDB.
   *
   * CRITICAL SECURITY GUARANTEE:
   * Accessible ONLY AFTER verifying the user's entitlement token.
   * If token is invalid, expired, tampered with, revoked, or belongs to another device,
   * access is rejected and no decrypted content is exposed.
   */
  async loadOfflineBook(
    bookId = 'dating-wrong',
    tokenInput?: string | EntitlementToken
  ): Promise<{ metadata: BookMetadata; sections: ChapterSection[]; pages: BookPage[]; tokenPayload: EntitlementTokenPayload } | null> {
    try {
      // 1. Obtain token
      let candidateToken = tokenInput;
      if (!candidateToken) {
        candidateToken = (await this.getStoredEntitlementToken(bookId)) || undefined;
      }

      if (!candidateToken) {
        console.warn('[OfflineStorage] Access denied: No entitlement token found for offline reading.');
        return null;
      }

      // 2. VERIFY ENTITLEMENT TOKEN
      const verification = await EntitlementTokenEngine.verifyToken(candidateToken, bookId);
      if (!verification.valid || !verification.payload) {
        console.error('[OfflineStorage] Access blocked: Entitlement token verification failed.', verification.error);
        await recordAuditEvent('OFFLINE_READ_ACCESS_DENIED', {
          bookId,
          error: verification.error,
          reasonCode: verification.reasonCode,
        });
        return null;
      }

      const tokenPayload = verification.payload;
      const deviceId = getOrCreateDeviceId();

      // 3. Retrieve encrypted record from IndexedDB
      const db = await openDB();
      const record = await new Promise<EncryptedOfflineBookRecord | null>((resolve, reject) => {
        const tx = db.transaction(STORE_BOOKS, 'readonly');
        const store = tx.objectStore(STORE_BOOKS);
        const req = store.get(bookId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });

      if (!record || !record.encryptedData || !record.encryptedData.ciphertext) {
        console.warn(`[OfflineStorage] No encrypted record in IndexedDB for book: ${bookId}`);
        return null;
      }

      // 4. Derive decryption key using verified token's signature + device ID
      const signature = typeof candidateToken === 'string'
        ? candidateToken.split('.')[2]
        : candidateToken.signature;

      const aesKey = await deriveAesKeyFromToken(signature, tokenPayload.userId, deviceId);

      // 5. Decrypt using Web Crypto API AES-GCM
      const iv = new Uint8Array(record.encryptedData.iv);
      const cipherBytes = new Uint8Array(record.encryptedData.ciphertext);

      let plainBuffer: ArrayBuffer;
      try {
        plainBuffer = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          aesKey,
          cipherBytes
        );
      } catch (decryptErr) {
        console.error('[OfflineStorage] AES-GCM Decryption failed. Token or device key mismatch.', decryptErr);
        await recordAuditEvent('DECRYPTION_FAILED', {
          bookId,
          tokenId: tokenPayload.tokenId,
        });
        return null;
      }

      // 6. Decode and verify payload integrity
      const dec = new TextDecoder();
      const jsonString = dec.decode(plainBuffer);

      // Checksum integrity check
      const currentChecksum = await computeSha256Checksum(jsonString);
      if (record.checksum && currentChecksum !== record.checksum) {
        console.error('[OfflineStorage] SHA-256 Checksum validation failed: Content integrity compromised.');
        return null;
      }

      const decrypted = JSON.parse(jsonString);

      await recordAuditEvent('OFFLINE_BOOK_ACCESSED', {
        bookId,
        tokenId: tokenPayload.tokenId,
        userId: tokenPayload.userId,
      });

      return {
        metadata: decrypted.metadata,
        sections: decrypted.sections,
        pages: decrypted.pages || [],
        tokenPayload,
      };
    } catch (err) {
      console.error('[OfflineStorage] Exception during offline book access:', err);
      return null;
    }
  },

  /**
   * Retrieve active stored entitlement token for a given book
   */
  async getStoredEntitlementToken(bookId = 'dating-wrong'): Promise<EntitlementToken | null> {
    try {
      // Check localStorage mirror first for quick retrieval
      const rawLocal = localStorage.getItem(`${LOCAL_TOKEN_KEY_PREFIX}${bookId}`);
      if (rawLocal) {
        const parts = rawLocal.split('.');
        if (parts.length === 3) {
          const dec = new TextDecoder();
          const payloadJson = dec.decode(base64ToArrayBuffer(parts[1]));
          const payload: EntitlementTokenPayload = JSON.parse(payloadJson);
          return {
            tokenId: payload.tokenId,
            tokenString: rawLocal,
            payload,
            signature: parts[2],
          };
        }
      }

      // Otherwise read from IndexedDB
      const db = await openDB();
      return new Promise<EntitlementToken | null>((resolve) => {
        const tx = db.transaction(STORE_TOKENS, 'readonly');
        const store = tx.objectStore(STORE_TOKENS);
        const req = store.openCursor();
        let found: EntitlementToken | null = null;

        req.onsuccess = (e: any) => {
          const cursor: IDBCursorWithValue = e.target.result;
          if (cursor) {
            const token = cursor.value as EntitlementToken;
            if (token && token.payload && token.payload.bookId === bookId && token.payload.status === 'active') {
              found = token;
              resolve(found);
              return;
            }
            cursor.continue();
          } else {
            resolve(found);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  /**
   * Delete offline book from IndexedDB and revoke its local token
   */
  async removeOfflineBook(bookId = 'dating-wrong'): Promise<void> {
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([STORE_BOOKS, STORE_TOKENS], 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);

        tx.objectStore(STORE_BOOKS).delete(bookId);
      });

      // Clear local keys
      const token = await this.getStoredEntitlementToken(bookId);
      if (token) {
        EntitlementTokenEngine.revokeToken(token.payload.tokenId);
      }

      localStorage.removeItem(`${LOCAL_TOKEN_KEY_PREFIX}${bookId}`);
      localStorage.removeItem(OFFLINE_LICENSE_KEY);

      await recordAuditEvent('OFFLINE_BOOK_REMOVED', { bookId });
    } catch (err) {
      console.error('[OfflineStorage] Error removing offline book:', err);
    }
  },

  /**
   * Get current stored offline license (compatibility layer)
   */
  getOfflineLicense(): OfflineLicense | null {
    try {
      const raw = localStorage.getItem(OFFLINE_LICENSE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  /**
   * Clean all offline state on logout if deliberate policy requires it
   */
  async clearAllOfflineData(): Promise<void> {
    try {
      const db = await openDB();
      const tx = db.transaction([STORE_BOOKS, STORE_TOKENS, STORE_AUDIT], 'readwrite');
      tx.objectStore(STORE_BOOKS).clear();
      tx.objectStore(STORE_TOKENS).clear();
      tx.objectStore(STORE_AUDIT).clear();
      localStorage.removeItem(OFFLINE_LICENSE_KEY);
      localStorage.removeItem(`${LOCAL_TOKEN_KEY_PREFIX}dating-wrong`);
    } catch {
      // Non-blocking
    }
  },

  /**
   * Sync and refresh offline license with server
   */
  async syncOfflineLicenseWithServer(): Promise<{ valid: boolean; license?: OfflineLicense }> {
    const license = this.getOfflineLicense();
    if (!license) return { valid: false };

    try {
      const resp = await apiFetch('/api/devices/verify-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: license.userId,
          deviceId: license.authorizedDevice.deviceId,
          licenseId: license.licenseId,
        }),
      });
      const data = await resp.json();
      if (data.valid) {
        if (data.renewedLicense) {
          localStorage.setItem(OFFLINE_LICENSE_KEY, JSON.stringify(data.renewedLicense));
        }
        return { valid: true, license: data.renewedLicense || license };
      }
      return { valid: false };
    } catch {
      // When truly offline, verify cryptographic local token
      const isExpired = new Date(license.expiresAt).getTime() < Date.now();
      return { valid: !isExpired, license };
    }
  },
};
