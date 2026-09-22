"use client";

import { useActionState } from "react";
import Link from "next/link";

import { signUpAction, type AuthFormState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { FieldError, Input, Label } from "@/components/ui/form";

const initialState: AuthFormState = {};

export function SignupForm() {
  const [state, action, pending] = useActionState(signUpAction, initialState);

  if (state.message) {
    return <Alert variant="success">{state.message}</Alert>;
  }

  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert variant="danger">{state.error}</Alert>}

      <div>
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" autoComplete="name" required />
        <FieldError>{state.fieldErrors?.fullName}</FieldError>
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        <FieldError>{state.fieldErrors?.email}</FieldError>
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
        <FieldError>{state.fieldErrors?.password}</FieldError>
        <p className="mt-1 text-xs text-muted">At least 8 characters, with a letter and a number.</p>
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account..." : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand">
          Sign in
        </Link>
      </p>
    </form>
  );
}
