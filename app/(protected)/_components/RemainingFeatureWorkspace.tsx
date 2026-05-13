import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          {toolbar ? <div className="shrink-0">{toolbar}</div> : null}
        </div>
      </Card>

      {stats?.length ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="p-3">
              <div className="text-xs font-medium uppercase text-muted-foreground">
                {stat.label}
              </div>
              <div className="mt-1 text-2xl font-bold">{stat.value}</div>
            </Card>
          ))}
        </div>
      ) : null}

      <Card className="overflow-hidden">
        {items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="border-b">
                    {columns.map((column) => (
                      <th
                        key={column.label}
                        className="px-4 py-3 text-left font-medium text-muted-foreground"
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b">
                      {columns.map((column) => (
                        <td key={column.label} className="px-4 py-3">
                          {column.value(item)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-3 md:hidden">
              {items.map((item) => (
                <Card key={item.id} className="p-3">
                  <div className="space-y-2">
                    {columns.map((column) => (
                      <div key={column.label}>
                        <div className="text-[11px] font-medium uppercase text-muted-foreground">
                          {column.label}
                        </div>
                        <div className="mt-0.5 text-sm">{column.value(item)}</div>
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
  return <Badge variant="secondary">{children}</Badge>;
}

export function ManagementFilters({
  search,
  status,
  statuses,
}: {
  search?: string;
  status?: string;
  statuses?: string[];
}) {
  return (
    <form className="flex flex-col gap-2 rounded-md border bg-background p-3 sm:flex-row sm:items-end">
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
        <span>Search</span>
        <input
          name="search"
          defaultValue={search}
          placeholder="Reference, product, supplier, notes"
          className="h-9 min-w-64 rounded-md border bg-background px-3 text-sm text-foreground"
        />
      </label>
      {statuses?.length ? (
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          <span>Status</span>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
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
      <Button type="submit" className="h-9">
        Search
      </Button>
    </form>
  );
}
