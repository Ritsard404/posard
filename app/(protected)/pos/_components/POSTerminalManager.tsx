"use client";

import { useEffect, useState } from "react";
import { Monitor } from "lucide-react";
import { toast } from "sonner";
import { getCurrentSessionAction } from "../_actions/session.action";
import { usePOSStore } from "../_store/pos-store";
import { POSLayout } from "./POSLayout";
import { ProductDisplay } from "./ProductDisplay";
import { CartPanel } from "./CartPanel";
import { TenderPanel } from "./TenderPanel";
import { TerminalSelection } from "./TerminalSelection";
import { OpenSessionModal } from "./OpenSessionModal";
import type { PrinterConfigDto } from "../_services/_dto/print.dto";
import { printClientService } from "../_services/print-client.service";
import { getDeviceIdentity } from "../_services/device-identity.client";
import {
  fetchOfflineBootstrap,
  getOfflineQueueSnapshot,
  registerPOSServiceWorker,
  syncOfflineActions,
} from "../_services/offline-sync.client";
import {
  getOfflineCatalogSnapshot,
  getOfflineManagerVerifiers,
  getOfflineSessionSnapshot,
} from "../_services/offline-db.client";
import type { SessionSnapshotDto } from "../_services/_dto/offline.dto";

const INITIAL_SESSION_WAIT_MS = 1800;
const OFFLINE_FALLBACK_WAIT_MS = 600;
const EMPTY_OFFLINE_CATALOG = {
  categories: [],
  products: [],
  epaymentMethods: [],
};

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T,
) {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => {
      window.setTimeout(() => resolve(fallback), timeoutMs);
    }),
  ]);
}

async function refreshQueueState(
  setSyncCounts: ReturnType<typeof usePOSStore.getState>["setSyncCounts"],
) {
  const queue = await getOfflineQueueSnapshot();
  setSyncCounts({
    pendingSyncCount: queue.pendingCount,
    syncingCount: queue.syncingCount,
    needsReviewCount: queue.needsReviewCount,
  });
}

function mapSessionSnapshotToStore(
  sessionSnapshot: SessionSnapshotDto,
): Parameters<ReturnType<typeof usePOSStore.getState>["setSession"]>[0] {
  return {
    sessionId: sessionSnapshot.timestampId,
    timestampId: sessionSnapshot.timestampId,
    deviceId: sessionSnapshot.deviceId,
    profileId: sessionSnapshot.cashierId,
    terminal: {
      id: sessionSnapshot.terminalId,
      name: sessionSnapshot.terminalName,
      vat: sessionSnapshot.terminalVat,
      discountCapType: sessionSnapshot.discountCapType,
      discountMax: sessionSnapshot.discountMax,
      allowCashierDebtCreate: sessionSnapshot.allowCashierDebtCreate,
      allowCashierDebtCollect: sessionSnapshot.allowCashierDebtCollect,
      requireManagerApprovalForDebt:
        sessionSnapshot.requireManagerApprovalForDebt,
      pinlessModeEnabled: sessionSnapshot.pinlessModeEnabled,
      defaultDebtDueDays: sessionSnapshot.defaultDebtDueDays,
      printerConfig: sessionSnapshot.printerConfig,
      billingLocked: sessionSnapshot.billingLocked,
      billingMessage: sessionSnapshot.billingMessage,
      businessMode: "RETAIL",
      enableFulfillmentTypes: false,
      enableRestaurantFeatures: false,
      enableTableService: false,
      enableDeliveryDetails: false,
      enableProductModifiers: false,
    },
    user: {
      name: sessionSnapshot.cashierName,
      role: "cashier",
    },
  };
}

