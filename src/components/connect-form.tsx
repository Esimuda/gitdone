"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ConnectForm() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [project, setProject] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const response = await fetch("/api/connect/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, project }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string; next?: string };
    setPending(false);
    if (!response.ok) {
      setError(body.error || "GitLab did not accept that token.");
      return;
    }
    setToken("");
    router.push(body.next || "/connect/review");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm" htmlFor="connect-project">
        Project
        <input
          id="connect-project"
          name="project"
          value={project}
          onChange={(event) => setProject(event.target.value)}
          placeholder="group/project"
          autoComplete="off"
          required
          className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
        />
      </label>
      <label className="block text-sm" htmlFor="connect-token">
        Personal access token
        <input
          id="connect-token"
          name="token"
          type="password"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          autoComplete="off"
          required
          className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
        />
      </label>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Scope <span className="num">api</span>. The token stays on the server, encrypted, and is never sent back to the
        browser.
      </p>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Checking GitLab…" : "Check this project"}
      </button>
    </form>
  );
}
