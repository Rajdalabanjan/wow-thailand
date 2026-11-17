import React, { useEffect, useRef, useState } from 'react';
import { KeyRound, ShieldCheck, Loader2, ArrowRight } from 'lucide-react';
import OtpInput from './OtpInput';
import './OtpVerifyPanel.css';

const MIN_VERIFY_MS = 950;   // the orbit shows at least this long, even if the server answers at once
const SUCCESS_HOLD_MS = 1500; // merge + green seal + "Verified" before moving on

/**
 * "Glassy" OTP verification panel: dark glass card, gold accents.
 *   typing -> Verify -> the digit boxes orbit while the code is checked
 *   -> accepted: they merge into a green seal, "Verified Successfully", then onSuccessDone()
 *   -> rejected: back in a row, red, shake, with the error message.
 *
 * The parent keeps its own API call and logic; it only reports the result through
 * `status`: 'idle' | 'verifying' | 'success' | 'error'.
 *
 * Props: length, value, onChange, onComplete (all digits in), onSubmit (button),
 *   status, errorMessage, onSuccessDone, title / highlight / subtitle,
 *   successTitle / successHighlight / successSubtitle,
 *   submitLabel, verifyingLabel, successLabel,
 *   resendSeconds + onResend (resend line), autoFocus, children (shown under the subtitle),
 *   footer (e.g. a Back button, shown left of the main button)
 */
export default function OtpVerifyPanel({
  length = 6,
  value = '',
  onChange,
  onComplete,
  onSubmit,
  status = 'idle',
  errorMessage = '',
  onSuccessDone,
  title = 'Verify',
  highlight = 'OTP',
  subtitle,
  successTitle = 'Verified',
  successHighlight = 'Successfully',
  successSubtitle = 'Your security verification code has been confirmed.',
  submitLabel = 'Verify Code',
  verifyingLabel = 'Verifying Code…',
  successLabel = 'Verified & Secured',
  resendSeconds,
  onResend,
  autoFocus = true,
  children,
  footer,
  label = 'Verification code'
}) {
  // What the panel shows can lag the real status a little, so every stage is visible
  const [shown, setShown] = useState(status);
  const verifyStart = useRef(0);
  const doneTimer = useRef(null);
  const onDoneRef = useRef(onSuccessDone);
  onDoneRef.current = onSuccessDone;

  useEffect(() => {
    let t;
    if (status === 'verifying') {
      verifyStart.current = Date.now();
      setShown('verifying');
    } else if (status === 'success' || status === 'error') {
      const wait = Math.max(0, MIN_VERIFY_MS - (Date.now() - verifyStart.current));
      t = setTimeout(() => {
        setShown(status);
        if (status === 'success') {
          clearTimeout(doneTimer.current);
          doneTimer.current = setTimeout(() => onDoneRef.current?.(), SUCCESS_HOLD_MS);
        }
      }, verifyStart.current ? wait : 0);
    } else {
      setShown('idle');
    }
    return () => clearTimeout(t);
  }, [status]);

  useEffect(() => () => clearTimeout(doneTimer.current), []);

  const verifying = shown === 'verifying';
  const success = shown === 'success';
  const error = shown === 'error';
  const busy = verifying || success || status === 'verifying';
  const complete = value.length === length;

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className={`otp-panel ${success ? 'is-success' : ''} ${error ? 'is-error' : ''}`}>
      <div className="otp-panel__bg" aria-hidden="true" />
      <div className="otp-panel__glass">
        <div className="otp-panel__icon" aria-hidden="true">
          {success ? <ShieldCheck size={20} /> : <KeyRound size={18} />}
        </div>

        <h3 className="otp-panel__title" aria-live="polite">
          {success ? (
            <>{successTitle} <span className="otp-panel__accent otp-panel__accent--ok">{successHighlight}</span></>
          ) : (
            <>{title} <span className="otp-panel__accent">{highlight}</span></>
          )}
        </h3>
        <p className="otp-panel__subtitle">{success ? successSubtitle : subtitle}</p>

        {children && !success && <div className="otp-panel__extra">{children}</div>}

        <form
          className="otp-panel__form"
          onSubmit={(e) => { e.preventDefault(); if (!busy && complete) onSubmit?.(value); }}
        >
          <OtpInput
            theme="dark"
            length={length}
            value={value}
            onChange={onChange}
            onComplete={onComplete}
            status={shown}
            disabled={busy}
            autoFocus={autoFocus}
            label={label}
          />

          <div className="otp-panel__error" role="alert">
            {error && errorMessage ? errorMessage : ''}
          </div>

          {typeof resendSeconds === 'number' && !success && (
            <div className="otp-panel__resend">
              Didn't receive the code?{' '}
              {resendSeconds > 0 ? (
                <span className="otp-panel__timer">Resend in {fmt(resendSeconds)}</span>
              ) : (
                <button type="button" className="otp-panel__link" onClick={onResend} disabled={busy}>
                  Resend code
                </button>
              )}
            </div>
          )}

          <div className="otp-panel__actions">
            {footer && !success && <div className="otp-panel__footer">{footer}</div>}
            <button
              type="submit"
              className={`otp-panel__btn ${success ? 'is-success' : ''}`}
              disabled={!success && (busy || !complete)}
              aria-disabled={success || undefined}
            >
              {success ? (
                <><ShieldCheck size={16} /> {successLabel}</>
              ) : verifying || status === 'verifying' ? (
                <><Loader2 size={16} className="otp-panel__spin" /> {verifyingLabel}</>
              ) : (
                <>{submitLabel} <ArrowRight size={15} /></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
