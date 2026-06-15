/**
 * Thin, dependency-free REST client for Playwright factories.
 *
 * Why not Playwright `request`? Factories run from both Playwright
 * fixtures AND from `e2e/global-setup.ts`, which is a vanilla Node
 * script. Using `fetch` keeps the same code reusable in both contexts.
 *
 * Authentication: callers pass `{ accessToken }` (Supabase JWT) or
 * `{ demoMode: true }` to use the demo-mode bypass header documented
 * in workflow-map.md (and flagged as a P0 in missing-functionality-
 * report.md gap G4 — production RBAC tests MUST NOT use this).
 */

export interface ApiClientAuth {
  /** Supabase access token (JWT) — sent as `Authorization: Bearer <token>`. */
  accessToken?: string;
  /**
   * Enable demo-mode bypass header. Forbidden in RBAC-validation
   * suites — only safe for read-only or seed-shape tests during
   * initial wiring.
   */
  demoMode?: boolean;
}

export interface ApiClientOptions extends ApiClientAuth {
  baseUrl?: string;
}

export interface RequestInitJson extends Omit<RequestInit, 'body' | 'headers'> {
  body?: unknown;
  headers?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly method: string,
    public readonly path: string,
    public readonly body: unknown,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  readonly baseUrl: string;
  private accessToken: string | undefined;
  private demoMode: boolean;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl =
      options.baseUrl ??
      process.env.E2E_API_BASE_URL ??
      'http://localhost:8000/api';
    this.accessToken = options.accessToken;
    this.demoMode = options.demoMode ?? false;
  }

  setAuth(auth: ApiClientAuth): void {
    this.accessToken = auth.accessToken ?? this.accessToken;
    this.demoMode = auth.demoMode ?? this.demoMode;
  }

  async request<TResponse = unknown>(
    method: string,
    path: string,
    init: RequestInitJson = {}
  ): Promise<TResponse> {
    const url = `${this.baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    };
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    if (this.demoMode) {
      headers['X-App-Mode'] = 'demo';
    }

    const response = await fetch(url, {
      ...init,
      method,
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });

    const text = await response.text();
    let parsed: unknown = text;
    if (text.length > 0) {
      try {
        parsed = JSON.parse(text);
      } catch {
        // leave as raw text
      }
    }

    if (!response.ok) {
      throw new ApiError(
        response.status,
        method,
        path,
        parsed,
        `${method} ${path} failed with ${response.status}`
      );
    }

    return parsed as TResponse;
  }

  get<T = unknown>(path: string, init?: RequestInitJson): Promise<T> {
    return this.request<T>('GET', path, init);
  }

  post<T = unknown>(path: string, body?: unknown, init?: RequestInitJson): Promise<T> {
    return this.request<T>('POST', path, { ...init, body });
  }

  put<T = unknown>(path: string, body?: unknown, init?: RequestInitJson): Promise<T> {
    return this.request<T>('PUT', path, { ...init, body });
  }

  patch<T = unknown>(path: string, body?: unknown, init?: RequestInitJson): Promise<T> {
    return this.request<T>('PATCH', path, { ...init, body });
  }

  delete<T = unknown>(path: string, init?: RequestInitJson): Promise<T> {
    return this.request<T>('DELETE', path, init);
  }
}
