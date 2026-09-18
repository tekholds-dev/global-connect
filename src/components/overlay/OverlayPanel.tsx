import type { ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Minimal glass panel. Desktop: floats on the right. Mobile: bottom sheet.
 */
export function OverlayPanel({
  title,
  subtitle,
  accent,
  onClose,
  children,
  size = "md",
  footer,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  accent?: string;
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "md";
  footer?: ReactNode;
}) {
  const width = size === "sm" ? "md:w-[340px]" : "md:w-[380px]";
  return (
    <div
      className={`glass pointer-events-auto fixed inset-x-2 bottom-2 z-30 flex max-h-[70dvh] flex-col overflow-hidden rounded-2xl animate-slide-in-up md:inset-x-auto md:bottom-4 md:right-4 md:top-4 md:max-h-none md:animate-slide-in-right ${width}`}
      role="dialog"
    >
      <header className="flex items-start gap-3 border-b border-border px-4 py-3">
        {accent && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: accent, boxShadow: `0 0 14px ${accent}` }} />}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold tracking-wide">{title}</div>
          {subtitle && <div className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</div>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </header>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
      {footer && <div className="border-t border-border px-3 py-3">{footer}</div>}
    </div>
  );
}
