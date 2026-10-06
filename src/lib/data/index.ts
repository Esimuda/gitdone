import { cache } from "react";
import { connection } from "next/server";
import { buildDemoData } from "./demo";
import { loadGitlabAppData } from "./gitlab";
import { resolveGitlabEnv } from "./source";
import type { DataResult } from "./types";

export const getAppData = cache(async (): Promise<DataResult> => {
  await connection();
  const decision = resolveGitlabEnv(process.env);
  if (decision.mode === "demo") return buildDemoData();
  if (decision.mode === "misconfigured") return { source: "error", message: decision.message };
  try {
    return await loadGitlabAppData(decision);
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitLab request failed.";
    return { source: "error", message };
  }
});
