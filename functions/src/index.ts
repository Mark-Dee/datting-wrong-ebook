import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';
import { parseMpesaConfirmationSms } from './mpesaParser';

// Initialize Firebase Admin SDK
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

// System-wide default configuration
export const BOOK_PRICE_KES = 750;
export const OFFICIAL_POCHI_NAME = 'Alvis Njagi';
export const OFFICIAL_POCHI_PHONE = '0701870142'; // 0701 870 142 / 254701870142

// Default Administrator Emails
const DEFAULT_ADMIN_EMAILS = [
  'alvisnjagi@gmail.com',
  'wanyekigerison@gmail.com',
  'ochiengmark2908@gmail.com',
];

// 3 Designated Administrators configured via environment variables with defaults
export const ADMIN_NOTIFICATION_RECIPIENTS = [
  {
    name: 'Mark',
    role: 'Publisher',
    email: process.env.ADMIN_MARK_EMAIL || 'ochiengmark2908@gmail.com',
    phone: process.env.ADMIN_MARK_PHONE || '+254100597740',
  },
  {
    name: 'Gerishon Wanyeki',
    role: 'Author',
    email: process.env.ADMIN_GERISHON_EMAIL || 'wanyekigerison@gmail.com',
    phone: process.env.ADMIN_GERISHON_PHONE || '+254799507537',
  },
  {
    name: 'Alvis Njagi',
    role: 'Publisher / Tech Lead',
    email: process.env.ADMIN_ALVIS_EMAIL || 'alvisnjagi@gmail.com',
    phone: process.env.ADMIN_ALVIS_PHONE || '+254701870142',
  },
];

/**
 * Helper to get project & dashboard URLs for deep linking
 */
function getDeepLinks(requestId: string) {
  const dashboardBase =
    process.env.ADMIN_DASHBOARD_URL ||
    process.env.APP_URL ||
    '';
  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '';
  const databaseId =
    process.env.FIRESTORE_DATABASE_ID ||
    'ai-studio-datingwrongbyger-7148f8d1-9dc9-4edc-9876-4352495da2c9';

  const dashboardUrl = `${dashboardBase}/?admin=true&tab=pochi_approvals&requestId=${requestId}`;
  const firestoreUrl = `https://console.firebase.google.com/project/${projectId}/firestore/databases/${databaseId}/data/~2FpaymentRequests~2F${requestId}`;

  return { dashboardUrl, firestoreUrl, dashboardBase };
}

/**
 * Configure Nodemailer transport using Gmail or custom SMTP
 * Prioritizes Gmail integration with sender identity Dating Wrong
 */
function getNodemailerTransport(): any {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.GMAIL_PASS || process.env.SMTP_PASS;

  if (user && pass) {
    try {
      // Direct Gmail service integration
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user,
          pass,
        },
      });
    } catch (err) {
      console.warn('[Gmail Nodemailer Init Warning]', err);
    }
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } catch (err) {
      console.warn('[SMTP Nodemailer Init Warning]', err);
    }
  }
  return null;
}

/**
 * Verify administrator privileges
 */
function isAdministrator(email?: string): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return (
    DEFAULT_ADMIN_EMAILS.includes(clean) ||
    clean.endsWith('@markalvis.ke') ||
    clean === (process.env.ADMIN_MARK_EMAIL || '').toLowerCase() ||
    clean === (process.env.ADMIN_GERISHON_EMAIL || '').toLowerCase() ||
    clean === (process.env.ADMIN_ALVIS_EMAIL || '').toLowerCase()
  );
}

/**
 * Dispatch notification alerts to all 3 administrators (Mark, Gerishon, Alvis)
 * Sends Email via Nodemailer and SMS summary to each admin.
 */
