/**
 * Resolves the public origin of the application for links placed in emails and
 * redirects. Prefers the configured NEXT_PUBLIC_APP_URL; otherwise derives it
 * from the (proxy-aware) request headers, mirroring the OAuth callback.
 *
 * @param {Request} [req]
 * @returns {string} origin without a trailing slash
 */
export function resolveAppUrl(req) {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured && !configured.includes('localhost')) {
    return configured.replace(/\/+$/, '');
  }

  if (req?.headers?.get) {
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    if (host) {
      let proto = req.headers.get('x-forwarded-proto');
      if (!proto) {
        try {
          proto = new URL(req.url).protocol.replace(':', '');
        } catch {
          proto = 'https';
        }
      }
      return `${proto}://${host}`;
    }
  }

  return (configured || 'http://localhost:3000').replace(/\/+$/, '');
}

/**
 * Only allow same-site relative redirect targets (blocks open redirects such as
 * "//evil.com" or "https://evil.com").
 *
 * @param {string|null|undefined} target
 * @param {string} [fallback='/']
 * @returns {string}
 */
export function safeNextPath(target, fallback = '/') {
  if (typeof target !== 'string' || !target.startsWith('/')) return fallback;
  if (target.startsWith('//') || target.startsWith('/\\')) return fallback;
  return target;
}
