"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/current-user";
import {
  buildPosardImagePath,
  isPosardStoragePath,
  POSARD_IMAGE_BUCKET,
  type PosardImageKind,
} from "@/lib/storage/image-storage";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_OPTIMIZED_IMAGE_SIZE_BYTES = 950 * 1024;

type ImageActionResult =
  | { success: true; path: string }
  | { success: false; error: string };

export async function uploadPosardImageAction(formData: FormData): Promise<ImageActionResult> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return { success: false, error: "You must be signed in to upload images." };
    }

    const file = formData.get("file");
    const kind = formData.get("kind");
    const ownerId = formData.get("ownerId");

    if (!(file instanceof File)) {
      return { success: false, error: "Select an image to upload." };
    }

    if (kind !== "product" && kind !== "company-logo" && kind !== "donation") {
      return { success: false, error: "Image upload type is invalid." };
    }

    if (kind === "donation" && profile.role !== "admin") {
      return { success: false, error: "Only admins can upload donation images." };
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return { success: false, error: "Upload a JPG, PNG, or WEBP image." };
    }

    if (file.size > MAX_OPTIMIZED_IMAGE_SIZE_BYTES) {
      return { success: false, error: "Optimized image must be smaller than 1 MB." };
    }

    const path = buildPosardImagePath({
      kind: kind as PosardImageKind,
      companyId: profile.companyId,
      ownerId: typeof ownerId === "string" ? ownerId : null,
      fileName: file.name,
      extension: file.type === "image/png" ? "png" : "webp",
    });

    const supabase = createAdminClient();
    const { error } = await supabase.storage.from(POSARD_IMAGE_BUCKET).upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      console.error(error);
      return { success: false, error: "Image upload failed. Please try again." };
    }

    return { success: true, path };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Image upload failed. Please try again." };
  }
}

export async function deletePosardImageAction(path: string | null | undefined): Promise<void> {
  if (!isPosardStoragePath(path)) {
    return;
  }

  try {
    const profile = await getCurrentProfile();
    if (!profile) return;

    const supabase = createAdminClient();
    const { error } = await supabase.storage.from(POSARD_IMAGE_BUCKET).remove([path]);
    if (error) {
      console.error(error);
    }
  } catch (error) {
    console.error(error);
  }
}
