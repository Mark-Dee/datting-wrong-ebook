# Repair & testing report — Dating Wrong

## Confirmed defects found (reproduced against the original code) and fixes
| # | Severity | Original problem | Fix |
|---|---|---|---|
| 1 | Critical | `POST /api/book/content` unlocked the book for any `ENT-…` string or 9-digit phone | Requires verified token + ACTIVE entitlement |
| 2 | Critical | Whole manuscript shipped in the public JS bundle | Moved to `server/book/`; served by `GET /api/book/pages` only to entitled readers. Verified: chapter text absent from `dist/assets/*.js` |
| 3 | Critical | Admin auth trusted `x-user-role` / `x-admin-email` headers | Firebase ID-token verification; admin decided server-side |
| 4 | Critical | Free-book backdoors: `/payments/mpesa/confirm-pin-entry`, `/payments/verify-sms-or-receipt`, unauthenticated `/payments/mpesa/reconcile` (fabricated receipt) | Removed / admin-only and provider-confirmed |
| 5 | Critical | All payments, entitlements, tickets, logs in in-memory `Map`s (lost on every Vercel cold start) | Firestore-backed `PersistedMap`; flushed before each response |
| 6 | Critical | No Vercel architecture (long-running `app.listen`) | `createApp()` + `api/index.js` Function + `vercel.json` |
| 7 | High | Unauthenticated `/api/admin/payments`, `/api/admin/versions`; uid/email taken from request bodies | All identity from token; ownership checks |
| 8 | High | Client could set the payment amount (`/mpesa/initiate`); fake STK responses; hard-coded sandbox passkey | Server-side price; no fabricated responses; 503 if Daraja not configured |
| 9 | High | Daraja callback public & unsigned, trusted on its own | Needs known session + optional secret + server-to-server STK Query confirmation |
| 10 | High | Firestore rules: any user could create `users/{uid}` with `role:'admin'`; clients could self-create `entitlements`/`payments` | Rules tightened (`firestore.rules`) |
| 11 | High | SMS "sent" with fabricated message ids (no provider) | Africa's Talking client; otherwise honestly `simulated` |
| 12 | Medium | `getAllPayments` returned each session twice (inflated revenue) | Single key per payment |
| 13 | Medium | Duplicate-code race between concurrent approvals | Atomic Firestore `create()` claim; tested |
| 14 | Medium | Hourly `setInterval` (breaks serverless) | Pruning inside requests |
| 15 | Medium | Fuzzy device-key matching (`key.includes(userId)`) | Exact keys only |
| — | Info | New: admin activity audit log, `GET /api/admin/activity`, `/api/admin/devices` | |

Collection names (`payments`, `paymentRequests`, `bookEntitlements`, `usedTransactions`) match the existing Firestore model; new server-only collections are prefixed `srv_`.

## Test results
| Test | Result | Evidence |
|---|---|---|
| Dependency installation | PASS | `npm install` (428 pkgs) |
| TypeScript check | PASS | `npm run lint` → 0 errors |
| Production build | PASS | `npm run build` |
| API test suite | PASS | `npm test` → 19/19 (scenarios 1–7, race, forged headers, backdoors, daraja) |
| Chapter text not in bundle | PASS | probe of 5 phrases → absent |
| Vercel packaging | PASS | `vercel build` locally; packaged function served `/api/health`, 401s |
| Frontend in a browser | **BLOCKED** | no browser available here; UI not visually tested |
| Real Firestore backend | **BLOCKED** | needs your service account; backend implemented but only the in-memory twin was executed |
| Real Firebase ID-token verification | **BLOCKED** | tests inject a verifier; `firebase-admin` `verifyIdToken` path not exercised |
| Firestore rules | **BLOCKED** | edited, not run in the emulator |
| SMS / e-mail / Daraja | **BLOCKED** | no credentials |
| Vercel preview deployment | **BLOCKED** | needs your Vercel account |

## Needs the owner
Service-account JSON, Vercel env vars, Firebase Authorized Domains, deploy rules, optional SMS/e-mail/M-PESA credentials (see `DEPLOY.md`).

## Behaviour changes to be aware of
- Customers must sign in; e-mail-based lookups (restore, legacy entitlement match) require a **verified** e-mail.
- The old client-side demo paths (`restoreEntitlement` granting from any 8+ char string, client-written `entitlements` docs) no longer unlock anything — the server decides.
- The admin dashboard still mirrors approvals into Firestore from the browser; this is harmless (rules allow admins only) and server state is authoritative.
- Each `/api` request reads the small Firestore collections; fine for one book at this scale.
- "Registered users" is not in `/api/admin/stats` (users live only in Firebase Auth).
