import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export const MAX_NAME_LENGTH = 40;

// Lo que va antes de la @ del correo, para quien aún no ha elegido nombre.
export function nameFromEmail(email?: string) {
  const n = (email ?? "").split("@")[0].replace(/[._-]+/g, " ").trim();
  return n ? n[0].toUpperCase() + n.slice(1) : "";
}

// Nombre elegido en Ajustes (se guarda en la cuenta), o "" si no hay.
export function chosenName(user?: User | null): string {
  const n = user?.user_metadata?.display_name;
  return typeof n === "string" ? n.trim() : "";
}

// Nombre con el que te ven los demás: el elegido o, si no, el del correo.
export function profileName(user?: User | null): string {
  return chosenName(user) || nameFromEmail(user?.email);
}

export async function sessionProfileName() {
  const { data } = await supabase!.auth.getSession();
  return profileName(data.session?.user) || "Yo";
}

// Guarda el nombre en la cuenta y lo pone en todas tus listas compartidas.
export async function saveProfileName(name: string) {
  const { data, error } = await supabase!.auth.updateUser({ data: { display_name: name } });
  if (error) throw error;
  const { error: e2 } = await supabase!
    .from("household_members")
    .update({ display_name: name })
    .eq("user_id", data.user.id);
  if (e2) throw e2;
}
