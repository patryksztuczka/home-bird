import type { ComponentPropsWithRef } from "react";

export type ButtonVariant = "primary" | "secondary" | "quiet";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md text-[15px] font-semibold transition-all duration-[120ms] ease-settle outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-accent px-[22px] py-[13px] text-white shadow-accent hover:bg-accent-hover active:translate-y-px disabled:bg-surface-sunk disabled:text-muted disabled:shadow-none disabled:border disabled:border-hairline",
  secondary:
    "border border-hairline bg-surface px-4 py-2.5 text-ink hover:border-hairline-strong disabled:text-muted",
  quiet:
    "border border-hairline bg-surface-sunk px-4 py-2.5 text-muted hover:text-ink disabled:hover:text-muted",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentPropsWithRef<"button"> & { variant?: ButtonVariant }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
