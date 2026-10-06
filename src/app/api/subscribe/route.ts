import { parseSubscribeBody } from "@/lib/subscribe";

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
  }
  const parsed = parseSubscribeBody(json);
  if ("error" in parsed) return Response.json({ ok: false, error: parsed.error }, { status: 400 });

  const webhook = process.env.SUBSCRIBE_WEBHOOK_URL?.trim();
  if (webhook) {
    try {
      const response = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: parsed.email }),
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      });
      if (!response.ok) {
        return Response.json({ ok: false, error: "The subscription service did not accept that address." }, { status: 502 });
      }
    } catch {
      return Response.json({ ok: false, error: "The subscription service did not respond." }, { status: 502 });
    }
    return Response.json({ ok: true, delivery: "webhook" });
  }

  return Response.json({ ok: true, delivery: "demo" });
}
