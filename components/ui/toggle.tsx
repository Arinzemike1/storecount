"use client";

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  /** Accessible name. Required — the switch shows no text of its own. */
  label: string;
}

export function Toggle({ checked, onChange, disabled, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-150 disabled:opacity-40 ${
        checked ? "bg-primary" : "bg-border-strong"
      }`}
    >
      <span
        aria-hidden
        className={`inline-block size-5 rounded-full bg-white shadow-card transition-transform duration-150 ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
