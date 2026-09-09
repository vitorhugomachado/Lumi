export function Icon({ name, size = 24 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    home: (
      <>
        <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" />
      </>
    ),
    progress: (
      <>
        <rect x="3" y="12" width="4" height="9" rx="1" />
        <rect x="10" y="4" width="4" height="17" rx="1" />
        <rect x="17" y="9" width="4" height="12" rx="1" />
      </>
    ),
    trophy: (
      <>
        <path d="M8 3h8v5c0 4-2 6-4 6s-4-2-4-6ZM8 5H4v2c0 3 2 4 5 4m7-6h4v2c0 3-2 4-5 4m-3 3v5m-4 2h8m-6-2h4" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-3a8 8 0 0 1 16 0v3" />
      </>
    ),
    mic: (
      <>
        <rect x="8" y="2" width="8" height="13" rx="4" />
        <path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8" />
      </>
    ),
    sound: (
      <>
        <path d="m11 4-6 5H2v6h3l6 5Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.home}
    </svg>
  );
}
