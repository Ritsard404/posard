import { CheckCircle2 } from "lucide-react";

type PageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

type ContentSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

type BulletGridProps = {
  items: Array<{
    title: string;
    description: string;
  }>;
};

export function PageShell({
  eyebrow,
  title,
  description,
  children,
}: PageShellProps) {
  return (
    <main>
      <section className="border-b bg-secondary/20">
        <div className="mx-auto w-full max-w-7xl px-6 py-16 md:py-20">
          <p className="text-sm font-bold uppercase tracking-wider text-primary">
            {eyebrow}
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-heading font-extrabold leading-tight tracking-tight md:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            {description}
          </p>
        </div>
      </section>
      <div className="mx-auto w-full max-w-7xl px-6 py-12 md:py-16">
        {children}
      </div>
    </main>
  );
}

export function ContentSection({
  title,
  description,
  children,
}: ContentSectionProps) {
  return (
    <section className="py-8 md:py-10">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-heading font-bold tracking-tight md:text-3xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <div className="mt-8">{children}</div>
    </section>
  );
}

export function BulletGrid({ items }: BulletGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <article
          key={item.title}
          className="rounded-md border bg-background p-5 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-primary" />
            <div>
              <h3 className="font-heading text-lg font-bold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function JsonLdScript({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
