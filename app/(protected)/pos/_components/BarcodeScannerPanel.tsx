"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Camera,
  Keyboard,
  Loader2,
  ScanBarcode,
  Search,
  X,
} from "lucide-react";
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
import { usePOSStore, type Product } from "../_store/pos-store";

type ScannerMode = "camera" | "manual";

interface BarcodeDetectorResult {
  rawValue: string;
}

interface BarcodeDetectorInstance {
  detect: (source: HTMLVideoElement) => Promise<BarcodeDetectorResult[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
}

function getBarcodeDetector(): BarcodeDetectorConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
      .BarcodeDetector ?? null
  );
}

function normalizeBarcode(value: string): string {
  return value.trim();
}

function findProductByBarcode(
  products: Product[],
  barcode: string,
): Product | null {
  const normalizedBarcode = normalizeBarcode(barcode).toLowerCase();

  if (!normalizedBarcode) {
    return null;
  }

  return (
    products.find((product) => {
      const productBarcode = product.barcode?.trim().toLowerCase();
      const productName = product.name.trim().toLowerCase();
      return (
        productBarcode === normalizedBarcode ||
        productName === normalizedBarcode
      );
    }) ?? null
  );
}

interface BarcodeScannerPanelProps {
  className?: string;
}

export function BarcodeScannerPanel({ className }: BarcodeScannerPanelProps) {
  const isMobile = useIsMobile();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const manualInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastScannedRef = useRef<{ value: string; at: number } | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<ScannerMode>("camera");
  const [manualValue, setManualValue] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [cameraRetryKey, setCameraRetryKey] = useState(0);
  const products = usePOSStore((state) => state.products);
  const addToCart = usePOSStore((state) => state.addToCart);

  const addBarcodeToCart = useCallback(
    (rawBarcode: string) => {
      const normalizedBarcode = normalizeBarcode(rawBarcode);

      if (!normalizedBarcode) {
        toast.error("Enter or scan a barcode first.");
        return false;
      }

      const product = findProductByBarcode(products, normalizedBarcode);

      if (!product) {
        toast.error("Barcode not found.", {
          description: `No product matches ${normalizedBarcode}.`,
        });
        return false;
      }

      const result = addToCart(product);

      if (!result.success) {
        toast.error(
          result.reason === "OUT_OF_STOCK"
            ? "Product is out of stock."
            : "Stock limit reached.",
          {
            description: `${product.name} was not added to the cart.`,
          },
        );
        return false;
      }

      toast.success("Product added to cart.", {
        description: product.name,
      });
      return true;
    },
    [addToCart, products],
  );

  const stopCamera = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const scanVideoFrame = useCallback(
    async (detector: BarcodeDetectorInstance) => {
      const video = videoRef.current;

      if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        frameRef.current = requestAnimationFrame(() => {
          void scanVideoFrame(detector);
        });
        return;
      }

      try {
        const barcodes = await detector.detect(video);
        const value = barcodes[0]?.rawValue;

        if (value) {
          const now = Date.now();
          const last = lastScannedRef.current;
          const isRepeatedScan = last?.value === value && now - last.at < 1500;

          if (!isRepeatedScan) {
            lastScannedRef.current = { value, at: now };
            addBarcodeToCart(value);
          }
        }
      } catch {
        setCameraError("Unable to read barcode from the camera.");
      }

      frameRef.current = requestAnimationFrame(() => {
        void scanVideoFrame(detector);
      });
    },
    [addBarcodeToCart],
  );

  useEffect(() => {
    if (!scannerOpen || scannerMode !== "camera") {
      stopCamera();
      return;
    }

    const BarcodeDetector = getBarcodeDetector();

    if (!BarcodeDetector) {
      setCameraError(
        "Camera barcode scanning is not supported on this browser.",
      );
      return;
    }

    const BarcodeDetectorCtor = BarcodeDetector;
    let isActive = true;

    async function startCamera() {
      try {
        setCameraError(null);
        setIsCameraStarting(true);
        stopCamera();

        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera access is not available on this device.");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
          },
          audio: false,
        });

        if (!isActive) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const detector = new BarcodeDetectorCtor({
          formats: [
            "ean_13",
            "ean_8",
            "upc_a",
            "upc_e",
            "code_128",
            "code_39",
            "itf",
            "qr_code",
          ],
        });

        void scanVideoFrame(detector);
      } catch {
        setCameraError("Unable to access camera");
      } finally {
        if (isActive) {
          setIsCameraStarting(false);
        }
      }
    }

    void startCamera();

    return () => {
      isActive = false;
      stopCamera();
    };
  }, [cameraRetryKey, scannerMode, scannerOpen, scanVideoFrame, stopCamera]);

  useEffect(() => {
    if (scannerOpen && scannerMode === "manual") {
      window.setTimeout(() => manualInputRef.current?.focus(), 100);
    }
  }, [scannerMode, scannerOpen]);

  function handleManualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (addBarcodeToCart(manualValue)) {
      setManualValue("");
      window.setTimeout(() => manualInputRef.current?.focus(), 50);
    }
  }

  function openScanner(mode: ScannerMode) {
    setScannerMode(mode);
    setScannerOpen(true);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn(
          "h-11 shrink-0 rounded-xl border-primary/25 bg-primary/5 px-4 font-bold text-primary hover:bg-primary/10",
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
          className={cn(
            "max-h-[calc(100dvh-2rem)] max-w-[min(42rem,calc(100vw-2rem))] gap-0 overflow-hidden rounded-2xl border-0 p-0 shadow-2xl sm:rounded-3xl",
            scannerMode === "camera"
              ? "w-[min(42rem,calc(100vw-2rem))]"
              : "w-[min(36rem,calc(100vw-2rem))]",
          )}
        >
          <DialogHeader className="shrink-0 border-b bg-background px-6 py-5 text-center">
            <div className="relative flex h-10 items-center justify-center">
              <DialogTitle className="text-center text-xl font-black tracking-tight sm:text-2xl">
                Scan Barcode
              </DialogTitle>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 size-10 rounded-full bg-muted/70"
                >
                  <X className="size-5" />
                  <span className="sr-only">Close scanner</span>
                </Button>
              </DialogClose>
            </div>
            <DialogDescription className="sr-only">
              Scan a barcode by camera or enter it manually.
            </DialogDescription>
            <div className="mt-4 grid grid-cols-2 rounded-2xl bg-muted p-1.5">
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  "h-11 rounded-xl text-sm font-semibold sm:h-12 sm:text-base",
                  scannerMode === "camera" && "bg-background shadow-sm",
                )}
                onClick={() => setScannerMode("camera")}
              >
                <Camera className="size-5" />
                Camera
              </Button>
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  "h-11 rounded-xl text-sm font-semibold sm:h-12 sm:text-base",
                  scannerMode === "manual" && "bg-background shadow-sm",
                )}
                onClick={() => setScannerMode("manual")}
              >
                <Keyboard className="size-5" />
                Manual
              </Button>
            </div>
          </DialogHeader>

          {scannerMode === "camera" ? (
            <div className="flex flex-col bg-background">
              <div className="relative flex h-[min(22rem,48dvh)] min-h-[16rem] items-center justify-center overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  className={cn(
                    "h-full w-full object-cover",
                    cameraError && "hidden",
                  )}
                  muted
                  playsInline
                />

                {isCameraStarting && !cameraError ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black">
                    <div className="flex flex-col items-center gap-3 text-white">
                      <Loader2 className="size-8 animate-spin" />
                      <span className="text-sm font-semibold">
                        Starting camera...
                      </span>
                    </div>
                  </div>
                ) : null}

                {cameraError ? (
                  <div
                    className="flex flex-col items-center gap-7 text-center text-white"
                    role="alert"
                  >
                    <div className="flex size-24 items-center justify-center rounded-full bg-destructive/25 text-red-300">
                      <AlertCircle className="size-12" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xl font-semibold">{cameraError}</p>
                      <p className="max-w-xs text-sm text-white/70">
                        Allow camera access, then try again. You can still use
                        manual barcode mode below.
                      </p>
                    </div>
                    <Button
                      type="button"
                      className="h-14 rounded-full bg-white px-10 text-base font-bold text-black hover:bg-white/90"
                      onClick={() =>
                        setCameraRetryKey((current) => current + 1)
                      }
                    >
                      Try Again
                    </Button>
                  </div>
                ) : (
                  <div className="pointer-events-none absolute inset-x-10 top-1/2 h-28 -translate-y-1/2 rounded-2xl border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.25)]" />
                )}
              </div>

              <form
                className="grid shrink-0 grid-cols-[minmax(0,1fr)_5rem] gap-3 border-t bg-background p-4"
                onSubmit={handleManualSubmit}
              >
                <Input
                  ref={manualInputRef}
                  value={manualValue}
                  onChange={(event) => setManualValue(event.target.value)}
                  placeholder="Enter barcode manually..."
                  autoComplete="off"
                  inputMode="search"
                  className="h-16 rounded-2xl border-muted bg-background text-lg"
                />
                <Button
                  type="submit"
                  className="h-16 rounded-2xl bg-red-300 text-white hover:bg-red-400"
                >
                  <Search className="size-7" />
                  <span className="sr-only">Search barcode</span>
                </Button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col gap-3 overflow-y-auto bg-background p-6">
              <form
                className="grid grid-cols-[minmax(0,1fr)_4rem] gap-3 sm:grid-cols-[minmax(0,1fr)_4.5rem]"
                onSubmit={handleManualSubmit}
              >
                <Input
                  ref={manualInputRef}
                  value={manualValue}
                  onChange={(event) => setManualValue(event.target.value)}
                  placeholder="Enter barcode or product name..."
                  autoComplete="off"
                  inputMode="search"
                  className="h-14 rounded-2xl border-red-300 text-base focus-visible:ring-red-300 sm:h-16 sm:text-lg"
                />
                <Button
                  type="submit"
                  className="h-14 rounded-2xl bg-red-300 text-white hover:bg-red-400 sm:h-16"
                >
                  <Search className="size-6" />
                  <span className="sr-only">Search barcode</span>
                </Button>
              </form>

              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-2xl text-base font-semibold"
                onClick={() => {
                  setManualValue("");
                  manualInputRef.current?.focus();
                }}
              >
                Clear & Focus
              </Button>

              <div className="rounded-2xl bg-muted p-4">
                <p className="text-sm font-semibold">Tips</p>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="text-red-400">•</span>
                    Enter full barcode or exact product name
                  </li>
                  <li className="flex gap-3">
                    <span className="text-red-400">•</span>
                    Press Enter to search quickly
                  </li>
                  <li className="flex gap-3">
                    <span className="text-red-400">•</span>
                    Scanner stays open for continuous scanning
                  </li>
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
