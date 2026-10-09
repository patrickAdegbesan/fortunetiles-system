// The small sync indicator in every screen's top bar: tap to sync now (or to set sync up).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSyncStatus, runSyncNow } from '../services/api';

export default function SyncChip() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    try { const s = await fetchSyncStatus(); if (alive.current) setStatus(s); } catch (_) { /* ignore */ }
  }, []);
  useEffect(() => {
    alive.current = true;
    refresh();
    const t = setInterval(refresh, 8000);
    return () => { alive.current = false; clearInterval(t); };
  }, [refresh]);

  if (!status) return null;
  const state = busy || status.state === 'syncing' ? 'syncing' : status.state;
  const label = {
    connecting: 'Setting up',
    needs_choice: 'Choose data',
    synced: 'Synced',
    pending: `${status.pending} waiting`,
    syncing: 'Syncing',
    offline: status.pending ? `Offline ${status.pending}` : 'Offline',
    error: 'Not synced',
  }[state] || '';

  const tap = async () => {
    if (busy) return;
    if (state === 'needs_choice') { navigate('/more/sync'); return; }
    setBusy(true);
    try { await runSyncNow(); } catch (_) { /* shown through the status */ }
    await refresh();
    setBusy(false);
  };

  return (
    <button type="button" className={`pos-sync ${state}`} onClick={tap} aria-label={`Cloud sync: ${label}`}>
      <span className="pos-sync-dot" aria-hidden="true" />{label}
    </button>
  );
}