export async function notifyAdministrators(payload: {
  requestId: string;
  customerName: string;
  authorizedEmail: string;
  senderPhone: string;
  amount: number;
  transactionCode: string;
  transactionTimeInSms: string;
  submittedAt: string;
  originalSms: string;
}) {
  const { dashboardUrl, firestoreUrl } = getDeepLinks(payload.requestId);

  const smsSummary =
    `DATING WRONG — PAYMENT REVIEW\n` +
    `New payment verification request\n\n` +
    `Customer Name: ${payload.customerName}\n` +
    `Google Account Email: ${payload.authorizedEmail}\n` +
    `M-PESA Sender Phone: ${payload.senderPhone}\n` +
    `Amount Reported: KSh ${payload.amount}\n` +
    `Transaction Code: ${payload.transactionCode}\n` +
    `Transaction Date & Time: ${payload.transactionTimeInSms}\n` +
    `Recipient Details: ${OFFICIAL_POCHI_NAME} (${OFFICIAL_POCHI_PHONE})\n` +
    `Request Status: PENDING ADMIN APPROVAL\n` +
    `Review Payment: ${dashboardUrl}`;

  const emailText =
    `Dear Admin Team,\n\n` +
    `A new payment verification request has been submitted on the Dating Wrong website. Your review is required before access to the book can be granted.\n\n` +
    `CUSTOMER DETAILS\n` +
    `- Customer Name: ${payload.customerName}\n` +
    `- Google Account Email: ${payload.authorizedEmail}\n` +
    `- M-PESA Sender Phone: ${payload.senderPhone}\n` +
    `- Amount Reported: KSh ${payload.amount}\n` +
    `- Transaction Code: ${payload.transactionCode}\n` +
    `- Transaction Date & Time: ${payload.transactionTimeInSms}\n` +
    `- Submission Date & Time: ${payload.submittedAt}\n` +
    `- Recipient Details: ${OFFICIAL_POCHI_NAME} (${OFFICIAL_POCHI_PHONE})\n` +
    `- Request Status: PENDING ADMIN APPROVAL\n\n` +
    `SUBMITTED M-PESA CONFIRMATION SMS\n\n` +
    `${payload.originalSms}\n\n` +
    `ACTION REQUIRED\n\n` +
    `Please compare the submitted confirmation SMS with the genuine M-PESA Pochi la Biashara transaction records. Verify the transaction code, amount received, sender details, recipient details, and transaction time. Check that the transaction has not already been used to authorize another purchase.\n\n` +
    `If the payment is valid and the required amount has been received, any one administrator may approve the request through the admin dashboard. If the payment is invalid, duplicated, or insufficient, reject it or flag it for further review as appropriate.\n\n` +
    `Important: Do not grant access based solely on the pasted SMS. Access should only be activated after verification and approval.\n\n` +
    `The approved Google account email above is the account that must receive access to the book.\n\n` +
    `Review Payment: ${dashboardUrl}\n\n` +
    `Regards,\n` +
    `Dating Wrong Website\n` +
    `Published by Mark & Alvis`;

  const emailHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #E2D7C5; background-color: #FAF6F0; color: #201D1A; border-radius: 4px; line-height: 1.5;">
      <div style="border-bottom: 2px solid #991B1B; padding-bottom: 12px; margin-bottom: 18px;">
        <h2 style="margin: 0; color: #991B1B; font-size: 18px; text-transform: uppercase; letter-spacing: 0.1em;">Dating Wrong Website</h2>
        <p style="margin: 4px 0 0; font-size: 13px; color: #78350F; font-weight: bold;">Published by Mark &amp; Alvis</p>
      </div>
      
      <p style="margin: 0 0 14px 0; font-size: 15px; color: #171412;">Dear Admin Team,</p>
      <p style="margin: 0 0 16px 0; font-size: 14px; color: #2C2825;">
        A new payment verification request has been submitted on the Dating Wrong website. Your review is required before access to the book can be granted.
      </p>

      <div style="background-color: #FFFFFF; border: 1px solid #E8E0D2; border-radius: 4px; padding: 14px 18px; margin-bottom: 18px;">
        <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #78350F;">CUSTOMER DETAILS</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr style="border-bottom: 1px solid #F0EAE1;">
            <td style="padding: 6px 0; font-weight: bold; width: 190px; color: #574E44;">Customer Name:</td>
            <td style="padding: 6px 0; color: #171412; font-weight: 600;">${payload.customerName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #F0EAE1;">
            <td style="padding: 6px 0; font-weight: bold; color: #574E44;">Google Account Email:</td>
            <td style="padding: 6px 0; color: #047857; font-weight: bold;">${payload.authorizedEmail}</td>
          </tr>
          <tr style="border-bottom: 1px solid #F0EAE1;">
            <td style="padding: 6px 0; font-weight: bold; color: #574E44;">M-PESA Sender Phone:</td>
            <td style="padding: 6px 0; font-family: monospace;">${payload.senderPhone}</td>
          </tr>
          <tr style="border-bottom: 1px solid #F0EAE1;">
            <td style="padding: 6px 0; font-weight: bold; color: #574E44;">Amount Reported:</td>
            <td style="padding: 6px 0; color: #991B1B; font-weight: bold; font-size: 14px;">KSh ${payload.amount}</td>
          </tr>
          <tr style="border-bottom: 1px solid #F0EAE1;">
            <td style="padding: 6px 0; font-weight: bold; color: #574E44;">Transaction Code:</td>
            <td style="padding: 6px 0; font-family: monospace; font-weight: bold; letter-spacing: 0.05em; color: #78350F;">${payload.transactionCode}</td>
          </tr>
          <tr style="border-bottom: 1px solid #F0EAE1;">
            <td style="padding: 6px 0; font-weight: bold; color: #574E44;">Transaction Date &amp; Time:</td>
            <td style="padding: 6px 0;">${payload.transactionTimeInSms}</td>
          </tr>
          <tr style="border-bottom: 1px solid #F0EAE1;">
            <td style="padding: 6px 0; font-weight: bold; color: #574E44;">Submission Date &amp; Time:</td>
            <td style="padding: 6px 0; color: #786C5E;">${payload.submittedAt}</td>
          </tr>
          <tr style="border-bottom: 1px solid #F0EAE1;">
            <td style="padding: 6px 0; font-weight: bold; color: #574E44;">Recipient Details:</td>
            <td style="padding: 6px 0;">${OFFICIAL_POCHI_NAME} (${OFFICIAL_POCHI_PHONE})</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: bold; color: #574E44;">Request Status:</td>
            <td style="padding: 6px 0;"><span style="background: #FEF3C7; color: #92400E; padding: 2px 8px; border-radius: 2px; font-weight: bold; font-size: 11px;">PENDING ADMIN APPROVAL</span></td>
          </tr>
        </table>
      </div>

      <div style="margin-bottom: 18px; padding: 14px; background: #FFFFFF; border: 1px dashed #C4A47C; border-radius: 4px;">
        <p style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; font-weight: bold; color: #78350F;">SUBMITTED M-PESA CONFIRMATION SMS</p>
        <blockquote style="margin: 0; font-family: monospace; font-size: 12px; line-height: 1.5; color: #1F2937; white-space: pre-wrap; word-break: break-all;">${payload.originalSms}</blockquote>
      </div>

      <div style="margin-bottom: 18px;">
        <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #78350F;">ACTION REQUIRED</p>
        <p style="margin: 0 0 10px 0; font-size: 13px; color: #2C2825;">
          Please compare the submitted confirmation SMS with the genuine M-PESA Pochi la Biashara transaction records. Verify the transaction code, amount received, sender details, recipient details, and transaction time. Check that the transaction has not already been used to authorize another purchase.
        </p>
        <p style="margin: 0 0 10px 0; font-size: 13px; color: #2C2825;">
          If the payment is valid and the required amount has been received, any one administrator may approve the request through the admin dashboard. If the payment is invalid, duplicated, or insufficient, reject it or flag it for further review as appropriate.
        </p>
        <p style="margin: 0 0 10px 0; font-size: 13px; color: #991B1B; font-weight: 600;">
          Important: Do not grant access based solely on the pasted SMS. Access should only be activated after verification and approval.
        </p>
        <p style="margin: 0 0 14px 0; font-size: 13px; color: #2C2825;">
          The approved Google account email above is the account that must receive access to the book.
        </p>
      </div>

      <!-- Direct Approval Buttons & Deep Links -->
      <div style="margin: 20px 0; padding: 16px; background-color: #F5EFE4; border: 1px solid #DDD3C2; border-radius: 4px; text-align: center;">
        <div style="margin-bottom: 10px;">
          <a href="${dashboardUrl}" style="display: inline-block; background-color: #991B1B; color: #FAF7F2; padding: 11px 24px; text-decoration: none; font-weight: bold; font-size: 13px; border-radius: 2px; text-transform: uppercase; letter-spacing: 0.5px;">
            Review Payment: Buy Book Approvals
          </a>
        </div>
        <div>
          <a href="${firestoreUrl}" style="color: #8C6D46; font-size: 12px; text-decoration: underline;">
            Direct Firestore Document Path
          </a>
        </div>
      </div>

      <div style="margin-top: 20px; font-size: 13px; color: #574E44; border-top: 1px solid #E8E0D2; padding-top: 14px;">
        <p style="margin: 0 0 4px 0;">Regards,</p>
        <p style="margin: 0 0 2px 0; font-weight: bold; color: #171412;">Dating Wrong Website</p>
        <p style="margin: 0; color: #78350F;">Published by Mark &amp; Alvis</p>
      </div>
    </div>
  `;

  console.log(`\n=============================================================`);
  console.log(`🚨 DATING WRONG — POCHI PAYMENT VERIFICATION ALERT (3 ADMINS)`);
  console.log(`Recipients: Mark, Gerishon, Alvis`);
  console.log(`Buy Book Approvals Link: ${dashboardUrl}`);
  console.log(`Firestore Console Link: ${firestoreUrl}`);
  console.log(`=============================================================`);
  console.log(emailText);
  console.log(`=============================================================\n`);

  // Attempt real email dispatch via Nodemailer (Gmail / SMTP)
  const transporter = getNodemailerTransport();
  const mailSender = process.env.GMAIL_USER || process.env.SMTP_USER || 'alerts@datingwrong.ke';
  const fromAddress = process.env.SMTP_FROM || `"Dating Wrong" <${mailSender}>`;

  for (const admin of ADMIN_NOTIFICATION_RECIPIENTS) {
    if (transporter) {
      try {
        await transporter.sendMail({
          from: fromAddress,
          to: admin.email,
          subject: `[ACTION REQUIRED] New Pochi Payment Review: ${payload.transactionCode} (KSh ${payload.amount})`,
          text: emailText,
          html: emailHtml,
        });
        console.log(`[Cloud Function Nodemailer] Email alert delivered to ${admin.name} (${admin.email})`);
      } catch (err: any) {
        console.warn(`[Cloud Function Nodemailer Error for ${admin.email}]`, err.message);
      }
    }

    console.log(`[Cloud Function SMS Summary] Sent to ${admin.name} at ${admin.phone}:\n${smsSummary}`);
  }

  // Record audit alert log in Firestore adminAlertLogs
  try {
    await db.collection('adminAlertLogs').add({
      requestId: payload.requestId,
      alertSummary: emailText,
      recipients: ADMIN_NOTIFICATION_RECIPIENTS,
      dashboardUrl,
      firestoreUrl,
      status: 'DISPATCHED',
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err: any) {
    console.warn('[Admin Alert Log Warning]', err.message);
  }
}

/**
 * Send customer confirmation email that digital access is now active
 * Triggered only after an administrator approves the payment and access is activated.
 */
export async function sendCustomerConfirmationEmail(params: {
  customerEmail: string;
  customerName: string;
  transactionCode: string;
  amount: number;
  readerUrl: string;
}) {
  const subject = 'Good news! Your payment for Dating Wrong has been verified and approved';

  const bodyText = `
Dear ${params.customerName},

Good news! Your payment for Dating Wrong has been verified and approved.

Thank you for purchasing Dating Wrong by Gerishon Wanyeki. Your payment has been accepted, and access to the book has been activated for your Google account:

Account email: ${params.customerEmail}
Amount paid: KSh ${params.amount}
M-PESA transaction code: ${params.transactionCode}

You can now sign in to the Dating Wrong website using the same Google account and click Read the Book to begin reading.

We hope this book gives you meaningful insights into love, relationships, personal growth, and the wisdom of choosing well.

Thank you for supporting Dating Wrong and being part of this journey.

Warm regards,
The Dating Wrong Team
Published by Mark & Alvis
  `.trim();

  const bodyHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: 'Newsreader', Georgia, serif; background-color: #F5F2EA; color: #201D1A; padding: 32px 16px; margin: 0; line-height: 1.6;">
      <div style="max-width: 580px; margin: 0 auto; background-color: #FCFAF6; border: 1px solid #E2D7C5; padding: 40px; border-radius: 4px;">
        <div style="text-align: center; border-bottom: 1px solid #E8E0D2; padding-bottom: 24px; margin-bottom: 28px;">
          <div style="font-size: 18px; font-weight: bold; letter-spacing: 2px; color: #78350F; text-transform: uppercase; font-family: sans-serif;">Dating Wrong</div>
          <h1 style="font-size: 24px; font-weight: normal; margin: 12px 0 6px 0; color: #1C1917;">Payment Verified &amp; Approved</h1>
          <p style="font-size: 13px; color: #2E6B34; font-weight: bold;">Access activated for your Google account</p>
        </div>
        <div style="font-size: 15px; color: #2C2825;">
          <p>Dear ${params.customerName},</p>
          <p><strong>Good news! Your payment for Dating Wrong has been verified and approved.</strong></p>
          <p>Thank you for purchasing <em>Dating Wrong</em> by Gerishon Wanyeki. Your payment has been accepted, and access to the book has been activated for your Google account:</p>
          <div style="background-color: #F5EFE4; border: 1px solid #DFD5C3; padding: 18px 20px; border-radius: 2px; margin: 24px 0; font-family: sans-serif; font-size: 13px;">
            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #DDD2BE;"><span>Account email:</span><strong>${params.customerEmail}</strong></div>
            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #DDD2BE;"><span>Amount paid:</span><strong style="color: #78350F;">KSh ${params.amount}</strong></div>
            <div style="display: flex; justify-content: space-between; padding: 6px 0;"><span>M-PESA transaction code:</span><strong style="font-family: monospace;">${params.transactionCode}</strong></div>
          </div>
          <p>You can now sign in to the Dating Wrong website using the same Google account and click <strong>Read the Book</strong> to begin reading.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${params.readerUrl}" style="display: inline-block; background-color: #78350F; color: #FAF7F2; text-decoration: none; padding: 14px 34px; font-family: sans-serif; font-size: 13px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; border-radius: 2px;">Read the Book</a>
          </div>
          <p>We hope this book gives you meaningful insights into love, relationships, personal growth, and the wisdom of choosing well.</p>
          <p>Thank you for supporting Dating Wrong and being part of this journey.</p>
        </div>
        <div style="font-size: 13px; color: #574E44; text-align: left; margin-top: 32px; border-top: 1px solid #E8E0D2; padding-top: 20px;">
          <p style="margin: 0 0 4px 0;">Warm regards,</p>
          <p style="margin: 0 0 2px 0; font-weight: bold; color: #171412;">The Dating Wrong Team</p>
          <p style="margin: 0; color: #78350F;">Published by Mark &amp; Alvis</p>
        </div>
      </div>
    </body>
    </html>
  `.trim();

  const transporter = getNodemailerTransport();
  const mailSender = process.env.GMAIL_USER || process.env.SMTP_USER || 'orders@datingwrong.ke';
  const fromAddress = process.env.SMTP_FROM || `"Dating Wrong" <${mailSender}>`;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: fromAddress,
        to: params.customerEmail,
        subject,
        text: bodyText,
        html: bodyHtml,
      });
      console.log(`[Customer Email Delivered] Approval email sent to ${params.customerEmail}`);
    } catch (err: any) {
      console.warn(`[Customer Confirmation Email Error]`, err.message);
    }
  } else {
    console.log(`[Customer Confirmation Logged] To: ${params.customerEmail} | Subject: ${subject}`);
  }

  // Audit log in Firestore customerEmailLogs
  try {
    await db.collection('customerEmailLogs').add({
      customerEmail: params.customerEmail,
      transactionCode: params.transactionCode,
      subject,
      status: 'APPROVED_EMAIL_SENT',
      sentAt: FieldValue.serverTimestamp(),
    });
  } catch (err: any) {
    console.warn('[Customer Email Audit Log Warning]', err.message);
  }
}

