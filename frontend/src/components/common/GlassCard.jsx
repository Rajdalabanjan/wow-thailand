import React from 'react';
import './OtpVerifyPanel.css';

/**
 * The dark "glassy" card used by the OTP panel, for any other step of the same flow
 * (e.g. the phone-number step before the code), so the whole sign-in looks like one piece.
 */
export default function GlassCard({ children, className = '', style }) {
  return (
    <div className={`otp-panel ${className}`.trim()} style={style}>
      <div className="otp-panel__bg" aria-hidden="true" />
      <div className="otp-panel__glass">{children}</div>
    </div>
  );
}
