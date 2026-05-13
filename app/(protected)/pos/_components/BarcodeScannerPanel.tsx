"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Camera, Keyboard, Loader2, ScanBarcode, Search, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

import { usePOSStore } from "../_store/pos-store";
import { cameraScanService } from "@/lib/scanning/camera-scan.client";
import { deviceCapabilityService } from "@/lib/scanning/device-capability.service";
import {
  scannerStateService,
  type ScannerLifecycleState,
} from "@/lib/scanning/scanner-state.service";
import { findProductByScanValue, normalizeScanValue } from "../_services/scan-product.service";
import type { DeviceCapabilityDto } from "@/lib/scanning/scan.dto";

type ScannerMode = "camera" | "manual";

interface BarcodeScannerPanelProps {
  className?: string;
}

export function BarcodeScannerPanel({ className }: BarcodeScannerPanelProps) {
  const isMobile = useIsMobile();
  const manualInputRef = useRef<HTMLInputElement | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<ScannerMode>("camera");
  const [manualValue, setManualValue] = useState("");
  const [capabilities, setCapabilities] = useState<DeviceCapabilityDto | null>(null);
  const [cameraStatus, setCameraStatus] = useState<ScannerLifecycleState>("off");
  const [cameraMessage, setCameraMessage] = useState<string | null>(null);
  const products = usePOSStore((state) => state.products);
  const addToCart = usePOSStore((state) => state.addToCart);

  const addScanToCart = useCallback(
    (rawValue: string) => {
      const value = normalizeScanValue(rawValue);

      if (!value) {
        toast.error("Enter or scan a barcode first.");
        return false;
      }

      const product = findProductByScanValue(products, value);

      if (!product) {
        toast.error("Barcode not found.", {
          description: `No product matches ${value}.`,
        });
        return false;
      }

      const result = addToCart(product);

      if (!result.success) {
        toast.error(
          result.reason === "OUT_OF_STOCK" ? "Product is out of stock." : "Open the product to configure it first.",
          { description: `${product.name} was not added to the cart.` },
        );
        return false;
      }

      if (result.warning === "NEGATIVE_STOCK") {
        toast.warning("Inventory will go negative.", {
          description: `${product.name} was added to the cart.`,
        });
        return true;
      }

      toast.success("Product added to cart.", {
        description: product.name,
      });
      return true;
    },
    [addToCart, products],
  );

  async function refreshCapabilities() {
    setCameraStatus("checking");
    const nextCapabilities = await deviceCapabilityService.getCapabilities();
    setCapabilities(nextCapabilities);
    if (nextCapabilities.cameraBarcode.supported === false) {
      setCameraStatus("unsupported");
    } else if (
      nextCapabilities.cameraBarcode.permission === "denied" ||
      nextCapabilities.cameraBarcode.permission === "blocked"
    ) {
      setCameraStatus("denied");
    } else {
      setCameraStatus("ready");
    }
    setCameraMessage(null);
  }

  useEffect(() => {
    if (!scannerOpen) {
      setCameraStatus("off");
      setCameraMessage(null);
      setManualValue("");
      return;
    }

    void refreshCapabilities();
  }, [scannerOpen]);

  useEffect(() => {
    if (scannerOpen && scannerMode === "manual") {
      window.setTimeout(() => manualInputRef.current?.focus(), 100);
    }
  }, [scannerMode, scannerOpen]);

  async function handleCameraScan() {
    setCameraStatus("active");
    setCameraMessage(null);

    try {
      const result = await cameraScanService.scanBarcode();
      const added = addScanToCart(result.value);

      if (added && !isMobile) {
        setScannerOpen(false);
      }
    } catch {
      setCameraStatus("error");
      setCameraMessage("Camera scanning was cancelled, denied, or is unavailable on this device.");
      return;
    }

    void refreshCapabilities();
  }

  function handleManualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (addScanToCart(manualValue)) {
      setManualValue("");
      window.setTimeout(() => manualInputRef.current?.focus(), 50);
    }
  }

  function openScanner(mode: ScannerMode) {
    setScannerMode(mode);
    setScannerOpen(true);
  }

  const cameraCapability = capabilities?.cameraBarcode;
  const cameraUnsupported = cameraCapability?.supported === false;
  const cameraDenied =
    cameraCapability?.permission === "denied" || cameraCapability?.permission === "blocked";

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn(
          "h-11 min-w-0 rounded-xl border-primary/25 bg-primary/5 px-4 font-bold text-primary hover:bg-primary/10",
          className,
        )}
        onClick={() => openScanner(isMobile ? "camera" : "manual")}
      >
        <ScanBarcode className="size-4" />
        Barcode Scan
      </Button>

      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-h-[calc(100dvh-2rem)] w-[min(38rem,calc(100vw-2rem))] gap-0 overflow-hidden rounded-2xl border-0 p-0 shadow-2xl sm:rounded-3xl"
        >
          <DialogHeader className="shrink-0 border-b bg-background px-6 py-5 text-center">
            <div className="relative flex h-10 items-center justify-center">
              <DialogTitle className="text-center text-xl font-black tracking-tight sm:text-2xl">
                Scan Barcode
              </DialogTitle>
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="icon" className="absolute right-0 size-10 rounded-full bg-muted/70">
                  <X className="size-5" />
                  <span className="sr-only">Close scanner</span>
                </Button>
              </DialogClose>
            </div>
            <DialogDescription className="sr-only">
              Scan by camera, hardware scanner, or manual barcode entry.
            </DialogDescription>
            <div className="mt-4 grid grid-cols-2 rounded-2xl bg-muted p-1.5">
              <Button
                type="button"
                variant="ghost"
                className={cn("h-11 rounded-xl text-sm font-semibold", scannerMode === "camera" && "bg-background shadow-sm")}
                onClick={() => setScannerMode("camera")}
              >
                <Camera className="size-5" />
                Camera
              </Button>
              <Button
                type="button"
                variant="ghost"
                className={cn("h-11 rounded-xl text-sm font-semibold", scannerMode === "manual" && "bg-background shadow-sm")}
                onClick={() => setScannerMode("manual")}
              >
                <Keyboard className="size-5" />
                Manual
              </Button>
            </div>
          </DialogHeader>

          {scannerMode === "camera" ? (
            <div className="space-y-4 overflow-y-auto bg-background p-5">
              <div className="rounded-2xl border bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-background">
                    {cameraStatus === "checking" || cameraStatus === "active" ? (
                      <Loader2 className="size-5 animate-spin text-primary" />
                    ) : cameraUnsupported || cameraDenied || cameraStatus === "error" || cameraStatus === "unsupported" || cameraStatus === "denied" ? (
                      <AlertCircle className="size-5 text-destructive" />
                    ) : (
                      <Camera className="size-5 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      {scannerStateService.getLabel(cameraStatus)}
                    </p>
                    <p className="text-sm font-bold">
                      {cameraStatus === "active"
                        ? "Camera scan active"
                        : cameraStatus === "off"
                          ? "Scanner off"
                          : cameraUnsupported || cameraStatus === "unsupported"
                          ? "Camera scanning unsupported"
                          : cameraDenied || cameraStatus === "denied"
                            ? "Camera permission denied"
                            : "Camera scanner ready"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {cameraMessage ??
                        cameraCapability?.reason ??
                        "Camera permission is requested only when you start scanning."}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                className="h-14 w-full rounded-2xl text-base font-bold"
                disabled={cameraStatus === "checking" || cameraStatus === "active" || cameraUnsupported || cameraStatus === "unsupported"}
                onClick={() => void handleCameraScan()}
              >
                {cameraStatus === "active" ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
                {cameraStatus === "active" ? "Scanning..." : "Start Camera Scan"}
              </Button>

              <form className="grid grid-cols-[minmax(0,1fr)_4rem] gap-3" onSubmit={handleManualSubmit}>
                <Input
                  ref={manualInputRef}
                  value={manualValue}
                  onChange={(event) => setManualValue(event.target.value)}
                  placeholder="Fallback barcode entry..."
                  autoComplete="off"
                  inputMode="search"
                  className="h-14 rounded-2xl text-base"
                />
                <Button type="submit" variant="outline" className="h-14 rounded-2xl">
                  <Search className="size-5" />
                  <span className="sr-only">Search barcode</span>
                </Button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col gap-3 overflow-y-auto bg-background p-6">
              <form className="grid grid-cols-[minmax(0,1fr)_4rem] gap-3" onSubmit={handleManualSubmit}>
                <Input
                  ref={manualInputRef}
                  value={manualValue}
                  onChange={(event) => setManualValue(event.target.value)}
                  placeholder="Enter barcode or exact product name..."
                  autoComplete="off"
                  inputMode="search"
                  className="h-14 rounded-2xl text-base sm:h-16 sm:text-lg"
                />
                <Button type="submit" className="h-14 rounded-2xl sm:h-16">
                  <Search className="size-6" />
                  <span className="sr-only">Search barcode</span>
                </Button>
              </form>

              <div className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
                Hardware scanner input is controlled by the POS scanner toggle. This manual form only submits when you press search.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
