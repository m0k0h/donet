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

export const SunIcon = ({ size }: P) => (
  <Icon size={size}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
);

export const MoonIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
  </Icon>
);

export const ChevronIcon = ({ size, open }: P & { open?: boolean }) => (
  <Icon size={size}>
    <path d={open ? "M6 9l6 6 6-6" : "M9 6l6 6-6 6"} />
  </Icon>
);

export const CloseIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

// Opciones avanzadas de una tarea (descripción, fecha, proyecto…).
export const SlidersIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </Icon>
);

export const SubtaskIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M6 4v9a3 3 0 0 0 3 3h9" />
    <path d="M15 13l3 3-3 3" />
  </Icon>
);

export const FolderIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </Icon>
);

export const SwapIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M7 4v16M7 20l-3.5-3.5M7 20l3.5-3.5M17 20V4M17 4l-3.5 3.5M17 4l3.5 3.5" />
  </Icon>
);

export const PencilIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
    <path d="M13.5 6.5l4 4" />
  </Icon>
);

export const CalendarIcon = ({ size }: P) => (
  <Icon size={size}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Icon>
);

export const ClockIcon = ({ size }: P) => (
  <Icon size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);

export const FlagIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
  </Icon>
);

export const CommentIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M4 5h16v11H9l-5 4z" />
  </Icon>
);

export const EyeIcon = ({ size, off }: P & { off?: boolean }) => (
  <Icon size={size}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M4 4l16 16" />}
  </Icon>
);

// Círculo que se va rellenando como un quesito según el progreso (0 a 1).
export const ProgressPie = ({ size = 13, value }: P & { value: number }) => {
  const r = 3.5;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle
        cx="8"
        cy="8"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={r * 2}
        strokeDasharray={`${c * Math.min(Math.max(value, 0), 1)} ${c}`}
        transform="rotate(-90 8 8)"
      />
    </svg>
  );
};

export const CartIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M3 4h2l2.4 11h10.2L20 8H6.2" />
    <circle cx="9" cy="19.5" r="1.5" />
    <circle cx="17" cy="19.5" r="1.5" />
  </Icon>
);

export const UserPlusIcon = ({ size }: P) => (
  <Icon size={size}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6" />
  </Icon>
);

export const BackIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M15 5l-7 7 7 7" />
  </Icon>
);
