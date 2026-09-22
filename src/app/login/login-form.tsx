"use client";

import { useActionState } from "react";
import Link from "next/link";

import { signInAction, type AuthFormState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { FieldError, Input, Label } from "@/components/ui/form";

const initialState: AuthFormState = {};

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signInAction, initialState);

  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      {state.error && <Alert variant="danger">{state.error}</Alert>}

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        <FieldError>{state.fieldErrors?.email}</FieldError>
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
        <FieldError>{state.fieldErrors?.password}</FieldError>
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </Button>

      <p className="text-center text-sm text-muted">
        No account?{" "}
        <Link href="/signup" className="font-medium text-brand">
          Sign up
        </Link>
      </p>
    </form>
  );
}
