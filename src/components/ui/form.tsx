import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

const FIELD_CLASSES =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand disabled:opacity-50";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1 block text-sm font-medium", className)} {...props} />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD_CLASSES, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(FIELD_CLASSES, "min-h-24", className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(FIELD_CLASSES, className)} {...props} />;
}

export function FieldError({ children }: { children?: string | string[] }) {
  if (!children || (Array.isArray(children) && children.length === 0)) return null;
  const messages = Array.isArray(children) ? children : [children];
  return (
    <p className="mt-1 text-xs text-danger">
      {messages.join(" ")}
    </p>
  );
}
