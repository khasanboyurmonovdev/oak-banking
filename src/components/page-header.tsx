type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

/** Header actions are tablet/desktop only: on mobile the bottom tab bar carries the primary action. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? <p className="mt-1 text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="hidden shrink-0 flex-wrap items-center gap-2 md:flex">{actions}</div> : null}
    </header>
  );
}
