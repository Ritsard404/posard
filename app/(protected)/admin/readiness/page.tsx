import { getAppConfig } from "@/lib/app-config";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function StatusRow({
  label,
  value,
  ready,
}: {
  label: string;
  value: string;
  ready: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 text-sm font-medium">
        <span>{value}</span>
        <Badge variant={ready ? "default" : "secondary"}>
          {ready ? "Ready" : "Fallback"}
        </Badge>
      </div>
    </div>
  );
}

export default function ReadinessPage() {
  const config = getAppConfig();

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div>
        <h2 className="text-xl font-bold">Messaging and AI Readiness</h2>
        <p className="text-sm text-muted-foreground">
          Provider status for email notifications and report AI.
        </p>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-base">Providers</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusRow
            label="Email provider"
            value={
              config.email.ready
                ? config.email.provider
                : `${config.email.provider} (${config.email.enabled ? "not configured" : "disabled"})`
            }
            ready={config.email.ready}
          />
          <StatusRow
            label="AI provider"
            value={
              config.aiReport.ready
                ? config.aiReport.provider
                : `${config.aiReport.provider} (${config.aiReport.enabled ? "mock mode" : "disabled"})`
            }
            ready={config.aiReport.ready}
          />
          <StatusRow
            label="App URL"
            value={config.appUrl || "not configured"}
            ready={Boolean(config.appUrl)}
          />
        </CardContent>
      </Card>

      {config.warnings.length > 0 ? (
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-base">Warnings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {config.warnings.map((warning) => (
              <p key={warning} className="text-sm text-muted-foreground">
                {warning}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
