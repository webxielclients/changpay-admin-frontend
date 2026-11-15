'use client';

import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const generatedId = useId();
    const checkboxId = id || generatedId;

    return (
      <div className="flex items-center space-x-2">
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          className={cn(
            'w-4 h-4 text-teal-600 border-gray-300 rounded transition-colors',
            'focus:ring-2 focus:ring-teal-500 focus:ring-offset-0',
            'cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...props}
        />
        {label && (
          <label
            htmlFor={checkboxId}
            className="text-sm text-gray-700 cursor-pointer select-none"
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
