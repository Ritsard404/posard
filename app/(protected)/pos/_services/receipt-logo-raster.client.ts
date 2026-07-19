"use client";

import { getPosardImagePublicUrl } from "@/lib/storage/image-storage";

const ESC = 0x1b;
const GS = 0x1d;
const MAX_LOGO_WIDTH_PX = 384;
const MAX_LOGO_HEIGHT_PX = 180;

function concatBytes(chunks: Uint8Array[]) {
  const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

async function loadImageBlob(value: string | null | undefined) {
  const url = getPosardImagePublicUrl(value);
  if (!url) return null;

  const response = await fetch(url, {
    cache: "force-cache",
    mode: "cors",
  });

  if (!response.ok) {
    throw new Error("Receipt logo could not be loaded for printing.");
  }

  return response.blob();
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Receipt logo could not be prepared for printing."));
    reader.readAsDataURL(blob);
  });
}

async function decodeLogo(blob: Blob) {
  if ("createImageBitmap" in window) {
    return createImageBitmap(blob);
  }

  const dataUrl = await blobToDataUrl(blob);

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Receipt logo could not be decoded for printing."));
    image.src = dataUrl;
  });
}

function drawLogoToCanvas(image: CanvasImageSource) {
  const sourceWidth =
    "naturalWidth" in image ? image.naturalWidth : "width" in image ? Number(image.width) : 0;
  const sourceHeight =
    "naturalHeight" in image ? image.naturalHeight : "height" in image ? Number(image.height) : 0;

  if (!sourceWidth || !sourceHeight) {
    throw new Error("Receipt logo has invalid dimensions.");
  }

  const scale = Math.min(
    1,
    MAX_LOGO_WIDTH_PX / sourceWidth,
    MAX_LOGO_HEIGHT_PX / sourceHeight,
  );
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const rasterWidth = Math.ceil(width / 8) * 8;
  const canvas = document.createElement("canvas");
  canvas.width = rasterWidth;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("Receipt logo could not be rasterized.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, rasterWidth, height);
  context.drawImage(image, Math.floor((rasterWidth - width) / 2), 0, width, height);

  return { canvas, context, width: rasterWidth, height };
}

function canvasToMonochromeRaster(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const imageData = context.getImageData(0, 0, width, height).data;
  const widthBytes = width / 8;
  const raster = new Uint8Array(widthBytes * height);

  for (let y = 0; y < height; y += 1) {
    for (let xByte = 0; xByte < widthBytes; xByte += 1) {
      let value = 0;

      for (let bit = 0; bit < 8; bit += 1) {
        const x = xByte * 8 + bit;
        const offset = (y * width + x) * 4;
        const alpha = imageData[offset + 3] / 255;
        const red = imageData[offset];
        const green = imageData[offset + 1];
        const blue = imageData[offset + 2];
        const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) * alpha + 255 * (1 - alpha);

        if (luminance < 172) {
          value |= 0x80 >> bit;
        }
      }

      raster[y * widthBytes + xByte] = value;
    }
  }

  return { raster, widthBytes, height };
}

export async function buildReceiptLogoEscPosRaster(
  value: string | null | undefined,
): Promise<Uint8Array | null> {
  const blob = await loadImageBlob(value);
  if (!blob) return null;

  const image = await decodeLogo(blob);
  const { context, width, height } = drawLogoToCanvas(image);
  const { raster, widthBytes } = canvasToMonochromeRaster(context, width, height);
  const yL = height & 0xff;
  const yH = (height >> 8) & 0xff;
  const xL = widthBytes & 0xff;
  const xH = (widthBytes >> 8) & 0xff;

  return concatBytes([
    new Uint8Array([ESC, 0x40, ESC, 0x61, 0x01]),
    new Uint8Array([GS, 0x76, 0x30, 0x00, xL, xH, yL, yH]),
    raster,
    new Uint8Array([0x0a, ESC, 0x61, 0x00]),
  ]);
}

export async function getReceiptLogoBase64Png(
  value: string | null | undefined,
): Promise<string | null> {
  const blob = await loadImageBlob(value);
  if (!blob) return null;

  const image = await decodeLogo(blob);
  const { canvas } = drawLogoToCanvas(image);
  const outputBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((nextBlob) => {
      if (!nextBlob) {
        reject(new Error("Receipt logo could not be prepared for native printing."));
        return;
      }

      resolve(nextBlob);
    }, "image/png");
  });
  const dataUrl = await blobToDataUrl(outputBlob);

  return dataUrl.replace(/^data:image\/png;base64,/, "");
}

export function concatPrinterBytes(chunks: Uint8Array[]) {
  return concatBytes(chunks);
}
