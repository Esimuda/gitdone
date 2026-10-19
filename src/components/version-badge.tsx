"use client";

import { useEffect, useState } from "react";
import { PRODUCT_NAME } from "@/config/brand";
import { loadShortSha } from "@/lib/version-client";

export function VersionBadge() {
  const [sha, setSha] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void loadShortSha().then((value) => {
      if (live) setSha(value);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <span data-testid="build-version">
      {PRODUCT_NAME} · {sha ?? "…"}
    </span>
  );
}