/**
 * Send customer rejection email when payment could not be verified
 * Dispatched to the customer whenever an administrator rejects a payment request.
 */
export async function sendCustomerRejectionEmail(params: {
  customerEmail: string;
  customerName: string;
  rejectionReason: string;
}) {
  const subject = 'Dating Wrong — Payment Verification Unsuccessful';
  const effectiveReason = params.rejectionReason || 'Payment could not be verified in official M-PESA records.';

  const bodyText = `
Dear ${params.customerName},

Unfortunately, your M-PESA payment could not be verified, and access to Dating Wrong has not been granted.

Reason: ${effectiveReason}

If you believe this decision was made in error, please contact our support team for assistance.

Thank you for your understanding.

Regards,
Dating Wrong Team
Published by Mark & Alvis
  `.trim();

  const bodyHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: 'Newsreader', Georgia, serif; background-color: #F5F2EA; color: #201D1A; padding: 32px 16px; margin: 0; line-height: 1.6;">
      <div style="max-width: 580px; margin: 0 auto; background-color: #FCFAF6; border: 1px solid #E2D7C5; padding: 40px; border-radius: 4px;">
        <div style="text-align: center; border-bottom: 1px solid #E8E0D2; padding-bottom: 24px; margin-bottom: 28px;">
          <div style="font-size: 18px; font-weight: bold; letter-spacing: 2px; color: #991B1B; text-transform: uppercase; font-family: sans-serif;">Dating Wrong</div>
          <h1 style="font-size: 22px; font-weight: normal; margin: 12px 0 6px 0; color: #1C1917;">Payment Verification Unsuccessful</h1>
          <p style="font-size: 13px; color: #991B1B; font-weight: bold;">Access has not been granted</p>
        </div>
        <div style="font-size: 15px; color: #2C2825;">
          <p>Dear ${params.customerName},</p>
          <p>Unfortunately, your M-PESA payment could not be verified, and access to Dating Wrong has not been granted.</p>
          <div style="background-color: #FEF2F2; border: 1px solid #FECACA; padding: 18px 20px; border-radius: 4px; margin: 22px 0; font-family: sans-serif;">
            <div style="font-size: 11px; text-transform: uppercase; font-weight: bold; color: #991B1B; letter-spacing: 0.05em; margin-bottom: 6px;">Reason:</div>
            <p style="font-size: 14px; color: #7F1D1D; font-weight: 600; margin: 0;">${effectiveReason}</p>
          </div>
          <p>If you believe this decision was made in error, please contact our support team for assistance.</p>
          <p>Thank you for your understanding.</p>
        </div>
        <div style="font-size: 13px; color: #574E44; text-align: left; margin-top: 32px; border-top: 1px solid #E8E0D2; padding-top: 20px;">
          <p style="margin: 0 0 4px 0;">Regards,</p>
          <p style="margin: 0 0 2px 0; font-weight: bold; color: #171412;">Dating Wrong Team</p>
          <p style="margin: 0; color: #78350F;">Published by Mark &amp; Alvis</p>
        </div>
      </div>
    </body>
    </html>
  `.trim();

  const transporter = getNodemailerTransport();
  const mailSender = process.env.GMAIL_USER || process.env.SMTP_USER || 'orders@datingwrong.ke';
  const fromAddress = process.env.SMTP_FROM || `"Dating Wrong" <${mailSender}>`;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: fromAddress,
        to: params.customerEmail,
        subject,
        text: bodyText,
        html: bodyHtml,
      });
      console.log(`[Customer Rejection Delivered] Email sent to ${params.customerEmail}`);
    } catch (err: any) {
      console.warn(`[Customer Rejection Email Error]`, err.message);
    }
  } else {
    console.log(`[Customer Rejection Logged] To: ${params.customerEmail} | Subject: ${subject}`);
  }

  // Audit log in Firestore customerEmailLogs
  try {
    await db.collection('customerEmailLogs').add({
      customerEmail: params.customerEmail,
      subject,
      reason: effectiveReason,
      status: 'REJECTION_EMAIL_SENT',
      sentAt: FieldValue.serverTimestamp(),
    });
  } catch (err: any) {
    console.warn('[Customer Rejection Audit Log Warning]', err.message);
  }
}

// ============================================================================
// 1. CALLABLE CLOUD FUNCTION: submitPayment (also aliased as submitMpesaSms)
// ============================================================================
export const submitPayment = onCall({ cors: true }, async (request) => {
  // 1. Mandatory Google Authentication Check
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError(
      'unauthenticated',
      'Google Sign-In is required before submitting your payment SMS. Please sign in to capture your authorized email.'
    );
  }

  const uid = request.auth.uid;
  const email = (request.auth.token.email || '').toLowerCase().trim();

  if (!email) {
    throw new HttpsError(
      'failed-precondition',
      'A valid email address associated with your Google account is required.'
    );
  }

  const { submittedSms, senderPhone, customerName } = request.data || {};

  if (!submittedSms || typeof submittedSms !== 'string' || submittedSms.trim().length < 15) {
    throw new HttpsError(
      'invalid-argument',
      'Please paste the complete M-PESA confirmation SMS received from Safaricom.'
    );
  }

  // 2. Parse M-PESA Confirmation SMS
  const parsed = parseMpesaConfirmationSms(submittedSms);
  const transactionCode = parsed.transactionCode?.toUpperCase().trim();

  if (!transactionCode || transactionCode.length < 8) {
    throw new HttpsError(
      'invalid-argument',
      'Could not extract a valid 10-character M-PESA transaction code from the message. Please ensure the full SMS is pasted.'
    );
  }

  // 3. Validate Amount against 750Ksh requirement
  const amount = parsed.amount || BOOK_PRICE_KES;
  if (amount < BOOK_PRICE_KES) {
    throw new HttpsError(
      'invalid-argument',
      `Underpayment detected: Received KSh ${amount}. The official price for Dating Wrong is KSh ${BOOK_PRICE_KES}.`
    );
  }

  const effectiveSenderPhone = senderPhone || parsed.senderPhone || '254700000000';
  const effectiveSenderName = customerName || parsed.senderName || request.auth.token.name || 'Valued Reader';
  const transactionTime = parsed.dateTimeStr || 'Stated in SMS';
  const recipient = parsed.recipient || OFFICIAL_POCHI_NAME;

  // 4. Verify Transaction Code Uniqueness (anti-replay check)
  const usedTxRef = db.collection('usedTransactions').doc(transactionCode);
  const usedTxSnap = await usedTxRef.get();
  if (usedTxSnap.exists) {
    throw new HttpsError(
      'already-exists',
      `Transaction code ${transactionCode} has already been approved and used to unlock Dating Wrong. Each M-PESA code can only be used once.`
    );
  }

  // Check existing approved payment requests
  const existingApprovedQuery = await db
    .collection('paymentRequests')
    .where('transactionCode', '==', transactionCode)
    .where('status', '==', 'APPROVED')
    .limit(1)
    .get();

  if (!existingApprovedQuery.empty) {
    throw new HttpsError(
      'already-exists',
      `Transaction code ${transactionCode} was already approved for another account.`
    );
  }

  // 5. Create Payment Request Record in 'paymentRequests' collection as 'PENDING_REVIEW'
  const requestId = `REQ-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const submittedAtIso = new Date().toISOString();
  const { dashboardUrl, firestoreUrl } = getDeepLinks(requestId);

  const paymentRequestDoc = {
    requestId,
    uid,
    email,
    customerName: effectiveSenderName,
    submittedSms: submittedSms.trim(),
    transactionCode,
    amount,
    expectedAmount: BOOK_PRICE_KES,
    senderPhone: effectiveSenderPhone,
    senderName: parsed.senderName || effectiveSenderName,
    recipientDetails: `${OFFICIAL_POCHI_NAME} (${OFFICIAL_POCHI_PHONE})`,
    transactionTime,
    submittedAt: submittedAtIso,
    status: 'PENDING_REVIEW', // Stored as PENDING_REVIEW
    reviewedBy: null,
    reviewedAt: null,
    rejectionReason: null,
    entitlementId: null,
    notifiedAdmins: ['Mark', 'Gerishon Wanyeki', 'Alvis Njagi'],
    dashboardApprovalUrl: dashboardUrl,
    firestorePathUrl: firestoreUrl,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await db.collection('paymentRequests').doc(requestId).set(paymentRequestDoc);

  // 6. Alert the 3 Administrators (Mark, Gerishon, Alvis)
  await notifyAdministrators({
    requestId,
    customerName: effectiveSenderName,
    authorizedEmail: email,
    senderPhone: effectiveSenderPhone,
    amount,
    transactionCode,
    transactionTimeInSms: transactionTime,
    submittedAt: submittedAtIso,
    originalSms: submittedSms.trim(),
  });

  return {
    success: true,
    message: 'Payment verification request created and stored as PENDING_REVIEW. Administrators notified.',
    requestId,
    status: 'PENDING_REVIEW',
    authorizedEmail: email,
    parsedDetails: {
      transactionCode,
      amount,
      senderPhone: effectiveSenderPhone,
      senderName: effectiveSenderName,
      recipient: OFFICIAL_POCHI_NAME,
      transactionTime,
    },
  };
});

