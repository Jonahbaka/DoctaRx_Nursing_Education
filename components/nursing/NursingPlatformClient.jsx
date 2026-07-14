'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  BookMarked,
  Building2,
  ChevronDown,
  Check,
  CheckCircle,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  Download,
  Edit3,
  FileText,
  FilePlus,
  GraduationCap,
  Headphones,
  LayoutDashboard,
  Layers3,
  LogOut,
  Menu,
  MessageCircle,
  MessageSquare,
  Microscope,
  NotebookPen,
  PlayCircle,
  Pill,
  Plus,
  Send,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Stethoscope,
  User,
  UserCheck,
  Users,
  Video,
  X,
} from 'lucide-react';
import DoctaRxLogo from '@/components/branding/DoctaRxLogo';
import CertificatePreview from '@/components/nursing/CertificatePreview';
import ClinicalVitalsPanel from '@/components/nursing/ClinicalVitalsPanel';
import CourseBuilder from '@/components/nursing/CourseBuilder';
import CourseProgressCard from '@/components/nursing/CourseProgressCard';
import LessonPlayer from '@/components/nursing/LessonPlayer';
import LogbookEntryCard from '@/components/nursing/LogbookEntryCard';
import MagicGridPattern from '@/components/nursing/MagicGridPattern';
import NursingAnalyticsPanel from '@/components/nursing/NursingAnalyticsPanel';
import NursingEmptyState from '@/components/nursing/NursingEmptyState';
import NursingLoadingState from '@/components/nursing/NursingLoadingState';
import NursingMetricCard from '@/components/nursing/NursingMetricCard';
import NursingFooter from '@/components/nursing/NursingFooter';
import NursingSupportCenter from '@/components/nursing/NursingSupportCenter';
import PaymentStatusCard from '@/components/nursing/PaymentStatusCard';
import SimulationCaseCard from '@/components/nursing/SimulationCaseCard';
import StudentProfileHeader from '@/components/nursing/StudentProfileHeader';
import TimelineComposer from '@/components/nursing/TimelineComposer';
import TimelinePostCard from '@/components/nursing/TimelinePostCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  NURSING_ROLE_LABELS,
  NURSING_ROLE_ROUTES,
  NURSING_ROLES,
  canNursingRole,
  getNursingSeedData,
  getRoleDashboard,
} from '@/lib/nursingEducationData';

const STORAGE_KEY = 'doctarx:nursing-session:v1';
const SHOW_ROLE_SWITCHER = process.env.NEXT_PUBLIC_ENABLE_NURSING_ROLE_SWITCHER === 'true';

const nursingImages = {
  hero: '/images/nursing/nursing-command-center-hero.png',
  lms: '/images/nursing/nursing-lms-telehealth-course.png',
  simulation: '/images/nursing/nursing-simulation-lab.png',
  logbook: '/images/nursing/nursing-logbook-profile-cover.png',
  telehealth: '/images/nursing/nursing-telehealth-skills-lab.png',
};

const roleNavigation = [
  { label: 'Student', role: NURSING_ROLES.STUDENT, href: '/ng/nursing/student', icon: GraduationCap },
  { label: 'Lecturer', role: NURSING_ROLES.LECTURER, href: '/ng/nursing/lecturer', icon: BookOpen },
  { label: 'HOD', role: NURSING_ROLES.HOD, href: '/ng/nursing/hod', icon: BarChart3 },
  { label: 'Coordinator', role: NURSING_ROLES.CLINICAL_COORDINATOR, href: '/ng/nursing/coordinator', icon: ClipboardList },
  { label: 'Supervisor', role: NURSING_ROLES.SUPERVISOR, href: '/ng/nursing/supervisor', icon: UserCheck },
  { label: 'Admin', role: NURSING_ROLES.INSTITUTION_ADMIN, href: '/ng/nursing/admin', icon: ShieldCheck },
];

const moduleTabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'timeline', label: 'Timeline', icon: MessageSquare },
  { id: 'institution', label: 'Institution', icon: Building2 },
  { id: 'courses', label: 'LMS', icon: BookOpen },
  { id: 'assignments', label: 'Assignments', icon: FilePlus },
  { id: 'gradebook', label: 'Gradebook', icon: BookMarked },
  { id: 'discussions', label: 'Q&A', icon: MessageCircle },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'support', label: 'Live Support', icon: Headphones },
  { id: 'quiz', label: 'Quizzes', icon: ClipboardCheck },
  { id: 'simulation', label: 'Simulation', icon: Microscope },
  { id: 'telehealth', label: 'Telehealth Lab', icon: Video },
  { id: 'logbook', label: 'Logbook', icon: FileText },
  { id: 'certificates', label: 'Certificates', icon: Award },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const medicationEducationNavigation = [
  { label: 'Medication Library', href: '/ng/education/medications', icon: Pill },
  { label: 'My Medication Notes', href: '/ng/education/medication-notes', icon: NotebookPen },
  { label: 'Medication Quizzes', href: '/ng/education/medication-quizzes', icon: ClipboardCheck },
  { label: 'Medication Flashcards', href: '/ng/education/medication-flashcards', icon: Layers3 },
];

const roleDefaultTabs = {
  [NURSING_ROLES.STUDENT]: ['overview', 'profile', 'timeline', 'courses', 'assignments', 'gradebook', 'discussions', 'messages', 'support', 'quiz', 'simulation', 'telehealth', 'logbook', 'certificates', 'payments', 'settings'],
  [NURSING_ROLES.LECTURER]: ['overview', 'profile', 'timeline', 'courses', 'assignments', 'gradebook', 'discussions', 'messages', 'support', 'quiz', 'simulation', 'telehealth', 'reports', 'settings'],
  [NURSING_ROLES.HOD]: ['overview', 'profile', 'timeline', 'institution', 'courses', 'assignments', 'gradebook', 'discussions', 'messages', 'support', 'simulation', 'logbook', 'certificates', 'reports', 'payments', 'settings'],
  [NURSING_ROLES.CLINICAL_COORDINATOR]: ['overview', 'institution', 'messages', 'support', 'simulation', 'telehealth', 'logbook', 'reports', 'settings'],
  [NURSING_ROLES.SUPERVISOR]: ['overview', 'messages', 'support', 'telehealth', 'logbook', 'settings'],
  [NURSING_ROLES.INSTITUTION_ADMIN]: ['overview', 'profile', 'timeline', 'institution', 'courses', 'assignments', 'gradebook', 'discussions', 'messages', 'support', 'quiz', 'simulation', 'telehealth', 'logbook', 'certificates', 'reports', 'payments', 'settings'],
  [NURSING_ROLES.SUPER_ADMIN]: ['overview', 'profile', 'timeline', 'institution', 'courses', 'assignments', 'gradebook', 'discussions', 'messages', 'support', 'quiz', 'simulation', 'telehealth', 'logbook', 'certificates', 'reports', 'payments', 'settings'],
  [NURSING_ROLES.SUPPORT_ADMIN]: ['overview', 'profile', 'timeline', 'institution', 'messages', 'support', 'reports', 'payments', 'settings'],
};

