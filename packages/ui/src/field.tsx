import type { ReactNode } from "react";

/** An uppercase panel label. Used for every form field and panel section. */
export function FieldLabel({
  htmlFor,
  children,
  hint,
}: {
  htmlFor?: string;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <label
        htmlFor={htmlFor}
        className="text-label font-semibold tracking-[0.08em] text-ink uppercase"
      >
        {children}
      </label>
      {hint}
    </div>
  );
}

/** Validation text. Always sits directly under the field it belongs to. */
export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="text-meta text-danger">
      {children}
    </p>
  );
}
