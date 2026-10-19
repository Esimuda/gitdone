import type { VersionInfo } from "@/lib/version";

export const VERSION_FALLBACK = "dev";

type FetchLike = (input: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

/** Reads the short build sha from GET /api/version. Resolves to "dev" when the call fails or the body is unusable. */
export async function loadShortSha(fetcher: FetchLike = (input) => fetch(input, { cache: "no-store" })): Promise<string> {
  try {
    const res = await fetcher("/api/version");
    if (!res.ok) return VERSION_FALLBACK;
    const body = (await res.json()) as Partial<VersionInfo> | null;
    const short = typeof body?.shortSha === "string" ? body.shortSha.trim() : "";
    if (short) return short;
    const sha = typeof body?.sha === "string" ? body.sha.trim() : "";
    return sha ? sha.slice(0, 7) : VERSION_FALLBACK;
  } catch {
    return VERSION_FALLBACK;
  }
}
