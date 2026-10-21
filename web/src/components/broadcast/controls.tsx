import type { ReactNode } from "react";

type SwitchProps = { label: ReactNode; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean };

export function Switch({ label, checked, onChange, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className="bc-switch"
      onClick={() => onChange(!checked)}
    >
      <span className="bc-switch-label">{label}</span>
      <span className="bc-switch-track" aria-hidden="true" />
    </button>
  );
}

type SegmentedProps<T extends string> = {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
};

export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div className="bc-segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bc-field">
      <span className="bc-field-label">{label}</span>
      {children}
    </div>
  );
}
