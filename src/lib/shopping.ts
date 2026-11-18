import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "./supabase";

// Una lista de la compra. Empieza como «Mi lista»; al compartirla pasa a «Compartida».
export type Household = { id: string; name: string; memberCount: number };

export const DEFAULT_LIST_NAME = "Mi lista";

// Como mucho se puede estar en 3 listas (la base de datos también lo impide).
export const MAX_LISTS = 3;

// La base de datos rechazó entrar en otra lista por el límite.
export const isListLimit = (e: unknown) => !!e && typeof e === "object" && "message" in e && String(e.message).includes("list_limit");

// «Mi lista», o «Mi lista 2», «Mi lista 3»… si ya existe.
export function nextListName(existing: string[]) {
  for (let n = 1; ; n++) {
    const name = n === 1 ? DEFAULT_LIST_NAME : `${DEFAULT_LIST_NAME} ${n}`;
    if (!existing.includes(name)) return name;
  }
}

export type Member = { householdId: string; userId: string; name: string };

export type ShoppingItem = {
  id: string;
  householdId: string;
  name: string;
  quantity?: string; // texto libre: «2», «1 kg», «un paquete»
  note?: string;
  checked: boolean;
  addedBy?: string;
  checkedBy?: string;
  createdAt: number;
};

type ItemRow = {
  id: string;
  household_id: string;
  name: string;
  quantity: string | null;
  note: string | null;
  checked: boolean;
  added_by: string | null;
  checked_by: string | null;
  created_at: string;
};

export const itemFromRow = (r: ItemRow): ShoppingItem => ({
  id: r.id,
  householdId: r.household_id,
  name: r.name,
  quantity: r.quantity ?? undefined,
  note: r.note ?? undefined,
  checked: r.checked,
  addedBy: r.added_by ?? undefined,
  checkedBy: r.checked_by ?? undefined,
  createdAt: Date.parse(r.created_at),
});

// Lo pendiente primero (lo último añadido abajo); lo que ya está en el carro, al final.
export const sortItems = (list: ShoppingItem[]) =>
  [...list].sort((a, b) => Number(a.checked) - Number(b.checked) || a.createdAt - b.createdAt);

// Invitación pendiente: viene en el enlace (?unirse=CÓDIGO) y se guarda por si
// hay que crear la cuenta o confirmar el correo antes de aceptarla.
const INVITE_KEY = "donet.invite.v1";

export function savePendingInvite(code: string) {
  try {
    localStorage.setItem(INVITE_KEY, code);
  } catch {}
}

export function loadPendingInvite(): string | null {
  try {
    return localStorage.getItem(INVITE_KEY);
  } catch {
    return null;
  }
}

export function clearPendingInvite() {
  try {
    localStorage.removeItem(INVITE_KEY);
  } catch {}
}

// /compra no es una pantalla aparte: deja esta marca y lleva a la app, que abre la Compra.
const OPEN_KEY = "donet.openShopping.v1";

export function requestOpenShopping() {
  try {
    sessionStorage.setItem(OPEN_KEY, "1");
  } catch {}
}

export function consumeOpenShopping(): boolean {
  try {
    const open = sessionStorage.getItem(OPEN_KEY) === "1";
    sessionStorage.removeItem(OPEN_KEY);
    return open;
  } catch {
    return false;
  }
}

// En GitHub Pages la app vive bajo /donet, así que el enlace lleva esa base.
export const inviteLink = (code: string) =>
  `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/compra/?unirse=${code}`;

// Hogar abierto la última vez en este navegador (por si se pertenece a más de uno).
const HOUSEHOLD_KEY = "donet.household.v1";

export function saveHouseholdId(id: string) {
  try {
    localStorage.setItem(HOUSEHOLD_KEY, id);
  } catch {}
}

export function loadHouseholdId(): string | null {
  try {
    return localStorage.getItem(HOUSEHOLD_KEY);
  } catch {
    return null;
  }
}

// Todas las listas de la persona, en el orden en que entró en ellas.
export async function fetchMyHouseholds(userId: string): Promise<Household[]> {
  const { data, error } = await supabase!
    .from("household_members")
    .select("joined_at, households (id, name, household_members (count))")
    .eq("user_id", userId)
    .order("joined_at");
  if (error) throw error;
  type H = { id: string; name: string; household_members: { count: number }[] };
  return data
    .map((m) => m.households as unknown as H | null)
    .filter((h): h is H => !!h)
    .map((h) => ({ id: h.id, name: h.name, memberCount: h.household_members[0]?.count ?? 1 }));
}

