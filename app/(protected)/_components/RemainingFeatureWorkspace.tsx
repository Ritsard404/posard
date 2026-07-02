import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Column<T> {
  label: string;
  value: (item: T) => React.ReactNode;
}

export function RemainingFeatureWorkspace<T extends { id: string }>({
  title,
  description,
  stats,
  items,
  columns,
  emptyText,
  toolbar,
}: {
  title: string;
  description: string;
  stats?: Array<{ label: string; value: string | number; tone?: "default" | "warning" | "danger" | "success" }>;
  items: T[];
  columns: Array<Column<T>>;
  emptyText: string;
  toolbar?: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <Card className="border-border/80 p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight sm:text-xl">{title}</h1>
            <p className="mt-0.5 max-w-4xl text-xs leading-5 text-muted-foreground sm:text-sm">
              {description}
            </p>
          </div>
          {toolbar ? <div className="w-full shrink-0 xl:max-w-5xl">{toolbar}</div> : null}
        </div>
      </Card>

      {stats?.length ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-border/80 p-2.5 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {stat.label}
              </div>
              <div className="mt-0.5 text-xl font-bold tabular-nums">{stat.value}</div>
            </Card>
          ))}
        </div>
      ) : null}

      <Card className="overflow-hidden border-border/80 shadow-sm">
        {items.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          <>
            <div className="hidden max-h-[calc(100vh-14rem)] overflow-auto md:block">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="sticky top-0 z-10 bg-muted/70 backdrop-blur">
                  <tr className="border-b">
                    {columns.map((column) => (
                      <th
                        key={column.label}
                        className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b transition-colors hover:bg-muted/30"
                    >
                      {columns.map((column) => (
                        <td
                          key={column.label}
                          className="max-w-[24rem] px-3 py-2 align-top leading-5"
                        >
                          {column.value(item)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-2 p-2 md:hidden">
              {items.map((item) => (
                <Card key={item.id} className="border-border/80 p-2.5 shadow-sm">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    {columns.map((column) => (
                      <div key={column.label}>
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {column.label}
                        </div>
                        <div className="mt-0.5 break-words text-sm leading-5">
                          {column.value(item)}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

export function StatusBadge({ children }: { children: React.ReactNode }) {
  return (
    <Badge variant="secondary" className="h-5 rounded-full px-2 text-[11px]">
      {children}
    </Badge>
  );
}

export function ManagementFilters({
  search,
  status,
  statuses,
  placeholder = "Reference, product, supplier, notes",
}: {
  search?: string;
  status?: string;
  statuses?: string[];
  placeholder?: string;
}) {
  return (
    <form className="flex flex-col gap-2 rounded-md border bg-background/80 p-2 sm:flex-row sm:items-end sm:justify-end">
      <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Search</span>
        <Input
          name="search"
          defaultValue={search}
          placeholder={placeholder}
          className="h-12 bg-background text-sm normal-case tracking-normal text-foreground sm:h-8 sm:w-64"
        />
      </label>
      {statuses?.length ? (
        <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Status</span>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="h-12 rounded-md border bg-background px-2 text-sm normal-case tracking-normal text-foreground sm:h-8"
          >
            <option value="">All statuses</option>
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <Button type="submit" size="sm" className="h-12 w-full sm:h-8 sm:w-auto">
        Search
      </Button>
    </form>
  );
}
