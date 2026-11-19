// Bank accounts printed on transfer receipts made before cashiers could choose which accounts to show.
// Set REACT_APP_LEGACY_BANK_ACCOUNTS in frontend/.env.local (not committed) to a JSON array such as
// [{"bankName":"Access Bank","accountNumber":"0123456789","accountName":"Fortune et Fever Nig LTD"}].
// Without it, those older receipts print no bank details.
export function legacyBankAccounts() {
  try {
    const parsed = JSON.parse(process.env.REACT_APP_LEGACY_BANK_ACCOUNTS || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}
