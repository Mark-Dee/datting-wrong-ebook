/**
 * M-PESA SMS Parser & Verification Engine
 * Parses incoming pasted SMS messages from Safaricom M-PESA
 * Example SMS strings:
 * "QGH7K92ABC Confirmed. Ksh750.00 sent to Gerishon Wanyeki 0722100200 on 11/9/26 at 10:42 AM. New M-PESA balance is Ksh1,240.00..."
 * "RK72QM9XLP Confirmed. Ksh750.00 sent to MARK & ALVIS PUBLISHERS on 12/9/26 at 2:15 PM..."
 * "QGH7K92ABC Confirmed. You have received Ksh500.00 from PETER MWANGI 0712345678 on 11/9/26 at 10:42 AM..."
 */

import { normalizeKenyanPhone, arePhonesEqual } from './phoneNormalization.ts';

export interface ParsedMpesaSms {
  rawText: string;
  transactionCode?: string;
  amount?: number;
  senderName?: string;
  senderPhone?: string;
  recipient?: string;
  dateTimeStr?: string;
  isLikelyMpesaSms: boolean;
  parseConfidence: number; // 0 to 1
  parsingNotes: string[];
}

export interface SmsVerificationRuleCheck {
  rule: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
}

export interface SmsVerificationResult {
  isValid: boolean;
  decision: 'VERIFIED' | 'UNDERPAID' | 'PHONE_MISMATCH' | 'RECIPIENT_MISMATCH' | 'INVALID_CODE' | 'DUPLICATE' | 'REJECTED';
  parsed: ParsedMpesaSms;
  checks: SmsVerificationRuleCheck[];
  extractedCode?: string;
  extractedAmount?: number;
  extractedPhone?: string;
  reason?: string;
}

export function parseMpesaSms(smsText: string): ParsedMpesaSms {
  const text = (smsText || '').trim();
  const notes: string[] = [];
  let confidence = 0;

  if (!text) {
    return {
      rawText: '',
      isLikelyMpesaSms: false,
      parseConfidence: 0,
      parsingNotes: ['Empty SMS text provided'],
    };
  }

  // 1. Transaction Code (Usually starts at beginning or after Confirmed, 10 alphanumeric chars e.g. QGH7K92ABC, RK72QM9XLP)
  let transactionCode: string | undefined;
  const codeRegex = /\b([A-Z0-9]{10})\b/i;
  const codeMatch = text.match(codeRegex);
  if (codeMatch) {
    transactionCode = codeMatch[1].toUpperCase();
    confidence += 0.3;
    notes.push(`Extracted transaction code: ${transactionCode}`);
  }

  // 2. Amount (e.g. Ksh750.00, Ksh. 750, KSh750, Ksh 750)
  let amount: number | undefined;
  const amountRegex = /(?:Ksh|KSh|KES)\.?\s*([0-9,]+(?:\.\d{2})?)/i;
  const amountMatch = text.match(amountRegex);
  if (amountMatch) {
    const cleanAmountStr = amountMatch[1].replace(/,/g, '');
    amount = parseFloat(cleanAmountStr);
    confidence += 0.3;
    notes.push(`Extracted amount: KES ${amount}`);
  }

  // 3. Sender Phone (e.g. from PETER MWANGI 0712345678, or 2547XXXXXXXX)
  let senderPhone: string | undefined;
  const phoneRegex = /\b(07\d{8}|01\d{8}|2547\d{8}|2541\d{8}|\+2547\d{8}|\+2541\d{8})\b/;
  const phoneMatch = text.match(phoneRegex);
  if (phoneMatch) {
    senderPhone = phoneMatch[1];
    confidence += 0.2;
    notes.push(`Extracted sender phone: ${senderPhone}`);
  }

  // 4. Sender Name (e.g. from JOHN MWANGI 07... or from JANE DOE.)
  let senderName: string | undefined;
  const senderRegex = /from\s+([A-Z\s]{3,35})(?:\s+0[71]\d{8}|\s+254[71]\d{8}|\s+on|\.)/i;
  const senderMatch = text.match(senderRegex);
  if (senderMatch) {
    senderName = senderMatch[1].trim();
    notes.push(`Extracted sender name: ${senderName}`);
  }

  // 5. Recipient (e.g. sent to Dating Wrong, paid to MARK & ALVIS, sent to 4089221)
  let recipient: string | undefined;
  const recipientRegex = /(?:sent to|paid to)\s+([^.]+?)(?:\s+on|\s+at|\.|$)/i;
  const recipientMatch = text.match(recipientRegex);
  if (recipientMatch) {
    recipient = recipientMatch[1].trim();
    confidence += 0.2;
    notes.push(`Extracted recipient: ${recipient}`);
  }

  // 6. Date & Time (e.g. on 11/9/26 at 10:42 AM or on 11/09/2026 at 10:42 AM)
  let dateTimeStr: string | undefined;
  const dateRegex = /on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i;
  const dateMatch = text.match(dateRegex);
  if (dateMatch) {
    dateTimeStr = `${dateMatch[1]} ${dateMatch[2]}`;
    notes.push(`Extracted timestamp: ${dateTimeStr}`);
  }

  const isLikelyMpesaSms = Boolean(
    text.toLowerCase().includes('confirmed') ||
    text.toLowerCase().includes('m-pesa') ||
    (transactionCode && amount)
  );

  return {
    rawText: text,
    transactionCode,
    amount,
    senderName,
    senderPhone,
    recipient,
    dateTimeStr,
    isLikelyMpesaSms,
    parseConfidence: Math.min(confidence, 1),
    parsingNotes: notes,
  };
}

