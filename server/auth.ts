/**
 * Server-side authentication & authorisation.
 *
 * - Identity comes ONLY from a verified Firebase ID token (Authorization: Bearer …).
 * - Administrator status is decided on the server (custom claim, verified admin
 *   e-mail, or users/{uid}.role == 'admin') — never from request headers/body.
 */
import type { NextFunction, Request, Response } from 'express';
import { isAdminEmail } from './config.ts';
import { Persistence } from './persistence.ts';

export interface VerifiedUser {
  uid: string;
  email?: string;
  emailVerified: boolean;
  claims: Record<string, unknown>;
}

export type TokenVerifier = (idToken: string) => Promise<VerifiedUser>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: VerifiedUser;
      isAdmin?: boolean;
    }
  }
}

export function firebaseTokenVerifier(auth: { verifyIdToken(t: string): Promise<any> }): TokenVerifier {
  return async (idToken) => {
    const d = await auth.verifyIdToken(idToken);
    return {
      uid: d.uid,
      email: d.email ? String(d.email).toLowerCase() : undefined,
      emailVerified: !!d.email_verified,
      claims: d,
    };
  };
}

function bearer(req: Request): string | null {
  const h = req.headers.authorization;
  if (!h || !/^Bearer\s+/i.test(h)) return null;
  return h.replace(/^Bearer\s+/i, '').trim() || null;
}

export function makeAuth(verify: TokenVerifier) {
  /** Attaches req.user when a valid token is supplied; never rejects. */
  const optionalUser = async (req: Request, _res: Response, next: NextFunction) => {
    const token = bearer(req);
    if (token) {
      try {
        req.user = await verify(token);
      } catch {
        /* invalid token => treated as anonymous */
      }
    }
    next();
  };

  const requireUser = async (req: Request, res: Response, next: NextFunction) => {
    const token = bearer(req);
    if (!token) return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    try {
      req.user = await verify(token);
      next();
    } catch {
      res.status(401).json({ error: 'Your session is invalid or has expired. Please sign in again.' });
    }
  };

  const resolveIsAdmin = async (user: VerifiedUser): Promise<boolean> => {
    if (user.claims.admin === true) return true;
    if (user.email && user.emailVerified && isAdminEmail(user.email)) return true;
    try {
      if (Persistence.isConfigured) {
        const doc = await Persistence.backend.get('users', user.uid);
        if (doc && doc.role === 'admin') return true;
      }
    } catch {
      /* fall through */
    }
    return false;
  };

  const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
    await requireUser(req, res, async () => {
      const ok = await resolveIsAdmin(req.user!);
      if (!ok) return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
      req.isAdmin = true;
      next();
    });
  };

  return { optionalUser, requireUser, requireAdmin, resolveIsAdmin };
}
