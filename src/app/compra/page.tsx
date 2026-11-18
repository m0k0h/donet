import type { Metadata } from "next";
import ShoppingApp from "@/components/ShoppingApp";

export const metadata: Metadata = { title: "Compra · doneT" };

// Lista de la compra compartida. Los enlaces de invitación llegan como /compra?unirse=CÓDIGO.
export default function CompraPage() {
  return <ShoppingApp />;
}
