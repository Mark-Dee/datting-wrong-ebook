/**
 * End-to-end API tests. They exercise the real Express app and the real persistence layer
 * against the in-memory document backend (the Firestore backend implements the same interface).
 * Identity is supplied through an injected token verifier; production uses Firebase Admin.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from '../server/app.ts';
import { MemoryBackend, Persistence } from '../server/persistence.ts';
import type { TokenVerifier } from '../server/auth.ts';

// token format: "<uid>|<email>|<verified 1/0>"
const verifyIdToken: TokenVerifier = async (t) => {
  const [uid, email, v] = t.split('|');
  if (!uid || !email) throw new Error('bad token');
  return { uid, email, emailVerified: v === '1', claims: {} };
};
const backend = new MemoryBackend();
Persistence.setBackend(backend);

let base = '';
let server: import('node:http').Server;
const ADMIN = 'adm1|alvisnjagi@gmail.com|1';
const alice = 'alice-uid|alice@example.com|1';
const bob = 'bob-uid|bob@example.com|1';
const mallory = 'mal-uid|mallory@example.com|1';

const call = async (method: string, path: string, token?: string, body?: unknown) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* */ }
  return { status: res.status, json };
};

const sms = (code: string, amount = '750.00') =>
  `${code} Confirmed. Ksh${amount} sent to Alvis Njagi 0701870142 on 11/9/26 at 10:42 AM. New M-PESA balance is Ksh1,240.00. Transaction cost, Ksh0.00.`;

