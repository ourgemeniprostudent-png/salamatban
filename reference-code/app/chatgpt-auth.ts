import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export type AuthenticatedUser = { userId: string; email: string; displayName: string };

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  // Archived prototype routes are disabled. The pilot uses its own server sessions.
  if (process.env.ENABLE_LEGACY_PROTOTYPE !== 'true') return null;
  const requestHeaders = await headers();
  let userId = requestHeaders.get('oai-authenticated-user-id');
  let email = requestHeaders.get('oai-authenticated-user-email');
  if ((!userId || !email) && process.env.NODE_ENV !== 'production') {
    const devUser = requestHeaders.get('x-hamyar-dev-user');
    if (devUser) {
      userId = `dev:${devUser}`;
      email = `${devUser}@example.invalid`;
    }
  }
  if (!userId || !email) return null;
  const encodedName = requestHeaders.get('oai-authenticated-user-full-name');
  const encoding = requestHeaders.get('oai-authenticated-user-full-name-encoding');
  let displayName = email;
  if (encodedName && encoding === 'percent-encoded-utf-8') {
    try { displayName = decodeURIComponent(encodedName); } catch { displayName = email; }
  }
  return { userId, email, displayName };
}

export async function requireAuthenticatedUser(returnTo: string): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();
  if (user) return user;
  const safeReturnTo = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';
  redirect(`/signin-with-chatgpt?return_to=${encodeURIComponent(safeReturnTo)}`);
}
