import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TaskApp from "@/components/TaskApp";
import { SPACES } from "@/lib/tasks";

type Props = { params: Promise<{ space: string }> };

// Solo existen /personal y /laboral; cualquier otra dirección da "no encontrado".
export const dynamicParams = false;

export function generateStaticParams() {
  return SPACES.map((s) => ({ space: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { space } = await params;
  const found = SPACES.find((s) => s.slug === space);
  return { title: found ? `${found.label} · doneT` : "doneT" };
}

export default async function SpacePage({ params }: Props) {
  const { space } = await params;
  const found = SPACES.find((s) => s.slug === space);
  if (!found) notFound();
  return <TaskApp space={found.id} />;
}