before(async () => {
  const app = createApp({ verifyIdToken });
  await new Promise<void>((r) => {
    server = app.listen(0, () => { base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`; r(); });
  });
});

after(() => { server.close(); server.closeAllConnections?.(); });

test('health responds without auth and reports storage', async () => {
  const r = await call('GET', '/api/health');
  assert.equal(r.status, 200);
  assert.equal(r.json.storage, 'memory');
});

test('previously problematic routes exist with the correct methods', async () => {
  assert.equal((await call('GET', '/api/config/pochi')).status, 200);
  assert.equal((await call('POST', '/api/payments/pochi/submit-sms')).status, 401); // exists, needs auth
  assert.equal((await call('GET', '/api/payments/pochi/user-requests')).status, 401);
  assert.equal((await call('POST', '/api/entitlements/check')).status, 401);
  const unknown = await call('GET', '/api/does-not-exist');
  assert.equal(unknown.status, 404);
  assert.ok(unknown.json?.error, 'unknown API routes return JSON, not HTML');
});

test('Scenario 5: normal users and forged headers cannot reach admin APIs', async () => {
  for (const p of ['/api/admin/stats', '/api/admin/payments', '/api/admin/payment-requests', '/api/admin/versions']) {
    assert.equal((await call('GET', p)).status, 401, p + ' anonymous');
    assert.equal((await call('GET', p, alice)).status, 403, p + ' normal user');
  }
  const forged = await fetch(base + '/api/admin/stats', { headers: { 'x-user-role': 'admin', 'x-admin-email': 'alvisnjagi@gmail.com' } });
  assert.equal(forged.status, 401, 'forged admin headers are ignored');
  // unverified e-mail of an admin address is NOT admin
  assert.equal((await call('GET', '/api/admin/stats', 'x|alvisnjagi@gmail.com|0')).status, 403);
  assert.equal((await call('GET', '/api/admin/stats', ADMIN)).status, 200);
});

test('Scenario 7: book content is denied without an entitlement (including old bypasses)', async () => {
  assert.equal((await call('GET', '/api/book/pages')).status, 401);
  assert.equal((await call('GET', '/api/book/pages', alice)).status, 403);
  assert.equal((await call('POST', '/api/book/content', alice, { entitlementId: 'ENT-fake', phone: '123456789' })).status, 403);
  assert.equal((await call('POST', '/api/book/content', undefined, { entitlementId: 'ENT-fake' })).status, 401);
});

test('free-grant backdoors are gone', async () => {
  assert.equal((await call('POST', '/api/payments/mpesa/confirm-pin-entry', alice, { uid: 'alice-uid' })).status, 404);
  assert.equal((await call('POST', '/api/payments/verify-sms-or-receipt', alice, { receiptCode: 'ABCDEFGH12' })).status, 404);
  assert.equal((await call('POST', '/api/payments/mpesa/reconcile/x', alice)).status, 403);
});

let aliceRequestId = '';

test('Scenario 2: pending payment does not unlock the book', async () => {
  const r = await call('POST', '/api/payments/pochi/submit-sms', alice, { submittedSms: sms('RK72QM9XLP'), senderPhone: '0712345678', customerName: 'Alice' });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.status, 'PENDING_REVIEW');
  aliceRequestId = r.json.requestId;
  assert.equal((await call('GET', '/api/book/pages', alice)).status, 403);
  const check = await call('POST', '/api/entitlements/check', alice, {});
  assert.equal(check.json.authorized, false);
});

test('validation: underpaid, malformed and identity-spoofed submissions are rejected', async () => {
  const under = await call('POST', '/api/payments/pochi/submit-sms', bob, { submittedSms: sms('QWE12RTY34', '100.00'), senderPhone: '0711111111' });
  assert.equal(under.status, 400);
  const junk = await call('POST', '/api/payments/pochi/submit-sms', bob, { submittedSms: 'hello this is not an mpesa message at all', senderPhone: '0711111111' });
  assert.equal(junk.status, 400);
  // body uid/email are ignored: request is stored under the token identity
  const spoof = await call('POST', '/api/payments/pochi/submit-sms', mallory, { uid: 'alice-uid', email: 'alice@example.com', submittedSms: sms('ZXC98VBN76'), senderPhone: '0722222222' });
  assert.equal(spoof.status, 200);
  assert.equal(spoof.json.request.uid, 'mal-uid');
  assert.equal(spoof.json.request.email, 'mallory@example.com');
});

test('Scenario 4: duplicate transaction is rejected / idempotent and never double-grants', async () => {
  // same user resubmits the same code -> same pending request returned
  const again = await call('POST', '/api/payments/pochi/submit-sms', alice, { submittedSms: sms('RK72QM9XLP'), senderPhone: '0712345678' });
  assert.equal(again.status, 200);
  assert.equal(again.json.requestId, aliceRequestId);
  assert.equal(again.json.duplicate, true);
});

test('users cannot approve their own payment or read others’ requests', async () => {
  assert.equal((await call('POST', `/api/admin/payment-requests/${aliceRequestId}/approve`, alice)).status, 403);
  assert.equal((await call('GET', `/api/payments/pochi/request-status/${aliceRequestId}`, bob)).status, 404);
  assert.equal((await call('GET', `/api/payments/pochi/request-status/${aliceRequestId}`, alice)).status, 200);
});

test('Scenario 3: rejected payment keeps the book locked', async () => {
  const r = await call('POST', '/api/payments/pochi/submit-sms', bob, { submittedSms: sms('BOB1234567'), senderPhone: '0733333333' });
  assert.equal(r.status, 200);
  const rej = await call('POST', `/api/admin/payment-requests/${r.json.requestId}/reject`, ADMIN, { reason: 'No matching Pochi record' });
  assert.equal(rej.status, 200);
  assert.equal(rej.json.request.status, 'REJECTED');
  assert.equal((await call('GET', '/api/book/pages', bob)).status, 403);
});

test('Scenario 1: approval creates exactly one entitlement and unlocks the book', async () => {
  const ok = await call('POST', `/api/admin/payment-requests/${aliceRequestId}/approve`, ADMIN, {});
  assert.equal(ok.status, 200, JSON.stringify(ok.json));
  assert.equal(ok.json.entitlement.status, 'ACTIVE');
  // approving again is idempotent
  const again = await call('POST', `/api/admin/payment-requests/${aliceRequestId}/approve`, ADMIN, {});
  assert.equal(again.status, 200);
  const stats = (await call('GET', '/api/admin/stats', ADMIN)).json;
  assert.equal(stats.activeEntitlements, 1);

  const pages = await call('GET', '/api/book/pages', alice);
  assert.equal(pages.status, 200);
  assert.ok(pages.json.pages.length >= 100, 'full manuscript delivered to the entitled reader');
  assert.equal((await call('GET', '/api/book/pages', bob)).status, 403, 'other users still locked');
  assert.equal((await call('POST', '/api/entitlements/check', alice, {})).json.authorized, true);
});

test('Scenario 4b: a code approved for Alice cannot be claimed by another account', async () => {
  const r = await call('POST', '/api/payments/pochi/submit-sms', mallory, { submittedSms: sms('RK72QM9XLP'), senderPhone: '0744444444' });
  assert.equal(r.status, 400, 'already-used code is refused at submission');
  assert.match(r.json.error, /already/i);
});

test('race: two pending requests for one code can only be approved once', async () => {
  const a = await call('POST', '/api/payments/pochi/submit-sms', bob, { submittedSms: sms('RACE123456'), senderPhone: '0755555555' });
  const m = await call('POST', '/api/payments/pochi/submit-sms', mallory, { submittedSms: sms('RACE123456'), senderPhone: '0766666666' });
  assert.equal(a.status, 200);
  assert.equal(m.status, 200);
  const [x, y] = await Promise.all([
    call('POST', `/api/admin/payment-requests/${a.json.requestId}/approve`, ADMIN, {}),
    call('POST', `/api/admin/payment-requests/${m.json.requestId}/approve`, ADMIN, {}),
  ]);
  assert.deepEqual([x.status, y.status].sort(), [200, 400]);
});

test('Scenario 6: records survive a cold start / redeploy', async () => {
  const before = (await call('GET', '/api/admin/stats', ADMIN)).json;
  Persistence.resetLocalState(); // forget every in-process copy
  const after = (await call('GET', '/api/admin/stats', ADMIN)).json;
  assert.equal(after.activeEntitlements, before.activeEntitlements);
  assert.equal(after.totalPaymentRequests, before.totalPaymentRequests);
  assert.equal((await call('GET', '/api/book/pages', alice)).status, 200, 'entitlement still honoured after restart');
  assert.ok(Object.keys(backend.dump('usedTransactions')).includes('RK72QM9XLP'));
  assert.ok(Object.keys(backend.dump('bookEntitlements')).includes('alice-uid_dating-wrong'));
});

test('admin activity is audited and logs are persisted', async () => {
  const act = (await call('GET', '/api/admin/activity', ADMIN)).json.activity;
  assert.ok(act.some((a: any) => a.action === 'APPROVE_PAYMENT'));
  assert.ok(act.some((a: any) => a.action === 'REJECT_PAYMENT'));
  const sms = (await call('GET', '/api/admin/sms-logs', ADMIN)).json.logs;
  assert.ok(sms.length > 0);
  assert.ok(sms.every((l: any) => l.recipients.every((r: any) => r.status !== 'sent')), 'no SMS is reported "sent" without a provider');
});

test('reading progress & bookmarks are private to the owner', async () => {
  assert.equal((await call('GET', '/api/reading-progress/alice-uid/dating-wrong', bob)).status, 403);
  const save = await call('POST', '/api/reading-progress', alice, { uid: 'bob-uid', bookId: 'dating-wrong', currentPage: 12, percentage: 10 });
  assert.equal(save.json.progress.uid, 'alice-uid');
});

test('devices: identity comes from the token and limits are enforced', async () => {
  for (let i = 1; i <= 3; i++) {
    assert.equal((await call('POST', '/api/devices/authorize', alice, { deviceId: `d${i}`, deviceName: `D${i}` })).status, 200);
  }
  assert.equal((await call('POST', '/api/devices/authorize', alice, { deviceId: 'd4' })).status, 403);
  assert.equal((await call('POST', '/api/devices/authorize', 'carol-uid|carol@example.com|1', { deviceId: 'c1' })).status, 403, 'no entitlement, no device');
});

test('daraja callback cannot grant access without provider confirmation', async () => {
  const res = await call('POST', '/api/payments/daraja/callback', undefined, {
    Body: { stkCallback: { MerchantRequestID: 'm', CheckoutRequestID: 'ws_CO_FAKE', ResultCode: 0, ResultDesc: 'ok',
      CallbackMetadata: { Item: [{ Name: 'Amount', Value: 750 }, { Name: 'MpesaReceiptNumber', Value: 'FAKE123456' }] } } },
  });
  assert.equal(res.status, 200);
  assert.equal((await call('GET', '/api/book/pages', mallory)).status, 403);
});

test('STK initiation refuses to fabricate prompts when Daraja is not configured', async () => {
  const r = await call('POST', '/api/payments/mpesa/initiate', alice, { phone: '0712345678' });
  assert.equal(r.status, 503);
});
