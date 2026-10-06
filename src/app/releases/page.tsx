import Link from "next/link";
import type { Metadata } from "next";
import { AnnouncementPanel } from "@/components/announcement-panel";
import { SubscribeDialog } from "@/components/subscribe-dialog";
import { getAppData } from "@/lib/data";
import { formatTimestamp, touchLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Releases" };

const KIND_LABEL = {
  added: "Added",
  fixed: "Fixed",
  changed: "Changed",
  security: "Security",
} as const;

export default async function ReleasesPage() {
  const data = await getAppData();
  if (data.source === "error") return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.18em] text-primary uppercase">{data.project.name}</p>
          <h1 className="mt-3 text-4xl font-medium tracking-tight sm:text-5xl">Releases</h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
            The changelog the community can read, and the announcement the flow already drafted.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/feed.xml" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            RSS
          </a>
          <SubscribeDialog />
        </div>
      </div>

      {data.releases.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">No releases yet.</p>
      ) : (
        <ol className="mt-10 space-y-8">
          {data.releases.map((release) => (
            <li key={release.tag} className="rounded-3xl border border-border bg-card p-5 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-2xl font-medium tracking-tight">
                  <Link href={`/releases/${encodeURIComponent(release.tag)}`} className="hover:text-primary">
                    {release.tag}
                  </Link>
                </h2>
                <p className="num text-xs text-muted-foreground">{formatTimestamp(release.releasedAt)}</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{release.title}</p>
              <p className="mt-4 text-base leading-relaxed">{release.summary}</p>
              {release.changelog.length > 0 ? (
                <ul className="mt-4 space-y-2 text-sm">
                  {release.changelog.map((item) => (
                    <li key={item.kind + item.text} className="grid grid-cols-[5.5rem_1fr] gap-3">
                      <span className="text-xs tracking-wide text-muted-foreground uppercase">{KIND_LABEL[item.kind]}</span>
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-4 text-xs text-muted-foreground">
                {touchLabel(release.humanTouches)}
                {release.issueIid ? ` · issue #${release.issueIid}` : ""}
                {release.author ? ` · ${release.author}` : ""}
              </p>
              <div className="mt-5">
                <h3 className="mb-2 text-sm font-medium">Announcement</h3>
                <AnnouncementPanel announcements={release.announcements} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
