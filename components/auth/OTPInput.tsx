'use client';

import { useRef, KeyboardEvent, ClipboardEvent } from 'react';
import { cn } from '@/lib/utils';

interface OTPInputProps {
  length: number;
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export function OTPInput({
  length,
  value,
  onChange,
  disabled = false,
}: OTPInputProps) {
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

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').slice(0, length);
    
    if (!/^\d+$/.test(pastedData)) return;

    const newValue = pastedData.split('');
    onChange(newValue);

    const nextEmptyIndex = newValue.length;
    if (nextEmptyIndex < length) {
      inputRefs.current[nextEmptyIndex]?.focus();
    } else {
      inputRefs.current[length - 1]?.focus();
    }
  };

  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length }).map((_, idx) => (
        <input
          key={idx}
          ref={setInputRef(idx)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[idx] || ''}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className={cn(
            'w-12 h-14 text-center text-xl font-semibold',
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
