# Deploying to Vercel

## One-time setup
1. **Firebase service account**: Firebase Console → Project settings → Service accounts → *Generate new private key*.
2. **Vercel env vars** (Project → Settings → Environment Variables, Production + Preview):
   - `FIREBASE_SERVICE_ACCOUNT_JSON` = the whole JSON (paste as-is)
   - `APP_URL` = `https://<your-domain>`
   - optional: `ADMIN_EMAILS`, `AT_USERNAME`/`AT_API_KEY` (SMS), `GMAIL_USER`/`GMAIL_PASS` (e-mail), `MPESA_*` (STK Push). See `.env.example`.
3. **Firebase Console → Authentication → Settings → Authorized domains**: add your `*.vercel.app` preview domain and your production domain (fixes `auth/unauthorized-domain`).
4. **Deploy the hardened rules**: `npx firebase-tools deploy --only firestore:rules` (uses `firestore.rules`).
5. Make sure the admin accounts sign in with a **verified** e-mail (Google sign-in is).

## Commands
```bash
npm install
npm test && npm run lint
npx vercel                 # preview deployment  -> test it
npx vercel --prod          # production (only after you approve the preview)
```
Vercel runs `npm run build` to generate the frontend in `dist/`, deploys the checked-in `api/index.js` function bundle, and routes `/api/*` to it (`vercel.json`).

## Post-deploy checks
- `GET /api/health` → `"storage":"firestore"` (if `"unconfigured"`, the service-account variable is missing).
- Sign in → submit a test Pochi SMS → approve it in the admin dashboard → redeploy → the record is still there.
- Open DevTools → Network: `/assets/*.js` must not contain chapter text.
