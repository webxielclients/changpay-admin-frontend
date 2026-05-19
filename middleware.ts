import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define public routes that don't require authentication
const publicRoutes = ['/login', '/register', '/verify', '/setup-pin', '/forgot-password'];

// Define protected routes that require authentication
const protectedRoutes = ['/dashboard'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Check if the current path is a public route
  const isPublicRoute = publicRoutes.some(route => 
    pathname.startsWith(route)
  );

  // For production: Check if user has a valid token in cookies
  // const token = request.cookies.get('changpay_token')?.value;
  
  // For development: Allow all routes since we're using mock authentication
  // In production, you would check the token validity here
  
  // If trying to access a protected route without authentication
  if (isProtectedRoute) {
    // In production, check token and redirect if invalid:
    // if (!token) {
    //   const loginUrl = new URL('/login', request.url);
    //   return NextResponse.redirect(loginUrl);
    // }
    
    // For now, allow access for development
    return NextResponse.next();
  }

  // Allow access to public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Allow access to all other routes
  return NextResponse.next();
} 

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
