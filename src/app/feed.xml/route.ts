import { PRODUCT_DESCRIPTION, PRODUCT_NAME } from "@/config/brand";
import { getAppData } from "@/lib/data";
import { escapeXml } from "@/lib/format";

export async function GET(request: Request) {
  const data = await getAppData();
  const origin = new URL(request.url).origin;
  const title = data.source === "error" ? PRODUCT_NAME : `${data.project.name} releases`;
  const description = data.source === "error" ? PRODUCT_DESCRIPTION : data.project.description || PRODUCT_DESCRIPTION;
  const items =
    data.source === "error"
      ? ""
      : data.releases
          .map((release) => {
            const link = `${origin}/releases/${encodeURIComponent(release.tag)}`;
            return `<item>
  <title>${escapeXml(`${release.tag} ${release.title}`)}</title>
  <link>${escapeXml(link)}</link>
  <guid>${escapeXml(link)}</guid>
  <pubDate>${escapeXml(new Date(release.releasedAt).toUTCString())}</pubDate>
  <description>${escapeXml(release.summary)}</description>
</item>`;
          })
          .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${escapeXml(title)}</title>
  <link>${escapeXml(`${origin}/releases`)}</link>
  <description>${escapeXml(description)}</description>
  ${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
