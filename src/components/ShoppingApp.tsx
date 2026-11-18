"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { loadSpace, spacePath } from "@/lib/tasks";
import {
  clearChecked,
  clearPendingInvite,
  createHousehold,
  createInvite,
  deleteItem,
  fetchItems,
  fetchMembers,
  fetchMyHousehold,
  insertItem,
  invitedHouseholdIfMember,
  inviteInfo,
  inviteLink,
  joinHousehold,
  loadPendingInvite,
  saveHouseholdId,
  savePendingInvite,
  setItemChecked,
  sortItems,
  subscribeItems,
  updateItem,
  type Household,
  type Member,
  type ShoppingItem,
} from "@/lib/shopping";
import AuthScreen from "./AuthScreen";
import ConfirmDialog from "./ConfirmDialog";
import Dialog, { fieldClass, labelClass } from "./Dialog";
import Logo from "./Logo";
import SetupScreen from "./SetupScreen";
import ThemeToggle from "./ThemeToggle";
import { BackIcon, CheckIcon, PencilIcon, TrashIcon, UserPlusIcon } from "./icons";

// Lista de la compra compartida con el resto del hogar.
export default function ShoppingApp() {
  return supabase ? <Shopping /> : <SetupScreen />;
}

const btnPrimary = "min-h-11 rounded-lg bg-accent px-5 text-sm font-bold text-white disabled:opacity-40";
const btnGhost = "min-h-11 rounded-lg px-4 text-sm font-semibold text-ink-soft hover:bg-track";

// Nombre por defecto para la familia: lo que va antes de la @ del correo.
const nameFromEmail = (email?: string) => {
  const n = (email ?? "").split("@")[0].replace(/[._-]+/g, " ").trim();
  return n ? n[0].toUpperCase() + n.slice(1) : "";
};

