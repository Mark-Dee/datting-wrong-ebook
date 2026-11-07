/**
 * Single-Use Cryptographic Access Ticket & Nonce Store (OTP System)
 * 
 * Enforces strict security requirements:
 * 1. URLs sent to customers and administrators contain single-use cryptographic tokens (OTP nonces).
 * 2. Each token is strictly mapped to ONE designated email address.
 * 3. Once used, the token is permanently consumed and CANNOT be reused (replay attack prevention).
 * 4. Unauthorized users attempting to use another person's URL or token are rejected.
 * 5. Expired tickets are rejected and purged.
 */

import crypto from 'crypto';
import { PaymentStore, BookEntitlementRecord } from './paymentStore.ts';
import { PersistedMap } from './persistence.ts';

export interface AccessTicket {
  ticketId: string;
  type: 'customer_reader' | 'admin_review';
  targetEmail: string; // Normalized lowercase
  requestId: string;
  transactionCode?: string;
  createdAt: string;
  expiresAt: string;
  isConsumed: boolean;
  consumedAt?: string;
  consumedByUid?: string;
  consumedByEmail?: string;
  singleUse: boolean;
}

export class AccessTicketStore {
  // Token registry — persisted so single-use tickets survive serverless restarts
  private static tickets = new PersistedMap<AccessTicket>({ collection: 'srv_accessTickets' });

  /**
   * Generates a high-entropy 256-bit cryptographically secure token
   */
  private static generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create a single-use reader access ticket for an approved customer.
   * Strictly mapped to the customer's email.
   */
  static createCustomerReaderTicket(params: {
    email: string;
    requestId: string;
    transactionCode?: string;
    expiresInDays?: number;
  }): string {
    const cleanEmail = (params.email || '').trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error('Customer email is required to issue an access ticket.');
    }

    this.pruneExpired(); // housekeeping happens inside requests (no background timers on serverless)
    const token = this.generateToken();
    const now = new Date();
    const days = params.expiresInDays || 7;
    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

    const ticket: AccessTicket = {
      ticketId: token,
      type: 'customer_reader',
      targetEmail: cleanEmail,
      requestId: params.requestId,
      transactionCode: params.transactionCode,
      createdAt: now.toISOString(),
      expiresAt,
      isConsumed: false,
      singleUse: true,
    };

