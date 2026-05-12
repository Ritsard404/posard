import { Badge } from "@/components/ui/badge";
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
}: {
  title: string;
  description: string;
  stats?: Array<{ label: string; value: string | number; tone?: "default" | "warning" | "danger" | "success" }>;
  items: T[];
  columns: Array<Column<T>>;
  emptyText: string;
}) {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
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
