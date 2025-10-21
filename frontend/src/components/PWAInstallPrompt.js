import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faTimes, faMobileAlt, faDesktop } from '@fortawesome/free-solid-svg-icons';
import '../styles/PWAInstallPrompt.css';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if user has recently dismissed the prompt
    const dismissedTime = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissedTime) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 30) { // Don't show for 30 days
        return;
      }
    }

    // Check if already installed
    const isInStandaloneMode = () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    setIsStandalone(isInStandaloneMode());

    // Don't show if already installed
    if (isInStandaloneMode()) {
      return;
    }

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Show prompt after a delay only if not already installed
      setTimeout(() => {
        if (!isInStandaloneMode()) {
          setShowPrompt(true);
        }
      }, 5000); // Increased to 5 seconds to be less intrusive
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show a different prompt after longer delay
    if (iOS && !isInStandaloneMode()) {
      setTimeout(() => setShowPrompt(true), 10000); // 10 seconds for iOS
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt && typeof deferredPrompt.prompt === 'function') {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }

        setDeferredPrompt(null);
        setShowPrompt(false);
      } catch (error) {
        console.log('Error showing install prompt:', error);
        setShowPrompt(false);
      }
    } else {
      // Fallback for browsers that don't support the install prompt
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Remember user's choice for 30 days
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  // Don't show if already installed or dismissed recently
  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <div className="pwa-install-prompt">
      <div className="pwa-prompt-content">
        <div className="pwa-prompt-icon">
          <FontAwesomeIcon icon={faDownload} />
        </div>

        <div className="pwa-prompt-text">
          <h3>Install Fortune Tiles App</h3>
          <p>Get the full experience with offline access and app-like features!</p>

          {isIOS ? (
            <div className="ios-instructions">
              <p><FontAwesomeIcon icon={faMobileAlt} /> Tap the share button and select "Add to Home Screen"</p>
            </div>
          ) : (
            <div className="install-benefits">
              <div className="benefit">
                <FontAwesomeIcon icon={faMobileAlt} />
                <span>Mobile App</span>
              </div>
              <div className="benefit">
                <FontAwesomeIcon icon={faDesktop} />
                <span>Desktop App</span>
              </div>
            </div>
          )}
        </div>

        <div className="pwa-prompt-actions">
          {!isIOS && (
            <button className="install-btn" onClick={handleInstallClick}>
              <FontAwesomeIcon icon={faDownload} />
              Install App
            </button>
          )}
          <button className="dismiss-btn" onClick={handleDismiss}>
            <FontAwesomeIcon icon={faTimes} />
            Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;