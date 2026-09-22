import Link from "next/link";

import { Card } from "@/components/ui/card";
import { SignupForm } from "@/app/signup/signup-form";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link href="/" className="text-lg font-semibold">
            search4jobs
          </Link>
          <h1 className="mt-2 text-xl font-semibold">Create your account</h1>
        </div>
        <Card>
          <SignupForm />
        </Card>
      </div>
    </div>
  );
}
