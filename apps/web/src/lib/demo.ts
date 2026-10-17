/**
 * Test builds (NEXT_PUBLIC_DEMO_LOGIN=1) let anyone enter without an account through
 * Supabase anonymous sign-in, so the owner can try the app before Google or email
 * login is configured (issue #20). Turn it off for real users.
 */
export function demoLoginEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_LOGIN === '1';
}
