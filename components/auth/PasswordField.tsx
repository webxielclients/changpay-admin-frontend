'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

interface PasswordFieldProps {
  label: string;
  name?: string;
  value: string;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  error?: string;
  onChange: (value: string) => void;
}

export function PasswordField({
  label,
  name,
  value,
  placeholder,
  autoComplete,
  disabled,
  error,
  onChange,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      <span className="relative mt-1.5 block">
        <input
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={`admin-input w-full pr-12 ${error ? 'border-red-400' : ''}`}
        />
        <button
          type="button"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          onClick={() => setVisible((current) => !current)}
          disabled={disabled}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
