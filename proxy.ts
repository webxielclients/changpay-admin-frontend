import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isProtectedRoute, isPublicRoute } from '@/lib/auth/route-policy';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isProtectedRoute(pathname) || isPublicRoute(pathname)) return NextResponse.next();
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

