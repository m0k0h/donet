"use client";

import { useState } from "react";
import type { Comment, Task } from "@/lib/tasks";
import Dialog, { fieldClass } from "./Dialog";
import { TrashIcon } from "./icons";

// «18 nov, 10:32»; si es de otro año, también el año.
function when(ms: number) {
  const d = new Date(ms);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Comentarios de una tarea: la lista, de más antiguo a más nuevo, y un campo para añadir otro.
// Enter añade; Mayúsculas+Enter hace salto de línea.
export default function CommentsDialog({
  task,
  comments,
  onAdd,
  onRemove,
  onClose,
}: {
  task: Task;
  comments: Comment[];
  onAdd: (body: string) => void;
  onRemove: (c: Comment) => void;
  onClose: () => void;
}) {
  const [body, setBody] = useState("");

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = body.trim();
    if (!text) return;
    onAdd(text);
    setBody("");
  }

  return (
    <Dialog title="Comentarios" onClose={onClose}>
      <p className="-mt-2 break-words text-sm text-muted">{task.title}</p>

      {comments.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">Todavía no hay comentarios.</p>
      ) : (
        <ul className="flex max-h-[45dvh] flex-col gap-2 overflow-y-auto">
          {comments.map((c) => (
            <li key={c.id} className="group flex items-start gap-2 rounded-xl bg-sunk py-2.5 pl-3.5 pr-1">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-xs font-semibold text-muted">{when(c.createdAt)}</span>
                <p className="whitespace-pre-line break-words text-[15px]">{c.body}</p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(c)}
                aria-label="Eliminar comentario"
                title="Eliminar comentario"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted hover:text-danger md:opacity-0 md:focus-visible:opacity-100 md:group-hover:opacity-100"
              >
                <TrashIcon size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="flex items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Escribe un comentario…"
          aria-label={`Nuevo comentario en ${task.title}`}
          rows={2}
          className={`${fieldClass} resize-none py-2.5`}
        />
        <button
          type="submit"
          disabled={!body.trim()}
          className="min-h-11 shrink-0 rounded-lg bg-accent px-4 text-sm font-bold text-white disabled:opacity-40"
        >
          Comentar
        </button>
      </form>
    </Dialog>
  );
}
