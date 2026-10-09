"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogoMark, Wordmark } from "@/components/logo";
import { SourceBadge } from "@/components/source-banner";
import { ThemeToggle } from "@/components/theme-toggle";
import type { AppData } from "@/lib/data/types";

const LINKS = [
  { href: "/mission", label: "Mission" },
  { href: "/releases", label: "Releases" },
  { href: "/connect", label: "Connect" },
];

export type HeaderProject = { id: number; name: string; path: string };

export function SiteHeader({
  source,
  projects = [],
}: {
  source?: AppData["source"];
  projects?: HeaderProject[];
}) {
  const pathname = usePathname();
  const badge = pathname.startsWith("/w/") ? "connected" : source;
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5 rounded-md" onClick={() => setOpen(false)}>
            <LogoMark className="size-8" />
            <Wordmark className="text-base" />
          </Link>
          {badge ? <SourceBadge source={badge} /> : null}
        </div>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3 py-2 text-sm ${active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {link.label}
              </Link>
            );
          })}
          {projects.length > 0 ? (
            <details className="relative">
              <summary className="cursor-pointer list-none rounded-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
                Projects
              </summary>
              <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-border bg-card p-2 shadow-xl">
                {projects.map((project) => (
                  <Link key={project.id} href={`/w/${project.id}`} className="block rounded-xl px-3 py-2 text-sm hover:bg-muted">
                    <span className="block font-medium">{project.name}</span>
                    <span className="block text-xs text-muted-foreground">{project.path}</span>
                  </Link>
                ))}
              </div>
            </details>
          ) : null}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-full border border-border md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>
      {open ? (
        <nav id="mobile-nav" className="border-t border-border px-4 py-3 md:hidden" aria-label="Mobile">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block rounded-xl px-3 py-3 text-base"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/w/${project.id}`}
              className="block rounded-xl px-3 py-3 text-base"
              onClick={() => setOpen(false)}
            >
              {project.name}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
