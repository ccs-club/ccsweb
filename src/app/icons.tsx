export function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
      <path d="M3.5 12.5 12 4m0 0H5m7 0v7" />
    </svg>
  );
}

function glyph(children: React.ReactNode) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      {children}
    </svg>
  );
}

export function FacebookIcon() {
  return glyph(
    <path
      d="M14.5 8.5h2.2V5.6h-2.4c-2 0-3.3 1.2-3.3 3.2v1.6H8.8v2.9h2.2V21h3V13.3h2.3l.4-2.9h-2.7V9.2c0-.5.2-.7.8-.7Z"
      fill="currentColor"
    />,
  );
}

export function InstagramIcon() {
  return glyph(
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.6" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="3.6" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17.1" cy="6.9" r="1.1" fill="currentColor" />
    </>,
  );
}

export function DiscordIcon() {
  return glyph(
    <path
      d="M18.9 6.2a14 14 0 0 0-3.4-1.1l-.5 1a12.6 12.6 0 0 0-5.9 0l-.5-1a14 14 0 0 0-3.4 1.1C2.9 9.6 2.2 13 2.5 16.3a14.2 14.2 0 0 0 4.3 2.2l1-1.7c-.6-.2-1.1-.5-1.6-.9l.4-.3a10 10 0 0 0 8.8 0l.4.3c-.5.4-1 .7-1.6.9l1 1.7a14.2 14.2 0 0 0 4.3-2.2c.4-3.9-.7-7.3-1.6-10.1ZM9.4 14.3c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.8Zm5.3 0c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.8Z"
      fill="currentColor"
    />,
  );
}

export function YouTubeIcon() {
  return glyph(
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M10.3 9.4v5.2L15 12l-4.7-2.6Z" fill="currentColor" />
    </>,
  );
}

export function BoxIcon() {
  return glyph(
    <>
      <path
        d="M3.6 7.4 12 3.3l8.4 4.1v9.2L12 20.7l-8.4-4.1V7.4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M12 12v8.6M3.7 7.5 12 12l8.3-4.5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </>,
  );
}

export function MapPinIcon() {
  return glyph(
    <>
      <path
        d="M12 21.5s6.6-6 6.6-11.1a6.6 6.6 0 1 0-13.2 0C5.4 15.5 12 21.5 12 21.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10.2" r="2.4" stroke="currentColor" strokeWidth="1.7" />
    </>,
  );
}

export function ChevronLeftIcon() {
  return glyph(
    <path
      d="M14.5 5.5 8 12l6.5 6.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />,
  );
}

export function ChevronRightIcon() {
  return glyph(
    <path
      d="M9.5 5.5 16 12l-6.5 6.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />,
  );
}

export function CloseIcon() {
  return glyph(
    <path
      d="M6.5 6.5l11 11m0-11-11 11"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />,
  );
}
