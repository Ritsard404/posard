import { dataExchangeService } from "../../_services/data-exchange.service";

export async function GET() {
  const backup = await dataExchangeService.buildBackup();
  const json = JSON.stringify(backup, null, 2);

  return new Response(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="posard-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
