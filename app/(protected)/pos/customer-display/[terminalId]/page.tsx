import { notFound } from "next/navigation";
import { customerDisplayService } from "../../_services/customer-display.service";
import { CustomerDisplayScreen } from "./_components/customer-display-screen";

interface CustomerDisplayPageProps {
  params: Promise<{ terminalId: string }>;
}

export default async function CustomerDisplayPage({
  params,
}: CustomerDisplayPageProps) {
  const { terminalId } = await params;

  try {
    const { meta, display } =
      await customerDisplayService.getInitialDisplay(terminalId);

    return (
      <CustomerDisplayScreen
        terminalId={terminalId}
        meta={meta}
        initialDisplay={display}
      />
    );
  } catch {
    notFound();
  }
}
