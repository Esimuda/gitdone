"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type PaletteItem = {
  href: string;
  label: string;
  hint: string;
  group: "Journeys" | "Releases" | "Pages";
};

export function CommandPalette({ items }: { items: PaletteItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("gitdone:palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("gitdone:palette", onOpen);
    };
  }, []);

  const groups = ["Pages", "Journeys", "Releases"] as const;

  return (
    <Command.Dialog open={open} onOpenChange={setOpen} label="Jump to a page" shouldFilter>
      <Command.Input placeholder="Jump to an issue, release, or page" />
      <Command.List>
        <Command.Empty>Nothing matches.</Command.Empty>
        {groups.map((group) => (
          <Command.Group key={group} heading={group}>
            {items
              .filter((item) => item.group === group)
              .map((item) => (
                <Command.Item
                  key={item.href + item.label}
                  value={`${item.label} ${item.hint}`}
                  onSelect={() => {
                    setOpen(false);
                    router.push(item.href);
                  }}
                >
                  <span>{item.label}</span>
                  <span className="num text-xs text-muted-foreground">{item.hint}</span>
                </Command.Item>
              ))}
          </Command.Group>
        ))}
      </Command.List>
    </Command.Dialog>
  );
}

export function openCommandPalette() {
  window.dispatchEvent(new Event("gitdone:palette"));
}
