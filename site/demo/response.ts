/** Preserve simulated Set-Cookie metadata for the browser-only API adapter.
 * These cookies are never sent to a server or installed as real browser cookies.
 */
export class DemoResponse extends Response {
  constructor(body?: BodyInit | null, init?: ResponseInit) {
    super(body, init);
    Object.defineProperty(this, 'headers', { value: new Headers(init?.headers) });
  }
  static json(data: unknown, init?: ResponseInit) {
    const headers = new Headers(init?.headers);
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    return new DemoResponse(JSON.stringify(data), { ...init, headers });
  }
}
