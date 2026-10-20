import { PRODUCT_NAME } from "@/config/brand";

type Env = Record<string, string | undefined>;

const has = (value: string | undefined) => Boolean(value?.trim());

/** Which runtime settings are present. Booleans only: values never leave the server. */
export function configFlags(env: Env = process.env) {
  return {
    database: has(env.DATABASE_URL),
    sessionSecret: has(env.GITDONE_SESSION_SECRET),
    tokenKey: has(env.GITDONE_TOKEN_KEY),
    oauth: has(env.GITLAB_OAUTH_CLIENT_ID) && has(env.GITLAB_OAUTH_CLIENT_SECRET),
    publicUrl: has(env.GITDONE_PUBLIC_URL),
    gitlabToken: has(env.GITLAB_TOKEN),
  };
}

export function GET() {
  return Response.json(
    { status: "ok", service: PRODUCT_NAME, config: configFlags() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
