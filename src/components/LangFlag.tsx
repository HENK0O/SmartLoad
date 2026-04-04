export function FlagFR({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.75} viewBox="0 0 3 2" fill="none">
      <rect width="1" height="2" fill="#002395" />
      <rect x="1" width="1" height="2" fill="#FFFFFF" />
      <rect x="2" width="1" height="2" fill="#ED2939" />
    </svg>
  );
}

export function FlagUK({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 60 30" fill="none">
      <rect width="60" height="30" fill="#012169" />
      <path d="M0 0L60 30M60 0L0 30" stroke="#FFFFFF" strokeWidth="6" />
      <path d="M0 0L60 30M60 0L0 30" stroke="#C8102E" strokeWidth="2" />
      <path d="M30 0v30M0 15h60" stroke="#FFFFFF" strokeWidth="10" />
      <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}

export function LangFlag({ lang, size = 14 }: { lang: "fr" | "en"; size?: number }) {
  return lang === "fr" ? <FlagFR size={size} /> : <FlagUK size={size} />;
}
