"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sessionProfileName } from "@/lib/profile";
import { EmptyShopping } from "./EmptyShopping";
import {
  DEFAULT_LIST_NAME,
  MAX_LISTS,
  clearPendingInvite,
  createHousehold,
  createInvite,
  deleteItem,
  fetchItems,
  fetchMembers,
  fetchMyHouseholds,
  fetchPurchases,
  fetchSectionMemory,
  finishShopping,
  insertItem,
  invitedHouseholdIfMember,
  isListLimit,
  inviteInfo,
  inviteLink,
  joinHousehold,
  leaveHousehold,
  loadHouseholdId,
  loadPendingInvite,
  nextListName,
  rememberSection,
  renameHousehold,
  saveHouseholdId,
  setItemChecked,
  sortItems,
  subscribeItems,
  updateItem,
  type Household,
  type ItemChanges,
  type Member,
  type Purchase,
  type ShoppingItem,
} from "@/lib/shopping";
import { OTHER, SECTIONS, classifySection, itemKey, type SectionId, type SectionMemory } from "@/lib/sections";
import ConfirmDialog from "./ConfirmDialog";
import Dialog, { Select, fieldClass, labelClass } from "./Dialog";
import PageHeader from "./PageHeader";
import { CheckIcon, InfoIcon, PencilIcon, PlusIcon, TrashIcon, UserPlusIcon } from "./icons";

const btnPrimary = "min-h-11 rounded-lg bg-accent px-5 text-sm font-bold text-white disabled:opacity-40";
const btnGhost = "min-h-11 rounded-lg px-4 text-sm font-semibold text-ink-soft hover:bg-track";

// Nombre por defecto para el resto de la lista: el de Ajustes o, si no hay, el del correo.
const sessionName = sessionProfileName;

// Propone tu nombre de Ajustes (o el del correo), sin pisar lo que ya se haya escrito.
function useDefaultName(): [string, (v: string) => void] {
  const [name, setName] = useState("");
  useEffect(() => {
    sessionName().then((n) => setName((prev) => prev || n));
  }, []);
  return [name, setName];
}

