"use client";

import Link from "next/link";

export function AccountMenu({
  name,
  username,
  avatarUrl,
}: {
  name: string;
  username: string;
  avatarUrl: string | null;
}) {
  const initial = (name || username || "?").slice(0, 1).toUpperCase();
  return (
    <details className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-border bg-card py-1 pr-3 pl-1 text-sm">
        {avatarUrl ? (
          // GitLab hosts the avatar. next/image would need a remote pattern per user.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="size-8 rounded-full object-cover" />
        ) : (
          <span className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-xs font-medium text-primary">
            {initial}
          </span>
        )}
        <span className="max-w-32 truncate">{name}</span>
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-56 rounded-2xl border border-border bg-card p-2 shadow-xl">
        <p className="px-3 py-2 text-xs text-muted-foreground">@{username}</p>
        <Link href="/projects" className="block rounded-xl px-3 py-2 text-sm hover:bg-muted">
          Your projects
        </Link>
        <Link href="/connect" className="block rounded-xl px-3 py-2 text-sm hover:bg-muted">
          Connect a project
        </Link>
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-muted">
            Sign out
          </button>
        </form>
      </div>
    </details>
  );
}
