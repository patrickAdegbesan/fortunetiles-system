import React from 'react';
import ReactDOM from 'react-dom/client';
import './boot.css';
import { installScrollToErrors } from './utils/scrollToErrors';
import { isAndroidApp, ensureReady } from './local';

// The compact "terminal" interface is always used in the Android app; on a computer it can be previewed with ?pos=1.
try {
  if (/[?&]pos=1/.test(window.location.search)) localStorage.setItem('ft_pos', '1');
  if (/[?&]pos=0/.test(window.location.search)) localStorage.removeItem('ft_pos');
} catch (_) { /* ignore */ }
const posMode = isAndroidApp || (typeof localStorage !== 'undefined' && localStorage.getItem('ft_pos') === '1');
if (posMode) document.documentElement.classList.add('pos-terminal');

const root = ReactDOM.createRoot(document.getElementById('root'));
const splash = (text) => root.render(
  <div className="boot-splash">
    <img className="boot-logo" src={`${process.env.PUBLIC_URL}/assets/logo-mark.png`} alt="" />
    <div>{text}</div>
  </div>
);

async function start() {
  if (isAndroidApp) {
    // The terminal has no server: open the local database first.
    splash('Preparing Fortune Tiles…');
    await ensureReady();
  }
  // Each interface is its own chunk, so only the one in use is downloaded and parsed.
  const Root = (await (posMode ? import('./pos/PosApp') : import('./desktop'))).default;
  root.render(<React.StrictMode><Root /></React.StrictMode>);
}

start().catch((error) => {
  console.error('Startup failed', error);
  splash(`Could not start: ${String((error && error.message) || error)}`);
});

installScrollToErrors();

// This app runs from a local server or from the device itself: remove any
// service worker left behind by earlier PWA builds so it cannot serve stale files.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((regs) => regs.forEach((r) => r.unregister()))
    .catch(() => {});
}
