import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMpesaSms, verifyPastedMpesaSms } from '../src/utils/mpesaSmsParser.ts';

const merchantReceipt =
  'QGH7K92ABC Confirmed. Ksh750.00 sent to Alvis Njagi 0701870142 on 11/9/26 at 10:42 AM.';

test('does not mistake the merchant phone in a sent-to receipt for the payer phone', () => {
  const parsed = parseMpesaSms(merchantReceipt);
  assert.equal(parsed.senderPhone, undefined);
  assert.match(parsed.recipient || '', /0701870142/);

  const result = verifyPastedMpesaSms({
    smsText: merchantReceipt,
    expectedAmount: 750,
    checkoutPhone: '',
    merchantName: 'Alvis Njagi',
    paybillNumber: '0701870142',
  });
  assert.equal(result.isValid, true);
});

test('matches an explicitly identified payer phone when the customer supplies it', () => {
  const sms =
    'QGH7K92ABC Confirmed. You have received Ksh750.00 from PETER MWANGI 0712345678 on 11/9/26 at 10:42 AM.';
  const parsed = parseMpesaSms(sms);
  assert.equal(parsed.senderPhone, '0712345678');

  const result = verifyPastedMpesaSms({
    smsText: sms,
    expectedAmount: 750,
    checkoutPhone: '0712345678',
  });
  assert.equal(result.isValid, true);
});
