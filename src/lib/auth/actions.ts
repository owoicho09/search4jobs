"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { SignInSchema, SignUpSchema } from "@/lib/validation/auth";

export interface AuthFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  message?: string;
}

export async function signUpAction(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) {
    return { error: "Sign-up is not available yet — authentication is not configured." };
  }

  const parsed = SignUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseServerClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${appUrl}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    return { message: "Check your email to confirm your account, then sign in." };
  }

  redirect("/dashboard/onboarding");
}

export async function signInAction(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) {
    return { error: "Sign-in is not available yet — authentication is not configured." };
  }

  const parsed = SignInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Incorrect email or password." };
  }

  const next = formData.get("next");
  redirect(typeof next === "string" && next.startsWith("/") ? next : "/dashboard");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
