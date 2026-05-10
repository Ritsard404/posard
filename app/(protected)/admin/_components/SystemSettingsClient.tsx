"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { SystemConfigurationDto } from "../_services/system-configuration.dto";
import { updateSystemConfigurationAction } from "../_actions/system-configuration.actions";

export function SystemSettingsClient({
  initialConfig,
}: {
  initialConfig: SystemConfigurationDto;
}) {
  const [config, setConfig] = useState(initialConfig);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(() => {
      void updateSystemConfigurationAction(config).then((result) => {
        if (!result.success) {
          toast.error(result.error);
          return;
        }

        setConfig(result.data);
        toast.success("System settings updated.");
      });
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">System Settings</h2>
          <p className="text-sm text-muted-foreground">
            Registration behavior and platform-wide controls.
          </p>
        </div>
        <Badge variant={config.directRegistrationEnabled ? "default" : "secondary"}>
          {config.directRegistrationEnabled ? "Direct Registration" : "Approval Required"}
        </Badge>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4" />
            User Registration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border p-4">
            <Checkbox
              id="direct-registration-enabled"
              checked={config.directRegistrationEnabled}
              disabled={isPending}
              onCheckedChange={(checked) =>
                setConfig({ directRegistrationEnabled: checked === true })
              }
            />
            <div className="space-y-1">
              <Label
                htmlFor="direct-registration-enabled"
                className="text-sm font-semibold"
              >
                Allow direct registration without admin approval
              </Label>
              <p className="text-sm text-muted-foreground">
                When enabled, public manager sign-ups create an active account immediately.
                When disabled, sign-ups stay in the existing admin approval queue.
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={save}
            disabled={isPending}
            aria-busy={isPending}
            className="gap-2"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            {isPending ? "Saving..." : "Save settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
