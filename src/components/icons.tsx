import type { ReactNode } from "react";
import type { Space, View } from "@/lib/tasks";

function Icon({ size = 20, strokeWidth = 2, children }: { size?: number; strokeWidth?: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

type P = { size?: number };

export const SpaceIcon = ({ space, size }: P & { space: Space }) =>
  space === "personal" ? (
    <Icon size={size}>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </Icon>
  ) : (
    <Icon size={size}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </Icon>
  );

export const ViewIcon = ({ view, size }: P & { view: View }) =>
  view === "inbox" ? (
    <Icon size={size}>
      <path d="M3 13h5l1.5 3h5L16 13h5" />
      <path d="M5 5h14l2 8v6H3v-6z" />
    </Icon>
  ) : (
    <Icon size={size}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      {view === "today" ? <path d="M9.5 15.5l2 2 3.5-4" /> : <path d="M8 14h2M14 14h2M8 17.5h2" />}
    </Icon>
  );

export const TrashIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </Icon>
);

export const PlusIcon = ({ size }: P) => (
  <Icon size={size} strokeWidth={2.5}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const CheckIcon = ({ size }: P) => (
  <Icon size={size} strokeWidth={3.5}>
    <path d="M5 12.5l4.5 4.5L19 7" />
  </Icon>
);
