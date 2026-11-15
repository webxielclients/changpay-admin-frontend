import { Modal } from './Modal';

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', busy = false, onConfirm, onClose }: { open: boolean; title: string; message: string; confirmLabel?: string; busy?: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className="text-sm text-slate-600">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
        <button type="button" onClick={onConfirm} disabled={busy} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Working...' : confirmLabel}</button>
      </div>
    </Modal>
  );
}

