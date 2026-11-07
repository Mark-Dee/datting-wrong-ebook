/**
 * Dating Wrong — API application (Express).
 *
 * Exported as a factory so the same code runs under:
 *   - `npm run dev` / `npm start`  (server.ts, long-running process)
 *   - Vercel Functions            (api/index.ts, one invocation per request)
 *   - automated tests             (injected token verifier + in-memory backend)
 *
 * Security model
 *   - Identity = verified Firebase ID token only (Authorization: Bearer …).
 *   - Admin = decided server-side (custom claim / verified admin e-mail / users/{uid}.role).
 *   - Every protected route derives uid/email from the token, never from body/query/headers.
 *   - State is hydrated from Firestore at the start of each /api request and flushed
 *     BEFORE the response is sent, so a 2xx always means the data is durable.
 */
import crypto from 'node:crypto';
import express from 'express';
import { DarajaService } from './darajaService.ts';
import { PaymentStore } from './paymentStore.ts';
import { NotificationService } from './notificationService.ts';
import { EmailConfirmationService } from './emailConfirmationService.ts';
import { AccessTicketStore } from './accessTicketStore.ts';
import { Persistence } from './persistence.ts';
import { makeAuth, type TokenVerifier, type VerifiedUser } from './auth.ts';
import { isAdminEmail } from './config.ts';
import { MANUSCRIPT_V1 } from './book/manuscript-v1.ts';
import { ALL_BOOK_PAGES } from './book/manuscript/allPages.ts';
import { FREE_PREVIEW_SECTION_IDS } from './book/access.ts';
import { verifyPastedMpesaSms } from '../src/utils/mpesaSmsParser.ts';
import { normalizeKenyanPhone } from '../src/utils/phoneNormalization.ts';

export interface AppDeps {
  verifyIdToken: TokenVerifier;
  daraja?: DarajaService;
}

const BOOK_ID = 'dating-wrong';
const FREE_IDS: readonly string[] = FREE_PREVIEW_SECTION_IDS;
const adminDeviceKey = (email: string) => `admin_${email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_')}`;

