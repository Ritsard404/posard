import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { categoryService } from "@/app/(protected)/pos/_services/category.service";
import { productService } from "@/app/(protected)/pos/_services/product.service";
import { epaymentService } from "@/app/(protected)/pos/_services/epayment.service";
import { printConfigService } from "@/app/(protected)/pos/_services/print-config.service";
import {
  getPlatformBillingMode,
  isPlatformBillingFree,
  isTerminalPosAccessible,
  TERMINAL_BILLING_TRANSACTION_RESTRICTION_MESSAGE,
} from "@/lib/billing-access";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import {
  rateLimitErrorResponse,
  sensitiveNoStoreHeaders,
} from "@/lib/security/response";

const textEncoder = new TextEncoder();
const BOOTSTRAP_STALE_AFTER_MINUTES = 30;

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

function parseSinceCursor(value: string | null) {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid since cursor.");
  }

  return parsed;
}

export async function GET(request: Request) {
  try {
    const startedAt = Date.now();
    const profile = await getCurrentProfile();
    if (!profile?.companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: sensitiveNoStoreHeaders },
      );
    }
    const companyId = profile.companyId;
    await enforceRateLimit({
      bucket: "sync",
      route: "/api/sync/bootstrap",
      action: "OFFLINE_BOOTSTRAP",
      profileId: profile.id,
      userId: profile.id,
      role: profile.role,
      companyId,
    });

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId")?.trim();
    let changedSince: Date | null = null;
    try {
      changedSince = parseSinceCursor(searchParams.get("since"));
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid since cursor." },
        { status: 400, headers: sensitiveNoStoreHeaders },
      );
    }

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: "deviceId is required" },
        { status: 400, headers: sensitiveNoStoreHeaders },
      );
    }

    const [categories, products, epaymentMethods, removedCategories, removedProducts, managers, timestamp, platformBillingMode] =
      await Promise.all([
        categoryService.getCategories(companyId, { changedSince: changedSince ?? undefined }),
        productService.getProducts(companyId, { changedSince: changedSince ?? undefined }),
        epaymentService.getEPaymentMethods(companyId, { changedSince: changedSince ?? undefined }),
        changedSince
          ? prisma.category.findMany({
              where: {
                companyId,
                isDeleted: true,
                deletedAt: { gt: changedSince },
              },
              select: { id: true },
            })
          : Promise.resolve([]),
        changedSince
          ? prisma.product.findMany({
              where: {
                companyId,
                isDeleted: true,
                deletedAt: { gt: changedSince },
              },
              select: { id: true },
            })
          : Promise.resolve([]),
        Promise.resolve([]),
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
                isDefaultTerminal: true,
                validUntil: true,
                isTrainMode: true,
                vat: true,
                discountCapType: true,
                discountMax: true,
                allowCashierDebtCreate: true,
                allowCashierDebtCollect: true,
                requireManagerApprovalForDebt: true,
                defaultDebtDueDays: true,
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
                subscription: {
                  select: {
                    status: true,
                    expiresAt: true,
                  },
                },
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
        getPlatformBillingMode(),
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

    const fetchedAt = new Date();
    const durationMs = Date.now() - startedAt;
    const responsePayload = {
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
                allowCashierDebtCreate:
                  timestamp.posTerminal.allowCashierDebtCreate,
                allowCashierDebtCollect:
                  timestamp.posTerminal.allowCashierDebtCollect,
                requireManagerApprovalForDebt:
                  timestamp.posTerminal.requireManagerApprovalForDebt,
                defaultDebtDueDays:
                  timestamp.posTerminal.defaultDebtDueDays ?? null,
                printerConfig: printConfigService.mapPrinterConfig(
                  timestamp.posTerminal,
                ),
                cashierId: timestamp.cashierId,
                cashierName: timestamp.cashier.fullName ?? null,
                companyId,
                companyCode: profile.company?.code ?? null,
                deviceId: timestamp.deviceId ?? deviceId,
                isTrainMode: timestamp.posTerminal.isTrainMode,
                lastSeenAt: timestamp.lastSeenAt?.toISOString() ?? null,
                billingLocked:
                  !isPlatformBillingFree(platformBillingMode) &&
                  !isTerminalPosAccessible(timestamp.posTerminal),
                billingMessage:
                  !isPlatformBillingFree(platformBillingMode) &&
                  !isTerminalPosAccessible(timestamp.posTerminal)
                  ? TERMINAL_BILLING_TRANSACTION_RESTRICTION_MESSAGE
                  : null,
              }
            : null,
          metadata: {
            categories,
            products,
            epaymentMethods,
          },
          managerVerifiers: managers,
          fetchedAt: fetchedAt.toISOString(),
          stockSnapshotVersion: fetchedAt.toISOString(),
          sync: {
            mode: changedSince ? "delta" : "snapshot",
            requestedSince: changedSince?.toISOString() ?? null,
            cursor: fetchedAt.toISOString(),
            durationMs,
            payloadBytes: 0,
            counts: {
              categories: categories.length,
              products: products.length,
              epaymentMethods: epaymentMethods.length,
              removedCategories: removedCategories.length,
              removedProducts: removedProducts.length,
            },
            removed: {
              categoryIds: removedCategories.map((item) => item.id),
              productIds: removedProducts.map((item) => item.id),
            },
            staleAfterMinutes: BOOTSTRAP_STALE_AFTER_MINUTES,
          },
        },
    };

    responsePayload.data.sync.payloadBytes = textEncoder.encode(
      JSON.stringify(responsePayload),
    ).byteLength;

    console.info("POS bootstrap metrics", {
      companyId,
      mode: responsePayload.data.sync.mode,
      productCount: products.length,
      categoryCount: categories.length,
      durationMs,
      payloadBytes: responsePayload.data.sync.payloadBytes,
    });

    return NextResponse.json(responsePayload, { headers: sensitiveNoStoreHeaders });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Too many requests")) {
      return rateLimitErrorResponse(error.message);
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unable to build offline bootstrap.",
      },
      { status: 500, headers: sensitiveNoStoreHeaders },
    );
  }
}
