import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { PRODUCT_NAME } from "@/config/brand";
import { oauthConfigured } from "@/lib/connect/oauth";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  config: "This server is missing the GitLab OAuth app, GITDONE_PUBLIC_URL, or the session secrets.",
  state: "That sign-in attempt expired. Start again.",
  rejected: "GitLab did not finish sign-in.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const query = await searchParams;
  const notice = query.error ? ERRORS[query.error] : "";
  const next = query.next && query.next.startsWith("/") && !query.next.startsWith("//") ? query.next : "/connect";
  const ready = oauthConfigured();

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
      <div>
        <p className="text-xs tracking-[0.22em] text-primary uppercase">Supervised</p>
        <h1 className="mt-4 max-w-xl text-4xl font-medium tracking-[-0.04em] text-balance sm:text-6xl sm:leading-[0.98]">
          Sign in with GitLab
        </h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
          Agents do everything up to the merge. You approve with one click. {PRODUCT_NAME} uses your GitLab account, and
          nothing else.
        </p>
      </div>
      <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[0_30px_80px_-48px_rgba(252,109,38,0.75)] sm:p-8">
        <LogoMark className="size-12" />
        <h2 className="mt-6 text-2xl font-medium tracking-tight">Your projects, your token</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          OAuth with PKCE. Scopes <span className="num">read_user</span> and <span className="num">api</span>. The access
          token stays encrypted on the server.
        </p>
        {notice ? <p className="mt-4 text-sm text-danger">{notice}</p> : null}
        <a
          href={`/api/auth/start?next=${encodeURIComponent(next)}`}
          className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
        >
          Sign in with GitLab
        </a>
        {ready ? null : (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Set <span className="num">GITLAB_OAUTH_CLIENT_ID</span> and <span className="num">GITLAB_OAUTH_CLIENT_SECRET</span>.
            The redirect URI is <span className="num">/api/auth/callback</span>.
          </p>
        )}
        <p className="mt-6 text-sm text-muted-foreground">
          Looking at the public record?{" "}
          <Link href="/mission" className="text-primary hover:underline">
            Open the GitDone showcase
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
