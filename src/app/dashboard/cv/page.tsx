import { Card, CardHeading } from "@/components/ui/card";
import { requireAuthUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CvManager } from "@/app/dashboard/cv/cv-manager";

export default async function CvPage() {
  const user = await requireAuthUser();
  const supabase = await createSupabaseServerClient();

  const { data: cv } = await supabase
    .from("cv_files")
    .select("file_name, status, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">CV management</h1>
      <Card>
        <CardHeading>Your CV</CardHeading>
        <div className="mt-4">
          <CvManager
            cv={cv ? { fileName: cv.file_name, status: cv.status, uploadedAt: cv.created_at } : null}
          />
        </div>
      </Card>
    </div>
  );
}
