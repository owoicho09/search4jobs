import { z } from "zod";

export const SignUpSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(120),
  email: z.email("Enter a valid email address.").trim(),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .regex(/[a-zA-Z]/, "Include at least one letter.")
    .regex(/[0-9]/, "Include at least one number."),
});

export const SignInSchema = z.object({
  email: z.email("Enter a valid email address.").trim(),
  password: z.string().min(1, "Enter your password."),
});
