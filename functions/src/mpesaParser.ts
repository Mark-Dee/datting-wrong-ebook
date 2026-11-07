/**
 * M-PESA SMS Parser Utility for Firebase Cloud Functions
 * Parses incoming pasted SMS messages from Safaricom M-PESA.
 * Examples:
 * "QGH7K92ABC Confirmed. Ksh750.00 sent to Gerishon Wanyeki 0722100200 on 11/9/26 at 10:42 AM. New M-PESA balance is Ksh1,240.00."
 * "RK72QM9XLP Confirmed. Ksh750.00 sent to MARK & ALVIS PUBLISHERS on 12/9/26 at 2:15 PM..."
 */

export interface ParsedMpesaSmsDetails {
  rawText: string;
  transactionCode?: string;
  amount?: number;
  senderName?: string;
  senderPhone?: string;
  recipient?: string;
  dateTimeStr?: string;
  isLikelyMpesaSms: boolean;
  notes: string[];
}

export function parseMpesaConfirmationSms(smsText: string): ParsedMpesaSmsDetails {
  const text = (smsText || '').trim();
  const notes: string[] = [];

  if (!text) {
    return {
      rawText: '',
      isLikelyMpesaSms: false,
      notes: ['Empty SMS text provided'],
    };
  }

  // 1. Transaction Code (10 alphanumeric characters e.g. QGH7K92ABC, RK72QM9XLP)
  let transactionCode: string | undefined;
  const codeMatch = text.match(/\b([A-Z0-9]{10})\b/i);
  if (codeMatch) {
    transactionCode = codeMatch[1].toUpperCase();
    notes.push(`Extracted transaction code: ${transactionCode}`);
  }

  // 2. Amount (e.g. Ksh750.00, Ksh. 750, KSh750, Ksh 750, KES 750)
  let amount: number | undefined;
  const amountMatch = text.match(/(?:Ksh|KSh|KES)\.?\s*([0-9,]+(?:\.\d{2})?)/i);
  if (amountMatch) {
    const cleanAmountStr = amountMatch[1].replace(/,/g, '');
    amount = parseFloat(cleanAmountStr);
    notes.push(`Extracted amount: KES ${amount}`);
  }

  // 3. Sender Phone (e.g. from PETER MWANGI 0712345678, or 2547XXXXXXXX)
  let senderPhone: string | undefined;
  const phoneMatch = text.match(/\b(07\d{8}|01\d{8}|2547\d{8}|2541\d{8}|\+2547\d{8}|\+2541\d{8})\b/);
  if (phoneMatch) {
    senderPhone = phoneMatch[1];
    notes.push(`Extracted sender phone: ${senderPhone}`);
  }

  // 4. Sender Name
  let senderName: string | undefined;
  const senderMatch = text.match(/from\s+([A-Z\s]{3,35})(?:\s+0[71]\d{8}|\s+254[71]\d{8}|\s+on|\.)/i);
  if (senderMatch) {
    senderName = senderMatch[1].trim();
    notes.push(`Extracted sender name: ${senderName}`);
  }

  // 5. Recipient
  let recipient: string | undefined;
  const recipientMatch = text.match(/(?:sent to|paid to)\s+([^.]+?)(?:\s+on|\s+at|\.|$)/i);
  if (recipientMatch) {
    recipient = recipientMatch[1].trim();
    notes.push(`Extracted recipient: ${recipient}`);
  }

  // 6. Date & Time (e.g. on 11/9/26 at 10:42 AM or on 11/09/2026 at 10:42 AM)
  let dateTimeStr: string | undefined;
  const dateMatch = text.match(/on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
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
    notes,
  };
}
