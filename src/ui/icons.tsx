import type { ReactNode } from "react";

/**
 * One line icon per kind of subject, drawn here on a 24-unit grid. None is a
 * logo or a mark of any site a study names.
 */
const ICONS = {
  house: <path d="M3 11 12 3l9 8M5 9.5V21h5v-6h4v6h5V9.5" />,
  key: (
    <>
      <circle cx="8" cy="15" r="4.5" />
      <path d="m11.5 11.5 8-8M16 7l3 3M13.5 9.5l2 2" />
    </>
  ),
  record: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 6.5a5.5 5.5 0 0 1 5.5 5.5" />
    </>
  ),
  film: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4M10.5 9.5v5l4-2.5z" />
    </>
  ),
  book: <path d="M12 6c-2-1.5-5-2-8-1.5V19c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V4.5C17 4 14 4.5 12 6zm0 0v14.5" />,
  cassette: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="1.5" />
      <circle cx="8.5" cy="11.5" r="2" />
      <circle cx="15.5" cy="11.5" r="2" />
      <path d="M8.5 13.5h7M7 19l1.5-3h7l1.5 3" />
    </>
  ),
  scoreboard: (
    <>
      <rect x="2.5" y="4" width="19" height="13" rx="1.5" />
      <path d="M12 4v13M6 8.5h2.5v4H6zM15.5 8.5H18v4h-2.5zM8 20.5h8M12 17v3.5" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 9.5c-.5-1-1.4-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1.1 0-2-.5-2.5-1.5M12 6v2M12 16v2" />
    </>
  ),
  post: (
    <>
      <path d="M4 5h16v11H10l-4 3.5V16H4z" />
      <path d="M8 9h8M8 12.5h5" />
    </>
  ),
  columns: <path d="M3 9.5 12 4l9 5.5M4 9.5h16M6.5 9.5V17M10.2 9.5V17M13.8 9.5V17M17.5 9.5V17M4 17h16M3 20h18" />,
  bell: <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 18.5a2 2 0 0 0 4 0M12 3v2" />,
  shield: <path d="M12 3 4.5 6v5.5c0 4.5 3 8 7.5 9.5 4.5-1.5 7.5-5 7.5-9.5V6zM8.5 12l2.5 2.5 4.5-5" />,
  burger: <path d="M4 10a8 5.5 0 0 1 16 0zM3 13.5h18M4.5 17h15a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3z" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

export const ICON_NAMES = Object.keys(ICONS) as IconName[];

/** A decorative icon. It carries no meaning the text beside it does not. */
export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name]}
    </svg>
  );
}
