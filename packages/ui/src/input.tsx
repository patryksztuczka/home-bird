import type { ComponentPropsWithRef } from "react";

export function Input({ className = "", ...props }: ComponentPropsWithRef<"input">) {
  return (
    <input
      className={`w-full min-w-0 rounded-md border border-hairline-strong bg-surface px-[15px] py-[13px] text-base text-ink shadow-[inset_0_1px_2px_rgb(15_26_21/0.04)] transition-colors duration-[120ms] ease-settle outline-none placeholder:text-muted focus:border-accent aria-invalid:border-danger aria-invalid:bg-danger-wash ${className}`}
      {...props}
    />
  );
}
