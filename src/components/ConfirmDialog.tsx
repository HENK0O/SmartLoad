"use client";

import { useEffect } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Confirmer", cancelLabel = "Annuler", danger = false, onConfirm, onCancel }: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative rounded-2xl border border-neutral-800 bg-neutral-900 p-6 max-w-sm w-full shadow-2xl">
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-sm text-neutral-500 mb-6">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 rounded-xl border border-neutral-800 px-4 py-3 text-sm font-semibold text-neutral-500 hover:text-neutral-300 active:scale-95 transition-all">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold active:scale-95 transition-all ${danger ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "bg-green-500 text-neutral-950 shadow-lg shadow-green-500/20"}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
