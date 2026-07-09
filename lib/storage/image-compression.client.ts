"use client";

export type ImageUploadPurpose = "product" | "company-logo" | "donation";

export interface CompressedImageResult {
  file: File;
  width: number;
  height: number;
}

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
const MAX_OPTIMIZED_IMAGE_SIZE_BYTES = 950 * 1024;

const TARGETS: Record<ImageUploadPurpose, { maxDimension: number; quality: number }> = {
  product: { maxDimension: 1200, quality: 0.82 },
  "company-logo": { maxDimension: 1000, quality: 0.88 },
  donation: { maxDimension: 1200, quality: 0.9 },
};

const RETRY_STEPS = [
  { dimensionScale: 1, qualityOffset: 0 },
  { dimensionScale: 0.9, qualityOffset: -0.08 },
  { dimensionScale: 0.8, qualityOffset: -0.14 },
  { dimensionScale: 0.7, qualityOffset: -0.2 },
] as const;

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return "Upload a JPG, PNG, or WEBP image.";
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return "Image must be 8 MB or smaller.";
  }

  return null;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The selected image could not be read."));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("The selected image could not be optimized."));
          return;
        }

        resolve(blob);
      },
      type,
      quality,
    );
  });
}

export async function compressImageFile(
  file: File,
  purpose: ImageUploadPurpose,
): Promise<CompressedImageResult> {
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const image = await loadImage(file);
  const target = TARGETS[purpose];
  const outputType = "image/webp";
  let bestResult: { blob: Blob; width: number; height: number } | null = null;

  for (const step of RETRY_STEPS) {
    const maxDimension = Math.round(target.maxDimension * step.dimensionScale);
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("The selected image could not be optimized.");
    }

    context.drawImage(image, 0, 0, width, height);
    const quality = Math.max(0.62, target.quality + step.qualityOffset);
    const blob = await canvasToBlob(canvas, outputType, quality);
    bestResult = { blob, width, height };

    if (blob.size <= MAX_OPTIMIZED_IMAGE_SIZE_BYTES) {
      break;
    }
  }

  if (!bestResult || bestResult.blob.size > MAX_OPTIMIZED_IMAGE_SIZE_BYTES) {
    throw new Error("Image could not be optimized below 1 MB. Try a smaller or less detailed image.");
  }

  return {
    file: new File([bestResult.blob], file.name.replace(/\.[^/.]+$/, ".webp"), { type: outputType }),
    width: bestResult.width,
    height: bestResult.height,
  };
}