// Estado de las listas de la compra. Vive junto a las tareas para que el contador
// y los avisos («Marta ha añadido huevos») funcionen aunque la Compra no esté abierta.
export function useShopping(userId: string | null | undefined) {
  // undefined = cargando.
  const [households, setHouseholds] = useState<Household[] | undefined>(undefined);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [invite, setInvite] = useState<string | null>(null);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  // Secciones corregidas a mano, por lista.
  const [memory, setMemory] = useState<Record<string, SectionMemory>>({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const latest = useRef({ households: [] as Household[], members: [] as Member[] });
  latest.current = { households: households ?? [], members };
  // Evita crear dos «Mi lista» si la carga se lanza dos veces seguidas.
  const creating = useRef(false);

  useEffect(() => {
    setInvite(loadPendingInvite());
    setCurrentId(loadHouseholdId());
  }, []);

  // Carga listas, artículos y miembros. Sin ninguna lista (y sin invitación
  // pendiente) se crea «Mi lista» para que siempre haya dónde apuntar.
  const reload = useCallback(async () => {
    if (!userId) return;
    try {
      let hs = await fetchMyHouseholds(userId);
      if (!hs.length && !loadPendingInvite() && !creating.current) {
        creating.current = true;
        try {
          await createHousehold(DEFAULT_LIST_NAME, await sessionName());
          hs = await fetchMyHouseholds(userId);
        } finally {
          creating.current = false;
        }
      }
      const ids = hs.map((h) => h.id);
      const [i, m, sm] = await Promise.all([fetchItems(ids), fetchMembers(ids), fetchSectionMemory(ids)]);
      setHouseholds(hs);
      setItems(i);
      setMembers(m);
      setMemory(sm);
      setError("");
    } catch {
      setError("No se ha podido cargar la lista de la compra. Comprueba la conexión.");
    }
    setLoaded(true);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setHouseholds(undefined);
      setItems([]);
      setMembers([]);
      setMemory({});
      setLoaded(false);
      return;
    }
    const unsubscribe = subscribeItems({
      upsert: (item, isNew) => {
        setItems((prev) =>
          prev.some((x) => x.id === item.id) ? prev.map((x) => (x.id === item.id ? item : x)) : [...prev, item],
        );
        if (isNew && item.addedBy && item.addedBy !== userId) {
          const { households: hs, members: ms } = latest.current;
          const who = ms.find((m) => m.householdId === item.householdId && m.userId === item.addedBy)?.name;
          const list = hs.length > 1 ? hs.find((h) => h.id === item.householdId)?.name : undefined;
          if (!who || !list) reload();
          setNotice(`${who ?? "Alguien"} ha añadido «${item.name}»${list ? ` a ${list}` : " a la compra"}`);
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
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", reload);
    };
  }, [userId, reload]);

  // El aviso desaparece solo a los pocos segundos.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  // Guarda un cambio; si falla, vuelve al estado real del servidor.
  function sync(op: Promise<void>, after?: () => void) {
    op.then(() => {
      setError("");
      after?.();
    }).catch(() => {
      setError("No se ha podido guardar el cambio. Comprueba la conexión.");
      reload();
    });
  }

  const current = households?.find((h) => h.id === currentId) ?? households?.[0];
  const currentItems = current ? items.filter((i) => i.householdId === current.id) : [];
  const currentMembers = current ? members.filter((m) => m.householdId === current.id) : [];
  const pendingIn = (householdId: string) => items.filter((i) => i.householdId === householdId && !i.checked).length;
  const memberName = (id?: string) => currentMembers.find((m) => m.userId === id)?.name;
  const myName = (current && currentMembers.find((m) => m.userId === userId)?.name) || undefined;
  const currentMemory = current ? memory[current.id] : undefined;
  // Sección que propone la lista actual para un nombre (memoria del hogar y diccionario).
  const classify = (name: string) => classifySection(name, currentMemory);

  function select(id: string) {
    saveHouseholdId(id);
    setCurrentId(id);
  }

  return {
    households,
    current,
    items: currentItems,
    members: currentMembers,
    invite,
    loaded,
    error,
    notice,
    // Total de cosas por comprar en todas las listas, para la barra lateral.
    pendingCount: items.filter((i) => !i.checked).length,
    pendingIn,
    // Ya está en el máximo de listas: no puede crear ni unirse a otra.
    full: (households?.length ?? 0) >= MAX_LISTS,
    memberName,
    myName,
    select,
    reload,
    classify,
    // La guardada en el artículo; si no tiene (los de antes), la que toque por el nombre.
    sectionOf: (item: ShoppingItem): SectionId =>
      item.section ?? classifySection(item.name, memory[item.householdId]) ?? OTHER,

    // Tras unirse a una lista por invitación: se carga y se abre.
    async joined(id: string) {
      clearPendingInvite();
      setInvite(null);
      select(id);
      await reload();
    },

    skipInvite() {
      clearPendingInvite();
      setInvite(null);
      reload();
    },

    async newList() {
      try {
        const id = await createHousehold(nextListName((households ?? []).map((h) => h.name)), myName ?? (await sessionName()));
        select(id);
        await reload();
      } catch (e) {
        setError(
          isListLimit(e)
            ? `Solo puedes estar en ${MAX_LISTS} listas. Sal de una para crear otra.`
            : "No se ha podido crear la lista. Inténtalo de nuevo.",
        );
      }
    },

    rename(id: string, name: string) {
      setHouseholds((prev) => prev?.map((h) => (h.id === id ? { ...h, name } : h)));
      sync(renameHousehold(id, name));
    },

    leave(id: string) {
      setHouseholds((prev) => prev?.filter((h) => h.id !== id));
      setItems((prev) => prev.filter((i) => i.householdId !== id));
      sync(leaveHousehold(id), reload);
    },

    // Devuelve sin añadir (y avisa) si ya está pendiente en esta lista.
    add(name: string) {
      if (!current || !userId) return;
      const dup = currentItems.find((i) => !i.checked && i.name.toLocaleLowerCase("es") === name.toLocaleLowerCase("es"));
      if (dup) {
        const who = dup.addedBy && dup.addedBy !== userId ? memberName(dup.addedBy) : undefined;
        setNotice(`«${dup.name}» ya está en la lista${who ? ` (lo añadió ${who})` : ""}`);
        return;
      }
      const item: ShoppingItem = {
        id: crypto.randomUUID(),
        householdId: current.id,
        name,
        checked: false,
        addedBy: userId,
        section: classify(name),
        createdAt: Date.now(),
      };
      setItems((prev) => [...prev, item]);
      sync(insertItem(item));
    },

    toggle(item: ShoppingItem) {
      if (!userId) return;
      const checked = !item.checked;
      const mark = checked ? { checkedBy: userId, checkedAt: Date.now() } : { checkedBy: undefined, checkedAt: undefined };
      setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, checked, ...mark } : x)));
      sync(setItemChecked(item.id, checked, userId));
    },

    // learn: la sección se ha elegido a mano, así que se recuerda para la próxima vez.
    save(item: ShoppingItem, c: ItemChanges, learn = false) {
      setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, ...c } : x)));
      sync(updateItem(item.id, c));
      const key = itemKey(c.name);
      if (learn && c.section && key) {
        const hid = item.householdId;
        const section = c.section;
        setMemory((prev) => ({ ...prev, [hid]: { ...prev[hid], [key]: section } }));
        sync(rememberSection(hid, key, section));
      }
    },

    remove(item: ShoppingItem) {
      setItems((prev) => prev.filter((x) => x.id !== item.id));
      sync(deleteItem(item.id));
    },

    // «Terminar compra»: apunta en el historial lo del carro de esta lista y lo quita.
    finish() {
      if (!current || !userId) return;
      const hid = current.id;
      const cart = items.filter((x) => x.householdId === hid && x.checked);
      setItems((prev) => prev.filter((x) => !(x.householdId === hid && x.checked)));
      sync(finishShopping(hid, cart, userId));
    },
  };
}

