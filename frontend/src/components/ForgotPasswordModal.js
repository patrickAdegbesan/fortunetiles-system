import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import '../styles/ForgotPasswordModal.css';

// Passwords live only on this computer, so there is no email reset.
// An owner resets them from Users > Edit.
const ForgotPasswordModal = ({ onClose }) => (
  <div className="modal-overlay" onClick={(e) => e.target.className === 'modal-overlay' && onClose()}>
    <div className="modal-content">
      <button className="close-button" onClick={onClose} aria-label="Close">
        <FontAwesomeIcon icon={faTimes} />
      </button>
      <h2>Forgot Password</h2>
      <p className="modal-description">
        This system works offline, so passwords can't be reset by email. Ask an owner to sign in
        and set a new password for you under Settings &rarr; Users &rarr; Edit.
      </p>
      <button type="button" className="submit-button" onClick={onClose}>OK</button>
    </div>
  </div>
);

export default ForgotPasswordModal;
