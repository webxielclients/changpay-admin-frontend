const publicRoutes = ['/login', '/register', '/auth/register', '/auth/verify', '/auth/setup-pin', '/forgot-password'];
const protectedRoutes = ['/dashboard'];

export function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
