"use client";

import { useEffect } from "react";
import { BackspaceIcon } from "./icons";

export const PIN_LENGTH = 4;

interface PinInputProps {
  value: string;
  onChange: (pin: string) => void;
  /** Shakes the dots and shows red when true (wrong PIN). */
  error?: boolean;
  disabled?: boolean;
}

/**
 * Big-target PIN entry: four dots plus an on-screen keypad.
 * Hardware keyboards work too (digits + backspace).
 */
export function PinInput({
  value,
  onChange,
  error = false,
  disabled = false,
}: PinInputProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (disabled) return;
      // Ignore hardware keyboard events when a text input/textarea has focus
      // so typing a phone number (or any other field) doesn't also fill the PIN.
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (/^\d$/.test(event.key) && value.length < PIN_LENGTH) {
        onChange(value + event.key);
      } else if (event.key === "Backspace") {
        onChange(value.slice(0, -1));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [value, onChange, disabled]);

  const press = (digit: string) => {
    if (!disabled && value.length < PIN_LENGTH) onChange(value + digit);
  };

  return (
    <div className="flex flex-col items-center gap-8">
      <div
        className={`flex gap-4 ${error ? "animate-[shake_0.4s_ease]" : ""}`}
        role="status"
        aria-label={`${value.length} of ${PIN_LENGTH} digits entered`}
      >
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <span
            key={i}
            className={`size-4 rounded-full transition-all duration-150 ${
              error
                ? "bg-danger"
                : i < value.length
                  ? "bg-primary scale-110"
                  : "bg-border-strong"
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 w-full max-w-70">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
          <KeypadButton
            key={digit}
            onClick={() => press(digit)}
            disabled={disabled}
          >
            {digit}
          </KeypadButton>
        ))}
        <span aria-hidden />
        <KeypadButton onClick={() => press("0")} disabled={disabled}>
          0
        </KeypadButton>
        <KeypadButton
          onClick={() => onChange(value.slice(0, -1))}
          disabled={disabled}
          aria-label="Delete digit"
        >
          <BackspaceIcon className="size-6" />
        </KeypadButton>
      </div>

      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}50%{transform:translateX(8px)}75%{transform:translateX(-5px)}}`}</style>
    </div>
  );
}

function KeypadButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="h-16 w-16 rounded-card bg-surface text-2xl font-medium text-ink shadow-card border border-border transition-transform active:scale-95 active:bg-surface-2 flex items-center justify-center disabled:opacity-50"
      {...props}
    >
      {children}
    </button>
  );
}
