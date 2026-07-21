import { NextResponse } from "next/server";
import { customerDisplayService } from "@/app/(protected)/pos/_services/customer-display.service";
import {
  sanitizeCustomerDisplayDTO,
  type CustomerDisplayDTO,
} from "@/app/(protected)/pos/_services/_dto/customer-display.dto";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ terminalId: string }> },
) {
  try {
    const { terminalId } = await params;
    const display = await customerDisplayService.getSnapshot(terminalId);

    return NextResponse.json(display, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load customer display." },
      { status: 401 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ terminalId: string }> },
) {
  try {
    const { terminalId } = await params;
    const payload = (await request.json()) as CustomerDisplayDTO;
    const display = await customerDisplayService.publishSnapshot(
      sanitizeCustomerDisplayDTO(payload, terminalId),
    );

    return NextResponse.json(display, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to update customer display." },
      { status: 400 },
    );
  }
}
