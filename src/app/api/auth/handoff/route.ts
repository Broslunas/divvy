import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, signToken } from '@/lib/auth';

/**
 * Cross-subdomain handoff token endpoint.
 *
 * Flow:
 *   1. album.divvy.es detects no local session
 *   2. Redirects to divvy.es/api/auth/handoff?redirectTo=<album-url>
 *   3. This endpoint reads the auth_token cookie (which exists on divvy.es)
 *   4. If valid: generates a short-lived handoff JWT and redirects to <album-url>?t=<token>
 *   5. If invalid: redirects to divvy.es/login?redirectTo=<handoff-url>
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectTo = searchParams.get('redirectTo');

  // Validate redirectTo to prevent open redirect attacks
  // Only allow redirects to album.divvy.es or localhost
  const isAllowed =
    redirectTo &&
    (redirectTo.startsWith('https://album.divvy.es') ||
      redirectTo.startsWith('http://localhost:3001'));

  if (!redirectTo || !isAllowed) {
    return NextResponse.redirect(new URL('/app', request.url));
  }

  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth_token')?.value;

  if (!authToken) {
    // Not logged in — send to login with this handoff URL as the return
    const handoffUrl = new URL(request.url);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', handoffUrl.toString());
    return NextResponse.redirect(loginUrl);
  }

  try {
    const payload = verifyToken(authToken);
    if (!payload || !payload.userId) {
      throw new Error('Invalid token');
    }

    // Generate a short-lived handoff token (valid 90 seconds, single use by convention)
    const handoffToken = signToken(
      { userId: payload.userId, handoff: true },
      90 // seconds
    );

    // Redirect to the album with the handoff token
    const destination = new URL(redirectTo);
    destination.searchParams.set('t', handoffToken);
    return NextResponse.redirect(destination.toString());
  } catch {
    // Token invalid — clear cookie and redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', redirectTo);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('auth_token');
    return response;
  }
}
