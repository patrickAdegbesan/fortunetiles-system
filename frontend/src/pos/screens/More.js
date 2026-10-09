import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaMapMarkerAlt, FaTags, FaUsers, FaPrint, FaKey, FaCloud, FaSignOutAlt, FaChevronRight, FaPlus, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { Screen, Card, Field, Button, Chips, Empty, Loading, ErrorNote, Badge, ConfirmDialog, timeAgo } from '../ui';
import { useAuth } from '../../contexts/AuthContext';
import { useCatalog, useToast } from '../store';
import {
  fetchLocations, createLocation, updateLocation, deleteLocation,
  createCategory, deleteCategory,
  fetchUsers, createUser, updateUser, resetUserPassword, deactivateUser, activateUser,
  setAdminPin, fetchSyncStatus, runSyncNow, chooseSync, resyncAll,
} from '../../services/api';
import { printTestSlip, printerStatus, isPosTerminal } from '../../utils/posPrinter';

const isOwner = (u) => !!u && u.role === 'owner';
const canManage = (u) => !!u && ['owner', 'manager'].includes(u.role);

/* ------------------------------------------------------------------ menu */
export function MoreMenu() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const items = [
    { to: '/more/locations', icon: <FaMapMarkerAlt aria-hidden="true" />, label: 'Locations', show: canManage(user) },
    { to: '/more/categories', icon: <FaTags aria-hidden="true" />, label: 'Categories', show: canManage(user) },
    { to: '/more/users', icon: <FaUsers aria-hidden="true" />, label: 'Users', show: isOwner(user) },
    { to: '/more/printer', icon: <FaPrint aria-hidden="true" />, label: 'Receipt printer', show: true },
    { to: '/more/pin', icon: <FaKey aria-hidden="true" />, label: 'Price-edit PIN', show: canManage(user) },
    { to: '/more/sync', icon: <FaCloud aria-hidden="true" />, label: 'Cloud sync', show: true },
  ].filter((i) => i.show);

  return (
    <Screen title="More" flush>
      <div className="pos-card" style={{ margin: 12 }}>
        <div className="pos-row-title">{user ? `${user.firstName} ${user.lastName}` : ''}</div>
        <div className="pos-row-sub">{user && (user.username || user.email)} · <Badge tone="blue">{user && user.role}</Badge></div>
      </div>
      <div className="pos-list">
        {items.map((i) => (
          <button type="button" className="pos-row" key={i.to} onClick={() => navigate(i.to)}>
            <span style={{ width: 28, color: 'var(--navy)', fontSize: 18 }}>{i.icon}</span>
            <div className="pos-row-main"><div className="pos-row-title">{i.label}</div></div>
            <FaChevronRight aria-hidden="true" style={{ color: '#9aa6bc' }} />
          </button>
        ))}
      </div>
      <div style={{ padding: 12 }}><Button kind="danger" block onClick={logout}><FaSignOutAlt aria-hidden="true" />Sign out</Button></div>
    </Screen>
  );
}

