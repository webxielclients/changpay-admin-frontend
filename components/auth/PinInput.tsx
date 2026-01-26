'use client';

import { useRef, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

interface PinInputProps {
  length: number;
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export function PinInput({
  length,
  value,
  onChange,
  disabled = false,
}: PinInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const setInputRef = (index: number) => (el: HTMLInputElement | null) => {
    inputRefs.current[index] = el;
  };

  const handleChange = (index: number, digit: string) => {
    if (!/^\d*$/.test(digit)) return;
    if (digit.length > 1) return;

    const newValue = [...value];
    newValue[index] = digit;
    onChange(newValue);

    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex justify-center gap-3">
      {Array.from({ length }).map((_, idx) => (
        <input
          key={idx}
          ref={setInputRef(idx)}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={value[idx] || ''}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          disabled={disabled}
          className={cn(
            'w-14 h-14 text-center text-2xl font-bold',
            'border-2 rounded-lg transition-colors',
            'focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            value[idx] ? 'border-teal-500' : 'border-gray-300'
          )}
        />
      ))}
    </div>
  );
}