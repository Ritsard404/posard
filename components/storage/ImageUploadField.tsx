"use client";

import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StorageImage } from "@/components/storage/StorageImage";
import { compressImageFile, type ImageUploadPurpose } from "@/lib/storage/image-compression.client";
import { uploadPosardImageAction } from "@/lib/storage/image-storage.actions";
import { cn } from "@/lib/utils";

interface ImageUploadFieldProps {
  id: string;
  label: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  purpose: ImageUploadPurpose;
  ownerId?: string | null;
  disabled?: boolean;
  error?: string;
  description?: string;
  previewClassName?: string;
}

export function ImageUploadField({
  id,
  label,
  value,
  onChange,
  purpose,
  ownerId,
  disabled,
  error,
  description,
  previewClassName,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const currentError = error || localError;
  const uploadLabel = useMemo(
    () => (value ? "Replace Image" : "Upload Image"),
    [value],
  );

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setLocalError(null);
    setIsUploading(true);

    try {
      const optimized = await compressImageFile(file, purpose);
      const formData = new FormData();
      formData.set("kind", purpose);
      if (ownerId) {
        formData.set("ownerId", ownerId);
      }
      formData.set("file", optimized.file);

      const result = await uploadPosardImageAction(formData);

      if (!result.success) {
        setLocalError(result.error);
        return;
      }

      onChange(result.path);
    } catch (uploadError) {
      setLocalError(
        uploadError instanceof Error
          ? uploadError.message
          : "Image upload failed. Please try again.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div
          className={cn(
            "relative flex aspect-[4/3] w-full max-w-44 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-muted/20",
            previewClassName,
          )}
        >
          <StorageImage
            src={value}
            alt={label}
            fill
            sizes="176px"
            className="object-cover"
            fallback={<ImageIcon className="size-8 text-muted-foreground/40" />}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={disabled || isUploading}
            onChange={handleFileChange}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={disabled || isUploading}
              onClick={() => inputRef.current?.click()}
              className="w-full sm:w-auto"
            >
              {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {isUploading ? "Uploading..." : uploadLabel}
            </Button>
            {value ? (
              <Button
                type="button"
                variant="outline"
                disabled={disabled || isUploading}
                onClick={() => {
                  setLocalError(null);
                  onChange(null);
                }}
                className="w-full text-destructive hover:text-destructive sm:w-auto"
              >
                <Trash2 className="size-4" />
                Remove
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {description ?? "JPG, PNG, or WEBP. Images are optimized before upload."}
          </p>
          {currentError ? <p className="text-xs text-destructive">{currentError}</p> : null}
        </div>
      </div>
    </div>
  );
}
