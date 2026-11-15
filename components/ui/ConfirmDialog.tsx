'use client';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

export function ConfirmDialog({ open, title = 'Confirm action', message, confirmLabel = 'Confirm', busy = false, onCancel, onConfirm }: { open: boolean; title?: string; message: string; confirmLabel?: string; busy?: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <Modal open={open} onClose={onCancel} title={title}><p className="text-sm leading-6 text-gray-600">{message}</p><div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button><Button onClick={onConfirm} isLoading={busy}>{confirmLabel}</Button></div></Modal>;
}
