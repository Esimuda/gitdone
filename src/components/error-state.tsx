export function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <p className="text-xs tracking-[0.16em] text-primary uppercase">GitLab connection</p>
      <h1 className="mt-3 text-3xl font-medium tracking-tight">The project did not load</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{message}</p>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Unset both variables to open the seeded demo, or set GITLAB_TOKEN, GITLAB_PROJECT_ID, and optionally
        GITLAB_BASE_URL.
      </p>
    </div>
  );
}
