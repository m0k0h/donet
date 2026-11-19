import type { Metadata } from "next";
import GoogleCallback from "./GoogleCallback";

export const metadata: Metadata = { title: "Google · doneT" };

// Vuelta de Google al conectar una cuenta (/google/?code=…&state=…).
export default function GooglePage() {
  return <GoogleCallback />;
}
