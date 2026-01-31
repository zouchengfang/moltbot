type FetchWithPreconnect = typeof fetch & {
  preconnect: (url: string, init?: { credentials?: RequestCredentials }) => void;
};

import { ProxyAgent } from "undici";

type RequestInitWithDuplex = RequestInit & { duplex?: "half" };

type RequestInitWithDispatcher = RequestInit & { dispatcher?: unknown };

function withDuplex(
  init: RequestInit | undefined,
  input: RequestInfo | URL,
): RequestInit | undefined {
  const hasInitBody = init?.body != null;
  const hasRequestBody =
    !hasInitBody &&
    typeof Request !== "undefined" &&
    input instanceof Request &&
    input.body != null;
  if (!hasInitBody && !hasRequestBody) return init;
  if (init && "duplex" in (init as Record<string, unknown>)) return init;
  return init
    ? ({ ...init, duplex: "half" as const } as RequestInitWithDuplex)
    : ({ duplex: "half" as const } as RequestInitWithDuplex);
}

export function wrapFetchWithAbortSignal(fetchImpl: typeof fetch): typeof fetch {
  const wrapped = ((input: RequestInfo | URL, init?: RequestInit) => {
    const patchedInit = withDuplex(init, input);
    const signal = patchedInit?.signal;
    if (!signal) return fetchImpl(input, patchedInit);
    if (typeof AbortSignal !== "undefined" && signal instanceof AbortSignal) {
      return fetchImpl(input, patchedInit);
    }
    if (typeof AbortController === "undefined") {
      return fetchImpl(input, patchedInit);
    }
    if (typeof signal.addEventListener !== "function") {
      return fetchImpl(input, patchedInit);
    }
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", onAbort, { once: true });
    }
    const response = fetchImpl(input, { ...patchedInit, signal: controller.signal });
    if (typeof signal.removeEventListener === "function") {
      void response.finally(() => {
        signal.removeEventListener("abort", onAbort);
      });
    }
    return response;
  }) as FetchWithPreconnect;

  const fetchWithPreconnect = fetchImpl as FetchWithPreconnect;
  wrapped.preconnect =
    typeof fetchWithPreconnect.preconnect === "function"
      ? fetchWithPreconnect.preconnect.bind(fetchWithPreconnect)
      : () => {};

  return Object.assign(wrapped, fetchImpl);
}

export function resolveFetch(fetchImpl?: typeof fetch): typeof fetch | undefined {
  const resolved = fetchImpl ?? globalThis.fetch;
  if (!resolved) return undefined;
  return wrapFetchWithAbortSignal(resolved);
}

/** HTTPS_PROXY / HTTP_PROXY (or lowercase). Used so Node fetch uses the proxy (built-in fetch ignores env). */
function getEnvProxy(): string | undefined {
  const url = (
    process.env.HTTPS_PROXY ??
    process.env.https_proxy ??
    process.env.HTTP_PROXY ??
    process.env.http_proxy ??
    ""
  ).trim();
  return url || undefined;
}

let cachedProxyFetch: typeof fetch | null = null;

/**
 * Returns a fetch that uses HTTP_PROXY/HTTPS_PROXY when set (via undici ProxyAgent).
 * Use this for outbound requests that must go through a proxy (e.g. web_search in Docker).
 */
export function fetchWithEnvProxy(): typeof fetch {
  if (cachedProxyFetch) return cachedProxyFetch;
  const proxyUrl = getEnvProxy();
  if (!proxyUrl) {
    cachedProxyFetch = wrapFetchWithAbortSignal(globalThis.fetch);
    return cachedProxyFetch;
  }
  const agent = new ProxyAgent(proxyUrl);
  const fetchImpl = (input: RequestInfo | URL, init?: RequestInit) => {
    const opts: RequestInitWithDispatcher = { ...init, dispatcher: agent };
    return fetch(input, opts);
  };
  cachedProxyFetch = wrapFetchWithAbortSignal(fetchImpl);
  return cachedProxyFetch;
}
