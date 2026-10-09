import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { loginUser } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Field, Button } from '../ui';

const FIRST_RUN_KEY = 'ft_first_run_password';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [firstRun, setFirstRun] = useState(() => { try { return localStorage.getItem(FIRST_RUN_KEY); } catch (_) { return null; } });

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) { setError('Enter your username and password.'); return; }
    setBusy(true);
    setError('');
    try {
      const data = await loginUser({ username: username.trim(), password });
      login(data.user, data.token);
    } catch (err) {
      setError((err && err.message) || 'Sign in failed');
    } finally {
      setBusy(false);
    }
  };

  const savedIt = () => { try { localStorage.removeItem(FIRST_RUN_KEY); } catch (_) { /* ignore */ } setFirstRun(null); };

  return (
    <div className="pos-login">
      <form className="pos-login-card" onSubmit={submit} noValidate>
        <img className="pos-login-logo" src={`${process.env.PUBLIC_URL}/assets/logo-mark.png`} alt="" />
        <h1>Fortune Tiles</h1>
        <p className="sub">Sign in to continue</p>

        {firstRun && (
          <div className="pos-notice">
            <strong>First-time setup</strong>
            Sign in with username <b>admin</b> and this one-time password. Write it down, then create your own users in More → Users.
            <code>{firstRun}</code>
            <Button kind="ghost" block onClick={savedIt}>I have written it down</Button>
          </div>
        )}

        <Field label="Username">
          <input type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} value={username} onChange={(e) => setUsername(e.target.value)} className={error && !username ? 'error' : ''} />
        </Field>
        <Field label="Password" error={error}>
          <div style={{ position: 'relative' }}>
            <input type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={error ? 'error' : ''} style={{ paddingRight: 48 }} />
            <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}
              style={{ position: 'absolute', right: 2, top: 0, width: 44, height: 44, border: 0, background: 'none', color: '#5b6678', fontSize: 18 }}>
              {show ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
            </button>
          </div>
        </Field>
        <Button kind="primary" block busy={busy} type="submit" onClick={undefined}>Sign in</Button>
      </form>
    </div>
  );
}
