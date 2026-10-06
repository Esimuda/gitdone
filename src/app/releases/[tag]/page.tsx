import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AnnouncementPanel } from "@/components/announcement-panel";
import { getAppData } from "@/lib/data";
import { formatTimestamp, touchLabel } from "@/lib/format";

type Params = { tag: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { tag } = await params;
  return { title: decodeURIComponent(tag) };
}

export default async function ReleasePage({ params }: { params: Promise<Params> }) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const data = await getAppData();
  if (data.source === "error") return null;
  const release = data.releases.find((item) => item.tag === decoded);
  if (!release) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link href="/releases" className="text-sm text-muted-foreground hover:text-foreground">
        Releases
      </Link>
      <p className="mt-6 text-xs tracking-[0.16em] text-primary uppercase">{data.project.name}</p>
      <h1 className="mt-3 text-4xl font-medium tracking-tight">{release.tag}</h1>
      <p className="mt-2 text-muted-foreground">{release.title}</p>
      <p className="num mt-2 text-xs text-muted-foreground">{formatTimestamp(release.releasedAt)}</p>
      <p className="mt-6 text-lg leading-relaxed">{release.summary}</p>
      <ul className="mt-6 space-y-2 text-sm">
        {release.highlights.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-muted-foreground">
        {touchLabel(release.humanTouches)}
        {release.issueIid ? (
          <>
            {" "}
            · <Link href={`/mission/${release.issueIid}`}>issue #{release.issueIid}</Link>
          </>
        ) : null}
      </p>
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-medium">Announcement</h2>
        <AnnouncementPanel announcements={release.announcements} />
      </div>
    </div>
  );
}