function readSession() {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function writeSession(user) {
  const session = {
    user,
    createdAt: new Date().toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

function clearSession() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function getAuthorizedRoute(user) {
  return user?.route || NURSING_ROLE_ROUTES[user?.role] || '/ng/nursing/login';
}

function hasActiveNursingAccount(user) {
  if (!user || user.status !== 'active') return false;
  if (!user.institutionId) return false;
  if (user.role === NURSING_ROLES.SUPER_ADMIN || user.role === NURSING_ROLES.SUPPORT_ADMIN) return true;
  return Boolean(user.departmentId);
}

function formatCurrency(amount) {
  return `NGN ${Number(amount || 0).toLocaleString('en-NG')}`;
}

async function nursingApiRequest(path, { method = 'GET', body } = {}) {
  const response = await fetch(`/api/nursing${path}`, {
    method,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Nursing platform request failed');
  }
  return data;
}

function percentBar(value, tone = 'emerald') {
  const toneClass = tone === 'cyan' ? 'bg-cyan-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-emerald-600';
  return (
    <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800">
      <div className={cn('h-2 rounded-full', toneClass)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

function SectionHeader({ eyebrow, title, action }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950 dark:text-white">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

function ActionError({ message }) {
  return message ? (
    <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">
      {message}
    </p>
  ) : null;
}

function MetricCard({ label, value, detail, icon: Icon }) {
  return <NursingMetricCard label={label} value={value} detail={detail} icon={Icon} />;
}

function statusBadge(status) {
  const normalized = String(status || '').replace(/_/g, ' ');
  const classes = {
    active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
    paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
    sponsored: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200',
    approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
    issued: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
    eligible: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200',
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
    returned: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  };

  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize', classes[status] || classes.draft)}>
      {normalized}
    </span>
  );
}

export function NursingLandingPage() {
  const seed = useMemo(() => getNursingSeedData(), []);
  const metrics = seed.metrics || getRoleDashboard(NURSING_ROLES.HOD).metrics;
  const landingPillars = [
    {
      title: 'Institution Operations',
      icon: Building2,
      image: nursingImages.hero,
      body: 'Departments, sessions, cohorts, course assignments, and supervisor coverage.',
      proof: ['Cohort planning', 'Supervisor coverage', 'HOD reporting'],
    },
    {
      title: 'Clinical Training',
      icon: Stethoscope,
      image: nursingImages.simulation,
      body: 'Simulation cases, mock telehealth room, triage checklists, and feedback rubrics.',
      proof: ['Simulation bank', 'Telehealth lab', 'Rubric feedback'],
    },
    {
      title: 'Academic Evidence',
      icon: ClipboardList,
      image: nursingImages.logbook,
      body: 'Digital logbook, quiz attempts, certificates, payment access, and HOD reporting.',
      proof: ['Logbook review', 'Certificates', 'Access tracking'],
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <section
        className="relative overflow-hidden border-b border-slate-200 bg-slate-950 text-white"
        style={{ backgroundImage: `linear-gradient(90deg, rgba(2,6,23,0.98), rgba(6,78,59,0.86), rgba(15,23,42,0.62)), url(${nursingImages.hero})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-slate-950/35" aria-hidden="true" />
        <MagicGridPattern />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/ng" className="inline-flex w-fit rounded-lg bg-slate-950 px-3 py-2 text-white dark:bg-black">
              <DoctaRxLogo className="h-8 w-auto" />
            </Link>
            <div className="flex flex-wrap gap-2">
              <Link href="/ng/nursing/login">
                <Button className="bg-emerald-700 text-white hover:bg-emerald-800">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Sign In
                </Button>
              </Link>
              <Link href="/ng/nursing/request-access">
                <Button variant="outline" className="border-white/40 bg-white/12 text-white hover:bg-white hover:text-slate-950">
                  <FilePlus className="mr-2 h-4 w-4" />
                  Request Institutional Access
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-200">
                University of Abuja programme
              </p>
              <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-normal sm:text-5xl">
                DoctaRx Nursing Education & Clinical Training Platform
              </h1>
              <p className="mt-4 max-w-3xl text-lg text-slate-200">
                Digital learning, clinical simulation, telehealth training, and logbook support for modern nursing education.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
              {[
                ['Students', metrics.totalStudents, 'Active learners', Users],
                ['Courses', metrics.coursesActive, 'Nursing modules', BookOpen],
                ['Cases', seed.simulationCases.length, 'Clinical simulations', Microscope],
                ['Readiness', `${metrics.reviewReadiness90Day}%`, '90-day review', BarChart3],
              ].map(([label, value, detail, Icon]) => {
                const StatIcon = Icon || BarChart3;
                return (
                  <div key={label} className="rounded-lg border border-white/20 bg-slate-950/55 p-4 text-white shadow-xl backdrop-blur-xl">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-teal-100">{label}</p>
                        <p className="mt-2 text-2xl font-semibold tracking-normal text-white">{value}</p>
                        <p className="mt-1 text-xs text-slate-200">{detail}</p>
                      </div>
                      <span className="rounded-lg bg-white/12 p-2 text-teal-100 ring-1 ring-white/15">
                        <StatIcon className="h-5 w-5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Platform coverage</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">Built for nursing education operations, practice, and evidence</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-600">Each area connects training records, supervision workflows, institutional reporting, and clinical readiness evidence for the programme.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {landingPillars.map(({ title, Icon, image, body, proof }) => {
            const PillarIcon = Icon || ShieldCheck;
            return (
              <article key={title} className="group overflow-hidden rounded-lg border border-white/70 bg-white/90 shadow-sm shadow-slate-200/70 backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-xl">
                <div
                  className="min-h-56 p-4 text-white"
                  style={{ backgroundImage: `linear-gradient(180deg, rgba(2,6,23,0.24), rgba(2,6,23,0.9)), url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                >
                  <span className="inline-flex rounded-lg bg-white/14 p-2 text-teal-100 ring-1 ring-white/20 backdrop-blur-xl">
                    <PillarIcon className="h-5 w-5" />
                  </span>
                </div>
                <div className="grid gap-4 p-5">
                  <div>
                    <h3 className="text-xl font-semibold tracking-normal text-slate-950">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {proof.map((item) => (
                      <span key={item} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <section className="mt-10 overflow-hidden rounded-lg border border-emerald-100 bg-white shadow-xl shadow-emerald-950/5">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
            <div
              className="min-h-72 p-6 text-white"
              style={{ backgroundImage: `linear-gradient(180deg, rgba(2,6,23,0.18), rgba(2,6,23,0.92)), url(${nursingImages.telehealth})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
              <span className="inline-flex rounded-lg bg-white/15 p-3 text-teal-100 ring-1 ring-white/20 backdrop-blur-xl">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div className="mt-28 max-w-md rounded-lg border border-white/20 bg-slate-950/65 p-4 shadow-2xl backdrop-blur-xl">
                <p className="text-sm font-semibold text-white">Institutional access only</p>
                <p className="mt-2 text-sm leading-6 text-slate-100">
                  Role-based dashboards are opened only after account verification and sign in.
                </p>
              </div>
            </div>
            <div className="grid content-center gap-5 p-6 sm:p-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Authorized Access</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">Authorized Access</h2>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                  This portal is for registered students, lecturers, coordinators, supervisors, and institutional administrators.
                  Sign in with your authorized account to continue.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/ng/nursing/login">
                  <Button className="bg-emerald-700 text-white hover:bg-emerald-800">
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Sign In
                  </Button>
                </Link>
                <Link href="/ng/nursing/request-access">
                  <Button variant="outline" className="border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50">
                    <FilePlus className="mr-2 h-4 w-4" />
                    Request Institutional Access
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </section>
      <NursingFooter />
    </main>
  );
}

export function NursingLoginPage() {
  const seed = useMemo(() => getNursingSeedData(), []);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submitLogin(event) {
    event.preventDefault();
    setError('');

    try {
      const response = await nursingApiRequest('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      const session = writeSession(response.user);
      const requestedRoute = new URLSearchParams(window.location.search).get('next');
      const safeRequestedRoute = requestedRoute
        && (requestedRoute.startsWith('/ng/nursing') || requestedRoute.startsWith('/ng/education'))
        && !requestedRoute.startsWith('//')
        ? requestedRoute
        : null;
      router.push(safeRequestedRoute || getAuthorizedRoute(session.user));
    } catch (requestError) {
      setError(requestError.message || 'Credentials were not recognized.');
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <section className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <Link href="/ng/nursing" className="inline-flex rounded-lg bg-slate-950 px-3 py-2 text-white dark:bg-black">
              <DoctaRxLogo className="h-8 w-auto" />
            </Link>
            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              Nursing education portal
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal">
              DoctaRx Nursing Education & Clinical Training Platform
            </h1>
            <p className="mt-3 text-slate-600 dark:text-slate-300">
              University of Abuja nursing education portal with clinical training, academic records, and authorized role-based access.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <MetricCard label="Roles" value="8" detail="RBAC profiles" icon={ShieldCheck} />
            <MetricCard label="Cases" value="10" detail="Simulation bank" icon={Microscope} />
          </div>
        </section>

        <section className="grid gap-4">
          <Card className="rounded-lg border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-2xl tracking-normal">Secure Sign In</CardTitle>
              <CardDescription>Use your assigned institutional credentials.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={submitLogin}>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
                </div>
                {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
                <Button type="submit" className="bg-emerald-700 text-white hover:bg-emerald-800">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Sign In
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-xl tracking-normal">Institution Access</CardTitle>
              <CardDescription>After sign in, the platform opens the correct area for the authorized account.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  ['Verified identity', 'Only assigned institutional accounts can continue.', ShieldCheck],
                  ['Role routing', 'Dashboards open from account permissions after sign in.', LayoutDashboard],
                  ['Access review', 'New institutions can request onboarding review.', FilePlus],
                ].map(([title, body, Icon]) => (
                  <div key={title} className="rounded-lg border border-slate-200 p-3 text-left dark:border-slate-800">
                    <Icon className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                    <p className="mt-3 font-semibold text-slate-950 dark:text-white">{title}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{body}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

export function NursingRequestAccessPage() {
  const [form, setForm] = useState({
    fullName: '',
    institution: '',
    department: '',
    roleRequested: NURSING_ROLES.STUDENT,
    email: '',
    phone: '',
    message: '',
  });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitRequest(event) {
    event.preventDefault();
    setError('');
    const request = {
      ...form,
      fullName: form.fullName.trim(),
      institution: form.institution.trim(),
      department: form.department.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      message: form.message.trim(),
      submittedAt: new Date().toISOString(),
    };

    if (!request.fullName || !request.institution || !request.department || !request.email || !request.phone) {
      setError('Complete the required fields before submitting.');
      return;
    }

    setStatus('submitting');
    try {
      await nursingApiRequest('/access-requests', {
        method: 'POST',
        body: request,
      });
      setStatus('submitted');
    } catch (requestError) {
      setStatus('idle');
      setError(requestError.message || 'The access request could not be submitted. Please try again.');
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
        <section
          className="relative overflow-hidden rounded-lg border border-white/20 bg-slate-950 p-6 text-white shadow-2xl"
          style={{ backgroundImage: `linear-gradient(180deg, rgba(2,6,23,0.36), rgba(2,6,23,0.94)), url(${nursingImages.logbook})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="relative flex min-h-[620px] flex-col justify-between">
            <Link href="/ng/nursing" className="inline-flex w-fit rounded-lg bg-slate-950/75 px-3 py-2 text-white ring-1 ring-white/15">
              <DoctaRxLogo className="h-8 w-auto" />
            </Link>
            <div className="max-w-lg rounded-lg border border-white/20 bg-slate-950/70 p-5 shadow-2xl backdrop-blur-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-200">Access review</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">Request Institutional Access</h1>
              <p className="mt-3 leading-7 text-slate-100">
                Submit an onboarding request for a nursing student, academic staff member, supervisor, or institution administrator.
              </p>
            </div>
          </div>
        </section>

        <section className="grid content-center">
          <Card className="rounded-lg border-slate-200 bg-white shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-2xl tracking-normal">Institutional Access Request</CardTitle>
              <CardDescription>Requests are reviewed by the institution or platform administration team before account activation.</CardDescription>
            </CardHeader>
            <CardContent>
              {status === 'submitted' ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
                  <CheckCircle className="h-8 w-8" />
                  <h2 className="mt-4 text-xl font-semibold tracking-normal">Request Received</h2>
                  <p className="mt-2 text-sm leading-6">
                    Your institutional access request has been recorded for review. A coordinator or administrator will contact you after verification.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link href="/ng/nursing/login">
                      <Button className="bg-emerald-700 text-white hover:bg-emerald-800">
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/ng/nursing">
                      <Button variant="outline" className="border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50">
                        Platform Overview
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <form className="grid gap-4" onSubmit={submitRequest}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input id="fullName" value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} autoComplete="name" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} autoComplete="email" required />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="institution">Institution</Label>
                      <Input id="institution" value={form.institution} onChange={(event) => updateField('institution', event.target.value)} required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="department">Department</Label>
                      <Input id="department" value={form.department} onChange={(event) => updateField('department', event.target.value)} required />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="roleRequested">Role Requested</Label>
                      <select
                        id="roleRequested"
                        value={form.roleRequested}
                        onChange={(event) => updateField('roleRequested', event.target.value)}
                        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      >
                        {[
                          NURSING_ROLES.STUDENT,
                          NURSING_ROLES.LECTURER,
                          NURSING_ROLES.HOD,
                          NURSING_ROLES.CLINICAL_COORDINATOR,
                          NURSING_ROLES.SUPERVISOR,
                          NURSING_ROLES.INSTITUTION_ADMIN,
                          NURSING_ROLES.SUPPORT_ADMIN,
                        ].map((role) => (
                          <option key={role} value={role}>{NURSING_ROLE_LABELS[role]}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} autoComplete="tel" required />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea id="message" value={form.message} onChange={(event) => updateField('message', event.target.value)} rows={5} />
                  </div>
                  {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
                  <div className="flex flex-wrap gap-3">
                    <Button type="submit" className="bg-emerald-700 text-white hover:bg-emerald-800" disabled={status === 'submitting'}>
                      <Send className="mr-2 h-4 w-4" />
                      {status === 'submitting' ? 'Submitting' : 'Submit Request'}
                    </Button>
                    <Link href="/ng/nursing/login">
                      <Button type="button" variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                        Sign In
                      </Button>
                    </Link>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

export function NursingUnauthorizedPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);

  useEffect(() => {
    setSession(readSession());
  }, []);

  async function signOut() {
    await nursingApiRequest('/auth/logout', { method: 'POST' }).catch(() => null);
    clearSession();
    router.push('/ng/nursing/login');
  }

  const dashboardRoute = getAuthorizedRoute(session?.user);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto flex min-h-screen max-w-4xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <Card className="w-full rounded-lg border-slate-200 bg-white shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-200">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl tracking-normal">Access Not Authorized</CardTitle>
            <CardDescription>
              Your account is not authorized for this nursing platform area. Use your assigned dashboard, sign out, or request access review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Link href={session?.user ? dashboardRoute : '/ng/nursing/login'}>
                <Button className="bg-emerald-700 text-white hover:bg-emerald-800">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Go to My Dashboard
                </Button>
              </Link>
              <Button type="button" variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200" onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
              <Link href="/ng/nursing/request-access">
                <Button variant="outline" className="border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50">
                  <FilePlus className="mr-2 h-4 w-4" />
                  Request Access
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function NursingShell({ role, session, onLogout, activeTab, onTabChange, tabs, notifications = [], children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const currentRoleLabel = NURSING_ROLE_LABELS[role] || 'Nursing Dashboard';
  const activeLabel = tabs.find((tab) => tab.id === activeTab)?.label || 'Overview';
  const unread = notifications.filter((notification) => !notification.isRead && notification.userId === session.user.id).length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      {mobileOpen ? <button className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation" /> : null}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-[19rem] max-w-[19rem] flex-col bg-slate-950 p-4 text-white shadow-2xl transition-transform lg:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-center justify-between gap-3">
          <Link href="/ng/nursing" className="inline-flex rounded-lg bg-white/10 px-3 py-2 text-white ring-1 ring-white/10">
            <DoctaRxLogo className="h-7 w-auto" />
          </Link>
          <button type="button" className="rounded-lg p-2 text-slate-300 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 rounded-lg border border-white/10 bg-white/10 p-3 shadow-lg backdrop-blur-xl">
          <p className="text-sm font-semibold text-white">{currentRoleLabel}</p>
          <p className="mt-1 truncate text-xs text-slate-300">
            {session.user.firstName} {session.user.lastName}
          </p>
          <p className="mt-2 text-xs text-teal-200">University of Abuja</p>
        </div>
        <nav className="mt-5 grid flex-1 content-start gap-1 overflow-y-auto pr-1">
          {tabs.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onTabChange(item.id);
                  setMobileOpen(false);
                }}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition',
                  isActive
                    ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-950/20'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
          {role === NURSING_ROLES.STUDENT ? (
            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Medication learning</p>
              <div className="grid gap-1">
                {medicationEducationNavigation.map((item) => {
                  const active = item.href === '/ng/education/medications'
                    ? pathname === item.href || pathname.startsWith(`${item.href}/`)
                    : pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                        active ? 'bg-teal-500 text-slate-950' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
        </nav>
        {SHOW_ROLE_SWITCHER ? (
          <div className="mt-4 rounded-lg border border-white/10 bg-slate-900/80 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Role portals</p>
            <div className="mt-2 grid gap-1">
              {roleNavigation.slice(0, 4).map((item) => (
                <Link key={item.href} href={item.href} className={cn('flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-300 hover:bg-white/10', pathname === item.href && 'text-teal-200')}>
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
        <button
          type="button"
          onClick={onLogout}
          className="mt-4 flex w-full items-center gap-3 rounded-lg border border-white/10 px-3 py-2.5 text-sm font-medium text-rose-200 hover:bg-rose-500/10"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </aside>

      <div className="lg:pl-[19rem]">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur-xl">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button type="button" className="rounded-lg border border-slate-200 p-2 lg:hidden dark:border-slate-800" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                  {activeLabel}
                </p>
                <h1 className="text-lg font-semibold tracking-normal">{currentRoleLabel}</h1>
              </div>
            </div>
            <div className="hidden min-w-0 flex-1 justify-center md:flex">
              <label className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input className="h-10 rounded-lg border-slate-200 bg-slate-50 pl-9" placeholder="Search courses, students, posts, logs" />
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="relative rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50" aria-label="Notifications">
                <Bell className="h-5 w-5" />
                {unread ? <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-semibold text-white">{unread}</span> : null}
              </button>
              <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 sm:flex">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-semibold text-white">
                  {initials(session.user)}
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </div>
            </div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1500px]">{children}</div>
        </main>
        <NursingFooter compact />
      </div>
    </div>
  );
}

export function NursingDashboardPage({ role, initialTab = 'overview' }) {
  const router = useRouter();
  const seed = useMemo(() => getNursingSeedData(), []);
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    let active = true;
    async function openSession() {
      try {
        const response = await nursingApiRequest('/session');
        if (!active) return;
        const verifiedSession = writeSession(response.user);
        if (!hasActiveNursingAccount(verifiedSession.user)) {
          router.push('/ng/nursing/unauthorized?reason=account');
          return;
        }
        const route = getAuthorizedRoute(verifiedSession.user);
        if (role && route && route !== NURSING_ROLE_ROUTES[role] && verifiedSession.user.role !== role) {
          router.push(route);
          return;
        }
        setSession(verifiedSession);
      } catch {
        clearSession();
        router.push('/ng/nursing/login');
      }
    }
    openSession();
    return () => {
      active = false;
    };
  }, [role, router]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <NursingLoadingState label="Opening nursing workspace" />
      </div>
    );
  }

  const effectiveRole = role || session.user.role || NURSING_ROLES.STUDENT;
  const dashboard = getRoleDashboard(effectiveRole);
  const visibleTabs = moduleTabs.filter((tab) => roleDefaultTabs[effectiveRole]?.includes(tab.id));

  async function logout() {
    await nursingApiRequest('/auth/logout', { method: 'POST' }).catch(() => null);
    clearSession();
    router.push('/ng/nursing/login');
  }

  return (
    <NursingShell
      role={effectiveRole}
      session={session}
      onLogout={logout}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      tabs={visibleTabs}
      notifications={seed.notifications}
    >
      {activeTab === 'overview' ? <OverviewSection dashboard={dashboard} seed={seed} role={effectiveRole} onNavigate={setActiveTab} /> : null}
      {activeTab === 'profile' ? <StudentProfileSection seed={seed} role={effectiveRole} session={session} /> : null}
      {activeTab === 'timeline' ? <TimelineSection seed={seed} role={effectiveRole} session={session} /> : null}
      {activeTab === 'institution' ? <InstitutionSection seed={seed} role={effectiveRole} session={session} /> : null}
      {activeTab === 'courses' ? <CoursesSection seed={seed} role={effectiveRole} session={session} /> : null}
      {activeTab === 'assignments' ? <AssignmentsSection seed={seed} role={effectiveRole} session={session} /> : null}
      {activeTab === 'gradebook' ? <GradebookSection seed={seed} role={effectiveRole} session={session} /> : null}
      {activeTab === 'discussions' ? <DiscussionsSection seed={seed} role={effectiveRole} session={session} /> : null}
      {activeTab === 'messages' ? <MessagesSection seed={seed} role={effectiveRole} session={session} /> : null}
      {activeTab === 'support' ? <NursingSupportCenter /> : null}
      {activeTab === 'quiz' ? <QuizSection seed={seed} role={effectiveRole} session={session} /> : null}
      {activeTab === 'simulation' ? <SimulationSection seed={seed} role={effectiveRole} session={session} /> : null}
      {activeTab === 'telehealth' ? <TelehealthLabSection seed={seed} role={effectiveRole} session={session} /> : null}
      {activeTab === 'logbook' ? <LogbookSection seed={seed} role={effectiveRole} session={session} /> : null}
      {activeTab === 'certificates' ? <CertificateSection seed={seed} role={effectiveRole} session={session} /> : null}
      {activeTab === 'reports' ? <ReportsSection seed={seed} role={effectiveRole} /> : null}
      {activeTab === 'payments' ? <PaymentsSection seed={seed} role={effectiveRole} session={session} /> : null}
      {activeTab === 'settings' ? <SettingsSection seed={seed} role={effectiveRole} session={session} /> : null}
    </NursingShell>
  );
}

function OverviewSection({ dashboard, seed, role, onNavigate }) {
  const iconMap = [Users, BookOpen, Award, BarChart3];
  const roleOverview = {
    [NURSING_ROLES.STUDENT]: {
      eyebrow: 'Student learning hub',
      title: 'Continue learning, complete clinical practice, and keep your academic evidence current.',
      body: 'Open assigned courses, submit coursework, practice clinical reasoning, and follow supervisor feedback from one secure workspace.',
      actions: [
        ['Continue learning', BookOpen, 'courses'],
        ['Update logbook', ClipboardList, 'logbook'],
        ['Open live support', Headphones, 'support'],
      ],
    },
    [NURSING_ROLES.LECTURER]: {
      eyebrow: 'Teaching workspace',
      title: 'Plan learning, assess performance, and guide students across academic and clinical activities.',
      body: 'Manage course content, grade submissions, review discussion activity, and schedule focused support for your students.',
      actions: [
        ['Manage courses', BookOpen, 'courses'],
        ['Open gradebook', BookMarked, 'gradebook'],
        ['Schedule office hours', Headphones, 'support'],
      ],
    },
    [NURSING_ROLES.HOD]: {
      eyebrow: 'Department command center',
      title: 'Guide programme quality with clear learning, clinical, and operational evidence.',
      body: 'Monitor student engagement, course delivery, supervisor reviews, access status, and reporting readiness across the department.',
      actions: [
        ['Open reports', BarChart3, 'reports'],
        ['Review clinical logs', ClipboardList, 'logbook'],
        ['Manage live support', Headphones, 'support'],
      ],
    },
    [NURSING_ROLES.CLINICAL_COORDINATOR]: {
      eyebrow: 'Clinical coordination',
      title: 'Coordinate placements, supervision, simulation, and evidence review across cohorts.',
      body: 'Track pending logbook reviews, clinical activity, supervisor coverage, and support requests requiring follow-up.',
      actions: [
        ['Review logbooks', ClipboardList, 'logbook'],
        ['Open simulations', Microscope, 'simulation'],
        ['Manage support queue', Headphones, 'support'],
      ],
    },
    [NURSING_ROLES.SUPERVISOR]: {
      eyebrow: 'Supervisor workspace',
      title: 'Review clinical evidence, sign off skills, and give students timely guidance.',
      body: 'Work through assigned logbook entries, review telehealth practice, and resolve student questions during support hours.',
      actions: [
        ['Review logbooks', ClipboardList, 'logbook'],
        ['Telehealth review', Video, 'telehealth'],
        ['Open support queue', Headphones, 'support'],
      ],
    },
    [NURSING_ROLES.SUPPORT_ADMIN]: {
      eyebrow: 'Platform support operations',
      title: 'Resolve access, technical, and institutional support requests with a complete history.',
      body: 'Monitor the waiting queue, coordinate escalations, review access status, and keep service communication accountable.',
      actions: [
        ['Manage support queue', Headphones, 'support'],
        ['Review access records', CreditCard, 'payments'],
        ['Open reports', BarChart3, 'reports'],
      ],
    },
    [NURSING_ROLES.INSTITUTION_ADMIN]: {
      eyebrow: 'Institution operations',
      title: 'Manage people, programmes, access, and academic evidence across the institution.',
      body: 'Coordinate courses, monitor participation, verify access records, and support accountable department operations.',
      actions: [
        ['Manage institution', Building2, 'institution'],
        ['Verify access', CreditCard, 'payments'],
        ['Manage support queue', Headphones, 'support'],
      ],
    },
    [NURSING_ROLES.SUPER_ADMIN]: {
      eyebrow: 'Platform administration',
      title: 'Govern institutions, academic operations, access, and platform-wide service quality.',
      body: 'Review institutional activity, oversee access controls, monitor reporting, and support multi-school rollout readiness.',
      actions: [
        ['Manage institutions', Building2, 'institution'],
        ['Open reports', BarChart3, 'reports'],
        ['Manage support queue', Headphones, 'support'],
      ],
    },
  }[role] || {
    eyebrow: 'Nursing education workspace',
    title: 'Learning, clinical practice, and academic evidence in one secure workspace.',
    body: 'Use the modules available to your assigned institutional role.',
    actions: [['Open live support', Headphones, 'support']],
  };
  return (
    <section>
      <SectionHeader eyebrow="Dashboard" title={`${dashboard.roleLabel} workspace`} />
      <div
        className="mb-6 overflow-hidden rounded-lg border border-white/70 bg-slate-950 p-5 text-white shadow-xl"
        style={{ backgroundImage: `linear-gradient(90deg, rgba(2,6,23,0.95), rgba(15,23,42,0.72), rgba(15,23,42,0.2)), url(${nursingImages.hero})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">{roleOverview.eyebrow}</p>
            <h3 className="mt-2 max-w-3xl text-3xl font-semibold tracking-normal">{roleOverview.title}</h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">{roleOverview.body}</p>
          </div>
          <div className="grid gap-3 rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur-xl">
            {roleOverview.actions.map(([label, Icon, tab]) => (
              <button key={label} type="button" onClick={() => onNavigate(tab)} className="flex items-center gap-3 rounded-lg bg-white/12 px-3 py-2 text-left text-sm font-medium text-white transition hover:bg-white/20">
                <Icon className="h-4 w-4 text-teal-200" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboard.cards.map(([label, value, detail], index) => (
          <MetricCard key={label} label={label} value={value} detail={detail} icon={iconMap[index] || LayoutDashboard} />
        ))}
      </div>

      {[NURSING_ROLES.HOD, NURSING_ROLES.INSTITUTION_ADMIN, NURSING_ROLES.SUPER_ADMIN].includes(role) ? (
        <div className="mt-6">
          <NursingAnalyticsPanel metrics={dashboard.metrics} seed={seed} />
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-lg border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-xl tracking-normal">Programme Health</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {[
              ['Quiz completion', dashboard.metrics.quizCompletion, 'emerald'],
              ['Simulation completion', dashboard.metrics.simulationCompletion, 'cyan'],
              ['90-day review readiness', dashboard.metrics.reviewReadiness90Day, 'amber'],
            ].map(([label, value, tone]) => (
              <div key={label}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">{label}</span>
                  <span>{value}%</span>
                </div>
                {percentBar(value, tone)}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-lg border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-xl tracking-normal">Announcements</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {seed.announcements
              .filter((announcement) => announcement.audience === 'all' || announcement.audience === role || role !== NURSING_ROLES.STUDENT)
              .map((announcement) => (
                <div key={announcement.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <p className="font-semibold">{announcement.title}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{announcement.body}</p>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function getDisplayUser(seed, userId) {
  return seed.users.find((user) => user.id === userId) || seed.users[0];
}

function initials(user) {
  return `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}` || 'N';
}

function courseImage(course, index = 0) {
  const title = `${course?.title || ''} ${course?.category || ''}`.toLowerCase();
  if (title.includes('simulation') || title.includes('clinical')) return nursingImages.simulation;
  if (title.includes('telehealth')) return nursingImages.telehealth;
  if (title.includes('logbook')) return nursingImages.logbook;
  return index % 2 === 0 ? nursingImages.lms : nursingImages.hero;
}

function StudentProfileSection({ seed, role, session }) {
  const defaultUserId = role === NURSING_ROLES.STUDENT ? session.user.id : 'user-student-01';
  const [selectedUserId, setSelectedUserId] = useState(defaultUserId);
  const selectedUser = getDisplayUser(seed, selectedUserId);
  const [profile, setProfile] = useState(seed.userProfiles.find((item) => item.userId === selectedUserId) || seed.userProfiles[0]);
  const [actionError, setActionError] = useState('');
  const enrollments = seed.courseEnrollments.filter((item) => item.studentId === selectedUserId);
  const certificates = seed.certificates.filter((item) => item.studentId === selectedUserId);
  const profilePosts = seed.timelinePosts.filter((item) => item.authorId === selectedUserId);
  const profileComments = seed.timelineComments.filter((item) => item.authorId === selectedUserId);
  const logbook = seed.logbookEntries.filter((item) => item.studentId === selectedUserId);
  const grades = seed.grades.filter((item) => item.studentId === selectedUserId);
  const canSelectStudent = role !== NURSING_ROLES.STUDENT;

  useEffect(() => {
    setProfile(seed.userProfiles.find((item) => item.userId === selectedUserId) || seed.userProfiles[0]);
  }, [seed.userProfiles, selectedUserId]);

  async function saveProfile(event) {
    event.preventDefault();
    setActionError('');
    try {
      const response = await nursingApiRequest(`/profiles/${selectedUserId}`, {
        method: 'PATCH',
        session,
        body: {
          bio: profile.bio,
          phone: profile.phone,
          skills: profile.skills,
          interests: profile.interests,
        },
      });
      setProfile(response.profile);
    } catch (error) {
      setActionError(error.message);
    }
  }

  return (
    <section>
      <SectionHeader
        eyebrow="Student Profile"
        title="Academic Identity and Progress"
        action={canSelectStudent ? (
          <select
            value={selectedUserId}
            onChange={(event) => setSelectedUserId(event.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
          >
            {seed.users.filter((user) => user.role === NURSING_ROLES.STUDENT).slice(0, 10).map((user) => (
              <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>
            ))}
          </select>
        ) : null}
      />
      <ActionError message={actionError} />
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-4">
          <StudentProfileHeader
            user={selectedUser}
            profile={profile}
            institution={seed.institution}
            department={seed.departments[0]}
            cohort={seed.cohorts.find((item) => item.id === selectedUser.cohortId)}
            initials={initials(selectedUser)}
            coverImage={nursingImages.logbook}
          />
          <Card className="rounded-lg border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-6">
              <form className="grid gap-4" onSubmit={saveProfile}>
                <div className="grid gap-2">
                  <Label htmlFor="profile-phone">Phone</Label>
                  <Input id="profile-phone" value={profile.phone || ''} onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="profile-bio">About</Label>
                  <Textarea id="profile-bio" rows={4} value={profile.bio || ''} onChange={(event) => setProfile((current) => ({ ...current, bio: event.target.value }))} />
                </div>
                <Button type="submit" className="bg-teal-700 text-white hover:bg-teal-800">
                  <Edit3 className="mr-2 h-4 w-4" />
                  Save Profile
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            <MetricCard label="Courses" value={enrollments.length} detail="Enrolled courses" icon={BookOpen} />
            <MetricCard label="Average grade" value={`${grades.find((grade) => grade.score)?.score || 82}%`} detail="Current gradebook" icon={Star} />
            <MetricCard label="Certificates" value={certificates.length} detail="Issued or eligible" icon={Award} />
          </div>
          <Card className="rounded-lg border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-xl tracking-normal">Profile Activity</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="flex justify-between"><span>Timeline posts</span><strong>{profilePosts.length}</strong></div>
              <div className="flex justify-between"><span>Comments made</span><strong>{profileComments.length}</strong></div>
              <div className="flex justify-between"><span>Logbook entries</span><strong>{logbook.length}</strong></div>
              <div className="flex flex-wrap gap-2 pt-2">
                {(profile.skills || []).map((skill) => (
                  <span key={skill} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{skill}</span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function TimelineSection({ seed, role, session }) {
  const [posts, setPosts] = useState(seed.timelinePosts);
  const [comments, setComments] = useState(seed.timelineComments);
  const [reactions, setReactions] = useState(seed.timelineReactions);
  const [body, setBody] = useState('');
  const [scope, setScope] = useState('department');
  const [commentDrafts, setCommentDrafts] = useState({});
  const [actionError, setActionError] = useState('');
  const canModerate = canNursingRole(role, 'moderateTimeline');

  async function submitPost(event) {
    event.preventDefault();
    if (!body.trim()) return;
    const post = {
      id: `post-local-${Date.now()}`,
      authorId: session.user.id,
      institutionId: seed.institution.id,
      departmentId: seed.departments[0].id,
      cohortId: session.user.cohortId || null,
      courseId: null,
      scope,
      type: role === NURSING_ROLES.STUDENT ? 'post' : 'announcement',
      title: scope === 'course' ? 'Course update' : 'Academic update',
      body,
      pinned: false,
      status: 'published',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setActionError('');
    try {
      const response = await nursingApiRequest('/timeline/posts', { method: 'POST', session, body: post });
      setPosts((current) => [response.post, ...current]);
      setBody('');
    } catch (error) {
      setActionError(error.message);
    }
  }

  async function addComment(postId) {
    const draft = (commentDrafts[postId] || '').trim();
    if (!draft) return;
    const comment = {
      id: `comment-local-${Date.now()}`,
      postId,
      authorId: session.user.id,
      body: draft,
      status: 'published',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setActionError('');
    try {
      const response = await nursingApiRequest(`/timeline/posts/${postId}/comments`, { method: 'POST', session, body: comment });
      setComments((current) => [...current, response.comment]);
      setCommentDrafts((current) => ({ ...current, [postId]: '' }));
    } catch (error) {
      setActionError(error.message);
    }
  }

  async function reactToPost(postId) {
    const reaction = {
      id: `reaction-local-${Date.now()}`,
      postId,
      userId: session.user.id,
      reactionType: 'helpful',
    };
    setActionError('');
    try {
      const response = await nursingApiRequest(`/timeline/posts/${postId}/reactions`, { method: 'POST', session, body: reaction });
      setReactions((current) => [...current, response.reaction]);
    } catch (error) {
      setActionError(error.message);
    }
  }

  async function moderatePost(postId) {
    const nextStatus = posts.find((post) => post.id === postId)?.status === 'hidden' ? 'published' : 'hidden';
    setActionError('');
    try {
      const response = await nursingApiRequest(`/timeline/posts/${postId}/moderate`, {
        method: 'PATCH',
        session,
        body: { status: nextStatus, moderationNote: nextStatus === 'hidden' ? 'Hidden by academic moderator' : 'Restored by academic moderator' },
      });
      setPosts((current) => current.map((post) => (post.id === postId ? response.post : post)));
    } catch (error) {
      setActionError(error.message);
    }
  }

  return (
    <section>
      <SectionHeader eyebrow="Academic Community" title="Professional Timeline" />
      <ActionError message={actionError} />
      <div className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
        <TimelineComposer
          user={session.user}
          initials={initials(session.user)}
          scope={scope}
          onScopeChange={setScope}
          body={body}
          onBodyChange={setBody}
          onSubmit={submitPost}
        />

        <div className="grid gap-4">
          {posts.length === 0 ? (
            <NursingEmptyState title="No timeline activity" description="Academic posts, cohort questions, and announcements will appear here." icon={MessageSquare} />
          ) : posts.map((post) => {
            const author = getDisplayUser(seed, post.authorId);
            const postComments = comments.filter((comment) => comment.postId === post.id);
            const postReactions = reactions.filter((reaction) => reaction.postId === post.id);
            return (
              <TimelinePostCard
                key={post.id}
                post={post}
                author={author}
                initials={initials(author)}
                comments={postComments}
                reactions={postReactions}
                commentDraft={commentDrafts[post.id] || ''}
                onCommentDraft={(value) => setCommentDrafts((current) => ({ ...current, [post.id]: value }))}
                onComment={() => addComment(post.id)}
                onReact={() => reactToPost(post.id)}
                onModerate={() => moderatePost(post.id)}
                canModerate={canModerate}
                renderUser={(userId) => getDisplayUser(seed, userId)}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function InstitutionSection({ seed, role, session }) {
  const [cohorts, setCohorts] = useState(seed.cohorts);
  const [newCohort, setNewCohort] = useState('');
  const [actionError, setActionError] = useState('');
  const canManage = canNursingRole(role, 'manageInstitution');

  async function addCohort(event) {
    event.preventDefault();
    if (!newCohort.trim()) return;
    setActionError('');
    try {
      const response = await nursingApiRequest('/cohorts', {
        method: 'POST',
        session,
        body: { name: newCohort.trim(), level: newCohort.trim(), academicSessionId: seed.academicSessions[0]?.id },
      });
      setCohorts((current) => [...current, response.cohort]);
      setNewCohort('');
    } catch (error) {
      setActionError(error.message);
    }
  }

  return (
    <section>
      <SectionHeader
        eyebrow="Institution"
        title="Academic Session Management"
        action={canManage ? (
          <form className="flex gap-2" onSubmit={addCohort}>
            <Input value={newCohort} onChange={(event) => setNewCohort(event.target.value)} placeholder="New cohort" className="h-10" />
            <Button type="submit" size="sm" className="bg-emerald-700 text-white hover:bg-emerald-800">
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </form>
        ) : null}
      />
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="rounded-lg border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-xl tracking-normal">{seed.institution.name}</CardTitle>
            <CardDescription>{seed.departments[0].name}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
              <span>Location</span>
              <span className="font-medium">{seed.institution.city}, {seed.institution.state}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
              <span>Session</span>
              <span className="font-medium">{seed.academicSessions[0].name}</span>
            </div>
            <div className="flex justify-between">
              <span>Status</span>
              {statusBadge(seed.institution.status)}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-xl tracking-normal">Cohorts and Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <tr>
                    <th className="py-2">Cohort</th>
                    <th className="py-2">Students</th>
                    <th className="py-2">Academic Session</th>
                    <th className="py-2">Supervisor Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {cohorts.map((cohort, index) => (
                    <tr key={cohort.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-3 font-medium">{cohort.name}</td>
                      <td className="py-3">{cohort.studentCount}</td>
                      <td className="py-3">{seed.academicSessions[0].name}</td>
                      <td className="py-3">{index % 2 === 0 ? 'Fatima Yakubu' : 'John Odey'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function CoursesSection({ seed, role, session }) {
  const [courses, setCourses] = useState(seed.courses);
  const [lessons, setLessons] = useState(seed.lessons);
  const [progress, setProgress] = useState(seed.lessonProgress);
  const [selectedCourseId, setSelectedCourseId] = useState(seed.courses[0]?.id);
  const [title, setTitle] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonMinutes, setLessonMinutes] = useState(45);
  const [actionError, setActionError] = useState('');
  const canManage = canNursingRole(role, 'manageCourses');
  const canCompleteLesson = canNursingRole(role, 'completeLesson');
  const selectedCourse = courses.find((course) => course.id === selectedCourseId) || courses[0];
  const courseSections = seed.courseSections.filter((section) => section.courseId === selectedCourse?.id);
  const courseLessons = lessons.filter((lesson) => lesson.courseId === selectedCourse?.id);
  const courseEnrollments = seed.courseEnrollments.filter((enrollment) => enrollment.courseId === selectedCourse?.id);
  const completedLessonIds = new Set(progress.filter((item) => item.studentId === session.user.id && item.status === 'completed').map((item) => item.lessonId));

  async function addCourse(event) {
    event.preventDefault();
    if (!title.trim()) return;
    const course = {
      id: `course-${Date.now()}`,
      code: `NUR-${courses.length + 101}`,
      title: title.trim(),
      lecturerId: session.user.id,
      status: 'draft',
      adoptionRate: 0,
      completionRate: 0,
      category: 'Core Nursing',
      level: 'Department elective',
      durationHours: 18,
      learningObjectives: ['Define course outcomes', 'Publish lesson sequence'],
      modules: ['Draft module outline'],
    };
    setActionError('');
    try {
      const response = await nursingApiRequest('/courses', { method: 'POST', session, body: course });
      setCourses((current) => [response.course, ...current]);
      setSelectedCourseId(response.course.id);
      setTitle('');
    } catch (error) {
      setActionError(error.message);
    }
  }

  async function addLesson(event) {
    event.preventDefault();
    if (!lessonTitle.trim() || !selectedCourse) return;
    const lesson = {
      id: `lesson-local-${Date.now()}`,
      courseId: selectedCourse.id,
      sectionId: courseSections[0]?.id || null,
      title: lessonTitle.trim(),
      contentType: 'video',
      estimatedMinutes: Number(lessonMinutes) || 45,
      materialStatus: 'draft',
      sortOrder: courseLessons.length + 1,
      objectives: ['Publish lesson content', 'Attach supporting resources'],
      resources: [],
    };
    setActionError('');
    try {
      const response = await nursingApiRequest(`/courses/${selectedCourse.id}/lessons`, { method: 'POST', session, body: lesson });
      setLessons((current) => [...current, response.lesson]);
      setLessonTitle('');
      setLessonMinutes(45);
    } catch (error) {
      setActionError(error.message);
    }
  }

  async function completeLesson(lesson) {
    const item = {
      id: `progress-local-${Date.now()}`,
      lessonId: lesson.id,
      courseId: lesson.courseId,
      studentId: session.user.id,
      status: 'completed',
      progressPercent: 100,
      completedAt: new Date().toISOString(),
    };
    setActionError('');
    try {
      const response = await nursingApiRequest(`/lessons/${lesson.id}/progress`, { method: 'POST', session, body: item });
      setProgress((current) => [...current.filter((entry) => !(entry.lessonId === lesson.id && entry.studentId === session.user.id)), response.progress]);
    } catch (error) {
      setActionError(error.message);
    }
  }

  return (
    <section>
      <SectionHeader
        eyebrow="Nursing LMS"
        title="Courses, Lessons, and Progress"
      />
      <ActionError message={actionError} />
      {canManage ? (
        <div className="mb-5">
          <CourseBuilder
            title={title}
            onTitleChange={setTitle}
            onCreateCourse={addCourse}
            lessonTitle={lessonTitle}
            onLessonTitleChange={setLessonTitle}
            lessonMinutes={lessonMinutes}
            onLessonMinutesChange={setLessonMinutes}
            onAddLesson={addLesson}
          />
        </div>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="grid gap-3">
          {courses.map((course, index) => (
            <CourseProgressCard
              key={course.id}
              course={course}
              selected={selectedCourse?.id === course.id}
              onSelect={() => setSelectedCourseId(course.id)}
              imageSrc={courseImage(course, index)}
            />
          ))}
        </div>

        <Card className="rounded-lg border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl tracking-normal">{selectedCourse?.title}</CardTitle>
                <CardDescription>{selectedCourse?.description || 'Structured nursing course with tracked lessons, resources, and completion.'}</CardDescription>
              </div>
              <div className="flex gap-2">
                {statusBadge(selectedCourse?.status)}
                <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200">{courseEnrollments.length} enrolled</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-2 sm:grid-cols-2">
              {(selectedCourse?.learningObjectives || []).map((objective) => (
                <div key={objective} className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  <span>{objective}</span>
                </div>
              ))}
            </div>

            <div className="grid gap-3">
              {courseSections.map((section) => (
                <div key={section.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <p className="font-semibold">{section.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{section.description}</p>
                  <div className="mt-3 grid gap-2">
                    {courseLessons.filter((lesson) => lesson.sectionId === section.id || (!lesson.sectionId && section.sortOrder === 1)).map((lesson) => (
                      <div key={lesson.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-950">
                        <div className="flex items-center gap-2">
                          <PlayCircle className="h-4 w-4 text-emerald-700" />
                          <span className="font-medium">{lesson.title}</span>
                          <span className="text-slate-500">{lesson.estimatedMinutes} min</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {completedLessonIds.has(lesson.id) ? statusBadge('completed') : statusBadge(lesson.materialStatus)}
                          {canCompleteLesson && !completedLessonIds.has(lesson.id) ? (
                            <Button type="button" size="sm" variant="outline" onClick={() => completeLesson(lesson)}>Complete</Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-5">
        <LessonPlayer
          course={selectedCourse}
          lessons={courseLessons}
          completedLessonIds={completedLessonIds}
          canCompleteLesson={canCompleteLesson}
          onComplete={completeLesson}
        />
      </div>

      <Card className="mt-5 rounded-lg border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-xl tracking-normal">Lessons</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <tr>
                  <th className="py-2">Lesson</th>
                  <th className="py-2">Course</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Minutes</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {seed.lessons.map((lesson) => (
                  <tr key={lesson.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-3 font-medium">{lesson.title}</td>
                    <td className="py-3">{seed.courses.find((course) => course.id === lesson.courseId)?.code}</td>
                    <td className="py-3 capitalize">{lesson.contentType.replace(/_/g, ' ')}</td>
                    <td className="py-3">{lesson.estimatedMinutes}</td>
                    <td className="py-3">{statusBadge(lesson.materialStatus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function AssignmentsSection({ seed, role, session }) {
  const [assignments, setAssignments] = useState(seed.assignments);
  const [submissions, setSubmissions] = useState(seed.assignmentSubmissions);
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [submissionText, setSubmissionText] = useState({});
  const [actionError, setActionError] = useState('');
  const canManage = canNursingRole(role, 'manageAssignments');
  const canSubmit = canNursingRole(role, 'submitAssignment');

  async function createAssignment(event) {
    event.preventDefault();
    if (!title.trim()) return;
    const assignment = {
      id: `assignment-local-${Date.now()}`,
      courseId: seed.courses[0].id,
      title: title.trim(),
      instructions: instructions.trim() || 'Complete the assigned nursing learning task and upload your clinical reasoning.',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      maxScore: 100,
      status: 'published',
      createdBy: session.user.id,
    };
    setActionError('');
    try {
      const response = await nursingApiRequest('/assignments', { method: 'POST', session, body: assignment });
      setAssignments((current) => [response.assignment, ...current]);
      setTitle('');
      setInstructions('');
    } catch (error) {
      setActionError(error.message);
    }
  }

  async function submitAssignment(assignmentId) {
    const body = (submissionText[assignmentId] || '').trim();
    if (!body) return;
    const submission = {
      id: `submission-local-${Date.now()}`,
      assignmentId,
      studentId: session.user.id,
      courseId: assignments.find((assignment) => assignment.id === assignmentId)?.courseId || seed.courses[0].id,
      submissionText: body,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
    };
    setActionError('');
    try {
      const response = await nursingApiRequest(`/assignments/${assignmentId}/submissions`, { method: 'POST', session, body: submission });
      setSubmissions((current) => [...current.filter((item) => !(item.assignmentId === assignmentId && item.studentId === session.user.id)), response.submission]);
      setSubmissionText((current) => ({ ...current, [assignmentId]: '' }));
    } catch (error) {
      setActionError(error.message);
    }
  }

  return (
    <section>
      <SectionHeader eyebrow="Continuous Assessment" title="Assignments and Submissions" />
      <ActionError message={actionError} />
      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        {canManage ? (
          <Card className="rounded-lg border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-xl tracking-normal">Publish Assignment</CardTitle>
              <CardDescription>Create scored work for the active course cohort.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-3" onSubmit={createAssignment}>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Assignment title" />
                <Textarea rows={5} value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Instructions, rubric, required files, and submission expectations." />
            <Button type="submit" className="bg-emerald-700 text-white hover:bg-emerald-800">
                  <FilePlus className="mr-2 h-4 w-4" />
                  Publish
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-lg border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-xl tracking-normal">Submission Status</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <MetricCard label="Open assignments" value={assignments.filter((item) => item.status === 'published').length} detail="Available for submission" icon={FilePlus} />
              <MetricCard label="My submissions" value={submissions.filter((item) => item.studentId === session.user.id).length} detail="Submitted work" icon={CheckCircle} />
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {assignments.map((assignment) => {
            const course = seed.courses.find((item) => item.id === assignment.courseId);
            const itemSubmissions = submissions.filter((item) => item.assignmentId === assignment.id);
            const mySubmission = itemSubmissions.find((item) => item.studentId === session.user.id);
            return (
              <Card key={assignment.id} className="rounded-lg border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{assignment.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{course?.code} - Due {new Date(assignment.dueDate || assignment.dueAt).toLocaleDateString()}</p>
                    </div>
                    {statusBadge(assignment.status)}
                  </div>
                  <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{assignment.instructions}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-sm">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">{assignment.maxScore} marks</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">{itemSubmissions.length} submissions</span>
                    {mySubmission ? statusBadge(mySubmission.status) : null}
                  </div>
                  {canSubmit ? (
                    <div className="mt-4 grid gap-2">
                      <Textarea rows={4} value={submissionText[assignment.id] || ''} onChange={(event) => setSubmissionText((current) => ({ ...current, [assignment.id]: event.target.value }))} placeholder="Write or paste your submission response." />
                      <Button type="button" variant="outline" onClick={() => submitAssignment(assignment.id)}>
                        <Send className="mr-2 h-4 w-4" />
                        Submit Work
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function GradebookSection({ seed, role, session }) {
  const [grades, setGrades] = useState(seed.grades);
  const [submissions, setSubmissions] = useState(seed.assignmentSubmissions);
  const [scoreDrafts, setScoreDrafts] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [actionError, setActionError] = useState('');
  const canGrade = canNursingRole(role, 'gradeAssignments');
  const visibleGrades = canGrade ? grades : grades.filter((grade) => grade.studentId === session.user.id);
  const awaitingGrades = submissions.filter((submission) => {
    const grade = grades.find((item) => item.submissionId === submission.id);
    return !grade || grade.status === 'awaiting_grade' || submission.status === 'submitted';
  });

  async function submitGrade(submission) {
    const score = Number(scoreDrafts[submission.id]);
    if (!Number.isFinite(score)) return;
    const assignment = seed.assignments.find((item) => item.id === submission.assignmentId);
    const grade = {
      id: `grade-local-${Date.now()}`,
      submissionId: submission.id,
      assignmentId: submission.assignmentId,
      courseId: assignment?.courseId || seed.courses[0].id,
      studentId: submission.studentId,
      graderId: session.user.id,
      score,
      maxScore: assignment?.maxScore || 100,
      letterGrade: score >= 70 ? 'A' : score >= 60 ? 'B' : score >= 50 ? 'C' : 'D',
      feedback: commentDrafts[submission.id] || 'Marked in the nursing gradebook.',
      comments: commentDrafts[submission.id] || 'Marked in the nursing gradebook.',
      status: 'graded',
      gradedAt: new Date().toISOString(),
    };
    setActionError('');
    try {
      const response = await nursingApiRequest(`/submissions/${submission.id}/grade`, { method: 'PATCH', session, body: grade });
      setGrades((current) => [{ ...grade, ...response.grade }, ...current.filter((item) => item.submissionId !== submission.id)]);
      setSubmissions((current) => current.map((item) => (item.id === submission.id ? { ...item, status: 'graded' } : item)));
      setScoreDrafts((current) => ({ ...current, [submission.id]: '' }));
      setCommentDrafts((current) => ({ ...current, [submission.id]: '' }));
    } catch (error) {
      setActionError(error.message);
    }
  }

  return (
    <section>
      <SectionHeader eyebrow="Academic Records" title="Gradebook and Feedback" />
      <ActionError message={actionError} />
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-lg border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-xl tracking-normal">Recorded Grades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <tr>
                    <th className="py-2">Student</th>
                    <th className="py-2">Course</th>
                    <th className="py-2">Assignment</th>
                    <th className="py-2">Score</th>
                    <th className="py-2">Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleGrades.map((grade) => {
                    const student = getDisplayUser(seed, grade.studentId);
                    const course = seed.courses.find((item) => item.id === grade.courseId);
                    const assignment = seed.assignments.find((item) => item.id === grade.assignmentId);
                    return (
                      <tr key={grade.id} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-3 font-medium">{student.firstName} {student.lastName}</td>
                        <td className="py-3">{course?.code}</td>
                        <td className="py-3">{assignment?.title}</td>
                        <td className="py-3">{grade.score}/{grade.maxScore} - {grade.letterGrade}</td>
                        <td className="py-3">{grade.feedback}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {canGrade ? (
          <Card className="rounded-lg border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-xl tracking-normal">Marking Queue</CardTitle>
              <CardDescription>{awaitingGrades.length} submissions awaiting score.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {awaitingGrades.map((submission) => {
                const student = getDisplayUser(seed, submission.studentId);
                const assignment = seed.assignments.find((item) => item.id === submission.assignmentId);
                return (
                  <div key={submission.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <p className="font-semibold">{student.firstName} {student.lastName}</p>
                    <p className="mt-1 text-sm text-slate-500">{assignment?.title}</p>
                    <p className="mt-2 text-sm">{submission.submissionText || submission.body}</p>
                    <div className="mt-3 grid gap-2">
                      <Input type="number" min="0" max={assignment?.maxScore || 100} placeholder="Score" value={scoreDrafts[submission.id] || ''} onChange={(event) => setScoreDrafts((current) => ({ ...current, [submission.id]: event.target.value }))} />
                      <Textarea rows={3} placeholder="Feedback" value={commentDrafts[submission.id] || ''} onChange={(event) => setCommentDrafts((current) => ({ ...current, [submission.id]: event.target.value }))} />
                      <Button type="button" variant="outline" onClick={() => submitGrade(submission)}>Post Grade</Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-lg border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-xl tracking-normal">Feedback Notes</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              {seed.gradeComments.filter((comment) => visibleGrades.some((grade) => grade.id === comment.gradeId)).map((comment) => {
                const author = getDisplayUser(seed, comment.authorId);
                return (
                  <div key={comment.id} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                    <p className="font-medium">{author.firstName} {author.lastName}</p>
                    <p className="mt-1">{comment.body}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}

function DiscussionsSection({ seed, role, session }) {
  const [discussions, setDiscussions] = useState(seed.courseDiscussions);
  const [replies, setReplies] = useState(seed.courseDiscussionReplies);
  const [question, setQuestion] = useState('');
  const [replyDrafts, setReplyDrafts] = useState({});
  const [actionError, setActionError] = useState('');
  const canManage = canNursingRole(role, 'manageDiscussions');

  async function createDiscussion(event) {
    event.preventDefault();
    if (!question.trim()) return;
    const discussion = {
      id: `discussion-local-${Date.now()}`,
      courseId: seed.courses[0].id,
      authorId: session.user.id,
      title: question.trim(),
      body: question.trim(),
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    setActionError('');
    try {
      const response = await nursingApiRequest('/discussions', { method: 'POST', session, body: discussion });
      setDiscussions((current) => [response.discussion, ...current]);
      setQuestion('');
    } catch (error) {
      setActionError(error.message);
    }
  }

  async function addReply(discussionId) {
    const body = (replyDrafts[discussionId] || '').trim();
    if (!body) return;
    const reply = {
      id: `reply-local-${Date.now()}`,
      discussionId,
      authorId: session.user.id,
      body,
      accepted: false,
      createdAt: new Date().toISOString(),
    };
    setActionError('');
    try {
      const response = await nursingApiRequest(`/discussions/${discussionId}/replies`, { method: 'POST', session, body: reply });
      setReplies((current) => [...current, response.reply]);
      setReplyDrafts((current) => ({ ...current, [discussionId]: '' }));
    } catch (error) {
      setActionError(error.message);
    }
  }

  return (
    <section>
      <SectionHeader eyebrow="Course Community" title="Discussion Board and Q&A" />
      <ActionError message={actionError} />
      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="rounded-lg border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-xl tracking-normal">Ask or Moderate</CardTitle>
            <CardDescription>{canManage ? 'Lecturers can seed answers and keep course Q&A focused.' : 'Ask course questions for lecturer and peer responses.'}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3" onSubmit={createDiscussion}>
              <Textarea rows={5} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask a course question or start a professional discussion." />
              <Button type="submit" className="bg-emerald-700 text-white hover:bg-emerald-800">
                <MessageCircle className="mr-2 h-4 w-4" />
                Post Question
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {discussions.map((discussion) => {
            const author = getDisplayUser(seed, discussion.authorId);
            const course = seed.courses.find((item) => item.id === discussion.courseId);
            const discussionReplies = replies.filter((reply) => reply.discussionId === discussion.id);
            return (
              <Card key={discussion.id} className="rounded-lg border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{discussion.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{course?.code} - {author.firstName} {author.lastName}</p>
                    </div>
                    {statusBadge(discussion.status)}
                  </div>
                  <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{discussion.body}</p>
                  <div className="mt-4 grid gap-2">
                    {discussionReplies.map((reply) => {
                      const replyAuthor = getDisplayUser(seed, reply.authorId);
                      return (
                        <div key={reply.id} className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium">{replyAuthor.firstName} {replyAuthor.lastName}</p>
                            {reply.accepted ? statusBadge('accepted') : null}
                          </div>
                          <p className="mt-1">{reply.body}</p>
                        </div>
                      );
                    })}
                    <div className="flex gap-2">
                      <Input value={replyDrafts[discussion.id] || ''} onChange={(event) => setReplyDrafts((current) => ({ ...current, [discussion.id]: event.target.value }))} placeholder="Reply to this thread" />
                      <Button type="button" variant="outline" onClick={() => addReply(discussion.id)}>Reply</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MessagesSection({ seed, session }) {
  const [selectedThread, setSelectedThread] = useState('announcements');
  const [reply, setReply] = useState('');
  const [savedMessages, setSavedMessages] = useState([]);
  const [actionError, setActionError] = useState('');
  const notifications = seed.notifications.filter((notification) => notification.userId === session.user.id || !notification.userId);
  const threads = [
    {
      id: 'announcements',
      title: 'Department announcements',
      summary: 'Official academic updates and institutional notices',
      messages: [...seed.announcements.map((announcement) => ({
        id: announcement.id,
        author: 'Department Office',
        body: announcement.body,
        time: announcement.createdAt || 'Recent',
        unread: false,
      })), ...savedMessages.filter((message) => message.threadId === 'announcements').map((message) => ({ ...message, author: message.senderName, time: message.createdAt }))],
    },
    {
      id: 'course-discussions',
      title: 'Course Q&A',
      summary: 'Lecturer and student course conversations',
      messages: [...seed.courseDiscussions.map((discussion) => ({
        id: discussion.id,
        author: getDisplayUser(seed, discussion.authorId),
        body: discussion.body,
        time: discussion.createdAt,
        unread: true,
      })), ...savedMessages.filter((message) => message.threadId === 'course-discussions').map((message) => ({ ...message, author: message.senderName, time: message.createdAt }))],
    },
    {
      id: 'notifications',
      title: 'Notifications',
      summary: 'Assignment, gradebook, and timeline updates',
      messages: [...notifications.map((notification) => ({
        id: notification.id,
        author: 'DoctaRx Nursing',
        body: notification.body,
        time: notification.createdAt,
        unread: !notification.isRead,
      })), ...savedMessages.filter((message) => message.threadId === 'notifications').map((message) => ({ ...message, author: message.senderName, time: message.createdAt }))],
    },
  ];
  const activeThread = threads.find((thread) => thread.id === selectedThread) || threads[0];

  useEffect(() => {
    let active = true;
    nursingApiRequest('/messages', { session })
      .then((response) => {
        if (active) setSavedMessages(response.messages || []);
      })
      .catch((error) => {
        if (active) setActionError(error.message);
      });
    return () => {
      active = false;
    };
  }, [session]);

  async function sendReply(event) {
    event.preventDefault();
    if (!reply.trim()) return;
    setActionError('');
    try {
      const response = await nursingApiRequest('/messages', {
        method: 'POST',
        session,
        body: { threadId: selectedThread, body: reply.trim(), scope: selectedThread === 'notifications' ? 'user' : 'department' },
      });
      setSavedMessages((current) => [...current, response.message]);
      setReply('');
    } catch (error) {
      setActionError(error.message);
    }
  }

  return (
    <section>
      <SectionHeader eyebrow="Communication" title="Messages and Notifications" />
      <ActionError message={actionError} />
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card className="rounded-lg border-white/70 bg-white/90 shadow-sm backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-xl tracking-normal">Inbox</CardTitle>
            <CardDescription>Academic conversations and system notices.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {threads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={() => setSelectedThread(thread.id)}
                className={cn(
                  'rounded-lg border p-3 text-left transition',
                  selectedThread === thread.id ? 'border-teal-600 bg-teal-50' : 'border-slate-200 bg-white hover:border-teal-400'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{thread.title}</p>
                  {thread.messages.some((message) => message.unread) ? <span className="h-2.5 w-2.5 rounded-full bg-teal-600" /> : null}
                </div>
                <p className="mt-1 text-sm text-slate-500">{thread.summary}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-lg border-white/70 bg-white/90 shadow-sm backdrop-blur-xl">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl tracking-normal">{activeThread.title}</CardTitle>
                <CardDescription>{activeThread.messages.length} messages</CardDescription>
              </div>
              <label className="relative w-full max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input className="pl-9" placeholder="Search thread" />
              </label>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid max-h-[540px] gap-3 overflow-y-auto pr-1">
              {activeThread.messages.length ? activeThread.messages.map((message) => {
                const author = typeof message.author === 'string' ? message.author : `${message.author.firstName} ${message.author.lastName}`;
                return (
                  <div key={message.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{author}</p>
                      <span className="text-xs text-slate-500">{message.time}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{message.body}</p>
                  </div>
                );
              }) : (
                <NursingEmptyState title="No messages" description="Messages, notifications, and course replies will appear here." icon={MessageSquare} />
              )}
            </div>
            <form className="mt-4 flex gap-2" onSubmit={sendReply}>
              <Input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a quick reply" />
              <Button type="submit" className="bg-teal-700 text-white hover:bg-teal-800" disabled={!reply.trim()}>
                <Send className="mr-2 h-4 w-4" />
                Send
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function QuizSection({ seed, role, session }) {
  const [quizId, setQuizId] = useState(seed.quizzes[0]?.id);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [actionError, setActionError] = useState('');
  const quiz = seed.quizzes.find((item) => item.id === quizId) || seed.quizzes[0];

  async function submitQuiz(event) {
    event.preventDefault();
    setActionError('');
    try {
      const response = await nursingApiRequest(`/quizzes/${quiz.id}/attempts`, {
        method: 'POST',
        session,
        body: { answers },
      });
      setResult(response.attempt);
    } catch (error) {
      setActionError(error.message);
    }
  }

  const canManage = canNursingRole(role, 'manageCourses');

  return (
    <section>
      <SectionHeader eyebrow="Assessment" title="Quiz Attempts and Analytics" />
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-lg border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-xl tracking-normal">Quiz Attempt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid gap-2">
              <Label htmlFor="quiz">Quiz</Label>
              <select
                id="quiz"
                value={quizId}
                onChange={(event) => {
                  setQuizId(event.target.value);
                  setAnswers({});
                  setResult(null);
                }}
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
              >
                {seed.quizzes.map((item) => (
                  <option key={item.id} value={item.id}>{item.title}</option>
                ))}
              </select>
            </div>
            <form className="grid gap-4" onSubmit={submitQuiz}>
              {quiz.questions.map((question, questionIndex) => (
                <fieldset key={question.prompt} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <legend className="px-1 text-sm font-semibold">{question.prompt}</legend>
                  <div className="mt-2 grid gap-2">
                    {question.options.map((option, optionIndex) => (
                      <label key={option} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-950">
                        <input
                          type="radio"
                          name={`question-${questionIndex}`}
                          value={optionIndex}
                          checked={Number(answers[questionIndex]) === optionIndex}
                          onChange={(event) => setAnswers((current) => ({ ...current, [questionIndex]: event.target.value }))}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
              <Button type="submit" className="bg-emerald-700 text-white hover:bg-emerald-800">
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Submit Attempt
              </Button>
              {actionError ? <p className="text-sm font-medium text-rose-600">{actionError}</p> : null}
            </form>
            {result ? (
              <div className="mt-4 rounded-lg bg-emerald-50 p-4 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
                <p className="font-semibold">Score: {result.score}%</p>
                <p className="text-sm">{result.correct} of {result.total} answers correct.</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-lg border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-xl tracking-normal">{canManage ? 'Lecturer Analytics' : 'Class Benchmarks'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {seed.quizzes.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium">{item.title}</span>
                    <span>{item.averageScore}% average</span>
                  </div>
                  {percentBar(item.averageScore, item.averageScore > 80 ? 'emerald' : 'amber')}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function SimulationSection({ seed, role, session }) {
  const [caseId, setCaseId] = useState(seed.simulationCases[0]?.id);
  const [selectedSteps, setSelectedSteps] = useState({});
  const [carePlan, setCarePlan] = useState('');
  const [submitted, setSubmitted] = useState(null);
  const [actionError, setActionError] = useState('');
  const activeCase = seed.simulationCases.find((item) => item.id === caseId) || seed.simulationCases[0];
  const canManage = canNursingRole(role, 'manageSimulations');

  async function submitSimulation(event) {
    event.preventDefault();
    setActionError('');
    try {
      const response = await nursingApiRequest(`/simulations/${activeCase.id}/attempts`, {
        method: 'POST',
        session,
        body: {
          selectedSteps: Object.entries(selectedSteps).filter(([, selected]) => selected).map(([step]) => step),
          carePlan,
        },
      });
      setSubmitted(response.attempt);
    } catch (error) {
      setActionError(error.message);
    }
  }

  return (
    <section>
      <SectionHeader eyebrow="Virtual Clinical Simulation" title="Nigerian Nursing Cases" />
      <div
        className="mb-5 overflow-hidden rounded-lg border border-white/70 bg-slate-950 p-5 text-white shadow-xl"
        style={{ backgroundImage: `linear-gradient(90deg, rgba(2,6,23,0.92), rgba(15,23,42,0.72), rgba(15,23,42,0.22)), url(${nursingImages.simulation})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">Clinical reasoning lab</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-normal">Practice assessment, escalation, and documentation with simulated patients.</h3>
          <p className="mt-2 text-sm leading-6 text-slate-200">Cases remain fictional while giving students a structured way to build clinical judgment before supervisor review.</p>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-lg border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-xl tracking-normal">Case Bank</CardTitle>
            <CardDescription>Training cases use simulated patients.</CardDescription>
          </CardHeader>
          <CardContent className="grid max-h-[660px] gap-2 overflow-y-auto pr-1">
            {seed.simulationCases.map((item) => (
              <SimulationCaseCard
                key={item.id}
                item={item}
                selected={item.id === caseId}
                onSelect={() => {
                  setCaseId(item.id);
                  setSelectedSteps({});
                  setCarePlan('');
                  setSubmitted(null);
                }}
              />
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-lg border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-xl tracking-normal">{activeCase.chiefComplaint}</CardTitle>
            <CardDescription>{activeCase.patientName}, {activeCase.age || 'community'} years, {activeCase.sex}</CardDescription>
          </CardHeader>
          <CardContent>
            <ClinicalVitalsPanel caseContext={activeCase} />
            <form className="mt-4 grid gap-4" onSubmit={submitSimulation}>
              <fieldset className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <legend className="px-1 text-sm font-semibold">Assessment Steps</legend>
                <div className="mt-2 grid gap-2">
                  {activeCase.assessmentSteps.map((step) => (
                    <label key={step} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedSteps[step])}
                        onChange={(event) => setSelectedSteps((current) => ({ ...current, [step]: event.target.checked }))}
                      />
                      {step}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-2">
                <Label htmlFor="carePlan">Care plan</Label>
                <Textarea id="carePlan" value={carePlan} onChange={(event) => setCarePlan(event.target.value)} rows={5} placeholder="Document nursing priorities, red flags, expected actions, and patient education." />
              </div>
              <Button type="submit" className="bg-emerald-700 text-white hover:bg-emerald-800">
                <Microscope className="mr-2 h-4 w-4" />
                Submit Case
              </Button>
              {actionError ? <p className="text-sm font-medium text-rose-600">{actionError}</p> : null}
            </form>
            {submitted ? (
              <div className="mt-4 rounded-lg bg-emerald-50 p-4 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
                <p className="font-semibold">Simulation score: {submitted.score}%</p>
                <p className="mt-1 text-sm">{activeCase.feedback}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {canManage ? (
        <Card className="mt-5 rounded-lg border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-xl tracking-normal">Attempt Review Queue</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {seed.simulationCases.slice(0, 6).map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <p className="font-medium">{item.chiefComplaint}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Average score {item.score}%</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}

function TelehealthLabSection({ seed, session }) {
  const [selectedRole, setSelectedRole] = useState('nurse');
  const [triage, setTriage] = useState({});
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [actionError, setActionError] = useState('');
  const caseContext = seed.simulationCases[2];
  const checklist = ['Identity and consent confirmed', 'Chief complaint clarified', 'Red flags screened', 'Escalation advice documented'];

  async function submitNote() {
    setActionError('');
    try {
      await nursingApiRequest('/telehealth-lab/notes', {
        method: 'POST',
        session,
        body: {
          role: selectedRole,
          checklist: Object.entries(triage).filter(([, selected]) => selected).map(([item]) => item),
          noteText: note,
        },
      });
      setSubmitted(true);
    } catch (error) {
      setActionError(error.message);
    }
  }

  return (
    <section>
      <SectionHeader eyebrow="Telehealth Skills Lab" title="Mock Consultation Room" />
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-lg border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-xl tracking-normal">Patient Case Panel</CardTitle>
            <CardDescription>{caseContext.chiefComplaint}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div
              className="min-h-44 rounded-lg border border-white/70 bg-slate-900 p-4 text-white shadow-inner"
              style={{ backgroundImage: `linear-gradient(90deg, rgba(15,23,42,0.92), rgba(15,23,42,0.45)), url(${nursingImages.telehealth})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-200">Video practice room</p>
              <p className="mt-2 max-w-xs text-lg font-semibold">Focused communication, triage, and escalation in a guided telehealth scenario.</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
              <p className="font-semibold">{caseContext.patientName}</p>
              <p>{caseContext.age} years, {caseContext.sex}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
              <p className="font-semibold">Vitals</p>
              <p>{caseContext.vitalSigns}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['nurse', 'observer', 'patient'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSelectedRole(item)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-medium capitalize',
                    selectedRole === item ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-200 dark:border-slate-800'
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-xl tracking-normal">Consultation Note</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {checklist.map((item) => (
                <label key={item} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                  <input
                    type="checkbox"
                    checked={Boolean(triage[item])}
                    onChange={(event) => setTriage((current) => ({ ...current, [item]: event.target.checked }))}
                  />
                  {item}
                </label>
              ))}
            </div>
            <div className="mt-4 grid gap-2">
              <Label htmlFor="telehealth-note">Documentation</Label>
              <Textarea id="telehealth-note" rows={6} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Focused history, assessment, advice, escalation, and follow-up." />
            </div>
            <Button type="button" onClick={submitNote} className="mt-4 bg-emerald-700 text-white hover:bg-emerald-800">
              <Video className="mr-2 h-4 w-4" />
              Submit Lab Note
            </Button>
            {actionError ? <p className="text-sm font-medium text-rose-600">{actionError}</p> : null}
            {actionError ? <p className="mt-3 text-sm font-medium text-rose-600">{actionError}</p> : null}
            {submitted ? (
              <div className="mt-4 rounded-lg bg-emerald-50 p-4 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
                <p className="font-semibold">Lab note submitted.</p>
                <p className="text-sm">Rubric feedback is ready for lecturer review.</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function LogbookSection({ seed, role, session }) {
  const [entries, setEntries] = useState(seed.logbookEntries);
  const [reflection, setReflection] = useState('');
  const [hours, setHours] = useState(6);
  const [actionError, setActionError] = useState('');
  const canReview = canNursingRole(role, 'reviewLogbook');
  const canSubmit = canNursingRole(role, 'submitLogbook');

  async function submitEntry(event) {
    event.preventDefault();
    if (!reflection.trim()) return;
    setActionError('');
    try {
      const response = await nursingApiRequest('/logbook', {
        method: 'POST',
        session,
        body: {
          clinicalSite: 'University of Abuja Teaching Hospital',
          wardUnit: 'Medical Ward',
          hoursCompleted: Number(hours),
          encounterCategory: 'General nursing',
          skillsPerformed: ['Vital signs assessment', 'Patient education'],
          reflection,
        },
      });
      setEntries((current) => [response.entry, ...current]);
      setReflection('');
    } catch (error) {
      setActionError(error.message);
    }
  }

  async function updateStatus(id, status) {
    setActionError('');
    try {
      const comments = status === 'approved' ? 'Approved after supervisor review.' : 'Returned for more clinical detail.';
      await nursingApiRequest(`/logbook/${id}/review`, { method: 'PATCH', session, body: { status, comments } });
      setEntries((current) => current.map((entry) => entry.id === id ? { ...entry, status, supervisorComments: comments } : entry));
    } catch (error) {
      setActionError(error.message);
    }
  }

  return (
    <section>
      <SectionHeader eyebrow="Digital Clinical Logbook" title="Clinical Posting Evidence" />
      <div
        className="mb-5 overflow-hidden rounded-lg border border-white/70 bg-slate-950 p-5 text-white shadow-xl"
        style={{ backgroundImage: `linear-gradient(90deg, rgba(2,6,23,0.9), rgba(15,23,42,0.72), rgba(15,23,42,0.2)), url(${nursingImages.logbook})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">Supervisor-ready evidence</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-normal">Capture skills, hours, reflections, and sign-off history without losing context.</h3>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        {canSubmit ? (
          <Card className="rounded-lg border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-xl tracking-normal">New Entry</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={submitEntry}>
                <div className="grid gap-2">
                  <Label htmlFor="hours">Clinical hours</Label>
                  <Input id="hours" type="number" min="1" max="24" value={hours} onChange={(event) => setHours(event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reflection">Reflection</Label>
                  <Textarea id="reflection" rows={5} value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="Skills performed, learning points, and safety reflection." />
                </div>
                <Button type="submit" className="bg-emerald-700 text-white hover:bg-emerald-800">
                  <FileText className="mr-2 h-4 w-4" />
                  Submit Entry
                </Button>
                {actionError ? <p className="text-sm font-medium text-rose-600">{actionError}</p> : null}
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-lg border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-xl tracking-normal">Review Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <MetricCard label="Pending" value={entries.filter((entry) => entry.status === 'pending').length} detail="Awaiting supervisor action" icon={ClipboardList} />
              <MetricCard label="Approved" value={entries.filter((entry) => entry.status === 'approved').length} detail="Signed off entries" icon={Check} />
            </CardContent>
          </Card>
        )}

        <Card className="rounded-lg border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-xl tracking-normal">Entries</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {entries.map((entry) => {
              const student = seed.users.find((user) => user.id === entry.studentId);
              return (
                <div key={entry.id} className="grid gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-sm font-semibold">{student?.firstName} {student?.lastName}</p>
                  <LogbookEntryCard entry={entry} />
                  <div className="flex flex-wrap gap-2">
                    {entry.skillsPerformed.map((skill) => (
                      <span key={skill} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs dark:bg-slate-800">{skill}</span>
                    ))}
                  </div>
                  {entry.supervisorComments ? <p className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">{entry.supervisorComments}</p> : null}
                  {canReview && entry.status === 'pending' ? (
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" className="bg-emerald-700 text-white hover:bg-emerald-800" onClick={() => updateStatus(entry.id, 'approved')}>
                        <Check className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => updateStatus(entry.id, 'returned')}>
                        <FileText className="mr-2 h-4 w-4" />
                        Return
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function CertificateSection({ seed, session }) {
  const studentCertificate = seed.certificates.find((certificate) => certificate.studentId === session.user.id) || seed.certificates[0];
  const student = seed.users.find((user) => user.id === studentCertificate.studentId);

  return (
    <section>
      <SectionHeader
        eyebrow="Certificates"
        title="Participation and Completion Records"
      />
      <CertificatePreview
        certificate={studentCertificate}
        studentName={`${student?.firstName || ''} ${student?.lastName || ''}`}
        institutionName={seed.institution.name}
        onPrint={() => window.print()}
      />
    </section>
  );
}

function ReportsSection({ seed }) {
  function exportCsv() {
    const rows = [['Report', 'Status', 'Summary'], ...seed.reports.map((report) => [report.title, report.status, report.summary])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nursing-platform-reports.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section>
      <SectionHeader
        eyebrow="Reports"
        title="Department Analytics"
        action={
          <Button variant="outline" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        }
      />
      <div
        className="mb-5 overflow-hidden rounded-lg border border-white/70 bg-slate-950 p-5 text-white shadow-xl"
        style={{ backgroundImage: `linear-gradient(90deg, rgba(2,6,23,0.92), rgba(15,23,42,0.76), rgba(15,23,42,0.24)), url(${nursingImages.hero})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">Department intelligence</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-normal">Export clear programme evidence for HOD review, coordinators, and institution leadership.</h3>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {seed.reports.map((report) => (
          <Card key={report.id} className="rounded-lg border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-xl tracking-normal">{report.title}</CardTitle>
                {statusBadge(report.status)}
              </div>
              <CardDescription>{report.summary}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}

function PaymentsSection({ seed, role, session }) {
  const [records, setRecords] = useState(seed.paymentRecords);
  const canManage = canNursingRole(role, 'managePayments');
  const [actionError, setActionError] = useState('');

  async function verify(recordId) {
    setActionError('');
    try {
      const response = await nursingApiRequest(`/payments/${recordId}/verify`, {
        method: 'PATCH',
        session,
        body: { reference: `MANUAL-${Date.now()}` },
      });
      setRecords((current) => current.map((record) => record.id === recordId ? response.payment : record));
    } catch (error) {
      setActionError(error.message);
    }
  }

  return (
    <section>
      <SectionHeader eyebrow="Payment and Access" title="Access Tracking" />
      {actionError ? <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">{actionError}</p> : null}
      <div className="mb-5 grid gap-3 md:grid-cols-4">
        {seed.feeSchedule.map((fee) => (
          <MetricCard key={fee.id} label={fee.label} value={formatCurrency(fee.amount)} detail={fee.currency} icon={CreditCard} />
        ))}
      </div>
      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        {records.slice(0, 6).map((record) => {
          const student = seed.users.find((user) => user.id === record.studentId);
          return (
            <PaymentStatusCard
              key={record.id}
              record={record}
              studentName={`${student?.firstName || ''} ${student?.lastName || ''}`}
              formatCurrency={formatCurrency}
              canManage={canManage}
              onVerify={() => verify(record.id)}
            />
          );
        })}
      </div>
      <Card className="rounded-lg border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-xl tracking-normal">Student Access Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <tr>
                  <th className="py-2">Student</th>
                  <th className="py-2">Expected</th>
                  <th className="py-2">Paid</th>
                  <th className="py-2">Payment</th>
                  <th className="py-2">Access</th>
                  <th className="py-2">Reference</th>
                  {canManage ? <th className="py-2">Action</th> : null}
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const student = seed.users.find((user) => user.id === record.studentId);
                  return (
                    <tr key={record.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-3 font-medium">{student?.firstName} {student?.lastName}</td>
                      <td className="py-3">{formatCurrency(record.amountExpected)}</td>
                      <td className="py-3">{formatCurrency(record.amountPaid)}</td>
                      <td className="py-3">{statusBadge(record.paymentStatus)}</td>
                      <td className="py-3">{statusBadge(record.accessStatus)}</td>
                      <td className="py-3">{record.paymentReference}</td>
                      {canManage ? (
                        <td className="py-3">
                          {record.paymentStatus === 'pending' ? (
                            <Button size="sm" variant="outline" onClick={() => verify(record.id)}>
                              <Check className="mr-2 h-4 w-4" />
                              Verify
                            </Button>
                          ) : (
                            <span className="text-slate-400">Verified</span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function SettingsSection({ seed, role, session }) {
  const [preferences, setPreferences] = useState({
    email: true,
    sms: false,
    lowBandwidth: true,
    supervisorDigest: role !== NURSING_ROLES.STUDENT,
  });
  const canManageInstitution = canNursingRole(role, 'manageInstitution');
  const accessRows = [
    ['Workspace role', NURSING_ROLE_LABELS[role] || role, ShieldCheck],
    ['Institution', seed.institution.name, Building2],
    ['Department', seed.departments[0]?.name || 'Nursing Science', GraduationCap],
    ['Session user', `${session.user.firstName} ${session.user.lastName}`, User],
  ];

  function togglePreference(key) {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <section>
      <SectionHeader eyebrow="Workspace Settings" title="Account, Notifications, and Institution Controls" />
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="overflow-hidden rounded-lg border-white/70 bg-white/90 shadow-sm backdrop-blur-xl">
          <div
            className="min-h-52 bg-slate-950 p-5 text-white"
            style={{ backgroundImage: `linear-gradient(90deg, rgba(2,6,23,0.92), rgba(15,23,42,0.62), rgba(15,23,42,0.18)), url(${nursingImages.lms})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">Professional workspace</p>
            <h3 className="mt-2 max-w-lg text-2xl font-semibold tracking-normal">Keep learning, supervision, reports, and communications aligned to your assigned role.</h3>
          </div>
          <CardContent className="grid gap-3 p-5">
            {accessRows.map(([label, value, Icon]) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm text-slate-500">{label}</span>
                </div>
                <strong className="text-right text-sm text-slate-950">{value}</strong>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="rounded-lg border-white/70 bg-white/90 shadow-sm backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-xl tracking-normal">Notification Preferences</CardTitle>
              <CardDescription>Choose how urgent academic updates reach you.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {[
                ['email', 'Email alerts', 'Assignments, course activity, and department announcements'],
                ['sms', 'SMS alerts', 'Critical clinical posting and telehealth lab changes'],
                ['lowBandwidth', 'Low-bandwidth mode', 'Prioritize lightweight views for mobile networks'],
                ['supervisorDigest', 'Supervisor digest', 'Daily summary of logbook and grading actions'],
              ].map(([key, label, detail]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => togglePreference(key)}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-teal-400"
                >
                  <span>
                    <span className="block font-semibold">{label}</span>
                    <span className="mt-1 block text-sm text-slate-500">{detail}</span>
                  </span>
                  <span className={cn('flex h-6 w-11 items-center rounded-full p-1 transition', preferences[key] ? 'bg-teal-600' : 'bg-slate-300')}>
                    <span className={cn('h-4 w-4 rounded-full bg-white transition', preferences[key] && 'translate-x-5')} />
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-lg border-white/70 bg-white/90 shadow-sm backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-xl tracking-normal">Institution Controls</CardTitle>
              <CardDescription>{canManageInstitution ? 'Configure academic structures and reporting readiness.' : 'Read-only institutional details for your workspace.'}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <MetricCard label="Cohorts" value={seed.cohorts.length} detail="Academic levels" icon={Users} />
              <MetricCard label="Courses" value={seed.courses.length} detail="Active modules" icon={BookOpen} />
              <MetricCard label="Reports" value={seed.reports.length} detail="Export-ready" icon={BarChart3} />
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
