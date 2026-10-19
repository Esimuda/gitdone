import { resolveVersion } from "@/lib/version";

export function GET() {
  return Response.json(resolveVersion());
}
