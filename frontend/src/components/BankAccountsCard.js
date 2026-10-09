import React, { useCallback, useEffect, useState } from 'react';
import { FaUniversity } from 'react-icons/fa';
import { fetchBankAccounts, createBankAccount, updateBankAccount, deleteBankAccount } from '../services/api';
import '../styles/SyncBar.css';

// Settings card: the shop's bank accounts. At checkout, for a transfer, the cashier picks from this list and only the
// chosen accounts are printed on the receipt.
const empty = { bankName: '', accountNumber: '', accountName: '' };

export default function BankAccountsCard() {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);

  const load = useCallback(async () => {
    try { setAccounts((await fetchBankAccounts(true)).bankAccounts || []); } catch (_) { /* ignore */ }
  }, []);
  useEffect(() => { load(); }, [load]);

  const start = (a) => { setEditingId(a ? a.id : null); setForm(a ? { bankName: a.bankName, accountNumber: a.accountNumber, accountName: a.accountName || '' } : empty); setOpen(true); setNote(null); };
  const cancel = () => { setOpen(false); setEditingId(null); setForm(empty); };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    try {
      const payload = { bankName: form.bankName.trim(), accountNumber: form.accountNumber.trim(), accountName: form.accountName.trim() };
      if (editingId) await updateBankAccount(editingId, payload); else await createBankAccount(payload);
      cancel();
      await load();
    } catch (err) {
      setNote((err && (err.message || (err.errors && err.errors.map((x) => x.message).join(', ')))) || 'Could not save');
    } finally { setBusy(false); }
  };

  const toggle = async (a) => { try { await updateBankAccount(a.id, { isActive: !a.isActive }); await load(); } catch (err) { setNote((err && err.message) || 'Could not change this account'); } };
  const remove = async (a) => {
    if (!window.confirm(`Remove ${a.bankName} ${a.accountNumber}? Receipts already printed are not affected.`)) return;
    try { await deleteBankAccount(a.id); await load(); } catch (err) { setNote((err && err.message) || 'Could not remove this account'); }
  };

  return (
    <div className="sync-card bank-card">
      <h3><FaUniversity className="ui-icon" />Bank Accounts</h3>
      <p>The accounts customers can pay into. At checkout, when someone pays by bank transfer, the cashier ticks the account to use, and only that account is printed on the receipt.</p>
      <div className="bank-list">
        {accounts.map((a) => (
          <div className={`bank-row${a.isActive ? '' : ' off'}`} key={a.id}>
            <div className="bank-row-main">
              <strong>{a.bankName}</strong> <span className="bank-num">{a.accountNumber}</span>
              <div className="bank-row-sub">{a.accountName || 'No account name yet'}{a.isActive ? '' : ' · hidden at checkout'}</div>
            </div>
            <div className="bank-row-actions">
              <button type="button" className="sync-btn" onClick={() => start(a)}>Edit</button>
              <button type="button" className="sync-btn" onClick={() => toggle(a)}>{a.isActive ? 'Hide' : 'Show'}</button>
              <button type="button" className="sync-btn danger" onClick={() => remove(a)}>Remove</button>
            </div>
          </div>
        ))}
        {accounts.length === 0 && <p className="sync-meta">No accounts yet.</p>}
      </div>
      {open ? (
        <form className="bank-form" onSubmit={save}>
          <div className="form-group"><label>Bank</label><input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="e.g. Zenith Bank" required /></div>
          <div className="form-group"><label>Account number</label><input value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value.replace(/[^0-9]/g, '') })} inputMode="numeric" required /></div>
          <div className="form-group"><label>Account name</label><input value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} placeholder="Name on the account" /></div>
          <div className="bank-form-actions">
            <button type="submit" className="sync-btn primary" disabled={busy}>{busy ? 'Saving...' : editingId ? 'Save changes' : 'Add account'}</button>
            <button type="button" className="sync-btn" onClick={cancel}>Cancel</button>
          </div>
        </form>
      ) : (
        <button type="button" className="sync-btn primary" onClick={() => start(null)}>Add bank account</button>
      )}
      {note && <p className="sync-note bad" role="alert">{note}</p>}
    </div>
  );
}
