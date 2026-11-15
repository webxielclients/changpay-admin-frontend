import type { ButtonHTMLAttributes } from 'react';
import { toast } from 'sonner';

function ToastActionButton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} type={props.type ?? 'button'} className={`rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${props.className ?? 'bg-[#009f51] text-white'}`}>{children}</button>;
}

export const ToastAction = Object.assign(ToastActionButton, {
  success: (message: string, description?: string) => toast.success(message, description ? { description } : undefined),
  error: (message: string, description?: string) => toast.error(message, description ? { description } : undefined),
  warning: (message: string, description?: string) => toast.warning(message, description ? { description } : undefined),
  info: (message: string, description?: string) => toast.info(message, description ? { description } : undefined),
});
