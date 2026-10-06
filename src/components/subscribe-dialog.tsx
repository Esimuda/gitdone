"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Rss, X } from "lucide-react";
import { useState, type FormEvent } from "react";

export function SubscribeDialog({ feedPath = "/feed.xml" }: { feedPath?: string }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = (await response.json()) as { ok?: boolean; delivery?: string; error?: string };
      if (!response.ok || !body.ok) {
        setError(body.error || "Could not subscribe.");
      } else if (body.delivery === "webhook") {
        setMessage("You are on the list. New releases will go to that address.");
        setEmail("");
      } else {
        window.localStorage.setItem("gitdone-subscribe", email);
        setMessage("Saved in this browser. RSS is the reliable feed until a webhook is configured.");
        setEmail("");
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog.Root>
      <Dialog.Trigger className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90">
        <Rss className="size-4" />
        Subscribe
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(28rem,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="text-lg font-medium tracking-tight">Release notes, as they ship</Dialog.Title>
            <Dialog.Close className="inline-flex size-10 items-center justify-center rounded-full border border-border" aria-label="Close">
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Leave an email, or take the RSS feed. In demo mode the address stays in this browser.
          </Dialog.Description>
          <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3">
            <label className="text-sm" htmlFor="subscribe-email">
              Email
            </label>
            <input
              id="subscribe-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              placeholder="you@community.org"
            />
            <button
              type="submit"
              disabled={pending}
              className="h-11 rounded-full bg-foreground text-sm font-medium text-background disabled:opacity-60"
            >
              {pending ? "Saving…" : "Subscribe"}
            </button>
          </form>
          {message ? (
            <p className="mt-3 text-sm" role="status">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="mt-3 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <a href={feedPath} className="mt-4 inline-flex text-sm text-primary underline-offset-4 hover:underline">
            Or copy the RSS feed
          </a>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
