import { defineMiddleware } from 'astro:middleware';

// /test-database writes to the DB to prove connectivity, so it's gated
// behind admin auth the same as /admin/* — it isn't meant for the public.
const PROTECTED_PATHS = ['/admin', '/test-database'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (!PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return next();
  if (pathname === '/admin/login' || pathname.startsWith('/api/admin/')) return next();

  const session = context.cookies.get('admin_session');
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || session?.value !== adminPassword) {
    return context.redirect('/admin/login');
  }

  return next();
});
