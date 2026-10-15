import { type ClipboardEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";

const LENGTH = 6;
const EMPTY: string[] = Array(LENGTH).fill("");

interface OtpInputProps {
  /** Called once every box holds a digit. */
  onComplete: (code: string) => void;
  /** Dims and locks the boxes while the code is being checked. */
  checking: boolean;
  /** Marks the code as rejected. */
  failed: boolean;
}

/** Six one-digit boxes. Typing advances, paste spreads digits across boxes. */
export function OtpInput({ onComplete, checking, failed }: OtpInputProps) {
  const [digits, setDigits] = useState(EMPTY);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  function fillFrom(start: number, input: string) {
    const next = [...digits];
    let i = start;
    for (const d of input.replace(/\D/g, "")) {
      if (i >= LENGTH) break;
      next[i++] = d;
    }
    setDigits(next);
    const empty = next.indexOf("");
    refs.current[empty === -1 ? LENGTH - 1 : empty]?.focus();
    if (empty === -1) onComplete(next.join(""));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>, idx: number) {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      e.preventDefault();
      setDigits(digits.map((d, i) => (i === idx - 1 ? "" : d)));
      refs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowLeft" && idx > 0) {
      e.preventDefault();
      refs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < LENGTH - 1) {
      e.preventDefault();
      refs.current[idx + 1]?.focus();
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>, idx: number) {
    e.preventDefault();
    fillFrom(idx, e.clipboardData.getData("text"));
  }

  const state = checking ? " checking" : failed ? " failed" : "";

  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset would add a visible border and legend for no benefit here.
    <div className={`otp${state}`} role="group" aria-label="6-digit code">
      {digits.map((digit, idx) => (
        <input
          // biome-ignore lint/suspicious/noArrayIndexKey: the boxes are a fixed set of positions.
          key={idx}
          ref={(el) => {
            refs.current[idx] = el;
          }}
          value={digit}
          inputMode="numeric"
          autoComplete={idx === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${idx + 1}`}
          disabled={checking || failed}
          onChange={(e) => {
            // A box that already holds a digit can receive "old+new" when the
            // caret wasn't selecting it; keep only what was just typed.
            const typed = e.target.value.replace(/\D/g, "");
            const fresh =
              digit && typed.length > 1 && typed.startsWith(digit) ? typed.slice(1) : typed;
            if (fresh) fillFrom(idx, fresh);
            else if (!typed) setDigits(digits.map((d, i) => (i === idx ? "" : d)));
          }}
          onKeyDown={(e) => onKeyDown(e, idx)}
          onPaste={(e) => onPaste(e, idx)}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
