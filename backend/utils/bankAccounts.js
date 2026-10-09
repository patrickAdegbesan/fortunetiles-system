// The accounts listed on the shop's notice. They are created once, with fixed ids and a fixed date, so every device
// starts with the identical list and syncing them never creates duplicates. After that they are edited in Settings.
const COMPANY_NAME = 'Fortune et Fever Nig LTD';
const DEFAULT_ACCOUNTS = [
  { id: 1, bankName: 'Access Bank', accountNumber: '0000000001', accountName: COMPANY_NAME },
  { id: 2, bankName: 'Fidelity Bank', accountNumber: '0000000002', accountName: COMPANY_NAME },
  { id: 3, bankName: 'Zenith Bank', accountNumber: '0000000003', accountName: COMPANY_NAME },
  { id: 4, bankName: 'FCMB', accountNumber: '0000000004', accountName: COMPANY_NAME },
  { id: 5, bankName: 'GTBank', accountNumber: '0000000005', accountName: '' }, // account name was cut off on the notice
];
const SEEDED_AT = '2026-01-01 00:00:00.000 +00:00';

async function ensureDefaultBankAccounts(sequelize) {
  await sequelize.query('CREATE TABLE IF NOT EXISTS app_flags (k TEXT PRIMARY KEY, v TEXT)');
  const [done] = await sequelize.query("SELECT v FROM app_flags WHERE k = 'bank_accounts_seeded'", { type: sequelize.QueryTypes.SELECT });
  if (done) return;
  const [count] = await sequelize.query('SELECT COUNT(*) AS n FROM bank_accounts', { type: sequelize.QueryTypes.SELECT });
  if (Number(count.n) === 0) {
    for (const [i, a] of DEFAULT_ACCOUNTS.entries()) {
      await sequelize.query(
        'INSERT INTO bank_accounts (id, bank_name, account_number, account_name, is_active, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?, ?)',
        { replacements: [a.id, a.bankName, a.accountNumber, a.accountName, i, SEEDED_AT, SEEDED_AT] }
      );
    }
  }
  await sequelize.query("INSERT INTO app_flags (k, v) VALUES ('bank_accounts_seeded', '1') ON CONFLICT(k) DO UPDATE SET v = '1'");
}

module.exports = { ensureDefaultBankAccounts, DEFAULT_ACCOUNTS };
