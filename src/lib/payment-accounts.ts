/**
 * Payment Accounts Utilities & Validation — Al Harmain Travels
 */

import type { PaymentAccount, PaymentAccountMethodType, PaymentAccountSnapshot } from '@/types';

// Helper: Normalize IBAN (remove spaces and dashes, uppercase)
export function normalizeIBAN(iban: string): string {
  return iban.replace(/[\s\-]/g, '').toUpperCase();
}

// Helper: Validate Saudi IBAN
export function isValidSaudiIBAN(iban: string): boolean {
  const clean = normalizeIBAN(iban);
  // Saudi IBAN is exactly 24 characters: starts with SA followed by 2 digits and 20 alphanumeric characters
  const saudiIbanRegex = /^SA\d{2}[A-Z0-9]{20}$/;
  return saudiIbanRegex.test(clean);
}

// Helper: Normalize phone / wallet number
export function normalizePhoneNumber(phone: string): string {
  return phone.replace(/[\s\-\(\)]/g, '');
}

// Helper: Validate mobile wallet number (Saudi +966 or 05, or international E.164 phone)
export function isValidMobileWalletNumber(phone: string): boolean {
  const clean = normalizePhoneNumber(phone);
  const phoneRegex = /^(\+9665\d{8}|05\d{8}|009665\d{8}|9665\d{8}|\+[1-9]\d{7,14})$/;
  return phoneRegex.test(clean);
}

// Helper: Create an immutable snapshot of a payment account for booking historical records
export function createPaymentAccountSnapshot(account: PaymentAccount): PaymentAccountSnapshot {
  return {
    id: account.id,
    payment_method_type: account.payment_method_type,
    provider_name: account.provider_name,
    account_holder_name: account.account_holder_name,
    account_number: account.account_number || null,
    iban: account.iban || null,
    wallet_number: account.wallet_number || null,
    instructions: account.instructions || null,
  };
}
