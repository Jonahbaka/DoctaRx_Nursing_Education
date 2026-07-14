import { NextResponse } from 'next/server';

const SESSION_COOKIE = 'doctarx_nursing_session';
const PUBLIC_NURSING_PATHS = new Set([
  '/ng/nursing',
  '/ng/nursing/login',
  '/ng/nursing/request-access',
  '/ng/nursing/unauthorized',
]);

const ROLE_DASHBOARD_REQUIREMENTS = {
  '/ng/nursing/student': ['student'],
  '/ng/nursing/lecturer': ['lecturer'],
  '/ng/nursing/hod': ['hod'],
  '/ng/nursing/coordinator': ['clinical_coordinator'],
  '/ng/nursing/supervisor': ['supervisor'],
  '/ng/nursing/admin': ['super_admin', 'institution_admin', 'support_admin'],
  '/ng/education/medication-notes': ['student'],
  '/ng/education/medication-quizzes': ['student'],
  '/ng/education/medication-flashcards': ['student'],
};

const ROLE_ROUTES = {
  super_admin: '/ng/nursing/admin',
  institution_admin: '/ng/nursing/admin',
  hod: '/ng/nursing/hod',
  lecturer: '/ng/nursing/lecturer',
  clinical_coordinator: '/ng/nursing/coordinator',
  supervisor: '/ng/nursing/supervisor',
  student: '/ng/nursing/student',
  support_admin: '/ng/nursing/admin',
};

function sessionSecret() {
  const configured = process.env.NURSING_SESSION_SECRET || process.env.SESSION_SECRET;
  if (configured) return configured;
  return process.env.NODE_ENV === 'production'
    ? null
    : 'local-only-nursing-session-secret-change-before-production';
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function verifySessionToken(value) {
  const secret = sessionSecret();
  if (!secret || !value || value.split('.').length !== 2) return null;
  const [body, signature] = value.split('.');
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      decodeBase64Url(signature),
      new TextEncoder().encode(body)
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(body)));
    if (!payload?.id || !payload?.role || !payload?.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function getRoleRequirement(pathname) {
  return Object.entries(ROLE_DASHBOARD_REQUIREMENTS).find(([route]) => (
    pathname === route || pathname.startsWith(`${route}/`)
  ));
}

function redirectTo(request, pathname) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = '';
  return NextResponse.redirect(url);
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_NURSING_PATHS.has(pathname)) return NextResponse.next();

  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = '/ng/nursing/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  const canOperateWithoutDepartment = ['super_admin', 'support_admin', 'institution_admin'].includes(session.role);
  if (session.status !== 'active' || !session.institutionId || (!canOperateWithoutDepartment && !session.departmentId)) {
    return redirectTo(request, '/ng/nursing/unauthorized');
  }

  const roleRequirement = getRoleRequirement(pathname);
  if (roleRequirement && !roleRequirement[1].includes(session.role)) {
    return redirectTo(request, session.route || ROLE_ROUTES[session.role] || '/ng/nursing/unauthorized');
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/ng/nursing/:path*', '/ng/education/:path*'],
};
