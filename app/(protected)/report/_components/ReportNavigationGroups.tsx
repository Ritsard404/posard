import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReportCategory, ReportPrintableView } from "./report-workspace-config";

type NavigationGroup = {
  category: ReportCategory;
  description: string;
  views: Array<{
    id: ReportPrintableView;
    label: string;
    description: string;
    icon: React.ElementType;
    href: string;
    isActive: boolean;
  }>;
};

export function ReportNavigationGroups({
  groups,
}: {
  groups: NavigationGroup[];
}) {
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <Card
          key={group.category}
          className="overflow-hidden rounded-[28px] border-border/70 bg-background shadow-sm"
        >
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="space-y-1">
              <div className="text-sm font-semibold tracking-tight">
                {group.category}
              </div>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                {group.description}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {group.views.map((view) => {
                const Icon = view.icon;

                return (
                  <Link
                    key={view.id}
                    href={view.href}
                    className={cn(
                      "group flex min-h-32 cursor-pointer flex-col justify-between rounded-[24px] border p-4 transition-colors",
                      view.isActive
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border/70 bg-muted/10 hover:border-primary/40 hover:bg-primary/[0.03]",
                    )}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className={cn(
                            "rounded-2xl p-3",
                            view.isActive
                              ? "bg-primary-foreground/15 text-primary-foreground"
                              : "bg-primary/10 text-primary",
                          )}
                        >
                          <Icon className="size-4" />
                        </div>
                        {view.isActive ? (
                          <Badge
                            variant="secondary"
                            className="rounded-full bg-primary-foreground/15 text-primary-foreground"
                          >
                            Open
                          </Badge>
                        ) : null}
                      </div>
                      <div className="space-y-1">
                        <div className="font-semibold tracking-tight">{view.label}</div>
                        <p
                          className={cn(
                            "text-sm leading-6",
                            view.isActive
                              ? "text-primary-foreground/90"
                              : "text-muted-foreground",
                          )}
                        >
                          {view.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

