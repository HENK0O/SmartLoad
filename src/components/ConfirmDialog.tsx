"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
    }
  }, [open]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onCancel();
      }
    },
    [onCancel]
  );

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!mounted && !open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300",
        open ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
      style={{
        backdropFilter: "blur(8px)",
        backgroundColor: "hsl(220 15% 6% / 0.7)",
      }}
      onClick={handleBackdropClick}
    >
      <div
        className={cn(
          "w-full max-w-sm rounded-2xl p-6 transition-all duration-300",
          open ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        )}
        style={{
          backgroundColor: "hsl(220 15% 9%)",
          border: "1px solid hsl(220 15% 14%)",
          boxShadow: "0 24px 48px hsl(0 0% 0% / 0.4)",
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {danger && (
              <div
                className="mt-0.5 flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "hsl(0 72% 51% / 0.15)" }}
              >
                <AlertTriangle
                  className="w-5 h-5"
                  style={{ color: "hsl(0 72% 51%)" }}
                />
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-1 text-sm text-white/60">{description}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors active:scale-[0.98]"
            style={{ backgroundColor: "hsl(220 15% 14%)" }}
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 min-h-11 rounded-xl text-sm font-medium transition-all active:scale-[0.98]"
            style={{
              backgroundColor: "hsl(220 15% 14%)",
              color: "hsl(220 15% 80%)",
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 min-h-11 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98]"
            style={{
              background: danger
                ? "linear-gradient(135deg, hsl(0 72% 51%), hsl(0 72% 41%))"
                : "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))",
              boxShadow: danger
                ? "0 4px 16px hsl(0 72% 51% / 0.3)"
                : "0 4px 16px hsl(142 71% 45% / 0.3)",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
