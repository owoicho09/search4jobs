"use server";

import { revalidatePath } from "next/cache";

import { requireAuthUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface CvFormState {
  error?: string;
  success?: boolean;
}

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
}

export async function uploadCvAction(_prevState: CvFormState, formData: FormData): Promise<CvFormState> {
  const user = await requireAuthUser();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { error: "Only PDF and Word documents (.pdf, .doc, .docx) are supported." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { error: "File is too large — the limit is 10 MB." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("cv_files")
    .select("storage_path")
    .eq("user_id", user.id)
    .maybeSingle();

  const path = `${user.id}/${Date.now()}-${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage.from("cvs").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    return { error: "Upload failed. Please try again." };
  }

  const { error: dbError } = await supabase.from("cv_files").upsert(
    {
      user_id: user.id,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      status: "ready",
    },
    { onConflict: "user_id" }
  );

  if (dbError) {
    await supabase.storage.from("cvs").remove([path]);
    return { error: "Could not save the upload. Please try again." };
  }

  if (existing?.storage_path && existing.storage_path !== path) {
    await supabase.storage.from("cvs").remove([existing.storage_path]);
  }

  revalidatePath("/dashboard/cv");
  return { success: true };
}

export async function removeCvAction(): Promise<CvFormState> {
  const user = await requireAuthUser();
  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("cv_files")
    .select("storage_path")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) return { success: true };

  await supabase.storage.from("cvs").remove([existing.storage_path]);
  await supabase.from("cv_files").delete().eq("user_id", user.id);

  revalidatePath("/dashboard/cv");
  return { success: true };
}