export async function renameHousehold(id: string, name: string) {
  const { error } = await supabase!.from("households").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function leaveHousehold(id: string) {
  const { error } = await supabase!.rpc("leave_household", { h: id });
  if (error) throw error;
}

// El nombre con el que te ve el resto de la lista.
export async function renameMember(householdId: string, userId: string, name: string) {
  const { error } = await supabase!
    .from("household_members")
    .update({ display_name: name })
    .eq("household_id", householdId)
    .eq("user_id", userId);
  if (error) throw error;
}

// Miembros de todas las listas, para saber quién añadió cada cosa.
export async function fetchMembers(householdIds: string[]): Promise<Member[]> {
  if (!householdIds.length) return [];
  const { data, error } = await supabase!
    .from("household_members")
    .select("household_id, user_id, display_name")
    .in("household_id", householdIds)
    .order("joined_at");
  if (error) throw error;
  return data.map((m) => ({ householdId: m.household_id, userId: m.user_id, name: m.display_name }));
}

export async function createHousehold(name: string, memberName: string): Promise<string> {
  const { data, error } = await supabase!.rpc("create_household", { household_name: name, member_name: memberName });
  if (error) throw error;
  return data as string;
}

export async function createInvite(householdId: string): Promise<string> {
  const { data, error } = await supabase!.rpc("create_household_invite", { h: householdId });
  if (error) throw error;
  return data as string;
}

// Nombre del hogar de una invitación, o null si no existe o ha caducado.
export async function inviteInfo(code: string): Promise<string | null> {
  const { data, error } = await supabase!.rpc("household_invite_info", { invite_code: code });
  if (error) throw error;
  return (data as string | null) ?? null;
}

// Hogar de la invitación si ya se es miembro: las reglas de seguridad solo dejan
// ver las invitaciones de los hogares propios.
export async function invitedHouseholdIfMember(code: string): Promise<string | null> {
  const { data, error } = await supabase!
    .from("household_invites")
    .select("household_id")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data?.household_id ?? null;
}

export async function joinHousehold(code: string, memberName: string): Promise<string> {
  const { data, error } = await supabase!.rpc("join_household", { invite_code: code, member_name: memberName });
  if (error) throw error;
  return data as string;
}

// Artículos de todas las listas a la vez, para los contadores y los avisos.
export async function fetchItems(householdIds: string[]): Promise<ShoppingItem[]> {
  if (!householdIds.length) return [];
  const { data, error } = await supabase!
    .from("shopping_items")
    .select("*")
    .in("household_id", householdIds)
    .order("created_at");
  if (error) throw error;
  return (data as ItemRow[]).map(itemFromRow);
}

export async function insertItem(i: ShoppingItem) {
  const { error } = await supabase!.from("shopping_items").insert({
    id: i.id,
    household_id: i.householdId,
    name: i.name,
    quantity: i.quantity ?? null,
    note: i.note ?? null,
    created_at: new Date(i.createdAt).toISOString(),
  });
  if (error) throw error;
}

export async function updateItem(id: string, c: Pick<ShoppingItem, "name" | "quantity" | "note">) {
  const { error } = await supabase!
    .from("shopping_items")
    .update({ name: c.name, quantity: c.quantity ?? null, note: c.note ?? null })
    .eq("id", id);
  if (error) throw error;
}

export async function setItemChecked(id: string, checked: boolean, userId: string) {
  const { error } = await supabase!
    .from("shopping_items")
    .update({ checked, checked_by: checked ? userId : null, checked_at: checked ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteItem(id: string) {
  const { error } = await supabase!.from("shopping_items").delete().eq("id", id);
  if (error) throw error;
}

// «Terminar compra»: quita de la lista todo lo que ya está en el carro.
export async function clearChecked(householdId: string) {
  const { error } = await supabase!.from("shopping_items").delete().eq("household_id", householdId).eq("checked", true);
  if (error) throw error;
}

// Escucha los cambios en todas las listas de la persona: las reglas de seguridad
// hacen que solo lleguen los de sus listas. Los borrados llegan solo con el id.
export function subscribeItems(on: {
  upsert: (item: ShoppingItem, isNew: boolean) => void;
  remove: (id: string) => void;
  reconnect: () => void;
}) {
  const channel = supabase!
    .channel(`shopping:${crypto.randomUUID()}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "shopping_items" }, (p: RealtimePostgresChangesPayload<ItemRow>) => {
      if (p.eventType === "DELETE") {
        if (p.old.id) on.remove(p.old.id);
      } else {
        on.upsert(itemFromRow(p.new), p.eventType === "INSERT");
      }
    })
    .subscribe((status) => {
      // Al (re)conectar se recarga todo por si se perdió algún cambio mientras tanto.
      if (status === "SUBSCRIBED") on.reconnect();
    });
  return () => {
    supabase!.removeChannel(channel);
  };
}
