import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (!pathname.startsWith('/admin')) return next();
  if (pathname === '/admin/login' || pathname.startsWith('/api/admin/')) return next();

  const session = context.cookies.get('admin_session');
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || session?.value !== adminPassword) {
    return context.redirect('/admin/login');
  }

  return next();
});
