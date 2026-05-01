"use client";

import { useEffect, useState } from "react";
import { Monitor } from "lucide-react";
import { fetchPOSMetaDataAction } from "../_actions/pos.action";
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

async function refreshQueueState(setSyncCounts: ReturnType<typeof usePOSStore.getState>["setSyncCounts"]) {
  const queue = await getOfflineQueueSnapshot();
  setSyncCounts({
    pendingSyncCount: queue.pendingCount,
    syncingCount: queue.syncingCount,
    needsReviewCount: queue.needsReviewCount,
  });
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
    defaultDebtDueDays: number | null;
    printerConfig?: PrinterConfigDto | null;
    billingLocked?: boolean;
    billingMessage?: string | null;
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
      const [catalog, sessionSnapshot, managerVerifiers] = await Promise.all([
        getOfflineCatalogSnapshot(),
        getOfflineSessionSnapshot(),
        getOfflineManagerVerifiers(),
      ]);

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
        setSession({
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
              allowCashierDebtCreate: false,
              allowCashierDebtCollect: false,
                requireManagerApprovalForDebt: false,
                defaultDebtDueDays: null,
                printerConfig: sessionSnapshot.printerConfig,
                billingLocked: sessionSnapshot.billingLocked,
                billingMessage: sessionSnapshot.billingMessage,
              },
          user: {
            name: sessionSnapshot.cashierName,
            role: "cashier",
          },
        });
      }
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
            .offlineReceipts.filter((receipt) => receipt.localId === result.localId)
            .forEach((receipt) => {
              usePOSStore
                .getState()
                .updateOfflineReceiptStatus(receipt.receiptId, result.syncStatus);
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
              syncedCount > 0 ? `Synced ${syncedCount} queued action(s).` : "Queue is up to date.",
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
              error instanceof Error ? error.message : "Unable to sync queued actions.",
          });
        }
      }
    }

    async function loadData() {
      const deviceId = getDeviceIdentity();
      setDeviceId(deviceId);
      setNetworkStatus(navigator.onLine);

      try {
        await registerPOSServiceWorker();
      } catch {
        // Offline foreground retries still work without a service worker.
      }

      try {
        if (navigator.onLine) {
          const [metaRes, sessionRes, bootstrap] = await Promise.all([
            fetchPOSMetaDataAction(),
            getCurrentSessionAction(),
            fetchOfflineBootstrap(deviceId),
          ]);

          if (cancelled) {
            return;
          }

          setProducts(bootstrap.metadata.products);
          setCategories(bootstrap.metadata.categories);
          setEPaymentMethods(bootstrap.metadata.epaymentMethods);
          setManagerVerifiers(bootstrap.managerVerifiers);
          setCompanyId(bootstrap.session?.companyId ?? null);

          if (sessionRes.success && sessionRes.data) {
            setSession({
              ...sessionRes.data,
              deviceId: sessionRes.data.deviceId ?? deviceId,
            });
          } else if (bootstrap.session) {
              setSession({
                sessionId: bootstrap.session.timestampId,
                timestampId: bootstrap.session.timestampId,
                deviceId: bootstrap.session.deviceId,
                profileId: bootstrap.session.cashierId,
                terminal: {
                id: bootstrap.session.terminalId,
                name: bootstrap.session.terminalName,
                vat: bootstrap.session.terminalVat,
                discountCapType: bootstrap.session.discountCapType,
                discountMax: bootstrap.session.discountMax,
                allowCashierDebtCreate: false,
                allowCashierDebtCollect: false,
                requireManagerApprovalForDebt: false,
                defaultDebtDueDays: null,
                printerConfig: bootstrap.session.printerConfig,
                billingLocked: bootstrap.session.billingLocked,
                billingMessage: bootstrap.session.billingMessage,
              },
              user: {
                name: bootstrap.session.cashierName,
                role: "cashier",
              },
            });
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

          if (metaRes.success && bootstrap.metadata.products.length === 0) {
            setProducts(metaRes.data.products);
            setCategories(metaRes.data.categories);
            setEPaymentMethods(metaRes.data.epaymentMethods);
          }
        } else {
          await hydrateOfflineFallback();
        }
      } catch {
        await hydrateOfflineFallback();
      } finally {
        setPrinterCapabilities(printClientService.getCapabilities());
        await refreshQueueState(setSyncCounts);
        if (!cancelled) {
          setOfflineReady(true);
          setMounted(true);
          setLoading(false);
        }
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
    navigator.serviceWorker?.addEventListener("message", handleServiceWorkerMessage);

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
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
            defaultDebtDueDays,
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
              defaultDebtDueDays,
              printerConfig,
            })
          }
        />

        {selectedTerminal ? (
          <OpenSessionModal
            terminalId={selectedTerminal.id}
            terminalName={selectedTerminal.name}
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
                  allowCashierDebtCreate: selectedTerminal.allowCashierDebtCreate,
                  allowCashierDebtCollect: selectedTerminal.allowCashierDebtCollect,
                  requireManagerApprovalForDebt:
                    selectedTerminal.requireManagerApprovalForDebt,
                  defaultDebtDueDays: selectedTerminal.defaultDebtDueDays,
                  printerConfig: selectedTerminal.printerConfig ?? null,
                  billingLocked: false,
                  billingMessage: null,
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
