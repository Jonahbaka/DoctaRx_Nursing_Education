# Nursing UI Upgrade Plan

## Current UI Stack Found

- Framework: Next.js 15 App Router with React 18.
- Styling: Tailwind CSS 3 with `tailwindcss-animate`.
- Design primitives: existing shadcn/Radix-style components in `components/ui`.
- Icons: `lucide-react` is installed and already used.
- Routing: `/app/ng/nursing` route group renders `components/nursing/NursingPlatformClient.jsx`.
- Backend: Express router mounted at `/api/nursing`; shared data contracts live in `lib/nursingEducationData.js`.

## Packages Already Installed

- `tailwindcss`
- `tailwindcss-animate`
- Radix primitives used by shadcn-style components
- `class-variance-authority`, `clsx`, `tailwind-merge`
- `lucide-react`
- `recharts`

## Packages Installed For This Upgrade

- `@tremor/react` for executive analytics cards and charts.
- `framer-motion` for restrained premium motion and Magic UI-style visual polish.

## Components To Add Or Upgrade

- `components/nursing/NursingShell.jsx`
- `components/nursing/NursingTopbar.jsx`
- `components/nursing/NursingSidebar.jsx`
- `components/nursing/NursingMetricCard.jsx`
- `components/nursing/NursingEmptyState.jsx`
- `components/nursing/NursingLoadingState.jsx`
- `components/nursing/MagicGridPattern.jsx`
- `components/nursing/StudentProfileHeader.jsx`
- `components/nursing/TimelineComposer.jsx`
- `components/nursing/TimelinePostCard.jsx`
- `components/nursing/CourseProgressCard.jsx`
- `components/nursing/CourseBuilder.jsx`
- `components/nursing/LessonPlayer.jsx`
- `components/nursing/SimulationCaseCard.jsx`
- `components/nursing/ClinicalVitalsPanel.jsx`
- `components/nursing/LogbookEntryCard.jsx`
- `components/nursing/CertificatePreview.jsx`
- `components/nursing/PaymentStatusCard.jsx`
- `components/nursing/NursingAnalyticsPanel.jsx`

## Screens To Improve

- Main nursing landing page
- Secure sign-in page
- Student dashboard
- Student profile
- Academic timeline
- LMS course landing/player/builder
- Lecturer dashboard surfaces
- HOD/admin analytics
- Clinical simulation
- Telehealth skills lab
- Clinical logbook
- Certificate preview
- Payment/access tracking

## Visual Design Direction

Use a professional healthcare-tech aesthetic: white surfaces, navy structure, teal/blue/soft-green accents, restrained shadows, 8px card radii, dense but readable dashboards, clear tables, mobile-first responsive grids, and polished empty states. Motion is limited to subtle reveals and premium background treatment.

## Functionality Protection

- Preserve existing `/ng/nursing` routes and `/api/nursing` calls.
- Keep RBAC through `canNursingRole`.
- Keep profile, timeline, course, lesson, assignment, gradebook, discussion, simulation, logbook, certificate, and payment state flows intact.
- Avoid touching unrelated patient, provider, pharmacy, admin, auth, PHI, appointment, payment, and medical record surfaces.
- Validate with `npm run test`, `npm run lint`, and `npm run build`.
