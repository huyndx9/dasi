/** Pure routing helpers, kept free of Next.js imports so they can be unit tested. */

export function homePathFor(role: string | null | undefined): string {
  if (role === 'teacher') return '/classes';
  if (role === 'student') return '/home';
  return '/onboarding';
}

export function loginPath(next?: string): string {
  return withNext('/login', next);
}

/** Onboarding keeps the page the user was heading to, e.g. an invite link `/join?code=…`. */
export function onboardingPath(next?: string): string {
  return withNext('/onboarding', next);
}

function withNext(path: string, next?: string): string {
  return next && next !== '/' ? `${path}?next=${encodeURIComponent(next)}` : path;
}

/**
 * Accepts only same-site relative paths for post-login redirects, so a crafted
 * `?next=` cannot send the user to another site.
 */
export function safeNext(next: string | null | undefined, fallback = '/'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
    return fallback;
  }
  return next;
}

export function joinUrl(origin: string, inviteCode: string): string {
  return `${origin}/join?code=${encodeURIComponent(inviteCode)}`;
}
