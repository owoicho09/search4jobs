import { NextResponse } from "next/server";

import { requireAuthUserForApi, UnauthorizedError } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const user = await requireAuthUserForApi();
    const supabase = await createSupabaseServerClient();

    const { data: cv } = await supabase
      .from("cv_files")
      .select("storage_path, file_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!cv) {
      return NextResponse.json({ error: "No CV on file." }, { status: 404 });
    }

    const { data: signed, error } = await supabase.storage
      .from("cvs")
      .createSignedUrl(cv.storage_path, 60, { download: cv.file_name });

    if (error || !signed) {
      return NextResponse.json({ error: "Could not generate a download link." }, { status: 500 });
    }

    return NextResponse.redirect(signed.signedUrl);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }
}
