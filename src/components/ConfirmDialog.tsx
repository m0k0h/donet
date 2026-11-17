"use client";

import Dialog from "./Dialog";

// Pregunta antes de una acción que no se puede deshacer (por ahora, borrar).
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Borrar",
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog title={title} onClose={onClose}>
      <p className="text-[15px] text-ink-soft">{message}</p>
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-lg px-4 text-sm font-semibold text-ink-soft hover:bg-track"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className="min-h-11 rounded-lg bg-danger px-5 text-sm font-bold text-bg"
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