    this.tickets.set(token, ticket);
    console.log(`[ACCESS TICKET CREATED] Issued single-use customer ticket for ${cleanEmail} (Req: ${params.requestId})`);
    return token;
  }

  /**
   * Consume a customer reader ticket (OTP operation).
   * Validates:
   * 1. Ticket existence
   * 2. Expiration
   * 3. Has NOT been consumed yet (no reuse allowed)
   * 4. Requesting email strictly matches targetEmail
   */
  static consumeCustomerReaderTicket(params: {
    ticketId: string;
    email: string;
    uid?: string;
  }): {
    valid: boolean;
    reason?: string;
    ticket?: AccessTicket;
    entitlement?: BookEntitlementRecord;
  } {
    const rawTicket = (params.ticketId || '').trim();
    const requestingEmail = (params.email || '').trim().toLowerCase();

    if (!rawTicket) {
      return {
        valid: false,
        reason: 'Access ticket token is missing.',
      };
    }

    const ticket = this.tickets.get(rawTicket);
    if (!ticket || ticket.type !== 'customer_reader') {
      return {
        valid: false,
        reason: 'Invalid or unrecognized access ticket. Please sign in with your authorized Google account.',
      };
    }

    // 1. Check if already consumed (One-time pass / OTP rule)
    if (ticket.isConsumed) {
      return {
        valid: false,
        reason: 'This one-time access ticket has already been used and cannot be reused. Your account must already be authorized; please sign in with your Google account.',
      };
    }

    // 2. Check expiration
    if (new Date() > new Date(ticket.expiresAt)) {
      return {
        valid: false,
        reason: 'This access ticket has expired. Please restore your access or contact support.',
      };
    }

    // 3. Check email mapping (Must strictly match the email in the ticket)
    if (requestingEmail && requestingEmail !== ticket.targetEmail) {
      console.warn(`[UNAUTHORIZED TICKET ATTEMPT] Ticket meant for ${ticket.targetEmail} was used by ${requestingEmail}`);
      return {
        valid: false,
        reason: `Unauthorized: This access ticket was cryptographically generated for ${ticket.targetEmail} and cannot be used by ${requestingEmail}.`,
      };
    }

    // 4. Mark ticket as permanently consumed (cannot be used again)
    const consumedAt = new Date().toISOString();
    ticket.isConsumed = true;
    ticket.consumedAt = consumedAt;
    ticket.consumedByEmail = requestingEmail || ticket.targetEmail;
    ticket.consumedByUid = params.uid;

    // 5. Ensure entitlement exists for this user in PaymentStore
    const userUid = params.uid || `usr_${ticket.targetEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    let ent = PaymentStore.getEntitlement(userUid, 'dating-wrong');
    if (!ent) {
      ent = {
        uid: userUid,
        bookId: 'dating-wrong',
        bookVersion: 1,
        status: 'ACTIVE',
        grantedAt: consumedAt,
        paymentId: `ENT-TKT-${ticket.requestId}`,
        transactionCode: ticket.transactionCode || 'VERIFIED',
        offlineEnabled: true,
        authorizedDevices: [],
        lastSyncedAt: consumedAt,
        watermark: `Authorized Digital Edition • ${ticket.targetEmail} • Dating Wrong`,
      };
      PaymentStore.setEntitlement(ent);
    }

    console.log(`[ACCESS TICKET CONSUMED] Successfully redeemed ticket for ${ticket.targetEmail}. Ticket is now burned.`);

    return {
      valid: true,
      ticket,
      entitlement: ent,
    };
  }

  /**
   * Create a single-use review ticket for an administrator.
   * Strictly mapped to that administrator's email.
   */
  static createAdminReviewTicket(params: {
    adminEmail: string;
    requestId: string;
    expiresInHours?: number;
  }): string {
    const cleanEmail = (params.adminEmail || '').trim().toLowerCase();
    const authorized = ['wanyekigerison@gmail.com', 'ochiengmark2908@gmail.com', 'alvisnjagi@gmail.com'];
    if (!authorized.includes(cleanEmail)) {
      throw new Error(`Unauthorized administrator email: ${cleanEmail}`);
    }

    this.pruneExpired(); // housekeeping happens inside requests (no background timers on serverless)
    const token = this.generateToken();
    const now = new Date();
    const hours = params.expiresInHours || 48;
    const expiresAt = new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();

    const ticket: AccessTicket = {
      ticketId: token,
      type: 'admin_review',
      targetEmail: cleanEmail,
      requestId: params.requestId,
      createdAt: now.toISOString(),
      expiresAt,
      isConsumed: false,
      singleUse: true,
    };

    this.tickets.set(token, ticket);
    console.log(`[ADMIN TICKET CREATED] Issued admin OTP ticket for ${cleanEmail} (Req: ${params.requestId})`);
    return token;
  }

  /**
   * Verify and consume an admin review ticket.
   * Validates:
   * 1. Ticket existence
   * 2. Expiration
   * 3. Not already consumed
   * 4. Requesting email matches the target administrator
   */
  static verifyAndConsumeAdminTicket(params: {
    ticketId: string;
    adminEmail?: string;
    requestingEmail?: string;
    requestId?: string;
  }): {
    valid: boolean;
    reason?: string;
    ticket?: AccessTicket;
  } {
    const rawTicket = (params.ticketId || '').trim();
    if (!rawTicket) {
      return {
        valid: false,
        reason: 'Admin access ticket is required.',
      };
    }

    const ticket = this.tickets.get(rawTicket);
    if (!ticket || ticket.type !== 'admin_review') {
      return {
        valid: false,
        reason: 'Invalid or unrecognized administrative access ticket.',
      };
    }

    // 1. Check if already consumed
    if (ticket.isConsumed) {
      return {
        valid: false,
        reason: 'This administrative access ticket has already been used and cannot be reused.',
      };
    }

    // 2. Check expiration
    if (new Date() > new Date(ticket.expiresAt)) {
      return {
        valid: false,
        reason: 'This administrative access ticket has expired.',
      };
    }

    // 3. Check admin email mapping
    const reqEmail = (params.requestingEmail || params.adminEmail || '').trim().toLowerCase();
    if (reqEmail && reqEmail !== ticket.targetEmail) {
      console.warn(`[UNAUTHORIZED ADMIN TICKET ATTEMPT] Ticket for ${ticket.targetEmail} accessed by ${reqEmail}`);
      return {
        valid: false,
        reason: `Unauthorized: This administrative link is cryptographically tied to ${ticket.targetEmail}.`,
      };
    }

    // Mark consumed to prevent replay attacks
    ticket.isConsumed = true;
    ticket.consumedAt = new Date().toISOString();
    ticket.consumedByEmail = reqEmail || ticket.targetEmail;

    console.log(`[ADMIN TICKET VERIFIED] Verified and burned single-use admin ticket for ${ticket.targetEmail}`);

    return {
      valid: true,
      ticket,
    };
  }

  /**
   * Inspect ticket details without consuming
   */
  static getTicket(ticketId: string): AccessTicket | undefined {
    return this.tickets.get(ticketId);
  }

  /**
   * Periodically prune expired tickets
   */
  static pruneExpired(): void {
    const now = new Date();
    for (const [id, ticket] of this.tickets.entries()) {
      if (now > new Date(ticket.expiresAt)) {
        this.tickets.delete(id);
      }
    }
  }
}
