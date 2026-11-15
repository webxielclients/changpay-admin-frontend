'use client';

import type { ReactNode } from 'react';

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#012D32]/50 p-4" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">{title && <div className="mb-5 flex items-center justify-between"><h2 className="admin-title-sm">{title}</h2><button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Close">×</button></div>}{children}</section></div>;
}