export function POSTerminalManager() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTerminal, setSelectedTerminal] = useState<{
    id: string;
    name: string;
    vat: number;
    discountCapType: "amount" | "percent";
    discountMax: number;
    allowCashierDebtCreate: boolean;
    allowCashierDebtCollect: boolean;
    requireManagerApprovalForDebt: boolean;
    pinlessModeEnabled: boolean;
    defaultDebtDueDays: number | null;
    printerConfig?: PrinterConfigDto | null;
    billingLocked?: boolean;
    billingMessage?: string | null;
    businessMode?: "RETAIL" | "RESTAURANT" | "HYBRID";
    enableFulfillmentTypes?: boolean;
    enableRestaurantFeatures?: boolean;
    enableTableService?: boolean;
    enableDeliveryDetails?: boolean;
    enableProductModifiers?: boolean;
  } | null>(null);

  const {
    setProducts,
    setCategories,
    setEPaymentMethods,
    setSession,
    setDeviceId,
    setCompanyId,
    setPrinterCapabilities,
    setNetworkStatus,
    setOfflineReady,
    setSyncCounts,
    setManagerVerifiers,
    activeSessionId,
  } = usePOSStore();

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const refreshCapabilities = () => {
      setPrinterCapabilities(printClientService.getCapabilities());
    };

    refreshCapabilities();
    const firstRetry = window.setTimeout(refreshCapabilities, 600);
    const secondRetry = window.setTimeout(refreshCapabilities, 1800);

    return () => {
      window.clearTimeout(firstRetry);
      window.clearTimeout(secondRetry);
    };
  }, [mounted, setPrinterCapabilities]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateOfflineFallback() {
      const [catalog, sessionSnapshot, managerVerifiers] = await withTimeout(
        Promise.all([
          getOfflineCatalogSnapshot(),
          getOfflineSessionSnapshot(),
          getOfflineManagerVerifiers(),
        ]),
        OFFLINE_FALLBACK_WAIT_MS,
        [EMPTY_OFFLINE_CATALOG, null, []] as const,
      );

      if (cancelled) {
        return;
      }

      if (catalog.products.length > 0) {
        setProducts(catalog.products);
      }
      if (catalog.categories.length > 0) {
        setCategories(catalog.categories);
      }
      if (catalog.epaymentMethods.length > 0) {
        setEPaymentMethods(catalog.epaymentMethods);
      }
      setManagerVerifiers(managerVerifiers);
      if (sessionSnapshot?.companyId) {
        setCompanyId(sessionSnapshot.companyId);
      }

      if (sessionSnapshot) {
        setSession(mapSessionSnapshotToStore(sessionSnapshot));
      }

      return Boolean(
        sessionSnapshot ||
        catalog.products.length > 0 ||
        catalog.categories.length > 0 ||
        catalog.epaymentMethods.length > 0,
      );
    }

    async function syncNow(deviceId: string) {
      if (!navigator.onLine) {
        return;
      }

      try {
        await fetchOfflineBootstrap(deviceId);
        const syncResult = await syncOfflineActions();
        for (const result of syncResult.results) {
          usePOSStore
            .getState()
            .offlineReceipts.filter(
              (receipt) => receipt.localId === result.localId,
            )
            .forEach((receipt) => {
              usePOSStore
                .getState()
                .updateOfflineReceiptStatus(
                  receipt.receiptId,
                  result.syncStatus,
                );
            });
        }
        if (!cancelled) {
          const queue = await getOfflineQueueSnapshot();
          const syncedCount = syncResult.results.filter(
            (result) => result.syncStatus === "synced",
          ).length;
          setSyncCounts({
            pendingSyncCount: queue.pendingCount,
            syncingCount: queue.syncingCount,
            needsReviewCount: queue.needsReviewCount,
            lastSyncMessage:
              syncedCount > 0
                ? `Synced ${syncedCount} queued action(s).`
                : "Queue is up to date.",
          });
        }
      } catch (error) {
        if (!cancelled) {
          const queue = await getOfflineQueueSnapshot();
          setSyncCounts({
            pendingSyncCount: queue.pendingCount,
            syncingCount: queue.syncingCount,
            needsReviewCount: queue.needsReviewCount,
            lastSyncMessage:
              error instanceof Error
                ? error.message
                : "Unable to sync queued actions.",
          });
        }
      }
    }

    function applySessionResult(
      deviceId: string,
      sessionRes: Awaited<ReturnType<typeof getCurrentSessionAction>>,
    ) {
      if (sessionRes.success && sessionRes.data) {
        setSession({
          ...sessionRes.data,
          deviceId: sessionRes.data.deviceId ?? deviceId,
        });
        return;
      }

      setSession({
        sessionId: null,
        timestampId: null,
        deviceId,
        profileId: null,
        terminal: null,
        user: null,
      });
    }

    async function resolveInitialSession(
      sessionPromise: Promise<
        Awaited<ReturnType<typeof getCurrentSessionAction>>
      >,
    ) {
      return Promise.race([
        sessionPromise,
        new Promise<null>((resolve) => {
          window.setTimeout(() => resolve(null), INITIAL_SESSION_WAIT_MS);
        }),
      ]);
    }

    async function loadData() {
      const startedAt = performance.now();
      const deviceId = getDeviceIdentity();
      setDeviceId(deviceId);
      setNetworkStatus(navigator.onLine);

      void registerPOSServiceWorker().catch(() => {
        // Offline foreground retries still work without a service worker.
      });

      try {
        if (navigator.onLine) {
          const cachedDataShown = await hydrateOfflineFallback();

          if (cachedDataShown && !cancelled) {
            setOfflineReady(true);
            setMounted(true);
            setLoading(false);
          }

          const bootstrapPromise = fetchOfflineBootstrap(deviceId);
          const sessionPromise = getCurrentSessionAction();
          const sessionRes = await resolveInitialSession(sessionPromise);

          if (cancelled) {
            return;
          }

          if (sessionRes) {
            applySessionResult(deviceId, sessionRes);
          } else if (process.env.NODE_ENV !== "production") {
            console.info("POS terminal session restore deferred", {
              waitMs: INITIAL_SESSION_WAIT_MS,
            });
          }

          setOfflineReady(true);
          setMounted(true);
          setLoading(false);

          if (!sessionRes) {
            sessionPromise
              .then((lateSessionRes) => {
                if (!cancelled) {
                  applySessionResult(deviceId, lateSessionRes);
                }
              })
              .catch(() => undefined);
          }

          const bootstrap = await bootstrapPromise;

          if (cancelled) {
            return;
          }

          if (bootstrap.isStale && bootstrap.warning) {
            toast.warning("Using saved POS data", {
              description: bootstrap.warning,
            });
          }

          setProducts(bootstrap.metadata.products);
          setCategories(bootstrap.metadata.categories);
          setEPaymentMethods(bootstrap.metadata.epaymentMethods);
          setManagerVerifiers(bootstrap.managerVerifiers);
          setCompanyId(bootstrap.session?.companyId ?? null);

          if (bootstrap.session) {
            setSession(mapSessionSnapshotToStore(bootstrap.session));
          } else {
            setSession({
              sessionId: null,
              timestampId: null,
              deviceId,
              profileId: null,
              terminal: null,
              user: null,
            });
          }
        } else {
          await hydrateOfflineFallback();
        }
      } catch {
        await hydrateOfflineFallback();
      } finally {
        setPrinterCapabilities(printClientService.getCapabilities());
        if (!cancelled) {
          setOfflineReady(true);
          setMounted(true);
          setLoading(false);
          console.info("POS terminal bootstrap timing", {
            totalMs: Math.round(performance.now() - startedAt),
            online: navigator.onLine,
          });
        }
        void refreshQueueState(setSyncCounts);
      }
    }

    void loadData();

    const handleOnline = () => {
      setNetworkStatus(true);
      void syncNow(getDeviceIdentity());
    };

    const handleOffline = () => {
      setNetworkStatus(false);
    };

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "POSARD_SYNC_TRIGGER") {
        void syncNow(getDeviceIdentity());
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    navigator.serviceWorker?.addEventListener(
      "message",
      handleServiceWorkerMessage,
    );
    const retryTimer = window.setInterval(() => {
      if (navigator.onLine) {
        void syncNow(getDeviceIdentity());
      }
    }, 30_000);

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.clearInterval(retryTimer);
      navigator.serviceWorker?.removeEventListener(
        "message",
        handleServiceWorkerMessage,
      );
    };
  }, [
    setCategories,
    setCompanyId,
    setDeviceId,
    setEPaymentMethods,
    setManagerVerifiers,
    setNetworkStatus,
    setOfflineReady,
    setPrinterCapabilities,
    setProducts,
    setSession,
    setSyncCounts,
  ]);

  if (!mounted || loading) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-hidden bg-background">
        <div className="relative flex flex-col items-center gap-6 rounded-3xl border bg-card p-12 shadow-xl animate-in fade-in zoom-in-95 duration-500">
          <div className="relative size-20">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            <div className="absolute inset-4 flex items-center justify-center rounded-full bg-primary/10">
              <Monitor className="size-6 animate-pulse text-primary" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-bold uppercase tracking-widest text-foreground">
              Initializing
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              Loading POS Terminal...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!activeSessionId) {
    return (
      <div className="relative flex h-full min-h-0 flex-col items-center justify-center overflow-hidden p-4">
        <TerminalSelection
          onSelectTerminal={(
            id,
            name,
            vat,
            discountCapType,
            discountMax,
            allowCashierDebtCreate,
            allowCashierDebtCollect,
            requireManagerApprovalForDebt,
            pinlessModeEnabled,
            defaultDebtDueDays,
            businessMode,
            enableFulfillmentTypes,
            enableRestaurantFeatures,
            enableTableService,
            enableDeliveryDetails,
            enableProductModifiers,
            printerConfig,
          ) =>
            setSelectedTerminal({
              id,
              name,
              vat,
              discountCapType,
              discountMax,
              allowCashierDebtCreate,
              allowCashierDebtCollect,
              requireManagerApprovalForDebt,
              pinlessModeEnabled,
              defaultDebtDueDays,
              printerConfig,
              businessMode,
              enableFulfillmentTypes,
              enableRestaurantFeatures,
              enableTableService,
              enableDeliveryDetails,
              enableProductModifiers,
            })
          }
        />

        {selectedTerminal ? (
          <OpenSessionModal
            terminalId={selectedTerminal.id}
            terminalName={selectedTerminal.name}
            pinlessModeEnabled={selectedTerminal.pinlessModeEnabled}
            onSuccess={(data) => {
              setSession({
                sessionId: data.sessionId,
                timestampId: data.timestampId,
                deviceId: usePOSStore.getState().activeDeviceId,
                profileId: data.profileId,
                terminal: {
                  id: selectedTerminal.id,
                  name: selectedTerminal.name,
                  vat: selectedTerminal.vat,
                  discountCapType: selectedTerminal.discountCapType,
                  discountMax: selectedTerminal.discountMax,
                  allowCashierDebtCreate:
                    selectedTerminal.allowCashierDebtCreate,
                  allowCashierDebtCollect:
                    selectedTerminal.allowCashierDebtCollect,
                  requireManagerApprovalForDebt:
                    selectedTerminal.requireManagerApprovalForDebt,
                  pinlessModeEnabled: selectedTerminal.pinlessModeEnabled,
                  defaultDebtDueDays: selectedTerminal.defaultDebtDueDays,
                  printerConfig: selectedTerminal.printerConfig ?? null,
                  billingLocked: false,
                  billingMessage: null,
                  businessMode: selectedTerminal.businessMode ?? "RETAIL",
                  enableFulfillmentTypes:
                    selectedTerminal.enableFulfillmentTypes ?? false,
                  enableRestaurantFeatures:
                    selectedTerminal.enableRestaurantFeatures ?? false,
                  enableTableService:
                    selectedTerminal.enableTableService ?? false,
                  enableDeliveryDetails:
                    selectedTerminal.enableDeliveryDetails ?? false,
                  enableProductModifiers:
                    selectedTerminal.enableProductModifiers ?? false,
                },
                user: data.user,
              });
              setSelectedTerminal(null);
            }}
            onCancel={() => setSelectedTerminal(null)}
          />
        ) : null}
      </div>
    );
  }

  return (
    <POSLayout cart={<CartPanel />} tender={<TenderPanel />}>
      <ProductDisplay />
    </POSLayout>
  );
}
