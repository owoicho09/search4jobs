import { Card, CardHeading } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireAuthUser } from "@/lib/auth/dal";
import { signOutAction } from "@/lib/auth/actions";
import { DeleteAccountForm } from "@/app/dashboard/settings/delete-account-form";

export default async function SettingsPage() {
  const user = await requireAuthUser();

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Account settings</h1>

      <Card>
        <CardHeading>Account</CardHeading>
        <p className="mt-2 text-sm text-muted">Signed in as {user.email}</p>
        <form action={signOutAction} className="mt-4">
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeading>Delete account</CardHeading>
        <div className="mt-3">
          <DeleteAccountForm />
        </div>
      </Card>
    </div>
  );
}
