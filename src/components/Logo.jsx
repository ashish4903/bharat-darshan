/** Brand mark: a map pin framing an arched gateway. */
export function LogoMark({ size = 32 }) {
  return (
    <svg
      className="logo-mark"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="64" height="64" rx="16" fill="var(--saffron)" />
      <path
        d="M32 10c-9.4 0-17 7.4-17 16.6C15 38.8 32 54 32 54s17-15.2 17-27.4C49 17.4 41.4 10 32 10z"
        fill="#fff7ec"
      />
      <path d="M24 33v-6.5a8 8 0 0 1 16 0V33h-4v-6.2a4 4 0 0 0-8 0V33z" fill="#23214f" />
      <circle cx="32" cy="18.5" r="2.2" fill="#23214f" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="logo">
      <LogoMark />
      <span className="logo-word">
        Bharat <em>Darshan</em>
      </span>
    </span>
  );
}
