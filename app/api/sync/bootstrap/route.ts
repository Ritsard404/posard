import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { categoryService } from "@/app/(protected)/pos/_services/category.service";
import { productService } from "@/app/(protected)/pos/_services/product.service";
import { epaymentService } from "@/app/(protected)/pos/_services/epayment.service";
import { buildManagerPinVerifier } from "@/app/(protected)/pos/_services/offline-pin-verifier.service";
import { printConfigService } from "@/app/(protected)/pos/_services/print-config.service";

async function getCurrentProfile() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return null;
  }

  return prisma.profile.findFirst({
    where: { userId: data.user.id },
    select: {
      id: true,
      companyId: true,
      fullName: true,
      role: true,
      company: {
        select: {
          id: true,
          code: true,
        },
      },
    },
  });
}

export async function GET(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile?.companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    const companyId = profile.companyId;

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId")?.trim();
    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: "deviceId is required" },
        { status: 400 },
      );
    }

    const [categories, products, epaymentMethods, managers, timestamp] =
      await Promise.all([
        categoryService.getCategories(companyId),
        productService.getProducts(companyId),
        epaymentService.getEPaymentMethods(),
        prisma.profile.findMany({
          where: {
            companyId: profile.companyId,
            role: { in: ["manager", "admin"] },
            pin: { not: null },
          },
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            pin: true,
          },
        }),
        prisma.timestamp.findFirst({
          where: { cashierId: profile.id, timestampOut: null },
          select: {
            id: true,
            cashierId: true,
            deviceId: true,
            lastSeenAt: true,
            posTerminal: {
              select: {
                id: true,
                posName: true,
                isTrainMode: true,
                vat: true,
                discountCapType: true,
                discountMax: true,
                printerName: true,
                printerDisplayName: true,
                printerConnectionType: true,
                printerTransport: true,
                printerDriver: true,
                printerVendorId: true,
                printerProductId: true,
                printerDeviceId: true,
                printerServiceUuid: true,
                printerCharacteristicUuid: true,
                autoPrintEnabled: true,
              },
            },
            cashier: {
              select: {
                fullName: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

    if (timestamp && (!timestamp.deviceId || timestamp.deviceId === deviceId)) {
      await prisma.timestamp.update({
        where: { id: timestamp.id },
        data: {
          deviceId,
          lastSeenAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        session: timestamp
          ? {
              timestampId: timestamp.id,
              terminalId: timestamp.posTerminal.id,
              terminalName: timestamp.posTerminal.posName ?? "Unnamed terminal",
              terminalVat: timestamp.posTerminal.vat ?? 0,
              discountCapType: timestamp.posTerminal.discountCapType,
              discountMax: timestamp.posTerminal.discountMax
                ? Number(timestamp.posTerminal.discountMax)
                : 0,
              printerConfig: printConfigService.mapPrinterConfig(timestamp.posTerminal),
              cashierId: timestamp.cashierId,
              cashierName: timestamp.cashier.fullName ?? null,
              companyId,
              companyCode: profile.company?.code ?? null,
              deviceId: timestamp.deviceId ?? deviceId,
              isTrainMode: timestamp.posTerminal.isTrainMode,
              lastSeenAt: timestamp.lastSeenAt?.toISOString() ?? null,
            }
          : null,
        metadata: {
          categories,
          products,
          epaymentMethods,
        },
        managerVerifiers: managers.map((manager) => ({
          profileId: manager.id,
          email: manager.email ?? "",
          name: manager.fullName ?? "Manager",
          role: manager.role,
          pinVerifier: buildManagerPinVerifier({
            companyId,
            profileId: manager.id,
            deviceId,
            pin: manager.pin ?? "",
          }),
        })),
        fetchedAt: new Date().toISOString(),
        stockSnapshotVersion: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unable to build offline bootstrap.",
      },
      { status: 500 },
    );
  }
}
