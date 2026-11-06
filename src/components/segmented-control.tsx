"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

type Option<T extends string> = { value: T; label: string };

/**
 * A single-choice group of native radio inputs styled as segments: arrow
 * keys move the selection and screen readers announce the position.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  const name = useId();
  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="sr-only">{label}</legend>
      <div className="flex max-w-full rounded-md border border-border bg-surface-secondary p-0.5">
        {options.map((option) => (
          <label
            key={option.value}
            className="relative flex h-7 flex-1 cursor-pointer items-center justify-center rounded-sm px-2.5 text-[13px] font-medium whitespace-nowrap text-muted-foreground transition-colors select-none hover:text-foreground has-checked:bg-surface has-checked:text-foreground has-checked:shadow-xs has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-ring"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