function Shopping() {
  // undefined = comprobando sesión, null = sin sesión.
  const [user, setUser] = useState<{ id: string; email?: string } | null | undefined>(undefined);
  // undefined = cargando, null = todavía sin hogar.
  const [household, setHousehold] = useState<Household | null | undefined>(undefined);
  const [invite, setInvite] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");

  // El enlace de invitación trae ?unirse=CÓDIGO. Se guarda y se quita de la dirección,
  // así sobrevive a crear la cuenta o recargar la página.
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("unirse");
    if (code) {
      savePendingInvite(code.trim().toUpperCase());
      url.searchParams.delete("unirse");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
    setInvite(loadPendingInvite());
  }, []);

  useEffect(() => {
    const { data } = supabase!.auth.onAuthStateChange((_event, session) =>
      setUser(session ? { id: session.user.id, email: session.user.email } : null),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) {
      setHousehold(undefined);
      return;
    }
    let cancelled = false;
    fetchMyHousehold(userId)
      .then((h) => {
        if (cancelled) return;
        setHousehold(h);
        setLoadError("");
      })
      .catch(() => {
        if (!cancelled) setLoadError("No se ha podido cargar la lista. Comprueba la conexión y recarga.");
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  function enter(h: Household) {
    saveHouseholdId(h.id);
    clearPendingInvite();
    setInvite(null);
    setHousehold(h);
  }

  if (user === undefined) return <div data-space="compra" className="min-h-dvh" />;
  if (!user) return <AuthScreen />;

  if (loadError) {
    return (
      <Centered>
        <p role="alert" className="text-sm font-semibold text-danger">
          {loadError}
        </p>
      </Centered>
    );
  }

  // Una invitación pendiente va primero, aunque ya se tenga hogar.
  if (invite && household !== undefined) {
    return (
      <JoinCard
        code={invite}
        defaultName={nameFromEmail(user.email)}
        alreadyIn={household}
        onJoined={enter}
        onSkip={() => {
          clearPendingInvite();
          setInvite(null);
        }}
      />
    );
  }

  if (household === undefined) return <div data-space="compra" className="min-h-dvh" />;
  if (!household) return <CreateCard defaultName={nameFromEmail(user.email)} onCreated={enter} />;

  return <ShoppingList household={household} userId={user.id} />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div data-space="compra" className="grid min-h-dvh place-items-center px-4">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl bg-sunk p-6">
        <Logo size={28} surface="var(--sunk)" />
        {children}
      </div>
    </div>
  );
}

// Primera vez: se crea el hogar y la lista queda lista para invitar.
function CreateCard({ defaultName, onCreated }: { defaultName: string; onCreated: (h: Household) => void }) {
  const [name, setName] = useState("Casa");
  const [me, setMe] = useState(defaultName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const id = await createHousehold(name.trim(), me.trim());
      onCreated({ id, name: name.trim() });
    } catch {
      setError("No se ha podido crear la lista. Inténtalo de nuevo.");
      setBusy(false);
    }
  }

  return (
    <Centered>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <h1 className="text-xl font-extrabold tracking-[-0.02em]">Lista de la compra compartida</h1>
        <p className="text-sm text-ink-soft">
          Crea la lista de tu casa e invita a tu familia. Lo que cualquiera apunte aparece al momento en el móvil de
          quien esté en el súper.
        </p>
        <label className={labelClass}>
          Nombre de la lista
          <input required value={name} onChange={(e) => setName(e.target.value)} className={`${fieldClass} bg-bg`} />
        </label>
        <label className={labelClass}>
          Tu nombre (lo verá la familia)
          <input required value={me} onChange={(e) => setMe(e.target.value)} className={`${fieldClass} bg-bg`} />
        </label>
        {error && (
          <p role="alert" className="text-sm font-semibold text-danger">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy || !name.trim() || !me.trim()} className={btnPrimary}>
          Crear lista
        </button>
        <p className="text-xs text-muted">¿Te han invitado? Abre el enlace que te enviaron y entrarás en su lista.</p>
      </form>
    </Centered>
  );
}

// Se llega aquí desde un enlace de invitación.
function JoinCard({
  code,
  defaultName,
  alreadyIn,
  onJoined,
  onSkip,
}: {
  code: string;
  defaultName: string;
  alreadyIn: Household | null;
  onJoined: (h: Household) => void;
  onSkip: () => void;
}) {
  // undefined = comprobando, null = invitación no válida.
  const [name, setName] = useState<string | null | undefined>(undefined);
  const [me, setMe] = useState(defaultName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Si ya se pertenece a ese hogar, se entra directamente sin preguntar.
  useEffect(() => {
    Promise.all([inviteInfo(code), invitedHouseholdIfMember(code)])
      .then(([n, memberOf]) => {
        if (n && memberOf) onJoined({ id: memberOf, name: n });
        else setName(n);
      })
      .catch(() => setName(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const id = await joinHousehold(code, me.trim());
      onJoined({ id, name: name! });
    } catch {
      setError("No te has podido unir. Puede que la invitación haya caducado.");
      setBusy(false);
    }
  }

  if (name === undefined) return <div data-space="compra" className="min-h-dvh" />;

  if (name === null) {
    return (
      <Centered>
        <h1 className="text-xl font-extrabold tracking-[-0.02em]">Invitación no válida</h1>
        <p className="text-sm text-ink-soft">
          El enlace ha caducado o no es correcto. Pide a quien te invitó que te envíe uno nuevo.
        </p>
        <button onClick={onSkip} className={btnPrimary}>
          {alreadyIn ? "Ir a mi lista" : "Continuar"}
        </button>
      </Centered>
    );
  }

  return (
    <Centered>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <h1 className="text-xl font-extrabold tracking-[-0.02em]">Te han invitado a «{name}»</h1>
        <p className="text-sm text-ink-soft">Compartiréis la lista de la compra y veréis los cambios al momento.</p>
        <label className={labelClass}>
          Tu nombre (lo verá la familia)
          <input required value={me} onChange={(e) => setMe(e.target.value)} className={`${fieldClass} bg-bg`} />
        </label>
        {error && (
          <p role="alert" className="text-sm font-semibold text-danger">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy || !me.trim()} className={btnPrimary}>
          Unirme
        </button>
        <button type="button" onClick={onSkip} className={btnGhost}>
          Ahora no
        </button>
      </form>
    </Centered>
  );
}

function ShoppingList({ household, userId }: { household: Household; userId: string }) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [syncError, setSyncError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<ShoppingItem | null>(null);
  const [inviting, setInviting] = useState(false);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    label: string;
    tone: "danger" | "accent";
    onConfirm: () => void;
  } | null>(null);
  const [backHref, setBackHref] = useState("/personal");
  const membersRef = useRef<Member[]>([]);
  membersRef.current = members;

  useEffect(() => setBackHref(spacePath(loadSpace())), []);

  // El aviso desaparece solo a los pocos segundos.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const householdId = household.id;
  useEffect(() => {
    let cancelled = false;
    async function reload() {
      try {
        const [i, m] = await Promise.all([fetchItems(householdId), fetchMembers(householdId)]);
        if (cancelled) return;
        setItems(i);
        setMembers(m);
        setSyncError("");
      } catch {
        if (!cancelled) setSyncError("No se ha podido cargar la lista. Comprueba la conexión.");
      }
      if (!cancelled) setLoaded(true);
    }
    reload();
    const unsubscribe = subscribeItems(householdId, {
      upsert: (item, isNew) => {
        setItems((prev) =>
          prev.some((x) => x.id === item.id) ? prev.map((x) => (x.id === item.id ? item : x)) : [...prev, item],
        );
        if (isNew && item.addedBy && item.addedBy !== userId) {
          const who = membersRef.current.find((m) => m.userId === item.addedBy);
          if (!who) fetchMembers(householdId).then(setMembers).catch(() => {});
          setNotice(`${who?.name ?? "Alguien"} ha añadido «${item.name}»`);
        }
      },
      remove: (id) => setItems((prev) => prev.filter((x) => x.id !== id)),
      reconnect: reload,
    });
    // Al volver a la app (el móvil la congela en segundo plano), se recarga.
    const onVisible = () => document.visibilityState === "visible" && reload();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", reload);
    return () => {
      cancelled = true;
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", reload);
    };
  }, [householdId, userId]);

  // Guarda un cambio; si falla, vuelve al estado real del servidor.
  function sync(op: Promise<void>) {
    op.then(() => setSyncError("")).catch(async () => {
      setSyncError("No se ha podido guardar el cambio. Comprueba la conexión.");
      try {
        setItems(await fetchItems(householdId));
      } catch {}
    });
  }

  const memberName = (id?: string) => members.find((m) => m.userId === id)?.name;
  const sorted = sortItems(items);
  const pending = sorted.filter((i) => !i.checked);
  const inCart = sorted.filter((i) => i.checked);
  const shared = members.length > 1;

  function add(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    // Si ya está pendiente, no se duplica.
    const dup = pending.find((i) => i.name.toLocaleLowerCase("es") === n.toLocaleLowerCase("es"));
    if (dup) {
      const who = dup.addedBy && dup.addedBy !== userId ? memberName(dup.addedBy) : undefined;
      setNotice(`«${dup.name}» ya está en la lista${who ? ` (lo añadió ${who})` : ""}`);
      setName("");
      return;
    }
    const item: ShoppingItem = {
      id: crypto.randomUUID(),
      householdId,
      name: n,
      checked: false,
      addedBy: userId,
      createdAt: Date.now(),
    };
    setItems((prev) => [...prev, item]);
    setName("");
    sync(insertItem(item));
  }

  function toggle(item: ShoppingItem) {
    const checked = !item.checked;
    setItems((prev) =>
      prev.map((x) => (x.id === item.id ? { ...x, checked, checkedBy: checked ? userId : undefined } : x)),
    );
    sync(setItemChecked(item.id, checked, userId));
  }

  function save(item: ShoppingItem, c: Pick<ShoppingItem, "name" | "quantity" | "note">) {
    setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, ...c } : x)));
    sync(updateItem(item.id, c));
  }

  function askRemove(item: ShoppingItem) {
    setConfirm({
      title: "Quitar de la lista",
      message: `¿Quitar «${item.name}» de la lista?`,
      label: "Quitar",
      tone: "danger",
      onConfirm: () => {
        setItems((prev) => prev.filter((x) => x.id !== item.id));
        sync(deleteItem(item.id));
      },
    });
  }

  function askFinish() {
    const n = inCart.length;
    setConfirm({
      title: "Terminar compra",
      message: `Se quitarán de la lista ${n === 1 ? "el artículo" : `los ${n} artículos`} del carro. Lo que no hayas encontrado se queda para la próxima vez.`,
      label: "Terminar",
      tone: "accent",
      onConfirm: () => {
        setItems((prev) => prev.filter((x) => !x.checked));
        sync(clearChecked(householdId));
      },
    });
  }

  return (
    <div data-space="compra" className="min-h-dvh">
      <main className="mx-auto flex max-w-[720px] flex-col gap-6 px-4 pb-24 pt-4 md:px-6 md:pt-10">
        <div className="flex items-center justify-between">
          <Link
            href={backHref}
            className="-ml-2 flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-ink-soft hover:bg-track"
          >
            <BackIcon size={18} />
            Tareas
          </Link>
          <div className="flex items-center gap-1">
            <button onClick={() => supabase!.auth.signOut()} className={btnGhost}>
              Cerrar sesión
            </button>
            <ThemeToggle />
          </div>
        </div>

        {syncError && (
          <p role="alert" className="rounded-xl bg-sunk px-4 py-3 text-sm font-semibold text-danger">
            {syncError}
          </p>
        )}

        <header className="flex items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h1 className="text-[30px] font-extrabold leading-tight tracking-[-0.02em] md:text-[34px]">Compra</h1>
            <p className="text-sm text-muted">
              {household.name} · {pending.length === 1 ? "1 cosa por comprar" : `${pending.length} cosas por comprar`}
            </p>
          </div>
          <button
            onClick={() => setInviting(true)}
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-ring/60 px-3 text-sm font-semibold hover:border-ring"
          >
            <span className="flex -space-x-1.5">
              {members.slice(0, 4).map((m) => (
                <Avatar key={m.userId} name={m.name} />
              ))}
            </span>
            <UserPlusIcon size={18} />
            <span className="hidden sm:inline">Invitar</span>
          </button>
        </header>

        <form onSubmit={add} className="flex items-center gap-2 rounded-xl bg-sunk p-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="¿Qué hace falta?"
            aria-label="Artículo"
            enterKeyHint="done"
            className="min-h-11 min-w-0 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-muted"
          />
          <button type="submit" disabled={!name.trim()} className="min-h-11 shrink-0 rounded-lg bg-accent px-4 text-sm font-bold text-white disabled:opacity-40">
            Añadir
          </button>
        </form>

        {loaded && items.length === 0 && (
          <p className="py-16 text-center text-muted">
            La lista está vacía. Apunta lo que se vaya acabando{shared ? " y lo verá toda la familia" : ""}.
          </p>
        )}

        {pending.length > 0 && (
          <ul className="flex flex-col">
            {pending.map((i) => (
              <ItemRow
                key={i.id}
                item={i}
                addedBy={shared ? memberName(i.addedBy) : undefined}
                onToggle={toggle}
                onEdit={setEditing}
                onRemove={askRemove}
              />
            ))}
          </ul>
        )}

        {loaded && items.length > 0 && pending.length === 0 && (
          <p className="py-6 text-center font-semibold text-green">¡Todo en el carro!</p>
        )}

        {inCart.length > 0 && (
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-muted">En el carro · {inCart.length}</h2>
              <button onClick={askFinish} className="min-h-11 rounded-lg bg-accent-soft px-4 text-sm font-bold text-accent-ink">
                Terminar compra
              </button>
            </div>
            <ul className="flex flex-col">
              {inCart.map((i) => (
                <ItemRow
                  key={i.id}
                  item={i}
                  checkedBy={shared && i.checkedBy !== userId ? memberName(i.checkedBy) : undefined}
                  onToggle={toggle}
                  onEdit={setEditing}
                  onRemove={askRemove}
                />
              ))}
            </ul>
          </section>
        )}
      </main>

      {notice && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] mx-auto max-w-sm rounded-xl bg-ink px-4 py-3 text-center text-sm font-semibold text-bg shadow-lg"
        >
          {notice}
        </div>
      )}

      {editing && (
        <ItemDialog
          item={editing}
          onSave={(c) => save(editing, c)}
          onRemove={() => askRemove(editing)}
          onClose={() => setEditing(null)}
        />
      )}

      {inviting && <InviteDialog householdId={householdId} members={members} onClose={() => setInviting(false)} />}

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.label}
          tone={confirm.tone}
          onConfirm={confirm.onConfirm}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      title={name}
      className="grid h-7 w-7 place-items-center rounded-full border-2 border-bg bg-accent text-xs font-bold text-white"
    >
      {name.trim()[0]?.toUpperCase() ?? "?"}
    </span>
  );
}

