import type { Metadata } from "next";
import OpenShopping from "./OpenShopping";

export const metadata: Metadata = { title: "Compra · doneT" };

// La Compra vive dentro de la app; esta dirección (y los enlaces de invitación,
// /compra/?unirse=CÓDIGO) solo llevan hasta ella.
export default function CompraPage() {
  return <OpenShopping />;
}
