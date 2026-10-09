import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCloud, FaCheckCircle, FaSyncAlt, FaExclamationTriangle, FaCloudDownloadAlt } from 'react-icons/fa';
import { fetchSyncStatus, runSyncNow } from '../services/api';
import '../styles/SyncBar.css';

const ago = (iso) => {
  if (!iso) return 'never';
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
};

// The sync button fixed at the top of every page: it always says whether this computer is up to date with the cloud.
export default function SyncBar() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    try { const s = await fetchSyncStatus(); if (alive.current) setStatus(s); } catch (_) { /* server restarting */ }
  }, []);

  useEffect(() => {
    alive.current = true;
    refresh();
    const t = setInterval(refresh, 8000);
    return () => { alive.current = false; clearInterval(t); };
  }, [refresh]);

  const click = async () => {
    if (!status || busy) return;
    if (status.state === 'needs_choice') { navigate('/settings'); return; }
    setBusy(true);
    try { await runSyncNow(); } catch (_) { /* shown through the status */ }
    await refresh();
    setBusy(false);
  };

  if (!status) return <div className="sync-bar" />;

  const state = busy || status.state === 'syncing' ? 'syncing' : status.state;
  const view = {
    connecting: { cls: 'busy', icon: <FaSyncAlt className="spin" />, text: 'Setting up sync...', hint: 'Click to try now' },
    needs_choice: { cls: 'bad', icon: <FaExclamationTriangle />, text: 'Choose which data to keep', hint: 'Open Settings' },
    synced: { cls: 'ok', icon: <FaCheckCircle />, text: 'Up to date', hint: `Last synced ${ago(status.lastSyncAt)}` },
    pending: { cls: 'warn', icon: <FaCloudDownloadAlt />, text: `${status.pending} change${status.pending === 1 ? '' : 's'} waiting`, hint: 'Click to sync now' },
    syncing: { cls: 'busy', icon: <FaSyncAlt className="spin" />, text: 'Syncing...', hint: '' },
    offline: { cls: 'off', icon: <FaCloud />, text: status.pending ? `Offline - ${status.pending} waiting` : 'Offline', hint: 'Will sync when the internet is back. Click to try now' },
    error: { cls: 'bad', icon: <FaExclamationTriangle />, text: 'Not synchronized', hint: status.error || 'Click to try again' },
  }[state] || { cls: 'off', icon: <FaCloud />, text: '', hint: '' };

  return (
    <div className="sync-bar">
      <button type="button" className={`sync-pill ${view.cls}`} onClick={click} title={view.hint} disabled={busy}>
        {view.icon}<span>{view.text}</span>
        {view.hint && state !== 'pending' && state !== 'syncing' && <small>{view.hint}</small>}
      </button>
    </div>
  );
}
