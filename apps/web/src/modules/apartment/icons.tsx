/** The icon set drawn for the Paper design. Stroke-only, 1.4–1.6px, currentColor. */
import type { SVGProps } from "react";

const stroke = {
  fill: "none",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function HomeMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden {...stroke} {...props}>
      <path
        d="M2.5 8.6 10 2.5l7.5 6.1V17a.5.5 0 0 1-.5.5h-4.2v-5.3H7.2v5.3H3a.5.5 0 0 1-.5-.5V8.6Z"
        stroke="currentColor"
        strokeWidth={1.6}
      />
    </svg>
  );
}

export function PlanIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden {...stroke} {...props}>
      <rect
        x="2.2"
        y="2.2"
        width="13.6"
        height="13.6"
        rx="1.4"
        stroke="currentColor"
        strokeWidth={1.3}
      />
      <path d="M9 2.6v12.8M2.6 9.6h6.4" stroke="currentColor" strokeWidth={1.3} />
    </svg>
  );
}

export function PlanIconLarge(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden {...stroke} {...props}>
      <rect
        x="4.5"
        y="4.5"
        width="23"
        height="23"
        rx="2.5"
        stroke="currentColor"
        strokeWidth={1.6}
      />
      <path d="M16 5v22M5 18.5h11" stroke="currentColor" strokeWidth={1.6} />
      <path d="M22 11.5h5.5M22 22h5.5" stroke="currentColor" strokeWidth={1.6} opacity={0.45} />
    </svg>
  );
}

export function UploadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden {...stroke} {...props}>
      <path d="M16 22V6m0 0-6 6m6-6 6 6" stroke="currentColor" strokeWidth={2} />
      <path d="M5 21v4a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2v-4" stroke="currentColor" strokeWidth={2} />
    </svg>
  );
}

export function ChevronRight(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden {...stroke} {...props}>
      <path d="m6 3.5 5 4.5-5 4.5" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

export function ChevronLeft(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden {...stroke} {...props}>
      <path d="M10 3.5 5 8l5 4.5" stroke="currentColor" strokeWidth={1.6} />
    </svg>
  );
}

export function ArrowRight(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden {...stroke} {...props}>
      <path d="M3 8h9.5M8.5 4l4 4-4 4" stroke="currentColor" strokeWidth={1.6} />
    </svg>
  );
}

export function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden {...stroke} {...props}>
      <path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth={1.6} />
    </svg>
  );
}

export function MinusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden {...stroke} {...props}>
      <path d="M3 7h8" stroke="currentColor" strokeWidth={1.6} />
    </svg>
  );
}

export function SparkleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden {...stroke} {...props}>
      <path
        d="M8 2.5 9.6 6.4l3.9 1.6-3.9 1.6L8 13.5 6.4 9.6 2.5 8l3.9-1.6L8 2.5Z"
        stroke="currentColor"
        strokeWidth={1.4}
      />
    </svg>
  );
}

export function InfoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden {...stroke} {...props}>
      <circle cx="8" cy="8" r="6.4" stroke="currentColor" strokeWidth={1.4} />
      <path d="M8 4.6v4.2" stroke="currentColor" strokeWidth={1.5} />
      <circle cx="8" cy="11.2" r="0.85" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function AlertIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden {...stroke} {...props}>
      <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth={1.8} />
      <path d="M14 8.4v7" stroke="currentColor" strokeWidth={2} />
      <circle cx="14" cy="19.2" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}
