import type { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  error?: string;
  helperText?: string;
  children: ReactNode;
}

export function FormField({ label, error, helperText, children }: FormFieldProps) {
  return (
    <div className="w-full">
      <label className="mb-1.5 block text-sm font-medium text-[#012D32]">{label}</label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : helperText ? <p className="mt-1 text-xs text-gray-500">{helperText}</p> : null}
    </div>
  );
}
