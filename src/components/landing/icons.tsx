import type { SVGProps } from "react";

// Small, consistent line icons for the landing page — hand-drawn to avoid
// pulling in an icon library dependency. 24x24 viewBox, stroke-based.
function IconBase(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

export function ProfileIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5" />
    </IconBase>
  );
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M19 19l-4.3-4.3" />
    </IconBase>
  );
}

export function RouteIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="6" cy="18" r="2.2" />
      <circle cx="18" cy="12" r="2.2" />
      <path d="M8 6.7C11 7.5 13 9.5 15.6 10.9" />
      <path d="M8 17.3C11 16.5 13 14.5 15.6 13.1" />
    </IconBase>
  );
}

export function BriefcaseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="7.5" width="17" height="11" rx="2" />
      <path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" />
      <path d="M3.5 12.5h17" />
    </IconBase>
  );
}

export function SlidersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M5 6h9M18 6h1" />
      <path d="M5 12h3M12 12h7" />
      <path d="M5 18h11M20 18h-1" />
      <circle cx="16" cy="6" r="1.8" />
      <circle cx="9" cy="12" r="1.8" />
      <circle cx="16" cy="18" r="1.8" />
    </IconBase>
  );
}

export function TelegramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M20.5 4 3 11.2l5.6 2 2 6 3-3.6 4 3.2 2.9-14.8Z" />
      <path d="M8.6 13.2 17.5 7" />
    </IconBase>
  );
}

export function SyncIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M4.5 12a7.5 7.5 0 0 1 12.6-5.5" />
      <path d="M19.5 12a7.5 7.5 0 0 1-12.6 5.5" />
      <path d="M17.5 4.5v3.2h-3.2" />
      <path d="M6.5 19.5v-3.2h3.2" />
    </IconBase>
  );
}

export function BookmarkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M6.5 4.5h11v15l-5.5-4-5.5 4Z" />
    </IconBase>
  );
}

export function CoinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 8.3v7.4M9.8 14.3c.3.9 1.1 1.4 2.2 1.4 1.4 0 2.3-.7 2.3-1.7 0-2.4-4.5-1.1-4.5-3.5 0-1 .9-1.7 2.2-1.7 1.1 0 1.9.5 2.2 1.4" />
    </IconBase>
  );
}
