import { z } from "zod";

const schema = z.object({
  email: z.string().trim().email().max(200),
});

export function parseSubscribeBody(body: unknown): { email: string } | { error: string } {
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { error: "Enter a valid email address." };
  return { email: parsed.data.email };
}