export type Shop = ReturnType<typeof useShopping>;

// Aviso flotante de la compra. Se muestra también desde las tareas; en móvil, por encima de la barra.
export function ShoppingNotice({ notice }: { notice: string }) {
  if (!notice) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-24 z-10 mx-auto max-w-sm rounded-xl bg-ink px-4 py-3 text-center text-sm font-semibold text-bg shadow-lg md:bottom-6"
    >
      {notice}
    </div>
  );
}

// Contenido de la sección Compra dentro de la app: aceptar una invitación o las listas.
export default function ShoppingPanel({ shop, userId }: { shop: Shop; userId: string }) {
  if (shop.error && shop.households === undefined) {
    return (
      <p role="alert" className="rounded-xl bg-sunk px-4 py-3 text-sm font-semibold text-danger">
        {shop.error}
      </p>
    );
  }
  // Una invitación pendiente va primero.
  if (shop.invite && shop.households !== undefined) {
    return <JoinCard code={shop.invite} full={shop.full} onJoined={shop.joined} onSkip={shop.skipInvite} />;
  }
  if (!shop.current) return <Heading />;
  return <ShoppingList shop={shop} household={shop.current} userId={userId} />;
}

// Cabecera de la Compra, la misma que en el resto de la app.
function Heading({
  context,
  pending,
  actions,
}: {
  context?: string;
  pending?: number;
  actions?: React.ReactNode;
}) {
  return (
    <PageHeader
      title="Compra"
      actions={actions}
      context={context}
      count={
        pending === undefined
          ? undefined
          : { label: pending === 0 ? "Nada por comprar" : `${pending} por comprar`, empty: pending === 0 }
      }
    />
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-4 rounded-xl bg-sunk p-5">{children}</div>;
}

// Se llega aquí desde un enlace de invitación. La lista se añade a las tuyas.
function JoinCard({
  code,
  full,
  onJoined,
  onSkip,
}: {
  code: string;
  full: boolean;
  onJoined: (id: string) => void;
  onSkip: () => void;
}) {
  // undefined = comprobando, null = invitación no válida.
  const [name, setName] = useState<string | null | undefined>(undefined);
  const [me, setMe] = useDefaultName();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Si ya se pertenece a esa lista, se abre directamente sin preguntar.
  useEffect(() => {
    Promise.all([inviteInfo(code), invitedHouseholdIfMember(code)])
      .then(([n, memberOf]) => {
        if (n && memberOf) onJoined(memberOf);
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
      onJoined(await joinHousehold(code, me.trim()));
    } catch (e) {
      setError(
        isListLimit(e)
          ? `Ya estás en ${MAX_LISTS} listas. Sal de una para poder unirte.`
          : "No te has podido unir. Puede que la invitación haya caducado.",
      );
      setBusy(false);
    }
  }

  if (name === undefined) return <Heading />;

  if (name === null) {
    return (
      <>
        <Heading />
        <Card>
          <h2 className="text-lg font-extrabold">Invitación no válida</h2>
          <p className="text-[15px] text-ink-soft">
            El enlace ha caducado o no es correcto. Pide a quien te invitó que te envíe uno nuevo.
          </p>
          <div className="flex justify-end">
            <button onClick={onSkip} className={btnPrimary}>
              Ir a mis listas
            </button>
          </div>
        </Card>
      </>
    );
  }

  if (full) {
    return (
      <>
        <Heading />
        <Card>
          <h2 className="text-lg font-extrabold">Te han invitado a «{name}»</h2>
          <p className="text-[15px] text-ink-soft">
            Ya estás en {MAX_LISTS} listas, que es el máximo. Para unirte, sal antes de alguna (desde el lápiz de la
            lista) y vuelve a abrir el enlace.
          </p>
          <div className="flex justify-end">
            <button onClick={onSkip} className={btnPrimary}>
              Ir a mis listas
            </button>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <Heading />
      <Card>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <h2 className="text-lg font-extrabold">Te han invitado a «{name}»</h2>
          <p className="text-[15px] text-ink-soft">
            Se añadirá a tus listas de la compra y veréis los cambios al momento. Tus otras listas no cambian.
          </p>
          <label className={labelClass}>
            Tu nombre (lo verá el resto de la lista)
            <input required value={me} onChange={(e) => setMe(e.target.value)} className={`${fieldClass} bg-bg`} />
          </label>
          {error && (
            <p role="alert" className="text-sm font-semibold text-danger">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onSkip} className={btnGhost}>
              Ahora no
            </button>
            <button type="submit" disabled={busy || !me.trim()} className={btnPrimary}>
              Unirme
            </button>
          </div>
        </form>
      </Card>
    </>
  );
}

// Pestañas para cambiar de lista, con lo que queda por comprar en cada una.
function ListTabs({ shop, currentId }: { shop: Shop; currentId: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <nav aria-label="Listas de la compra" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
      {(shop.households ?? []).map((h) => {
        const active = h.id === currentId;
        const n = shop.pendingIn(h.id);
        return (
          <button
            key={h.id}
            onClick={() => shop.select(h.id)}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm ${
              active ? "bg-accent font-bold text-white" : "bg-sunk font-semibold text-ink-soft hover:bg-track"
            }`}
          >
            {h.name}
            {n > 0 && <span className={active ? "text-white/80" : "text-muted"}>{n}</span>}
          </button>
        );
      })}
      {/* Con el máximo de listas, el botón simplemente no aparece. */}
      {!shop.full && (
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await shop.newList();
            setBusy(false);
          }}
          className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-dashed border-ring px-4 text-sm font-semibold text-ink-soft hover:border-accent hover:text-accent disabled:opacity-40"
        >
          <PlusIcon size={15} />
          Nueva lista
        </button>
      )}
    </nav>
  );
}

function ShoppingList({ shop, household, userId }: { shop: Shop; household: Household; userId: string }) {
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<ShoppingItem | null>(null);
  const [info, setInfo] = useState<ShoppingItem | null>(null);
  const [inviting, setInviting] = useState(false);
  const [settings, setSettings] = useState(false);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    label: string;
    tone: "danger" | "accent";
    onConfirm: () => void;
  } | null>(null);

  const sorted = sortItems(shop.items);
  const pending = sorted.filter((i) => !i.checked);
  const inCart = sorted.filter((i) => i.checked);
  // Lo pendiente, por secciones en el orden de la tienda.
  const groups = SECTIONS.map((s) => ({ ...s, items: pending.filter((i) => shop.sectionOf(i) === s.id) })).filter(
    (g) => g.items.length > 0,
  );
  const shared = shop.members.length > 1;
  // Con quién compartes esta lista (sin contarte a ti).
  const others = shop.members.filter((m) => m.userId !== userId).map((m) => m.name);

  function add(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    shop.add(n);
    setName("");
  }

  function askRemove(item: ShoppingItem) {
    setConfirm({
      title: "Quitar de la lista",
      message: `¿Quitar «${item.name}» de la lista?`,
      label: "Quitar",
      tone: "danger",
      onConfirm: () => shop.remove(item),
    });
  }

  function askFinish() {
    const n = inCart.length;
    setConfirm({
      title: "Terminar compra",
      message: `Se quitarán de «${household.name}» ${n === 1 ? "el artículo" : `los ${n} artículos`} del carro. Lo que no hayas encontrado se queda para la próxima vez.`,
      label: "Terminar",
      tone: "accent",
      onConfirm: shop.finish,
    });
  }

  function askLeave() {
    const alone = shop.members.length <= 1;
    setConfirm({
      title: alone ? "Borrar lista" : "Salir de la lista",
      message: alone
        ? `Eres la única persona en «${household.name}»: se borrará con todo lo que tiene apuntado. No se puede deshacer.`
        : `Dejarás de ver «${household.name}». El resto de la lista la seguirá teniendo.`,
      label: alone ? "Borrar" : "Salir",
      tone: "danger",
      onConfirm: () => shop.leave(household.id),
    });
  }

  return (
    <>
      {shop.error && (
        <p role="alert" className="rounded-xl bg-sunk px-4 py-3 text-sm font-semibold text-danger">
          {shop.error}
        </p>
      )}

      <div className="flex flex-col gap-4">
        <Heading
          context={shared ? `Con ${others.join(", ")}` : "Solo tú"}
          pending={pending.length}
          actions={
            <>
              <button
                onClick={() => setInviting(true)}
                title={shared ? "Personas de esta lista e invitar" : "Compartir esta lista"}
                className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-ring/60 px-3 text-sm font-semibold hover:border-ring"
              >
                {shared && (
                  <span className="flex -space-x-1.5">
                    {shop.members.slice(0, 4).map((m) => (
                      <Avatar key={m.userId} name={m.name} />
                    ))}
                  </span>
                )}
                <UserPlusIcon size={18} />
                <span className="hidden sm:inline">{shared ? "Invitar" : "Compartir"}</span>
              </button>
              <button
                onClick={() => setSettings(true)}
                aria-label={`Ajustes de ${household.name}`}
                title="Renombrar o salir de la lista"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-soft hover:bg-track hover:text-ink"
              >
                <PencilIcon size={20} />
              </button>
            </>
          }
        />
        <ListTabs shop={shop} currentId={household.id} />
      </div>

      <form onSubmit={add} className="flex items-center gap-2 rounded-xl bg-sunk p-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`¿Qué hace falta en ${household.name}?`}
          aria-label="Artículo"
          enterKeyHint="done"
          className="min-h-11 min-w-0 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="min-h-11 shrink-0 rounded-lg bg-accent px-4 text-sm font-bold text-white disabled:opacity-40"
        >
          Añadir
        </button>
      </form>

      {shop.loaded && shop.items.length === 0 && <EmptyShopping shared={shared} />}

      {groups.length > 0 && (
        <div className="flex flex-col gap-5">
          {groups.map((g) => (
            <section key={g.id} aria-labelledby={`seccion-${g.id}`} className="flex flex-col">
              <h2 id={`seccion-${g.id}`} className="text-sm font-bold text-muted">
                {g.label} · {g.items.length}
              </h2>
              <ul className="flex flex-col">
                {g.items.map((i) => (
                  <ItemRow
                    key={i.id}
                    item={i}
                    onInfo={shared ? setInfo : undefined}
                    onToggle={shop.toggle}
                    onEdit={setEditing}
                    onRemove={askRemove}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {shop.loaded && shop.items.length > 0 && pending.length === 0 && (
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
                onInfo={shared ? setInfo : undefined}
                onToggle={shop.toggle}
                onEdit={setEditing}
                onRemove={askRemove}
              />
            ))}
          </ul>
        </section>
      )}

      {editing && (
        <ItemDialog
          item={editing}
          section={shop.sectionOf(editing)}
          classify={shop.classify}
          onSave={(c, learn) => shop.save(editing, c, learn)}
          onRemove={() => askRemove(editing)}
          onClose={() => setEditing(null)}
        />
      )}

      {info && (
        <ItemInfoDialog
          item={info}
          section={SECTIONS.find((s) => s.id === shop.sectionOf(info))?.label ?? ""}
          memberName={shop.memberName}
          onEdit={() => setEditing(info)}
          onClose={() => setInfo(null)}
        />
      )}

      {inviting && (
        <InviteDialog
          householdId={household.id}
          listName={household.name}
          members={shop.members}
          onClose={() => setInviting(false)}
        />
      )}

      {settings && (
        <ListSettingsDialog
          household={household}
          myName={shop.myName ?? ""}
          shared={shared}
          onSave={(listName) => {
            if (listName !== household.name) shop.rename(household.id, listName);
          }}
          onLeave={askLeave}
          onClose={() => setSettings(false)}
        />
      )}

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
    </>
  );
}

// Renombrar la lista (lo ve todo el mundo) o salir. Tu nombre se cambia en Ajustes.
function ListSettingsDialog({
  household,
  myName,
  shared,
  onSave,
  onLeave,
  onClose,
}: {
  household: Household;
  myName: string;
  shared: boolean;
  onSave: (listName: string) => void;
  onLeave: () => void;
  onClose: () => void;
}) {
  const [listName, setListName] = useState(household.name);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave(listName.trim());
    onClose();
  }

  return (
    <Dialog title="Ajustes de la lista" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className={labelClass}>
          Nombre de la lista{shared ? " (lo verá todo el mundo)" : ""}
          <input required value={listName} onChange={(e) => setListName(e.target.value)} className={fieldClass} />
        </label>
        {shared && (
          <p className="text-[15px] text-ink-soft">
            Aquí te ven como <strong className="text-ink">{myName || "tú"}</strong>.
            <br />
            Tu nombre se cambia en Ajustes, junto al tema.
          </p>
        )}
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              onClose();
              onLeave();
            }}
            className="min-h-11 rounded-lg px-3 text-sm font-semibold text-danger hover:bg-track"
          >
            {shared ? "Salir de la lista" : "Borrar lista"}
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={btnGhost}>
              Cancelar
            </button>
            <button type="submit" disabled={!listName.trim()} className={btnPrimary}>
              Guardar
            </button>
          </div>
        </div>
      </form>
    </Dialog>
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
  onInfo,
  onToggle,
  onEdit,
  onRemove,
}: {
  item: ShoppingItem;
  onInfo?: (i: ShoppingItem) => void; // solo en listas compartidas: quién, cuándo, historial
  onToggle: (i: ShoppingItem) => void;
  onEdit: (i: ShoppingItem) => void;
  onRemove: (i: ShoppingItem) => void;
}) {
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
        {item.note && <span className="break-words text-[13px] text-muted">{item.note}</span>}
      </button>
      {onInfo && (
        <button
          onClick={() => onInfo(item)}
          aria-label={`Información de ${item.name}`}
          title="Quién lo añadió y cuándo se compró"
          className="grid h-11 w-9 md:w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-track hover:text-ink"
        >
          <InfoIcon size={18} />
        </button>
      )}
      <button
        onClick={() => onEdit(item)}
        aria-label={`Editar ${item.name}`}
        className="hidden h-11 w-9 md:w-8 shrink-0 place-items-center rounded-lg text-ink-soft hover:bg-track md:group-hover:grid"
      >
        <PencilIcon size={18} />
      </button>
      <button
        onClick={() => onRemove(item)}
        aria-label={`Quitar ${item.name}`}
        className="grid h-11 w-9 md:w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-track hover:text-danger"
      >
        <TrashIcon size={18} />
      </button>
    </li>
  );
}

function ItemDialog({
  item,
  section: initialSection,
  classify,
  onSave,
  onRemove,
  onClose,
}: {
  item: ShoppingItem;
  section: SectionId;
  classify: (name: string) => SectionId | undefined;
  onSave: (c: ItemChanges, learn: boolean) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity ?? "");
  const [note, setNote] = useState(item.note ?? "");
  const [section, setSection] = useState(initialSection);
  // Elegida a mano: ya no sigue al nombre y se recuerda al guardar.
  const [picked, setPicked] = useState(false);

  function changeName(v: string) {
    setName(v);
    const s = picked ? undefined : classify(v);
    if (s) setSection(s);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave(
      { name: name.trim(), quantity: quantity.trim() || undefined, note: note.trim() || undefined, section },
      picked,
    );
    onClose();
  }

  return (
    <Dialog title="Editar artículo" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className={labelClass}>
          Artículo
          <input required value={name} onChange={(e) => changeName(e.target.value)} className={fieldClass} />
        </label>
        <label className={labelClass}>
          Sección
          <Select
            value={section}
            onChange={(e) => {
              setSection(e.target.value as SectionId);
              setPicked(true);
            }}
          >
            {SECTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
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

const relative = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
const fullDate = new Intl.DateTimeFormat("es", { dateStyle: "long", timeStyle: "short" });
const DAY = 86_400_000;

// «hace 5 minutos», «ayer», «hace 3 semanas»…
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_557_600],
  ["month", 2_629_800],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

function ago(ms: number) {
  const s = (ms - Date.now()) / 1000;
  for (const [unit, size] of UNITS) if (Math.abs(s) >= size) return relative.format(Math.round(s / size), unit);
  return "ahora mismo";
}

// Cada cuánto se compra, a partir de las compras guardadas (hacen falta 3).
function frequency(p: Purchase[]) {
  if (p.length < 3) return undefined;
  const days = (p[0].boughtAt - p[p.length - 1].boughtAt) / DAY / (p.length - 1);
  if (days < 1.5) return "Casi cada día";
  if (days < 10) return `Cada ${Math.round(days)} días, más o menos`;
  if (days < 60) return `Cada ${Math.round(days / 7)} semanas, más o menos`;
  return `Cada ${Math.round(days / 30)} meses, más o menos`;
}

// Quién lo compra casi siempre (al menos 3 compras y 2 de cada 3 suyas).
function usualBuyer(p: Purchase[]) {
  if (p.length < 3) return undefined;
  const count = new Map<string, number>();
  for (const x of p) if (x.boughtBy) count.set(x.boughtBy, (count.get(x.boughtBy) ?? 0) + 1);
  const [id, n] = [...count].sort((a, b) => b[1] - a[1])[0] ?? [];
  return id && n! / p.length >= 2 / 3 ? id : undefined;
}

// Ficha de un artículo en una lista compartida: quién lo apuntó, quién lo cogió e historial.
function ItemInfoDialog({
  item,
  section,
  memberName,
  onEdit,
  onClose,
}: {
  item: ShoppingItem;
  section: string;
  memberName: (id?: string) => string | undefined;
  onEdit: () => void;
  onClose: () => void;
}) {
  // undefined = cargando, null = no se pudo cargar.
  const [purchases, setPurchases] = useState<Purchase[] | null | undefined>(undefined);

  useEffect(() => {
    fetchPurchases(item.householdId, item.name)
      .then(setPurchases)
      .catch(() => setPurchases(null));
  }, [item.householdId, item.name]);

  const who = (id?: string) => memberName(id) ?? "Alguien que ya no está";
  const last = purchases?.[0];
  const buyer = purchases ? usualBuyer(purchases) : undefined;
  const often = purchases ? frequency(purchases) : undefined;

  return (
    <Dialog title={item.name} onClose={onClose}>
      <dl className="flex flex-col gap-3 text-[15px]">
        <InfoRow label="Lo apuntó">
          {who(item.addedBy)} · <time title={fullDate.format(item.createdAt)}>{ago(item.createdAt)}</time>
        </InfoRow>
        {item.checked && (
          <InfoRow label="Lo cogió">
            {who(item.checkedBy)}
            {item.checkedAt && (
              <>
                {" · "}
                <time title={fullDate.format(item.checkedAt)}>{ago(item.checkedAt)}</time>
              </>
            )}
          </InfoRow>
        )}
        <InfoRow label="Sección">{section}</InfoRow>
      </dl>

      <div className="flex flex-col gap-3 border-t border-line pt-4">
        <h3 className="text-sm font-bold text-muted">Historial</h3>
        {purchases === undefined ? (
          <p className="text-sm text-muted">Cargando…</p>
        ) : purchases === null ? (
          <p className="text-sm font-semibold text-danger">No se ha podido cargar el historial.</p>
        ) : !last ? (
          <p className="text-sm text-ink-soft">
            Aún no se ha comprado. Cada vez que pulséis «Terminar compra» se apunta aquí.
          </p>
        ) : (
          <dl className="flex flex-col gap-3 text-[15px]">
            <InfoRow label="Última compra">
              <time title={fullDate.format(last.boughtAt)}>{ago(last.boughtAt)}</time> · {who(last.boughtBy)}
            </InfoRow>
            <InfoRow label="Veces comprado">
              {purchases.length >= 100 ? "Más de 100" : purchases.length === 1 ? "1 vez" : `${purchases.length} veces`}
            </InfoRow>
            {often && <InfoRow label="Frecuencia">{often}</InfoRow>}
            {buyer && <InfoRow label="Suele comprarlo">{who(buyer)}</InfoRow>}
          </dl>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            onClose();
            onEdit();
          }}
          className={btnGhost}
        >
          Editar
        </button>
        <button type="button" onClick={onClose} className={btnPrimary}>
          Cerrar
        </button>
      </div>
    </Dialog>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-sm text-muted">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

function InviteDialog({
  householdId,
  listName,
  members,
  onClose,
}: {
  householdId: string;
  listName: string;
  members: Member[];
  onClose: () => void;
}) {
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
    <Dialog title={members.length > 1 ? `Personas de «${listName}»` : `Compartir «${listName}»`} onClose={onClose}>
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
          {/^Mi lista( \d+)?$/.test(listName) && " Cuando alguien se una, pasará a llamarse «Compartida» (podéis renombrarla)."}
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
              onClick={() =>
                navigator
                  .share({ title: "Lista de la compra", text: "Únete a nuestra lista de la compra en doneT", url: link })
                  .catch(() => {})
              }
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
