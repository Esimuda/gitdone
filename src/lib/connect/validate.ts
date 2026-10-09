import { z } from "zod";

const projectId = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(
    /^(?:[1-9][0-9]*|(?:[A-Za-z0-9_][A-Za-z0-9_.-]*\/)+[A-Za-z0-9_][A-Za-z0-9_.-]*)$/,
    "Enter a numeric project id or a group/project path.",
  )
  .refine((value) => !value.split("/").some((part) => part === "." || part === ".."), "Enter a numeric project id or a group/project path.");

const token = z
  .string()
  .trim()
  .min(20)
  .max(256)
  .regex(/^[A-Za-z0-9_\-.=]+$/, "That token has characters GitDone will not store.");

export const connectBody = z.object({
  token,
  project: projectId,
});

export function parseConnectBody(input: unknown): { token: string; project: string } | { error: string } {
  const parsed = connectBody.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue?.message || "Check the token and the project." };
  }
  return parsed.data;
}

export function isSafeProjectId(value: string): boolean {
  return projectId.safeParse(value).success;
}