function ItemRow({
  item,
  addedBy,
  checkedBy,
  onToggle,
  onEdit,
  onRemove,
}: {
  item: ShoppingItem;
  addedBy?: string;
  checkedBy?: string;
  onToggle: (i: ShoppingItem) => void;
  onEdit: (i: ShoppingItem) => void;
  onRemove: (i: ShoppingItem) => void;
}) {
  const meta = [item.note, addedBy && `Añadido por ${addedBy}`, checkedBy && `Lo cogió ${checkedBy}`].filter(Boolean);
  return (
    <li className="group flex items-center gap-1 border-b border-line">
      <button
        onClick={() => onToggle(item)}
        role="checkbox"
        aria-checked={item.checked}
        aria-label={item.checked ? `Sacar ${item.name} del carro` : `Meter ${item.name} en el carro`}
        className="grid h-14 w-12 shrink-0 place-items-center"
      >
        <span
          className={`grid h-7 w-7 place-items-center rounded-full border-2 ${
            item.checked ? "border-accent bg-accent text-white" : "border-ring"
          }`}
        >
          {item.checked && <CheckIcon size={15} />}
        </span>
      </button>
      <button onClick={() => onEdit(item)} className="flex min-h-14 min-w-0 flex-1 flex-col justify-center py-2 text-left">
        <span className="flex items-baseline gap-2">
          <span className={`break-words text-[17px] ${item.checked ? "text-muted line-through" : "font-medium"}`}>
            {item.name}
          </span>
          {item.quantity && (
            <span className="shrink-0 rounded-md bg-accent-soft px-1.5 text-[13px] font-bold text-accent-ink">
              {item.quantity}
            </span>
          )}
        </span>
        {meta.length > 0 && <span className="text-[13px] text-muted">{meta.join(" · ")}</span>}
      </button>
      <button
        onClick={() => onEdit(item)}
        aria-label={`Editar ${item.name}`}
        className="hidden h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-soft hover:bg-track md:group-hover:grid"
      >
        <PencilIcon size={18} />
      </button>
      <button
        onClick={() => onRemove(item)}
        aria-label={`Quitar ${item.name}`}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-muted hover:bg-track hover:text-danger"
      >
        <TrashIcon size={18} />
      </button>
    </li>
  );
}