// Backward-compatible alias
export const submitMpesaSms = submitPayment;

// ============================================================================
// 2. HTTP REST ENDPOINT: submitPaymentHttp (also aliased as submitMpesaSmsHttp)
// ============================================================================
export const submitPaymentHttp = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    return;
  }

  try {
    const { uid, email, customerName, submittedSms, senderPhone } = req.body;

    if (!uid || !email) {
      res.status(401).json({
        success: false,
        error: 'Authentication is required. Provide authenticated user UID and email.',
      });
      return;
    }

    if (!submittedSms || typeof submittedSms !== 'string' || submittedSms.trim().length < 15) {
      res.status(400).json({
        success: false,
        error: 'Please paste the complete M-PESA confirmation SMS.',
      });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const parsed = parseMpesaConfirmationSms(submittedSms);
    const transactionCode = parsed.transactionCode?.toUpperCase().trim();

    if (!transactionCode || transactionCode.length < 8) {
      res.status(400).json({
        success: false,
        error: 'Could not extract a valid M-PESA transaction code from the SMS.',
      });
      return;
    }

    const amount = parsed.amount || BOOK_PRICE_KES;
    if (amount < BOOK_PRICE_KES) {
      res.status(400).json({
        success: false,
        error: `Underpayment detected: Received KSh ${amount}. Price is KSh ${BOOK_PRICE_KES}.`,
      });
      return;
    }

    // Check duplicate in usedTransactions
    const usedSnap = await db.collection('usedTransactions').doc(transactionCode).get();
    if (usedSnap.exists) {
      res.status(409).json({
        success: false,
        error: `Transaction code ${transactionCode} has already been approved and used.`,
      });
      return;
    }

    const requestId = `REQ-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const submittedAtIso = new Date().toISOString();
    const { dashboardUrl, firestoreUrl } = getDeepLinks(requestId);

    const record = {
      requestId,
      uid,
      email: cleanEmail,
      customerName: customerName || parsed.senderName || 'Valued Reader',
      submittedSms: submittedSms.trim(),
      transactionCode,
      amount,
      expectedAmount: BOOK_PRICE_KES,
      senderPhone: senderPhone || parsed.senderPhone || '254700000000',
      senderName: parsed.senderName || customerName || '',
      recipientDetails: `${OFFICIAL_POCHI_NAME} (${OFFICIAL_POCHI_PHONE})`,
      transactionTime: parsed.dateTimeStr || 'Stated in SMS',
      submittedAt: submittedAtIso,
      status: 'PENDING_REVIEW',
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
      entitlementId: null,
      notifiedAdmins: ['Mark', 'Gerishon Wanyeki', 'Alvis Njagi'],
      dashboardApprovalUrl: dashboardUrl,
      firestorePathUrl: firestoreUrl,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await db.collection('paymentRequests').doc(requestId).set(record);

    await notifyAdministrators({
      requestId,
      customerName: record.customerName,
      authorizedEmail: cleanEmail,
      senderPhone: record.senderPhone,
      amount,
      transactionCode,
      transactionTimeInSms: record.transactionTime,
      submittedAt: submittedAtIso,
      originalSms: submittedSms.trim(),
    });

    res.json({
      success: true,
      requestId,
      status: 'PENDING_REVIEW',
      message: 'Payment verification request received and stored for admin review.',
      parsedDetails: {
        transactionCode,
        amount,
        senderPhone: record.senderPhone,
        transactionTime: record.transactionTime,
      },
    });
  } catch (err: any) {
    console.error('submitPaymentHttp error:', err);
    res.status(500).json({ error: err.message || 'Internal server error.' });
  }
});

export const submitMpesaSmsHttp = submitPaymentHttp;

// ============================================================================
// 3. FIRESTORE TRIGGER: onPaymentRequestCreated
// ============================================================================
export const onPaymentRequestCreated = onDocumentCreated('paymentRequests/{requestId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    return;
  }

  const data = snapshot.data();
  console.log(`[FIRESTORE TRIGGER] New paymentRequest created: ${event.params.requestId} (${data.transactionCode}) status: ${data.status}`);

  // Only trigger if not already dispatched
  if (data.status === 'PENDING_REVIEW' && !data.alertDispatched) {
    await notifyAdministrators({
      requestId: event.params.requestId,
      customerName: data.customerName || 'Valued Reader',
      authorizedEmail: data.email,
      senderPhone: data.senderPhone || '254700000000',
      amount: data.amount || BOOK_PRICE_KES,
      transactionCode: data.transactionCode,
      transactionTimeInSms: data.transactionTime || 'Stated in SMS',
      submittedAt: data.submittedAt || new Date().toISOString(),
      originalSms: data.submittedSms || '',
    });
  }
});

// ============================================================================
// 4. BACKEND APPROVAL LOGIC: approvePayment (also aliased as approvePaymentRequest)
//
// 1) Verify the transaction code is unique
// 2) Set the status to 'APPROVED'
// 3) Update the user's entitlement record in Firestore
// 4) Send a confirmation email to the user that their access is now active
// ============================================================================
export const approvePayment = onCall({ cors: true }, async (request) => {
  if (!request.auth || !request.auth.token.email) {
    throw new HttpsError('unauthenticated', 'Admin authentication required.');
  }

  const adminEmail = request.auth.token.email.toLowerCase().trim();
  if (!isAdministrator(adminEmail)) {
    throw new HttpsError('permission-denied', 'Only authorized administrators (Mark, Gerishon, Alvis) can approve payments.');
  }

  const { requestId, notes } = request.data || {};
  if (!requestId) {
    throw new HttpsError('invalid-argument', 'Missing requestId argument.');
  }

  const requestRef = db.collection('paymentRequests').doc(requestId);
  const reqSnap = await requestRef.get();

  if (!reqSnap.exists) {
    throw new HttpsError('not-found', `Payment request ${requestId} not found.`);
  }

  const reqData = reqSnap.data()!;
  if (reqData.status === 'APPROVED') {
    return { success: true, message: 'Request was already approved.', entitlementId: reqData.entitlementId };
  }

  const transactionCode = reqData.transactionCode;
  const reviewedAt = new Date().toISOString();
  const entitlementId = `ENT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Step 1: Verify the transaction code is unique in Firestore
  const usedRef = db.collection('usedTransactions').doc(transactionCode);
  const usedSnap = await usedRef.get();
  if (usedSnap.exists) {
    const existing = usedSnap.data();
    if (existing?.usedForUid !== reqData.uid) {
      throw new HttpsError(
        'already-exists',
        `Transaction code ${transactionCode} is not unique. It has already been registered for another account.`
      );
    }
  }

  // Steps 2 & 3: Run Firestore atomic transaction
  // - Set status to 'APPROVED'
  // - Update the user's entitlement record in bookEntitlements, users, and usedTransactions
  await db.runTransaction(async (transaction) => {
    // Check again inside transaction to prevent race conditions
    const txSnap = await transaction.get(usedRef);
    if (txSnap.exists && txSnap.data()?.usedForUid !== reqData.uid) {
      throw new Error(`Transaction code ${transactionCode} has already been claimed.`);
    }

    // 1. Lock transaction code in usedTransactions
    transaction.set(usedRef, {
      transactionCode,
      usedForUid: reqData.uid,
      paymentId: entitlementId,
      amount: reqData.amount || BOOK_PRICE_KES,
      usedAt: reviewedAt,
      phone: reqData.senderPhone,
    });

    // 2. Grant digital book entitlement in bookEntitlements/{uid_dating-wrong}
    const entRef = db.collection('bookEntitlements').doc(`${reqData.uid}_dating-wrong`);
    transaction.set(entRef, {
      uid: reqData.uid,
      bookId: 'dating-wrong',
      bookVersion: 1,
      status: 'ACTIVE',
      grantedAt: reviewedAt,
      paymentId: entitlementId,
      transactionCode,
      offlineEnabled: true,
      authorizedDevices: [],
      lastSyncedAt: reviewedAt,
      watermark: `Authorized Digital Edition • ${reqData.email} • Dating Wrong`,
    });

    // 3. Update User document hasAccess
    const userRef = db.collection('users').doc(reqData.uid);
    transaction.set(
      userRef,
      {
        hasAccess: true,
        phone: reqData.senderPhone,
        lastAccessAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // 4. Set the status to 'APPROVED' on payment request document
    transaction.update(requestRef, {
      status: 'APPROVED',
      reviewedBy: adminEmail,
      reviewedAt,
      entitlementId,
      adminNotes: notes || null,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  console.log(`[APPROVAL GRANTED] Payment request ${requestId} approved by ${adminEmail} for ${reqData.email}.`);

  // Step 4: Send confirmation email to the user that their access is now active
  const { dashboardBase } = getDeepLinks(requestId);
  const readerUrl = `${dashboardBase}/?reader=true`;

  try {
    await sendCustomerConfirmationEmail({
      customerEmail: reqData.email,
      customerName: reqData.customerName || 'Valued Reader',
      transactionCode,
      amount: reqData.amount || BOOK_PRICE_KES,
      readerUrl,
    });
  } catch (emailErr: any) {
    console.warn('[Confirmation Email Warning]', emailErr.message);
  }

  return {
    success: true,
    message: `Payment request approved by ${adminEmail}. Entitlement granted and customer notified.`,
    requestId,
    entitlementId,
  };
});

export const approvePaymentRequest = approvePayment;

// ============================================================================
// 5. CALLABLE CLOUD FUNCTION: rejectPayment (also aliased as rejectPaymentRequest)
// ============================================================================
export const rejectPayment = onCall({ cors: true }, async (request) => {
  if (!request.auth || !request.auth.token.email) {
    throw new HttpsError('unauthenticated', 'Admin authentication required.');
  }

  const adminEmail = request.auth.token.email.toLowerCase().trim();
  if (!isAdministrator(adminEmail)) {
    throw new HttpsError('permission-denied', 'Only authorized administrators can reject payment requests.');
  }

  const { requestId, reason } = request.data || {};
  if (!requestId) {
    throw new HttpsError('invalid-argument', 'Missing requestId argument.');
  }

  const requestRef = db.collection('paymentRequests').doc(requestId);
  const reqSnap = await requestRef.get();

  if (!reqSnap.exists) {
    throw new HttpsError('not-found', `Payment request ${requestId} not found.`);
  }

  const reviewedAt = new Date().toISOString();
  const rejectionReason = reason || 'Payment could not be verified in official Pochi records.';

  await requestRef.update({
    status: 'REJECTED',
    reviewedBy: adminEmail,
    reviewedAt,
    rejectionReason,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const reqData = reqSnap.data() || {};
  const customerEmail = reqData.email;
  const customerName = reqData.customerName || 'Valued Reader';

  if (customerEmail) {
    try {
      await sendCustomerRejectionEmail({
        customerEmail,
        customerName,
        rejectionReason,
      });
    } catch (emailErr: any) {
      console.warn('[Rejection Email Warning]', emailErr.message);
    }
  }

  console.log(`[PAYMENT REJECTED] Request ${requestId} rejected by ${adminEmail}. Reason: ${rejectionReason}`);

  return {
    success: true,
    message: `Payment request rejected by ${adminEmail}. Access remains locked.`,
    requestId,
    rejectionReason,
  };
});

export const rejectPaymentRequest = rejectPayment;

// ============================================================================
// 6. CALLABLE CLOUD FUNCTION: restorePaymentBySms
//
// Leads to the database of approved accounts.
// If the SMS (transactional code, amount, sender name, phone number, time/date)
// and the email of the one initiating restoration are mapped in the database:
// -> Approves and updates active entitlement.
// If not found:
// -> Returns { approved: false, redirectToBuy: true, reason: '...', parsedDetails }
// ============================================================================
export const restorePaymentBySms = onCall({ cors: true }, async (request) => {
  const { email, submittedSms } = request.data || {};
  const callerEmail = (request.auth?.token.email || email || '').toLowerCase().trim();
  const callerUid = request.auth?.uid;

  if (!callerEmail) {
    throw new HttpsError('invalid-argument', 'An email address is required to verify account ownership.');
  }

  if (!submittedSms || typeof submittedSms !== 'string' || submittedSms.trim().length < 15) {
    throw new HttpsError('invalid-argument', 'Please paste the complete M-PESA confirmation SMS.');
  }

  const parsed = parseMpesaConfirmationSms(submittedSms);
  const transactionCode = parsed.transactionCode?.toUpperCase().trim();

  const parsedDetails = {
    transactionCode,
    amount: parsed.amount,
    senderPhone: parsed.senderPhone,
    senderName: parsed.senderName,
    transactionTime: parsed.dateTimeStr,
  };

  if (!transactionCode || transactionCode.length < 8) {
    return {
      approved: false,
      redirectToBuy: true,
      reason: 'Could not extract valid 10-character M-PESA transaction code from SMS.',
      parsedDetails,
    };
  }

  // 1. Query database of approved accounts in paymentRequests
  const approvedSnap = await db
    .collection('paymentRequests')
    .where('transactionCode', '==', transactionCode)
    .where('status', '==', 'APPROVED')
    .limit(1)
    .get();

  if (approvedSnap.empty) {
    return {
      approved: false,
      redirectToBuy: true,
      reason: `No approved purchase found in our database for M-PESA code ${transactionCode}. Please proceed to the buying page to submit your purchase for admin approval.`,
      parsedDetails,
    };
  }

  const approvedDoc = approvedSnap.docs[0].data();

  // 2. Verify that the SMS and the email are mapped as in the database
  const mappedEmail = (approvedDoc.email || '').toLowerCase().trim();
  if (mappedEmail !== callerEmail) {
    return {
      approved: false,
      redirectToBuy: true,
      reason: `M-PESA transaction code ${transactionCode} was approved for account "${mappedEmail}", which does not match your email "${callerEmail}".`,
      parsedDetails,
    };
  }

  // 3. Approve and grant entitlement
  const activeUid = callerUid || approvedDoc.uid;
  const now = new Date().toISOString();

  if (activeUid) {
    await db.collection('bookEntitlements').doc(`${activeUid}_dating-wrong`).set(
      {
        uid: activeUid,
        bookId: 'dating-wrong',
        bookVersion: 1,
        status: 'ACTIVE',
        grantedAt: now,
        paymentId: approvedDoc.entitlementId || `ENT-${Date.now()}`,
        transactionCode,
        offlineEnabled: true,
        authorizedDevices: [],
        lastSyncedAt: now,
        watermark: `Authorized Digital Edition • ${mappedEmail} • Dating Wrong`,
      },
      { merge: true }
    );

    await db.collection('users').doc(activeUid).set(
      {
        hasAccess: true,
        lastAccessAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  return {
    approved: true,
    message: `Restoration approved! Verified purchase matched for ${mappedEmail}.`,
    entitlement: {
      entitlementId: approvedDoc.entitlementId || `ENT-${Date.now()}`,
      userId: activeUid,
      email: mappedEmail,
      transactionCode,
      amountPaid: approvedDoc.amount || BOOK_PRICE_KES,
      status: 'active',
      watermarkText: `Authorized Digital Edition • ${mappedEmail} • Dating Wrong`,
    },
    parsedDetails,
  };
});