export function createApp(deps: AppDeps) {
  const app = express();
  const daraja = deps.daraja || new DarajaService();
  const { optionalUser, requireUser, requireAdmin, resolveIsAdmin } = makeAuth(deps.verifyIdToken);

  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
  app.use(express.json({ limit: '100kb' }));

  // Remember the public base URL for e-mail/SMS links (never localhost)
  app.use((req, _res, next) => {
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
    if (host && typeof host === 'string' && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      NotificationService.setActiveBaseUrl(`${proto}://${host}`);
      EmailConfirmationService.setActiveBaseUrl(`${proto}://${host}`);
    }
    next();
  });

  // ------------------------------------------------------------------
  // Persistence guard: hydrate before handling, flush BEFORE responding.
  // ------------------------------------------------------------------
  app.use('/api', async (req, res, next) => {
    if (req.path === '/health') return next();
    if (!Persistence.isConfigured) {
      return res.status(503).json({
        error: 'Server storage is not configured. The administrator must set Firebase Admin credentials.',
        code: 'STORAGE_NOT_CONFIGURED',
      });
    }
    try {
      await Persistence.hydrateAll();
    } catch (e: any) {
      console.error('[persistence] hydrate failed:', e?.message);
      return res.status(503).json({ error: 'Storage is temporarily unavailable. Please retry.', code: 'STORAGE_UNAVAILABLE' });
    }
    const origEnd = res.end.bind(res) as (...a: any[]) => any;
    let done = false;
    (res as any).end = (...args: any[]) => {
      if (done) return origEnd(...args);
      done = true;
      Persistence.flushAll().then(
        () => origEnd(...args),
        (err) => {
          console.error('[persistence] flush failed:', err?.message);
          if (!res.headersSent) {
            res.removeHeader('Content-Length');
            res.removeHeader('ETag');
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            origEnd(JSON.stringify({ error: 'Your request could not be saved. Please retry.', code: 'PERSIST_FAILED' }));
          } else {
            origEnd();
          }
        }
      );
      return res;
    };
    next();
  });

  // ---------------------------- helpers ----------------------------
  const verifiedEmail = (u?: VerifiedUser) => (u && u.emailVerified && u.email ? u.email : undefined);

  /** Active entitlement for the signed-in user (uid-based always; e-mail-based only when e-mail is verified). */
  const entitlementFor = (u: VerifiedUser) => {
    const byUid = PaymentStore.getEntitlement(u.uid, BOOK_ID);
    if (byUid && byUid.status === 'ACTIVE') return byUid;
    const byEmail = PaymentStore.findEntitlement({ uid: u.uid, email: verifiedEmail(u), bookId: BOOK_ID });
    return byEmail && byEmail.status === 'ACTIVE' ? byEmail : undefined;
  };

  const baseUrlFrom = (req: express.Request) => {
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
    return host ? `${proto}://${host}` : undefined;
  };

  const ownsOrAdmin = async (req: express.Request, ownerUid?: string, ownerEmail?: string) => {
    const u = req.user!;
    if (ownerUid && ownerUid === u.uid) return true;
    if (ownerEmail && verifiedEmail(u) === ownerEmail.toLowerCase()) return true;
    return resolveIsAdmin(u);
  };

  // ============================ PUBLIC ============================
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      book: 'Dating Wrong',
      timestamp: new Date().toISOString(),
      storage: Persistence.isConfigured ? Persistence.backend.kind : 'unconfigured',
      stkPush: daraja.isConfigured() ? 'configured' : 'not_configured',
      smsProvider: process.env.AT_USERNAME && process.env.AT_API_KEY ? 'configured' : 'not_configured',
    });
  });

  app.get('/api/book', (_req, res) => {
    res.json({
      metadata: MANUSCRIPT_V1.metadata,
      tableOfContents: MANUSCRIPT_V1.sections.map((s) => ({
        id: s.id,
        order: s.order,
        type: s.type,
        numberLabel: s.numberLabel,
        title: s.title,
        subtitle: s.subtitle,
        readingMinutes: s.readingMinutes,
        isFreePreview: FREE_IDS.includes(s.id),
      })),
    });
  });

  app.get('/api/book/preview', (_req, res) => {
    res.json({ metadata: MANUSCRIPT_V1.metadata, sections: MANUSCRIPT_V1.sections.filter((s) => FREE_IDS.includes(s.id)) });
  });

  app.get('/api/config/pochi', (_req, res) => {
    res.json(PaymentStore.getPochiConfig());
  });

  // ====================== PROTECTED BOOK CONTENT ======================
  const denyContent = (res: express.Response) =>
    res.status(403).json({
      error: 'Unauthorized access',
      message: 'An approved purchase on your signed-in account is required to read Dating Wrong.',
    });

  app.get('/api/book/pages', requireUser, (req, res) => {
    const ent = entitlementFor(req.user!);
    if (!ent) return denyContent(res);
    res.setHeader('Cache-Control', 'private, no-store');
    res.json({ authorized: true, pages: ALL_BOOK_PAGES });
  });

  app.post('/api/book/content', requireUser, (req, res) => {
    const ent = entitlementFor(req.user!);
    if (!ent) return denyContent(res);
    res.setHeader('Cache-Control', 'private, no-store');
    res.json({ success: true, authorized: true, metadata: MANUSCRIPT_V1.metadata, sections: MANUSCRIPT_V1.sections, entitlement: ent });
  });

  // ===================== SINGLE-USE ACCESS TICKETS =====================
  app.post('/api/access-tickets/consume-reader', requireUser, (req, res) => {
    const { ticket } = req.body || {};
    if (!ticket) return res.status(400).json({ success: false, error: 'Access ticket token is required.' });
    const result = AccessTicketStore.consumeCustomerReaderTicket({
      ticketId: ticket,
      email: req.user!.email || '',
      uid: req.user!.uid,
    });
    if (!result.valid) return res.status(403).json({ success: false, error: result.reason });
    res.json({
      success: true,
      entitlement: result.entitlement,
      ticket: { targetEmail: result.ticket?.targetEmail, requestId: result.ticket?.requestId, consumedAt: result.ticket?.consumedAt },
      message: 'Access ticket successfully redeemed and burned. Lifetime reading authorized.',
    });
  });

  app.post('/api/access-tickets/verify-admin', requireAdmin, (req, res) => {
    const { ticket, authAdmin, requestId } = req.body || {};
    if (!ticket) return res.status(400).json({ success: false, error: 'Admin ticket token is required.' });
    const result = AccessTicketStore.verifyAndConsumeAdminTicket({
      ticketId: ticket,
      adminEmail: authAdmin,
      requestingEmail: req.user!.email || '',
      requestId,
    });
    if (!result.valid) return res.status(403).json({ success: false, error: result.reason });
    res.json({ success: true, targetAdmin: result.ticket?.targetEmail, requestId: result.ticket?.requestId, message: 'Administrative ticket verified and authorized.' });
  });

  // ========================= M-PESA DARAJA (STK) =========================
  app.post('/api/payments/mpesa/initiate', requireUser, async (req, res) => {
    try {
      if (!daraja.isConfigured()) {
        return res.status(503).json({ error: 'Automatic M-PESA prompts are not enabled. Please pay via Pochi la Biashara.', code: 'STK_NOT_CONFIGURED' });
      }
      const phoneNorm = normalizeKenyanPhone(req.body?.phone);
      if (!phoneNorm.isValid) {
        return res.status(400).json({ error: 'Please enter a valid Kenyan phone number (e.g. 0712 345 678 or 254712345678)' });
      }
      const config = PaymentStore.getConfig();
      const u = req.user!;
      const stk = await daraja.initiateStkPush({
        phone: phoneNorm.canonical,
        amount: config.priceKes, // price is ALWAYS server-side
        accountReference: 'DATING-WRONG',
        transactionDesc: 'Book Purchase',
        customerName: String(req.body?.name || u.email || 'Reader'),
        customerEmail: u.email || '',
        userId: u.uid,
      });
      const rec = PaymentStore.createPaymentSession({
        uid: u.uid,
        email: u.email || '',
        customerName: String(req.body?.name || 'Valued Reader'),
        checkoutPhone: phoneNorm.canonical,
        expectedAmount: config.priceKes,
        checkoutRequestId: stk.checkoutRequestId,
        merchantRequestId: stk.merchantRequestId,
      });
      res.json({
        success: true,
        paymentId: rec.paymentId,
        paymentSessionId: rec.paymentSessionId,
        checkoutRequestId: stk.checkoutRequestId,
        merchantRequestId: stk.merchantRequestId,
        customerMessage: stk.customerMessage,
        amount: config.priceKes,
        phone: phoneNorm.displayLocal,
      });
    } catch (err: any) {
      console.error('[STK initiate]', err.message);
      res.status(502).json({ error: 'Failed to start the M-PESA prompt. Please retry or pay via Pochi.' });
    }
  });

  app.get('/api/payments/mpesa/status/:checkoutRequestId', requireUser, async (req, res) => {
    const payment = PaymentStore.getPaymentByCheckoutRequestId(req.params.checkoutRequestId);
    if (!payment || !(await ownsOrAdmin(req, payment.uid, payment.email))) {
      return res.status(404).json({ error: 'Payment request not found' });
    }
    res.json({
      paymentId: payment.paymentId,
      checkoutRequestId: req.params.checkoutRequestId,
      status: payment.status,
      receiptNumber: payment.transactionCode || null,
      amount: payment.receivedAmount || payment.expectedAmount,
      failureReason: payment.failureReason || null,
    });
  });

  // Public webhook. Safaricom does not sign callbacks, so NOTHING in the body is trusted:
  // the session must be one we created, and success is confirmed by a server-to-server STK query.
  app.post('/api/payments/daraja/callback', async (req, res) => {
    const ack = { ResultCode: 0, ResultDesc: 'Accepted' };
    try {
      const secret = process.env.MPESA_CALLBACK_SECRET;
      if (secret) {
        const given = String(req.query.token || '');
        const a = Buffer.from(given);
        const b = Buffer.from(secret);
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(403).json({ error: 'forbidden' });
      }
      const parsed = daraja.parseCallback(req.body);
      const payment = PaymentStore.getPaymentByCheckoutRequestId(parsed.checkoutRequestId);
      if (!payment) return res.json(ack);
      if (payment.status === 'VERIFIED') return res.json(ack); // idempotent

      if (!parsed.isSuccessful || !parsed.transactionCode || !parsed.amount) {
        payment.status = 'FAILED';
        payment.failureReason = parsed.resultDesc;
        payment.updatedAt = new Date().toISOString();
        return res.json(ack);
      }

      let confirmed = false;
      try {
        confirmed = daraja.isConfigured() && (await daraja.queryStkStatus(parsed.checkoutRequestId)).confirmed;
      } catch (e: any) {
        console.warn('[Daraja callback] provider confirmation failed:', e.message);
      }
      if (!confirmed) {
        // Record what was claimed, but grant nothing until an admin reconciles with Safaricom.
        payment.status = 'MANUAL_REVIEW';
        payment.transactionCode = parsed.transactionCode.toUpperCase();
        payment.receivedAmount = parsed.amount;
        payment.failureReason = 'Callback could not be confirmed with Safaricom; awaiting administrator reconciliation.';
        payment.updatedAt = new Date().toISOString();
        return res.json(ack);
      }

      await PaymentStore.verifyAndGrantEntitlement({
        paymentId: payment.paymentId,
        checkoutRequestId: parsed.checkoutRequestId,
        uid: payment.uid,
        email: payment.email,
        customerName: payment.customerName,
        senderPhone: payment.checkoutPhone, // Safaricom masks the MSISDN in callbacks; correlate with the session instead
        amountReceived: parsed.amount,
        transactionCode: parsed.transactionCode,
        verificationMethod: 'daraja_stk',
        transactionTimestamp: parsed.transactionDate,
      });
      res.json(ack);
    } catch (err: any) {
      console.error('[Daraja callback]', err.message);
      res.json(ack);
    }
  });

  app.post('/api/payments/mpesa/reconcile/:paymentSessionId', requireAdmin, async (req, res) => {
    try {
      const result = await PaymentStore.reconcilePaymentSession(req.params.paymentSessionId, async (id) => {
        try {
          return daraja.isConfigured() && (await daraja.queryStkStatus(id)).confirmed;
        } catch {
          return false;
        }
      });
      PaymentStore.logAdminActivity({ admin: req.user!.email || req.user!.uid, action: 'RECONCILE_PAYMENT', target: req.params.paymentSessionId, details: result.status });
      res.json({ success: result.passed, status: result.status, entitlement: result.entitlement || null, checksLog: result.checksLog, error: result.error || null });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ===================== POCHI MANUAL-VERIFICATION FLOW =====================
  const CODE_RE = /^[A-Z0-9]{8,12}$/;

  app.post('/api/payments/pochi/submit-sms', requireUser, async (req, res) => {
    try {
      const u = req.user!;
      if (!u.email) return res.status(400).json({ success: false, error: 'Your account has no e-mail address.' });
      const { customerName, submittedSms, senderPhone } = req.body || {};

      if (!submittedSms || typeof submittedSms !== 'string' || submittedSms.trim().length < 15 || submittedSms.length > 2000) {
        return res.status(400).json({ success: false, error: 'Please paste the complete M-PESA confirmation SMS you received from Safaricom.' });
      }

      const existing = PaymentStore.getEntitlement(u.uid, BOOK_ID);
      if (existing && existing.status === 'ACTIVE') {
        return res.json({ success: true, message: 'Your account is already authorized to read Dating Wrong.', alreadyAuthorized: true, entitlement: existing });
      }

      if (senderPhone && !normalizeKenyanPhone(senderPhone).isValid) {
        return res.status(400).json({ success: false, error: 'The phone number you entered is not a valid Kenyan number.' });
      }

      const pochi = PaymentStore.getPochiConfig();
      const parsed = verifyPastedMpesaSms({
        smsText: submittedSms,
        expectedAmount: pochi.priceKes,
        checkoutPhone: senderPhone || '',
        merchantName: pochi.pochiName,
        paybillNumber: pochi.pochiPhone,
      });

      let code = (parsed.extractedCode || '').toUpperCase();
      if (!code) {
        const m = submittedSms.match(/\b([A-Z0-9]{10})\b/i);
        if (m) code = m[1].toUpperCase();
      }
      if (!CODE_RE.test(code)) {
        return res.status(400).json({ success: false, error: 'Could not find a valid M-PESA transaction code in the pasted SMS. Please paste the full message.', parsed });
      }

      let amount = parsed.extractedAmount;
      if (!amount || isNaN(amount)) {
        const m = submittedSms.match(/(?:Ksh|KSh|KES)\.?\s*([0-9,]+(?:\.\d{2})?)/i);
        amount = m ? parseFloat(m[1].replace(/,/g, '')) : undefined;
      }
      if (!amount) {
        return res.status(400).json({ success: false, error: 'Could not read the amount from the pasted SMS. Please paste the full message.' });
      }
      if (amount < pochi.priceKes) {
        return res.status(400).json({ success: false, error: `The SMS shows KSh ${amount}, which is less than the book price of KSh ${pochi.priceKes}.` });
      }

      const effectivePhone = senderPhone || parsed.extractedPhone || parsed.parsed.senderPhone;
      if (!effectivePhone) {
        return res.status(400).json({ success: false, error: 'Please enter the phone number you paid from.' });
      }
      const senderName = parsed.parsed.senderName || customerName || 'Valued Reader';

      const result = await PaymentStore.createPaymentRequest({
        uid: u.uid,
        email: u.email,
        customerName: customerName || senderName,
        submittedSms: submittedSms.trim(),
        transactionCode: code,
        amount,
        senderPhone: effectivePhone,
        senderName,
        recipientDetails: parsed.parsed.recipient || pochi.pochiName,
        transactionTime: parsed.parsed.dateTimeStr || 'Stated in SMS',
        baseUrl: baseUrlFrom(req),
      });

      res.json({
        success: true,
        message: 'Payment verification request received. Administrators have been notified for review.',
        requestId: result.request.requestId,
        status: 'PENDING_REVIEW',
        duplicate: result.isDuplicate,
        request: result.request,
        parsedDetails: {
          transactionCode: code,
          amount,
          senderPhone: effectivePhone,
          senderName,
          recipientDetails: result.request.recipientDetails,
          transactionTime: result.request.transactionTime,
        },
      });
    } catch (err: any) {
      console.error('[POCHI SUBMIT SMS]', err.message);
      res.status(400).json({ success: false, error: err.message || 'Failed to submit payment verification request.' });
    }
  });

  app.get('/api/payments/pochi/request-status/:requestId', requireUser, async (req, res) => {
    const request = PaymentStore.getPaymentRequest(req.params.requestId);
    if (!request || !(await ownsOrAdmin(req, request.uid, request.email))) {
      return res.status(404).json({ success: false, error: 'Payment request not found.' });
    }
    const entitlement = request.status === 'APPROVED' ? PaymentStore.getEntitlement(request.uid, BOOK_ID) : null;
    res.json({ success: true, request, status: request.status, entitlement });
  });

  app.get('/api/payments/pochi/user-requests', requireUser, (req, res) => {
    const u = req.user!;
    res.json({ success: true, requests: PaymentStore.getUserPaymentRequests({ uid: u.uid, email: verifiedEmail(u) }) });
  });

  app.post('/api/payments/pochi/restore-by-sms', requireUser, (req, res) => {
    const u = req.user!;
    const { smsText } = req.body || {};
    const email = verifiedEmail(u);
    if (!email || !smsText) {
      return res.status(400).json({
        approved: false,
        redirectToBuy: true,
        error: 'A verified account e-mail and the pasted SMS confirmation are required for restoration.',
      });
    }
    const result = PaymentStore.restoreApprovedPaymentBySms({ email, smsText, uid: u.uid });
    if (result.approved) {
      return res.json({
        success: true,
        approved: true,
        message: `Restoration approved! Verified purchase matched for ${email}.`,
        entitlement: result.entitlement,
        matchedRequest: result.matchedRequest,
        parsedDetails: result.parsedDetails,
      });
    }
    res.json({
      success: false,
      approved: false,
      redirectToBuy: true,
      message: result.reason || 'No approved purchase found matching this SMS and e-mail in our database.',
      reason: result.reason,
      parsedDetails: result.parsedDetails,
    });
  });

  // ==================== ENTITLEMENTS & DEVICES ====================
  app.post('/api/entitlements/check', requireUser, (req, res) => {
    const u = req.user!;
    const { deviceId, deviceName, platform } = req.body || {};
    const check = PaymentStore.checkEntitlementWithDevice({ email: verifiedEmail(u), uid: u.uid, deviceId, deviceName, platform });
    if (check.deviceLimitReached) {
      return res.json({ authorized: false, deviceLimitReached: true, maxDevices: check.maxDevices || 2, reason: check.reason, devices: check.devices || [] });
    }
    if (check.entitlement && check.entitlement.status === 'ACTIVE') {
      return res.json({ authorized: true, entitlement: check.entitlement, isExemptAdminDevice: check.isExemptAdminDevice || false, deviceCount: check.deviceCount });
    }
    res.json({ authorized: false });
  });

  const deviceScope = (u: VerifiedUser) => {
    const email = verifiedEmail(u);
    const admin = isAdminEmail(email);
    return { key: admin && email ? adminDeviceKey(email) : u.uid, admin, max: admin ? 2 : 3 };
  };

  app.get('/api/devices/:userId', requireUser, (req, res) => {
    const { key, max } = deviceScope(req.user!);
    const devices = PaymentStore.getUserDevices(key);
    res.json({ devices: devices.filter((d) => d.status === 'active'), allDevices: devices, maxDevices: max });
  });

  app.post('/api/devices/authorize', requireUser, (req, res) => {
    const { deviceId, deviceName, platform } = req.body || {};
    if (!deviceId) return res.status(400).json({ error: 'deviceId is required' });
    const u = req.user!;
    const { key, admin, max } = deviceScope(u);
    if (!admin && !entitlementFor(u)) return res.status(403).json({ success: false, error: 'An active entitlement is required to authorize a device.' });
    const result = PaymentStore.authorizeDevice({ userId: key, email: verifiedEmail(u), deviceId, deviceName: deviceName || 'Reader Device', platform: platform || 'desktop' });
    if (!result.success) {
      return res.status(403).json({
        success: false,
        reason: result.reason,
        message: admin
          ? 'Admin device exemption limit reached (Max 2 Devices). Please revoke an unused device to authorize this one.'
          : `You have reached the maximum of ${max} authorized devices. Please revoke an unused device to authorize this one.`,
        devices: result.devices,
      });
    }
    res.json({ success: true, device: result.device, activeDevices: result.devices, maxDevices: max });
  });

  app.post('/api/devices/revoke', requireUser, (req, res) => {
    const { deviceId } = req.body || {};
    if (!deviceId) return res.status(400).json({ error: 'deviceId is required' });
    const { key } = deviceScope(req.user!);
    const revoked = PaymentStore.revokeDevice(key, deviceId);
    res.json({
      success: revoked,
      message: revoked ? 'Device revoked successfully. You may now authorize a replacement device.' : 'Device was not found or already inactive.',
      activeDevices: PaymentStore.getUserDevices(key).filter((d) => d.status === 'active'),
    });
  });

  app.post('/api/devices/verify-license', requireUser, (req, res) => {
    const { deviceId, licenseId } = req.body || {};
    if (!deviceId) return res.status(400).json({ valid: false, error: 'Missing credentials' });
    const u = req.user!;
    const { key } = deviceScope(u);
    const active = PaymentStore.getUserDevices(key).find((d) => d.deviceId === deviceId && d.status === 'active');
    if (!active || (!entitlementFor(u) && !isAdminEmail(verifiedEmail(u)))) {
      return res.json({ valid: false, reason: 'Device authorization or entitlement has been revoked or expired.' });
    }
    res.json({
      valid: true,
      renewedLicense: {
        licenseId: licenseId || `LIC-${Date.now()}`,
        userId: u.uid,
        bookId: BOOK_ID,
        bookVersion: 1,
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        authorizedDevice: { deviceId, deviceName: active.deviceName, platform: active.platform },
        offlineEnabled: true,
        licenseVersion: 1,
      },
    });
  });

  app.post('/api/entitlements/issue-token', requireUser, (req, res) => {
    const { deviceId } = req.body || {};
    if (!deviceId) return res.status(400).json({ error: 'deviceId is required' });
    const u = req.user!;
    const ent = entitlementFor(u);
    if (!ent) return res.status(403).json({ error: 'User does not possess an active entitlement for this book' });
    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    res.json({
      success: true,
      payload: {
        tokenId: `TOK_${Date.now()}_${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
        entitlementId: ent.paymentId,
        userId: u.uid,
        bookId: ent.bookId,
        bookVersion: ent.bookVersion,
        deviceId,
        transactionCode: ent.transactionCode,
        scope: 'read:offline',
        issuedAt,
        expiresAt,
        status: 'active',
        watermarkText: ent.watermark,
      },
      expiresAt,
    });
  });

  app.post('/api/entitlements/verify-token', requireUser, (req, res) => {
    const { tokenPayload } = req.body || {};
    if (!tokenPayload || !tokenPayload.userId || !tokenPayload.deviceId) return res.status(400).json({ valid: false, error: 'Invalid token payload' });
    const u = req.user!;
    if (tokenPayload.userId !== u.uid) return res.status(403).json({ valid: false, reason: 'Token does not belong to this account' });
    if (!entitlementFor(u)) return res.json({ valid: false, reason: 'Entitlement not active or revoked on server' });
    if (new Date(tokenPayload.expiresAt).getTime() <= Date.now()) return res.json({ valid: false, reason: 'Offline token lease expired' });
    res.json({ valid: true });
  });

  // ==================== READING PROGRESS & BOOKMARKS ====================
  const ownUid = (req: express.Request, res: express.Response, uid: string) => {
    if (uid !== req.user!.uid) {
      res.status(403).json({ error: 'Forbidden' });
      return false;
    }
    return true;
  };

  app.get('/api/reading-progress/:uid/:bookId', requireUser, (req, res) => {
    const { uid, bookId } = req.params;
    if (!ownUid(req, res, uid)) return;
    res.json(PaymentStore.getReadingProgress(uid, bookId) || { uid, bookId, currentPage: 1, percentage: 0, lastReadAt: null });
  });

  app.post('/api/reading-progress', requireUser, (req, res) => {
    const { bookId, currentPage, percentage } = req.body || {};
    if (!bookId) return res.status(400).json({ error: 'bookId is required' });
    res.json({
      success: true,
      progress: PaymentStore.saveReadingProgress({ uid: req.user!.uid, bookId, currentPage: Number(currentPage) || 1, percentage: Number(percentage) || 0 }),
    });
  });

  app.get('/api/bookmarks/:uid/:bookId', requireUser, (req, res) => {
    if (!ownUid(req, res, req.params.uid)) return;
    res.json({ bookmarks: PaymentStore.getBookmarks(req.params.uid, req.params.bookId) });
  });

  app.post('/api/bookmarks', requireUser, (req, res) => {
    const { bookId, page, chapter, note } = req.body || {};
    if (!bookId || page == null) return res.status(400).json({ error: 'bookId and page are required' });
    res.json({
      success: true,
      bookmarks: PaymentStore.saveBookmark(req.user!.uid, bookId, { page: Number(page), chapter: String(chapter || 'Chapter').slice(0, 200), createdAt: new Date().toISOString(), note: note ? String(note).slice(0, 1000) : undefined }),
    });
  });

  app.delete('/api/bookmarks/:uid/:bookId/:page', requireUser, (req, res) => {
    if (!ownUid(req, res, req.params.uid)) return;
    res.json({ success: true, bookmarks: PaymentStore.deleteBookmark(req.params.uid, req.params.bookId, Number(req.params.page)) });
  });

  // ============================== ADMIN ==============================
  const adminName = (req: express.Request) => (req.user!.email || req.user!.uid).toLowerCase();

  app.get('/api/admin/stats', requireAdmin, (_req, res) => {
    const all = PaymentStore.getAllPayments();
    const verified = all.filter((p) => p.status === 'VERIFIED');
    const requests = PaymentStore.getAllPaymentRequests();
    res.json({
      totalReaders: verified.length,
      verifiedPurchases: verified.length,
      pendingPayments: all.filter((p) => p.status === 'PENDING' || p.status === 'STK_SENT').length,
      underpaidPayments: all.filter((p) => p.status === 'UNDERPAID').length,
      failedPayments: all.filter((p) => ['FAILED', 'REJECTED', 'INVALID_CODE'].includes(p.status)).length,
      manualReviewPayments: all.filter((p) => p.status === 'MANUAL_REVIEW').length,
      duplicatePayments: all.filter((p) => p.status === 'DUPLICATE').length,
      totalPaymentRequests: requests.length,
      pendingRequests: requests.filter((r) => r.status === 'PENDING_REVIEW').length,
      approvedRequests: requests.filter((r) => r.status === 'APPROVED').length,
      rejectedRequests: requests.filter((r) => r.status === 'REJECTED').length,
      revenue: verified.reduce((sum, p) => sum + (p.receivedAmount || p.expectedAmount), 0),
      activeEntitlements: PaymentStore.getEntitlementCount(),
      revokedEntitlements: PaymentStore.getRevokedEntitlementCount(),
      offlineUsers: PaymentStore.getAllDevices().filter((d) => d.status === 'active').length,
      recentPurchases: all.slice(0, 15),
    });
  });

  app.get('/api/admin/payments', requireAdmin, (_req, res) => {
    const all = PaymentStore.getAllPayments();
    res.json({
      payments: all,
      totalCount: all.length,
      verifiedCount: all.filter((p) => p.status === 'VERIFIED').length,
      underpaidCount: all.filter((p) => p.status === 'UNDERPAID').length,
      duplicateCount: all.filter((p) => p.status === 'DUPLICATE').length,
    });
  });

  app.get('/api/admin/sms-logs', requireAdmin, (_req, res) => res.json({ logs: NotificationService.getRecentLogs() }));
  app.get('/api/admin/email-logs', requireAdmin, (_req, res) => res.json({ logs: EmailConfirmationService.getRecentEmailLogs() }));
  app.get('/api/admin/activity', requireAdmin, (_req, res) => res.json({ activity: PaymentStore.getAdminActivity() }));
  app.get('/api/admin/devices', requireAdmin, (_req, res) => res.json({ devices: PaymentStore.getAllDevices() }));

  app.post('/api/admin/book-config', requireAdmin, (req, res) => {
    const { title, subtitle, priceKes, activeVersion, publisher } = req.body || {};
    if (priceKes) {
      const price = Number(priceKes);
      if (!Number.isFinite(price) || price <= 0 || price > 100000) return res.status(400).json({ error: 'Invalid price' });
      PaymentStore.setConfiguredPrice(price);
      PaymentStore.logAdminActivity({ admin: adminName(req), action: 'SET_PRICE', details: String(price) });
    }
    res.json({
      success: true,
      message: 'Book configuration updated successfully.',
      currentConfig: {
        title: title || MANUSCRIPT_V1.metadata.title,
        subtitle: subtitle || MANUSCRIPT_V1.metadata.subtitle,
        priceKes: PaymentStore.getConfig().priceKes,
        activeVersion: activeVersion || 1,
        publisher: publisher || MANUSCRIPT_V1.metadata.publisher,
      },
    });
  });

  app.get('/api/admin/payment-requests', requireAdmin, (_req, res) => {
    const requests = PaymentStore.getAllPaymentRequests();
    res.json({
      success: true,
      requests,
      counts: {
        total: requests.length,
        pending: requests.filter((r) => r.status === 'PENDING_REVIEW').length,
        approved: requests.filter((r) => r.status === 'APPROVED').length,
        rejected: requests.filter((r) => r.status === 'REJECTED').length,
      },
    });
  });

  app.get('/api/admin/mapped-users', requireAdmin, (_req, res) => {
    const users = PaymentStore.getAllPaymentRequests()
      .filter((r) => r.status === 'APPROVED')
      .map((r) => ({
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
        entitlementId: r.entitlementId,
      }));
    res.json({ success: true, totalMappedUsers: users.length, users });
  });

  app.get('/api/admin/notifications/toggle', requireAdmin, (_req, res) =>
    res.json({ success: true, pendingApprovalsNotificationsEnabled: NotificationService.isPendingApprovalsNotificationsEnabled() })
  );

  app.post('/api/admin/notifications/toggle', requireAdmin, (req, res) => {
    const state = NotificationService.setPendingApprovalsNotificationsEnabled(Boolean(req.body?.enabled));
    PaymentStore.logAdminActivity({ admin: adminName(req), action: 'TOGGLE_NOTIFICATIONS', details: String(state) });
    res.json({
      success: true,
      pendingApprovalsNotificationsEnabled: state,
      message: state ? 'Pending approvals notifications activated.' : 'Pending approvals notifications paused.',
    });
  });

  app.post('/api/admin/payment-requests/:requestId/approve', requireAdmin, async (req, res) => {
    const admin = adminName(req);
    try {
      const result = await PaymentStore.approvePaymentRequest(req.params.requestId, admin, req.body?.notes, baseUrlFrom(req));
      PaymentStore.logAdminActivity({ admin, action: 'APPROVE_PAYMENT', target: req.params.requestId, details: result.request.transactionCode });
      res.json({ success: true, message: `Payment request approved by ${admin}. Reader entitlement granted.`, request: result.request, entitlement: result.entitlement });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/payment-requests/:requestId/reject', requireAdmin, async (req, res) => {
    const admin = adminName(req);
    const reason = String(req.body?.reason || 'Payment could not be verified in Pochi records.').slice(0, 500);
    try {
      const result = await PaymentStore.rejectPaymentRequest(req.params.requestId, admin, reason);
      PaymentStore.logAdminActivity({ admin, action: 'REJECT_PAYMENT', target: req.params.requestId, details: reason });
      res.json({ success: true, message: `Payment request rejected by ${admin}. Access remains locked.`, request: result.request });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/payment-requests/:requestId/reassign-approver', requireAdmin, (req, res) => {
    const target = String(req.body?.adminEmail || '').trim().toLowerCase();
    if (!target || !isAdminEmail(target)) return res.status(400).json({ error: 'adminEmail must be an administrator account' });
    try {
      const updated = PaymentStore.updateRequestApprover(req.params.requestId, target);
      PaymentStore.logAdminActivity({ admin: adminName(req), action: 'REASSIGN_APPROVER', target: req.params.requestId, details: target });
      res.json({ success: true, message: `Approval attribution updated to ${target}`, request: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  const deleteUser = (req: express.Request, res: express.Response, target?: string) => {
    if (!target) return res.status(400).json({ success: false, error: 'User identifier (email, uid, or requestId) is required for deletion.' });
    try {
      const result = PaymentStore.deleteAndRevokeUser(target, adminName(req));
      PaymentStore.logAdminActivity({ admin: adminName(req), action: 'DELETE_USER', target, details: JSON.stringify(result.purgedRecords) });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
  app.post('/api/admin/users/delete', requireAdmin, (req, res) => {
    const b = req.body || {};
    deleteUser(req, res, b.userIdentifier || b.email || b.uid || b.requestId);
  });
  app.delete('/api/admin/users/:userIdentifier', requireAdmin, (req, res) => deleteUser(req, res, req.params.userIdentifier));

  app.post('/api/admin/config/pochi', requireAdmin, (req, res) => {
    const { pochiPhone, pochiName, priceKes, instructions } = req.body || {};
    const price = priceKes ? Number(priceKes) : undefined;
    if (price !== undefined && (!Number.isFinite(price) || price <= 0 || price > 100000)) return res.status(400).json({ error: 'Invalid price' });
    PaymentStore.updatePochiConfig({ pochiPhone, pochiName, priceKes: price, instructions });
    PaymentStore.logAdminActivity({ admin: adminName(req), action: 'UPDATE_POCHI_CONFIG', details: JSON.stringify({ pochiPhone, pochiName, priceKes: price }) });
    res.json({ success: true, message: 'Pochi la Biashara configuration updated.', config: PaymentStore.getPochiConfig() });
  });

  app.get('/api/admin/versions', requireAdmin, (_req, res) => {
    res.json({
      bookId: BOOK_ID,
      activeVersion: 1,
      versions: [
        {
          version: 1,
          label: 'Version 1.0 (Official First Edition)',
          pageCount: MANUSCRIPT_V1.metadata.pageCount,
          wordCount: MANUSCRIPT_V1.metadata.wordCount,
          publishedAt: MANUSCRIPT_V1.metadata.publishedAt,
          active: true,
          storagePath: 'books/dating-wrong/v1',
          sectionsCount: MANUSCRIPT_V1.sections.length,
          copyright: MANUSCRIPT_V1.metadata.copyright,
          publisher: MANUSCRIPT_V1.metadata.publisher,
        },
      ],
    });
  });

  // JSON 404 / error handling for the API (never fall through to the SPA's HTML)
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
    console.error('[unhandled]', err?.message);
    res.status(500).json({ error: 'Internal server error' });
  });

  void optionalUser;
  return app;
}
