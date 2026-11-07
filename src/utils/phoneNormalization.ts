/**
 * Kenyan Phone Number Normalization Utility
 * Supports:
 * - 07XXXXXXXX -> 2547XXXXXXXX
 * - 01XXXXXXXX -> 2541XXXXXXXX
 * - 2547XXXXXXXX -> 2547XXXXXXXX
 * - 2541XXXXXXXX -> 2541XXXXXXXX
 * - +2547XXXXXXXX -> 2547XXXXXXXX
 * - +2541XXXXXXXX -> 2541XXXXXXXX
 * - Formatted spaces, hyphens, parentheses
 */

export interface PhoneNormalizationResult {
  isValid: boolean;
  canonical: string; // e.g. 254712345678
  displayLocal: string; // e.g. 0712 345 678
  displayInternational: string; // e.g. +254 712 345 678
  masked: string; // e.g. 2547****5678
  carrierHint?: 'Safaricom' | 'Airtel' | 'Telkom' | 'Other';
  error?: string;
}

export function normalizeKenyanPhone(input: string | undefined | null): PhoneNormalizationResult {
  if (!input) {
    return {
      isValid: false,
      canonical: '',
      displayLocal: '',
      displayInternational: '',
      masked: '',
      error: 'Phone number is required',
    };
  }

  // Strip all non-digit characters except leading plus
  let cleaned = input.trim().replace(/[\s\-\(\)\.]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // If starts with 07 or 01, convert 0 to 254
  if (cleaned.startsWith('0') && (cleaned.startsWith('07') || cleaned.startsWith('01'))) {
    cleaned = '254' + cleaned.slice(1);
  }

  // If starts with 7 or 1 and has length 9, prefix with 254
  if ((cleaned.startsWith('7') || cleaned.startsWith('1')) && cleaned.length === 9) {
    cleaned = '254' + cleaned;
  }

  // Valid canonical Kenyan number must start with 254 followed by 7 or 1 and total 12 digits
  const kenyanRegex = /^254(7\d{8}|1\d{8})$/;

  if (!kenyanRegex.test(cleaned)) {
    return {
      isValid: false,
      canonical: cleaned,
      displayLocal: input,
      displayInternational: input,
      masked: input.length > 4 ? `****${input.slice(-4)}` : '****',
      error: 'Invalid Kenyan phone number format. Expected 07XXXXXXXX, 01XXXXXXXX, or 2547XXXXXXXX',
    };
  }

  const prefix = cleaned.slice(3, 5); // 70, 71, 72, 79 etc
  let carrierHint: 'Safaricom' | 'Airtel' | 'Telkom' | 'Other' = 'Other';
  const safaricomPrefixes = ['70', '71', '72', '74', '79', '11', '12'];
  const airtelPrefixes = ['73', '75', '78', '10'];
  const telkomPrefixes = ['77'];

  if (safaricomPrefixes.includes(prefix)) {
    carrierHint = 'Safaricom';
  } else if (airtelPrefixes.includes(prefix)) {
    carrierHint = 'Airtel';
  } else if (telkomPrefixes.includes(prefix)) {
    carrierHint = 'Telkom';
  }

  const localNumber = '0' + cleaned.slice(3); // e.g. 0712345678
  const displayLocal = `${localNumber.slice(0, 4)} ${localNumber.slice(4, 7)} ${localNumber.slice(7)}`;
  const displayInternational = `+254 ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  const masked = `${cleaned.slice(0, 5)}****${cleaned.slice(9)}`;

  return {
    isValid: true,
    canonical: cleaned,
    displayLocal,
    displayInternational,
    masked,
    carrierHint,
  };
}

/**
 * Compare two phone numbers after normalizing both.
 * Returns true if both point to the exact same Kenyan subscriber.
 */
export function arePhonesEqual(phoneA: string | undefined | null, phoneB: string | undefined | null): boolean {
  if (!phoneA || !phoneB) return false;
  const normA = normalizeKenyanPhone(phoneA);
  const normB = normalizeKenyanPhone(phoneB);
  if (!normA.isValid || !normB.isValid) return false;
  return normA.canonical === normB.canonical;
}
