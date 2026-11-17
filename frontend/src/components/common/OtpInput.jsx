import React, { useEffect, useRef, useState } from 'react';
import './OtpInput.css';

/**
 * Premium one-time-code input: one box per digit.
 * - Typing moves to the next box; Backspace goes back; arrow keys move.
 * - Pasting (or the phone's SMS / email autofill) fills every box at once.
 * - Gold glow on the active box, a soft "pop" as each digit lands, a shake when the
 *   code is wrong (error) and a green finish when it is accepted (success).
 *
 * Props
 *   length      number of digits (4 or 6)
 *   value       the code as a string ("" to "123456")
 *   onChange    (code) => void
 *   onComplete  (code) => void, called once all digits are filled
 *   error       true shows the red state and shakes the row (re-shakes on each new error)
 *   success     true shows the green state
 *   disabled    true while the code is being checked
 *   autoFocus   focus the first empty box on mount
 *   theme       'light' (white cards) or 'dark' (glass panels)
 *   status      'idle' | 'verifying' | 'success' | 'error' (used by OtpVerifyPanel):
 *               verifying = boxes orbit, success = boxes merge into a green seal
 */
export default function OtpInput({
  length = 6,
  value = '',
  onChange,
  onComplete,
  error = false,
  success = false,
  disabled = false,
  autoFocus = false,
  theme = 'light',
  label = 'Verification code',
  status = 'idle'
}) {
  const inputs = useRef([]);
  const [focusIndex, setFocusIndex] = useState(-1);
  const [shaking, setShaking] = useState(false);
  const digits = Array.from({ length }, (_, i) => value[i] || '');
  // The latest code, updated the moment a digit is typed. React only passes the new
  // `value` back on the next render, and focus moves before that: reading `value` there
  // would see the old code and send the cursor back a box.
  const codeRef = useRef(value);
  codeRef.current = value;
  const errorNow = status === 'error' || error;

  // Each new error shakes the row once (no remount, so focus stays put)
  useEffect(() => {
    if (!errorNow) return undefined;
    setShaking(true);
    const t = setTimeout(() => setShaking(false), 450);
    return () => clearTimeout(t);
  }, [errorNow]);

  // The boxes are disabled (and lose focus) while a code is checked. When it comes back
  // wrong, put the cursor back on the last digit so Backspace corrects it straight away.
  useEffect(() => {
    if (disabled || !errorNow) return;
    const last = Math.max(0, Math.min(codeRef.current.length, length) - 1);
    const el = inputs.current[last];
    if (el && document.activeElement !== el) el.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, errorNow]);

  useEffect(() => {
    if (!autoFocus) return undefined;
    const t = setTimeout(() => {
      const first = Math.min(value.length, length - 1);
      inputs.current[first]?.focus();
    }, 120);
    return () => clearTimeout(t);
    // only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentDigits = () => Array.from({ length }, (_, k) => codeRef.current[k] || '');

  const emit = (next) => {
    const code = next.slice(0, length);
    codeRef.current = code;
    onChange?.(code);
    if (code.length === length && !code.includes(' ')) onComplete?.(code);
  };

  const focusBox = (i) => {
    const el = inputs.current[Math.max(0, Math.min(length - 1, i))];
    if (el) { el.focus(); el.select?.(); }
  };

  const handleChange = (i, raw) => {
    const typed = String(raw || '').replace(/\D/g, '');
    if (!typed) return;
    if (typed.length > 1) {
      // autofill or a paste landed in one box: spread it from here
      const arr = currentDigits();
      for (let k = 0; k < typed.length && i + k < length; k++) arr[i + k] = typed[k];
      const code = arr.join('').replace(/\s/g, '');
      emit(code);
      focusBox(Math.min(i + typed.length, length - 1));
      return;
    }
    // boxes before i are always filled (see handleFocus), so the code stays in order
    const arr = currentDigits();
    arr[i] = typed;
    emit(arr.join(''));
    if (i < length - 1) focusBox(i + 1);
  };

  // Clicking a box further along than the next empty one goes to that empty box
  const handleFocus = (i, e) => {
    const firstEmpty = Math.min(codeRef.current.length, length - 1);
    if (i > firstEmpty) {
      focusBox(firstEmpty);
      return;
    }
    setFocusIndex(i);
    e.target.select();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const arr = currentDigits();
      if (arr[i]) {
        arr[i] = '';
        emit(arr.join(''));
      } else if (i > 0) {
        arr[i - 1] = '';
        emit(arr.join(''));
        focusBox(i - 1);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault(); focusBox(i - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault(); focusBox(i + 1);
    }
  };

  const handlePaste = (e) => {
    const text = (e.clipboardData?.getData('text') || '').replace(/\D/g, '');
    if (!text) return;
    e.preventDefault();
    emit(text.slice(0, length));
    focusBox(Math.min(text.length, length - 1));
  };

  // status ('verifying' | 'success' | 'error') drives the "glassy" sequence:
  // the boxes orbit while the code is checked, then merge into one green seal
  const isSuccess = status === 'success' || success;
  const isVerifying = status === 'verifying';
  const isError = !isSuccess && !isVerifying && (status === 'error' || error);
  const state = isSuccess ? 'is-success' : isVerifying ? 'is-verifying' : isError ? 'is-error' : '';
  return (
    // the wrapper is a size container: the boxes size themselves from the space they
    // actually get (a narrow modal on a phone), not from the screen width
    <div className="otp-input-wrap">
    <div
      className={`otp-input otp-input--${theme} otp-input--len${length} ${state} ${shaking && isError ? 'is-shaking' : ''}`}
      style={{ '--n': length }}
      role="group"
      aria-label={label}
      aria-busy={isVerifying || undefined}
      onPaste={handlePaste}
    >
      <div className="otp-input__track">
      {digits.map((d, i) => (
        <div
          key={i}
          className={`otp-input__cell ${d ? 'is-filled' : ''} ${focusIndex === i ? 'is-active' : ''}`}
          style={{ '--i': i }}
        >
          <input
            ref={(el) => { inputs.current[i] = el; }}
            className="otp-input__box"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={i === 0 ? length : 1}
            value={d}
            disabled={disabled}
            aria-label={`Digit ${i + 1} of ${length}`}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={(e) => handleFocus(i, e)}
            onBlur={() => setFocusIndex((cur) => (cur === i ? -1 : cur))}
          />
          {/* blinking caret in the active empty box */}
          {!d && focusIndex === i && !disabled && <span className="otp-input__caret" aria-hidden="true" />}
        </div>
      ))}
      </div>

      {/* The boxes merge into this seal once the code is accepted */}
      <div className="otp-input__seal" aria-hidden="true">
        <span className="otp-input__ring otp-input__ring--1" />
        <span className="otp-input__ring otp-input__ring--2" />
        <span className="otp-input__seal-box">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
            <path className="otp-input__check" d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </div>
    </div>
  );
}
