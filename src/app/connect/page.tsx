import type { Metadata } from "next";
import Link from "next/link";
import { ConnectForm } from "@/components/connect-form";
import { PRODUCT_NAME } from "@/config/brand";
import { oauthConfigured } from "@/lib/connect/oauth";

export const metadata: Metadata = { title: "Connect" };

const STEPS = [
  { n: "01", title: "Flow, skills, and the ship label", body: "One merge request adds the supervised flow, AGENTS.md, and the issue template." },
  { n: "02", title: "CI include", body: "Your pipeline includes GitDone’s stages: test, package, release, and the approval note." },
  { n: "03", title: "You enable the flow", body: "Two clicks left in GitLab: turn the flow on in the AI Catalog, and set CI variables if you deploy." },
];

export default function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ oauth?: string }>;
}) {
  return <ConnectLanding searchParams={searchParams} />;
}

async function ConnectLanding({ searchParams }: { searchParams: Promise<{ oauth?: string }> }) {
  const query = await searchParams;
  const oauth = oauthConfigured();
  const notice =
    query.oauth === "missing"
      ? "OAuth is not configured on this server. Paste a token to continue."
      : query.oauth === "rejected"
        ? "GitLab did not finish sign-in. Try again, or paste a token."
        : query.oauth === "key"
          ? "Set GITDONE_TOKEN_KEY before connecting a project. Tokens are encrypted at rest."
          : "";

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <p className="text-xs tracking-[0.22em] text-primary uppercase">Supervised</p>
      <h1 className="mt-4 max-w-3xl text-4xl font-medium tracking-[-0.04em] text-balance sm:text-6xl sm:leading-[0.98]">
        Connect your GitLab project in two minutes
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
        Agents do everything up to the merge. You approve with one click. {PRODUCT_NAME} opens the install merge
        request; it does not merge it for you.
      </p>
      {notice ? <p className="mt-4 text-sm text-danger">{notice}</p> : null}

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-[0_30px_80px_-48px_rgba(252,109,38,0.7)]">
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Preferred</p>
          <h2 className="mt-3 text-2xl font-medium tracking-tight">Continue with GitLab</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            An OAuth app with the <span className="num">api</span> scope. GitDone stores the access token encrypted and
            uses it only from the server.
          </p>
          {oauth ? (
            <a
              href="/api/connect/start"
              className="mt-6 inline-flex h-12 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
            >
              Continue with GitLab
            </a>
          ) : (
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              Set <span className="num">GITLAB_OAUTH_CLIENT_ID</span> and <span className="num">GITLAB_OAUTH_CLIENT_SECRET</span>{" "}
              to enable this button. The redirect URL is <span className="num">/api/connect/callback</span>.
            </p>
          )}
        </section>
        <section className="rounded-3xl border border-border bg-card/80 p-6">
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Fallback</p>
          <h2 className="mt-3 text-2xl font-medium tracking-tight">Paste a token</h2>
          <div className="mt-4">
            <ConnectForm />
          </div>
        </section>
      </div>

      <ol className="mt-12 grid gap-3 md:grid-cols-3">
        {STEPS.map((step) => (
          <li key={step.n} className="rounded-2xl border border-border bg-background p-5">
            <p className="num text-xs text-primary">{step.n}</p>
            <h2 className="mt-2 text-lg font-medium">{step.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>
      <p className="mt-8 text-sm text-muted-foreground">
        Already connected a project? Open <Link href="/mission" className="text-primary hover:underline">mission control</Link>{" "}
        and use the project switcher.
      </p>
    </div>
  );
}
