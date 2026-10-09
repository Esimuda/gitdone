export class GitlabApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "GitlabApiError";
  }
}

export class GitlabApi {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  async graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const payload = await this.request<{ data?: T; errors?: { message?: string }[] }>("POST", "/api/graphql", {
      query,
      variables,
    });
    if (payload.errors?.length) {
      throw new GitlabApiError(200, payload.errors[0]?.message || "GitLab GraphQL refused the query.");
    }
    if (!payload.data) throw new GitlabApiError(200, "GitLab GraphQL returned no data.");
    return payload.data;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const root = this.baseUrl.replace(/\/$/, "");
    const response = await this.fetchImpl(`${root}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new GitlabApiError(response.status, `GitLab returned ${response.status}.`);
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }
}

export function encodeProject(project: string): string {
  return encodeURIComponent(project);
}
