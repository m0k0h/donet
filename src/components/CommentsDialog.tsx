"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { Comment, Task } from "@/lib/tasks";
import Dialog from "./Dialog";
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
  const field = useRef<HTMLTextAreaElement>(null);

  // El campo crece con el texto (hasta un tope) y vuelve a una línea al enviar.
  useLayoutEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [body]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = body.trim();
    if (!text) return;
    onAdd(text);
    setBody("");
  }

  return (
    <Dialog title="Comentarios" badge={comments.length || undefined} onClose={onClose}>
      <p className="-mt-2 break-words text-sm text-muted">{task.title}</p>

      {comments.length > 0 && (
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

      {/* Campo tipo chat: el botón va dentro, abajo a la derecha, y el campo crece hacia arriba. */}
      <form
        onSubmit={submit}
        className="flex items-end gap-2 rounded-xl bg-sunk p-1 pl-3.5 focus-within:ring-2 focus-within:ring-accent"
      >
        <textarea
          ref={field}
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
          rows={1}
          className="max-h-[30dvh] min-w-0 flex-1 resize-none bg-transparent py-2 text-base leading-6 text-ink outline-none placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={!body.trim()}
          className="min-h-10 shrink-0 rounded-lg bg-accent px-4 text-sm font-bold text-white disabled:opacity-40"
        >
          Comentar
        </button>
      </form>
    </Dialog>
  );
}