function ItemDialog({
  item,
  onSave,
  onRemove,
  onClose,
}: {
  item: ShoppingItem;
  onSave: (c: Pick<ShoppingItem, "name" | "quantity" | "note">) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity ?? "");
  const [note, setNote] = useState(item.note ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ name: name.trim(), quantity: quantity.trim() || undefined, note: note.trim() || undefined });
    onClose();
  }

  return (
    <Dialog title="Editar artículo" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className={labelClass}>
          Artículo
          <input required value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
        </label>
        <label className={labelClass}>
          Cantidad
          <input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="2, 1 kg, un paquete…"
            className={`${fieldClass} placeholder:text-muted`}
          />
        </label>
        <label className={labelClass}>
          Nota
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="La sin lactosa, marca blanca…"
            className={`${fieldClass} placeholder:text-muted`}
          />
        </label>
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              onClose();
              onRemove();
            }}
            className="min-h-11 rounded-lg px-3 text-sm font-semibold text-danger hover:bg-track"
          >
            Quitar
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={btnGhost}>
              Cancelar
            </button>
            <button type="submit" disabled={!name.trim()} className={btnPrimary}>
              Guardar
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

function InviteDialog({ householdId, members, onClose }: { householdId: string; members: Member[]; onClose: () => void }) {
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && !!navigator.share;

  useEffect(() => {
    createInvite(householdId)
      .then((code) => setLink(inviteLink(code)))
      .catch(() => setError("No se ha podido crear la invitación. Inténtalo de nuevo."));
  }, [householdId]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {}
  }

  return (
    <Dialog title="Familia" onClose={onClose}>
      <ul className="flex flex-col gap-2">
        {members.map((m) => (
          <li key={m.userId} className="flex items-center gap-3 text-[15px] font-medium">
            <Avatar name={m.name} />
            {m.name}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 border-t border-line pt-4">
        <p className="text-sm text-ink-soft">
          Envía este enlace a quien quieras que comparta la lista. Tendrá que entrar con su cuenta. Caduca en 7 días.
        </p>
        {error ? (
          <p role="alert" className="text-sm font-semibold text-danger">
            {error}
          </p>
        ) : (
          <input
            readOnly
            value={link || "Creando enlace…"}
            aria-label="Enlace de invitación"
            onFocus={(e) => e.target.select()}
            className={`${fieldClass} text-sm`}
          />
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={copy} disabled={!link} className={btnGhost}>
            {copied ? "¡Copiado!" : "Copiar"}
          </button>
          {canShare && (
            <button
              type="button"
              disabled={!link}
              onClick={() => navigator.share({ title: "Lista de la compra", text: "Únete a nuestra lista de la compra en doneT", url: link }).catch(() => {})}
              className={btnPrimary}
            >
              Compartir
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
