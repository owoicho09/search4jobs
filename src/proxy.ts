import type { NextRequest } from "next/server";

import { updateSupabaseSession } from "@/lib/supabase/proxy";

export function proxy(request: NextRequest) {
  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    // Skip static assets, images, and API routes (which enforce their own
    // authorization independently of this optimistic check).
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