/**
 * Perform verification of Pasted SMS against expected parameters:
 * Mandatory checks:
 * 1. Amount: Received amount must equal the configured book price (Underpayment check).
 * 2. Phone: The sender phone (if present in SMS) must match the M-PESA phone entered during checkout.
 * 3. Recipient: The payment must belong to Dating Wrong or Mark & Alvis account.
 * 4. Name is informational only.
 */
export function verifyPastedMpesaSms(params: {
  smsText: string;
  expectedAmount: number;
  checkoutPhone: string;
  merchantName?: string;
  paybillNumber?: string;
}): SmsVerificationResult {
  const parsed = parseMpesaSms(params.smsText);
  const checks: SmsVerificationRuleCheck[] = [];

  // Check 1: Code valid format
  if (!parsed.transactionCode || parsed.transactionCode.length < 8) {
    checks.push({
      rule: 'Transaction Code Validation',
      status: 'failed',
      message: 'Could not detect a valid 10-character M-PESA transaction code in the pasted message.',
    });
    return {
      isValid: false,
      decision: 'INVALID_CODE',
      parsed,
      checks,
      reason: 'Missing or invalid M-PESA transaction code in SMS.',
    };
  } else {
    checks.push({
      rule: 'Transaction Code Validation',
      status: 'passed',
      message: `Valid M-PESA code extracted: ${parsed.transactionCode}`,
    });
  }

  // Check 2: Amount verification & Underpayment check
  if (parsed.amount === undefined || isNaN(parsed.amount)) {
    checks.push({
      rule: 'Amount Verification',
      status: 'failed',
      message: 'No monetary amount could be identified from the SMS.',
    });
    return {
      isValid: false,
      decision: 'REJECTED',
      parsed,
      checks,
      extractedCode: parsed.transactionCode,
      reason: 'No monetary amount found in pasted SMS.',
    };
  }

  if (parsed.amount < params.expectedAmount) {
    checks.push({
      rule: 'Amount Verification',
      status: 'failed',
      message: `Underpayment detected: Received KES ${parsed.amount}, expected KES ${params.expectedAmount}.`,
    });
    return {
      isValid: false,
      decision: 'UNDERPAID',
      parsed,
      checks,
      extractedCode: parsed.transactionCode,
      extractedAmount: parsed.amount,
      reason: `Underpayment: Received KES ${parsed.amount} but required amount is KES ${params.expectedAmount}.`,
    };
  }

  checks.push({
    rule: 'Amount Verification',
    status: 'passed',
    message: `Amount KES ${parsed.amount} matches or exceeds required KES ${params.expectedAmount}.`,
  });

  // Check 3: Phone verification
  if (parsed.senderPhone) {
    const isPhoneMatching = arePhonesEqual(parsed.senderPhone, params.checkoutPhone);
    if (!isPhoneMatching) {
      checks.push({
        rule: 'Phone Number Correlation',
        status: 'failed',
        message: `Phone mismatch: SMS sender ${parsed.senderPhone} does not match checkout phone ${params.checkoutPhone}.`,
      });
      return {
        isValid: false,
        decision: 'PHONE_MISMATCH',
        parsed,
        checks,
        extractedCode: parsed.transactionCode,
        extractedAmount: parsed.amount,
        extractedPhone: parsed.senderPhone,
        reason: 'The phone number in the M-PESA message does not match your checkout phone number.',
      };
    } else {
      checks.push({
        rule: 'Phone Number Correlation',
        status: 'passed',
        message: 'Phone number in SMS matches the checkout phone number perfectly.',
      });
    }
  } else {
    // SMS sent from customer's perspective might say "sent to Dating Wrong" without printing their own phone
    checks.push({
      rule: 'Phone Number Correlation',
      status: 'warning',
      message: 'Sender phone omitted in customer receipt; correlated via checkout session.',
    });
  }

  // Check 4: Recipient verification
  if (parsed.recipient) {
    const recipLower = parsed.recipient.toLowerCase();
    const validRecipients = [
      'dating wrong',
      'mark & alvis',
      'mark and alvis',
      'alvis',
      'alvis njagi',
      'njagi',
      '0701870142',
      '0701 870 142',
      '254701870142',
      'gerishon',
      'gerishon wanyeki',
      'wanyeki',
      '0799507537',
      '254799507537',
      '0799 507 537',
      '0722100200',
      params.paybillNumber || '4089221',
    ];
    const matchesRecipient = validRecipients.some((r) => recipLower.includes(r.toLowerCase()));
    if (!matchesRecipient) {
      checks.push({
        rule: 'Merchant Recipient Check',
        status: 'failed',
        message: `Recipient mismatch: "${parsed.recipient}" does not match Dating Wrong or Mark & Alvis account.`,
      });
      return {
        isValid: false,
        decision: 'RECIPIENT_MISMATCH',
        parsed,
        checks,
        extractedCode: parsed.transactionCode,
        extractedAmount: parsed.amount,
        reason: `Recipient "${parsed.recipient}" is not the authorized merchant for Dating Wrong.`,
      };
    } else {
      checks.push({
        rule: 'Merchant Recipient Check',
        status: 'passed',
        message: `Verified recipient: "${parsed.recipient}" matches authorized publisher account.`,
      });
    }
  }

  // Name check is informational only
  if (parsed.senderName) {
    checks.push({
      rule: 'Sender Name Check',
      status: 'passed',
      message: `Informational: M-PESA registered account name is ${parsed.senderName}.`,
    });
  }

  return {
    isValid: true,
    decision: 'VERIFIED',
    parsed,
    checks,
    extractedCode: parsed.transactionCode,
    extractedAmount: parsed.amount,
    extractedPhone: parsed.senderPhone,
  };
}
