import React, { useCallback, useEffect, useState } from 'react';
import { FaCloud } from 'react-icons/fa';
import { fetchSyncStatus, runSyncNow, chooseSync, resyncAll } from '../services/api';
import '../styles/SyncBar.css';

const when = (iso) => (iso ? new Date(iso).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }) : 'not yet');

// Settings card: sync happens by itself; this only shows how it is going and, rarely, asks the owner a question.
export default function SyncCard() {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);
  const [confirm, setConfirm] = useState(null); // 'use-cloud' | 'use-device'

  const load = useCallback(async () => { try { setStatus(await fetchSyncStatus()); } catch (_) { /* ignore */ } }, []);
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);

  const act = async (fn, okText) => {
    setBusy(true);
    setNote(null);
    try {
      const r = await fn();
      setNote(r && r.failed ? { ok: false, text: r.message } : { ok: true, text: okText });
    } catch (e) {
      setNote({ ok: false, text: (e && e.message) || 'Something went wrong' });
    } finally { setBusy(false); setConfirm(null); load(); }
  };

  if (!status) return null;
  const summary = {
    connecting: 'Setting up. This computer links itself to the cloud the first time it has internet.',
    waiting: 'Nothing to sync yet. Sync starts by itself as soon as you add your first products, or as soon as another device has data.',
    synced: 'Up to date. Changes are shared automatically whenever there is internet.',
    pending: `${status.pending} change${status.pending === 1 ? '' : 's'} waiting to be shared. They go out by themselves.`,
    syncing: 'Syncing now.',
    offline: 'No internet right now. Everything keeps working and will be shared when the internet is back.',
    error: `Something went wrong: ${status.error || 'unknown problem'}. It will try again by itself.`,
    needs_choice: 'This computer and the cloud both already hold data. Choose which one to keep.',
  }[status.state] || '';

  return (
    <div className="sync-card">
      <h3><FaCloud className="ui-icon" />Cloud Sync</h3>
      <p>{summary}</p>
      <p className="sync-meta">Last synced: <strong>{when(status.lastSyncAt)}</strong>{status.deviceNo ? ` · this device is number ${status.deviceNo}` : ''}</p>

      {status.state === 'needs_choice' && (
        <div className="sync-warning" role="alert">
          <strong>Which data should be kept?</strong>
          <p>Only one can be kept, and the other is replaced. Nothing has been changed yet.</p>
          <button type="button" className="sync-btn primary" disabled={busy} onClick={() => setConfirm('use-cloud')}>Use the cloud&apos;s data (replaces this computer&apos;s)</button>
          <button type="button" className="sync-btn" disabled={busy} onClick={() => setConfirm('use-device')}>Use this computer&apos;s data (replaces the cloud&apos;s)</button>
        </div>
      )}
      {confirm && (
        <div className="sync-warning" role="alert">
          <strong>{confirm === 'use-cloud' ? 'Replace this computer\'s data with the cloud\'s?' : 'Replace the cloud\'s data with this computer\'s?'}</strong>
          <p>{confirm === 'use-cloud'
            ? 'Its products, sales and users are removed and replaced by what is in the cloud. This cannot be undone.'
            : 'Everything now in the cloud is erased and replaced by this computer\'s data. Other devices that already use the cloud should be reset afterwards. This cannot be undone.'}</p>
          <button type="button" className="sync-btn danger" disabled={busy} onClick={() => act(() => chooseSync(confirm), 'Done.')}>Yes, replace</button>
          <button type="button" className="sync-btn" disabled={busy} onClick={() => setConfirm(null)}>Cancel</button>
        </div>
      )}

      <div className="sync-actions">
        <button type="button" className="sync-btn primary" disabled={busy || status.state === 'needs_choice'} onClick={() => act(runSyncNow, 'Synchronized.')}>Sync now</button>
        <button type="button" className="sync-btn" disabled={busy || !status.connected} onClick={() => act(resyncAll, 'Everything re-read from the cloud.')}>Re-read everything</button>
      </div>
      {note && <p className={`sync-note ${note.ok ? 'ok' : 'bad'}`} role="status">{note.text}</p>}
    </div>
  );
}
