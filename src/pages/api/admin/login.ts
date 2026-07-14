import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const body = await request.formData();
  const password = body.get('password')?.toString();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || password !== adminPassword) {
    return redirect('/admin/login?error=1', 302);
  }

  cookies.set('admin_session', adminPassword, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
    sameSite: 'lax',
  });

  return redirect('/admin/', 302);
};