/* ------------------------------------------------------------- locations */
export function LocationsScreen() {
  const { reload } = useCatalog();
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [edit, setEdit] = useState(null); // {id?, name, address}
  const [confirm, setConfirm] = useState(null);
  const [errors, setErrors] = useState({});

  const load = useCallback(async () => {
    try { setRows((await fetchLocations()).locations || []); } catch (e) { setError((e && e.message) || 'Could not load locations'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const err = {};
    if (!edit.name.trim()) err.name = 'Enter a name';
    if (!edit.address.trim()) err.address = 'Enter an address';
    setErrors(err);
    if (Object.keys(err).length) return;
    try {
      const body = { name: edit.name.trim(), address: edit.address.trim() };
      if (edit.id) await updateLocation(edit.id, body); else await createLocation(body);
      setEdit(null); toast('Location saved'); load(); reload();
    } catch (e) { toast((e && e.message) || 'Could not save', 'error'); }
  };
  const remove = async () => {
    const l = confirm; setConfirm(null);
    try { await deleteLocation(l.id); toast('Location deleted'); load(); reload(); } catch (e) { toast((e && e.message) || 'Could not delete', 'error'); }
  };

  if (edit) {
    return (
      <Screen title={edit.id ? 'Edit location' : 'New location'} back={false} right={<button type="button" className="pos-icon-btn" style={{ width: 'auto', padding: '0 10px', fontSize: 14 }} onClick={() => setEdit(null)}>Cancel</button>}
        footer={<Button kind="primary" block onClick={save}>Save location</Button>}>
        <Field label="Name" error={errors.name}><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className={errors.name ? 'error' : ''} /></Field>
        <Field label="Address" error={errors.address}><textarea value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} className={errors.address ? 'error' : ''} /></Field>
      </Screen>
    );
  }
  return (
    <Screen title="Locations" back="/more" right={<button type="button" className="pos-icon-btn" aria-label="Add location" onClick={() => { setErrors({}); setEdit({ name: '', address: '' }); }}><FaPlus aria-hidden="true" /></button>} flush>
      {error && <ErrorNote message={error} />}
      {!rows && !error && <Loading />}
      <div className="pos-list">
        {(rows || []).map((l) => (
          <button type="button" className="pos-row" key={l.id} onClick={() => { setErrors({}); setEdit({ id: l.id, name: l.name, address: l.address || '' }); }}>
            <div className="pos-row-main"><div className="pos-row-title">{l.name}</div><div className="pos-row-sub">{l.address}</div></div>
            <span role="button" tabIndex={0} className="pos-link" onClick={(e) => { e.stopPropagation(); setConfirm(l); }} style={{ color: 'var(--red)' }}>Delete</span>
          </button>
        ))}
      </div>
      {confirm && <ConfirmDialog danger title={`Delete ${confirm.name}?`} message="A location that still has stock cannot be deleted." confirmLabel="Delete" onConfirm={remove} onCancel={() => setConfirm(null)} />}
    </Screen>
  );
}

/* ------------------------------------------------------------ categories */
export function CategoriesScreen() {
  const { categories, reload } = useCatalog();
  const toast = useToast();
  const [name, setName] = useState('');
  const [confirm, setConfirm] = useState(null);

  const add = async () => {
    if (!name.trim()) return;
    try { await createCategory(name.trim()); setName(''); await reload(); toast('Category added'); } catch (e) { toast((e && e.message) || 'Could not add', 'error'); }
  };
  const remove = async () => {
    const c = confirm; setConfirm(null);
    try { await deleteCategory(c, 'General'); await reload(); toast('Category deleted'); } catch (e) { toast((e && e.message) || 'Could not delete', 'error'); }
  };

  return (
    <Screen title="Categories" back="/more">
      <div className="pos-row2" style={{ gridTemplateColumns: '1fr auto', marginBottom: 12 }}>
        <input placeholder="New category" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <Button kind="primary" onClick={add} disabled={!name.trim()}>Add</Button>
      </div>
      <Card style={{ padding: 0 }}>
        {categories.map((c) => (
          <div className="pos-row" key={c} style={{ cursor: 'default' }}>
            <div className="pos-row-main"><div className="pos-row-title">{c}</div></div>
            {c !== 'General' && <button type="button" className="pos-link" style={{ color: 'var(--red)' }} onClick={() => setConfirm(c)}>Delete</button>}
          </div>
        ))}
      </Card>
      {confirm && <ConfirmDialog danger title={`Delete "${confirm}"?`} message="Products in it move to General." confirmLabel="Delete" onConfirm={remove} onCancel={() => setConfirm(null)} />}
    </Screen>
  );
}

/* ----------------------------------------------------------------- users */
export function UsersScreen() {
  const { user: me } = useAuth();
  const { locations } = useCatalog();
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [edit, setEdit] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setRows((await fetchUsers({ limit: 100 })).users || []); } catch (e) { setError((e && e.message) || 'Could not load users'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const open = (u) => { setErrors({}); setEdit(u ? { id: u.id, firstName: u.firstName, lastName: u.lastName, username: u.username || '', email: /@fortunetiles\.local$/.test(u.email || '') ? '' : (u.email || ''), role: u.role, locationId: u.locationId || '', isActive: u.isActive, password: '' } : { firstName: '', lastName: '', username: '', email: '', role: 'staff', locationId: '', isActive: true, password: '' }); };

  const save = async () => {
    const err = {};
    if (!edit.firstName.trim()) err.firstName = 'Required';
    if (!edit.lastName.trim()) err.lastName = 'Required';
    if (!/^[a-z0-9._-]{3,30}$/i.test(edit.username.trim())) err.username = 'Use 3-30 letters, numbers, dot, dash or underscore';
    if (edit.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(edit.email.trim())) err.email = 'Enter a valid email or leave it empty';
    if (!edit.id && edit.password.length < 6) err.password = 'At least 6 characters';
    if (edit.id && edit.password && edit.password.length < 6) err.password = 'At least 6 characters';
    setErrors(err);
    if (Object.keys(err).length) return;
    setBusy(true);
    try {
      const body = { firstName: edit.firstName.trim(), lastName: edit.lastName.trim(), username: edit.username.trim().toLowerCase(), email: edit.email.trim().toLowerCase() || undefined, role: edit.role, locationId: edit.locationId ? Number(edit.locationId) : null, isActive: edit.isActive };
      if (edit.id) {
        await updateUser(edit.id, body);
        if (edit.password) await resetUserPassword(edit.id, edit.password);
      } else {
        await createUser({ ...body, password: edit.password });
      }
      toast('User saved'); setEdit(null); load();
    } catch (e) { toast((e && e.message) || 'Could not save', 'error'); }
    finally { setBusy(false); }
  };

  const toggle = async () => {
    try { if (edit.isActive) await deactivateUser(edit.id); else await activateUser(edit.id); toast(edit.isActive ? 'User deactivated' : 'User activated'); setEdit(null); load(); }
    catch (e) { toast((e && e.message) || 'Could not change status', 'error'); }
  };

  if (edit) {
    const self = edit.id && me && edit.id === me.id;
    return (
      <Screen title={edit.id ? 'Edit user' : 'New user'} back={false} right={<button type="button" className="pos-icon-btn" style={{ width: 'auto', padding: '0 10px', fontSize: 14 }} onClick={() => setEdit(null)}>Cancel</button>}
        footer={<Button kind="primary" block busy={busy} onClick={save}>Save user</Button>}>
        <div className="pos-row2">
          <Field label="First name" error={errors.firstName}><input value={edit.firstName} onChange={(e) => setEdit({ ...edit, firstName: e.target.value })} className={errors.firstName ? 'error' : ''} /></Field>
          <Field label="Last name" error={errors.lastName}><input value={edit.lastName} onChange={(e) => setEdit({ ...edit, lastName: e.target.value })} className={errors.lastName ? 'error' : ''} /></Field>
        </div>
        <Field label="Username" error={errors.username} hint="What they type to sign in, for example ada"><input autoCapitalize="none" spellCheck={false} value={edit.username} onChange={(e) => setEdit({ ...edit, username: e.target.value.replace(/\s/g, '') })} className={errors.username ? 'error' : ''} /></Field>
        <Field label="Email (optional)" error={errors.email}><input type="email" autoCapitalize="none" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} className={errors.email ? 'error' : ''} /></Field>
        <Field label={edit.id ? 'New password (leave empty to keep)' : 'Password'} error={errors.password} hint="At least 6 characters"><input type="text" autoCapitalize="none" value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} className={errors.password ? 'error' : ''} /></Field>
        <Field label="Role"><Chips options={[{ value: 'staff', label: 'Staff' }, { value: 'manager', label: 'Manager' }, { value: 'owner', label: 'Owner' }]} value={edit.role} onChange={(v) => setEdit({ ...edit, role: v })} /></Field>
        <Field label="Works at"><select value={edit.locationId} onChange={(e) => setEdit({ ...edit, locationId: e.target.value })}><option value="">Any location</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></Field>
        {edit.id && !self && <Button kind={edit.isActive ? 'danger' : 'green'} block onClick={toggle}>{edit.isActive ? 'Deactivate user' : 'Reactivate user'}</Button>}
      </Screen>
    );
  }
  return (
    <Screen title="Users" back="/more" right={<button type="button" className="pos-icon-btn" aria-label="Add user" onClick={() => open(null)}><FaPlus aria-hidden="true" /></button>} flush>
      {error && <ErrorNote message={error} />}
      {!rows && !error && <Loading />}
      {rows && rows.length === 0 && <Empty title="No users" />}
      <div className="pos-list">
        {(rows || []).map((u) => (
          <button type="button" className="pos-row" key={u.id} onClick={() => open(u)}>
            <div className="pos-row-main"><div className="pos-row-title">{u.firstName} {u.lastName}</div><div className="pos-row-sub">{u.username || u.email}</div></div>
            <div className="pos-row-end"><Badge tone="blue">{u.role}</Badge>{!u.isActive && <div><Badge tone="red">Inactive</Badge></div>}</div>
          </button>
        ))}
      </div>
    </Screen>
  );
}

/* --------------------------------------------------------------- printer */
export function PrinterScreen() {
  const toast = useToast();
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => setStatus(await printerStatus()), []);
  useEffect(() => { if (isPosTerminal()) refresh(); }, [refresh]);

  const test = async () => {
    setBusy(true);
    const r = await printTestSlip();
    toast(r.message, r.ok ? 'ok' : 'error');
    await refresh();
    setBusy(false);
  };

  if (!isPosTerminal()) return <Screen title="Receipt printer" back="/more"><Empty icon={<FaPrint aria-hidden="true" />} title="No built-in printer" hint="Receipts print through the browser's print dialog on a computer." /></Screen>;
  return (
    <Screen title="Receipt printer" back="/more">
      <Card>
        <h2>Built-in thermal printer</h2>
        {!status && <div className="pos-row-sub">Checking…</div>}
        {status && status.ready && <div className="pos-row-title" style={{ color: 'var(--green)' }}><FaCheckCircle aria-hidden="true" /> Ready to print</div>}
        {status && !status.ready && status.available && <div className="pos-row-title" style={{ color: 'var(--amber)' }}><FaExclamationTriangle aria-hidden="true" /> Not ready - check that paper is loaded and the cover is closed</div>}
        {status && !status.available && <div className="pos-row-title" style={{ color: 'var(--red)' }}><FaExclamationTriangle aria-hidden="true" /> No printer service found on this device</div>}
      </Card>
      <Button kind="primary" block busy={busy} onClick={test}><FaPrint aria-hidden="true" />Print test slip</Button>
      <div style={{ height: 8 }} />
      <Button block onClick={refresh}>Check again</Button>
    </Screen>
  );
}

