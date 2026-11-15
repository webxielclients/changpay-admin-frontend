import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          {...props}
          className={`
            w-full px-4 py-3 rounded-xl border text-sm transition-colors
            text-gray-900 placeholder-gray-400 bg-white
            focus:outline-none focus:ring-2 focus:ring-[#009F51] focus:border-transparent
            disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-500
            ${error ? 'border-red-400 focus:ring-red-400' : 'border-gray-300'}
            ${className}
          `}
        />
        {error && (
          <p className="mt-1 text-xs text-red-500">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-xs text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';