/* -------------------------------------------------------------------- pin */
export function PinScreen() {
  const toast = useToast();
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    if (!/^\d{4}$/.test(pin)) { setError('The PIN must be exactly 4 digits.'); return; }
    setBusy(true); setError('');
    try { await setAdminPin(pin); setPin(''); toast('PIN saved'); } catch (e) { setError((e && e.message) || 'Could not save the PIN'); }
    finally { setBusy(false); }
  };
  return (
    <Screen title="Price-edit PIN" back="/more" footer={<Button kind="primary" block busy={busy} onClick={save}>Save PIN</Button>}>
      <p style={{ marginBottom: 12, color: 'var(--muted)' }}>Staff enter this 4-digit PIN to unlock price edits (markups) while selling.</p>
      <Field label="New 4-digit PIN" error={error}><input inputMode="numeric" type="password" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} className={error ? 'error' : ''} /></Field>
    </Screen>
  );
}

/* ------------------------------------------------------------ cloud sync */
export function SyncScreen() {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const { user } = useAuth();

  const load = useCallback(async () => { try { setStatus(await fetchSyncStatus()); } catch (_) { /* ignore */ } }, []);
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);

  const act = async (fn, okText) => {
    setBusy(true); setNote(null);
    try { const r = await fn(); setNote(r && r.failed ? { ok: false, text: r.message } : { ok: true, text: okText }); }
    catch (e) { setNote({ ok: false, text: (e && e.message) || 'Something went wrong' }); }
    finally { setBusy(false); setConfirm(null); load(); }
  };

  if (!status) return <Screen title="Cloud sync" back="/more"><Loading /></Screen>;
  const summary = {
    connecting: 'Setting up. This terminal links itself to the cloud the first time it has internet.',
    waiting: 'Nothing to sync yet. Sync starts by itself as soon as you add your first items, or as soon as another device has data.',
    synced: 'Up to date. Changes are shared automatically whenever there is internet.',
    pending: `${status.pending} change${status.pending === 1 ? '' : 's'} waiting. They go out by themselves.`,
    syncing: 'Syncing now.',
    offline: 'No internet right now. Everything keeps working and is shared when it is back.',
    error: `Something went wrong: ${status.error || 'unknown problem'}. It will try again by itself.`,
    needs_choice: 'This terminal and the cloud both already hold data. The owner must choose which to keep.',
  }[status.state] || '';
  return (
    <Screen title="Cloud sync" back="/more">
      <Card>
        <p style={{ marginBottom: 8 }}>{summary}</p>
        <div className="pos-kv"><span>Last synced</span><strong>{status.lastSyncAt ? timeAgo(status.lastSyncAt) : 'not yet'}</strong></div>
        <div className="pos-kv"><span>Waiting to share</span><strong>{status.pending}</strong></div>
        {status.deviceNo ? <div className="pos-kv"><span>This device</span><strong>#{status.deviceNo}</strong></div> : null}
      </Card>
      {status.state === 'needs_choice' && isOwner(user) && (
        <Card style={{ borderColor: '#f59e0b' }}>
          <strong>Which data should be kept?</strong>
          <p style={{ margin: '6px 0 10px', color: 'var(--muted)' }}>Only one can be kept; the other is replaced. Nothing has changed yet.</p>
          <Button kind="primary" block onClick={() => setConfirm('use-cloud')}>Use the cloud&apos;s data</Button>
          <div style={{ height: 8 }} />
          <Button block onClick={() => setConfirm('use-device')}>Use this terminal&apos;s data</Button>
        </Card>
      )}
      <Button kind="primary" block busy={busy} disabled={status.state === 'needs_choice'} onClick={() => act(runSyncNow, 'Synchronized.')}>Sync now</Button>
      {isOwner(user) && status.connected && (<><div style={{ height: 8 }} /><Button block disabled={busy} onClick={() => act(resyncAll, 'Everything re-read from the cloud.')}>Re-read everything</Button></>)}
      {note && <div className={`pos-note ${note.ok ? 'ok' : 'bad'}`} role="status">{note.text}</div>}
      {confirm && (
        <ConfirmDialog danger
          title={confirm === 'use-cloud' ? 'Replace this terminal\'s data?' : 'Replace the cloud\'s data?'}
          message={confirm === 'use-cloud' ? 'Its products, sales and users are replaced by what is in the cloud. This cannot be undone.' : 'Everything in the cloud is erased and replaced by this terminal\'s data. Reset other devices afterwards. This cannot be undone.'}
          confirmLabel="Yes, replace" onCancel={() => setConfirm(null)} onConfirm={() => act(() => chooseSync(confirm), 'Done.')} />
      )}
    </Screen>
  );
}
