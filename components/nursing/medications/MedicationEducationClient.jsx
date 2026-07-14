'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  ClipboardCheck,
  ExternalLink,
  FileSearch,
  Layers3,
  NotebookPen,
  Pill,
  RefreshCw,
  Route,
  Search,
  ShieldCheck,
  Tablets,
} from 'lucide-react';
import DrugLabelSection from '@/components/nursing/medications/DrugLabelSection';
import EducationalDisclaimer, { DrugInteractionPlaceholder } from '@/components/nursing/medications/EducationalDisclaimer';
import MedicationEducationShell from '@/components/nursing/medications/MedicationEducationShell';
import MedicationFlashcardEngine from '@/components/nursing/medications/MedicationFlashcardEngine';
import MedicationNotesEditor from '@/components/nursing/medications/MedicationNotesEditor';
import MedicationQuizEngine from '@/components/nursing/medications/MedicationQuizEngine';
import MedicationSearchPanel from '@/components/nursing/medications/MedicationSearchPanel';
import NursingLoadingState from '@/components/nursing/NursingLoadingState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const medicationImages = {
  library: '/images/nursing/medication-library-learning.webp',
  notes: '/images/nursing/medication-notes-study.webp',
  practice: '/images/nursing/medication-quiz-flashcards.webp',
};

async function api(path, options = {}) {
  const response = await fetch(`/api/nursing${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'The medication learning request could not be completed');
    error.status = response.status;
    throw error;
  }
  return data;
}

function formatDate(value) {
  if (!value) return 'Not listed';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function MedicationSessionBoundary({ title, children }) {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    api('/session')
      .then((data) => { if (active) setUser(data.user); })
      .catch(() => {
        if (active) router.push(`/ng/nursing/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      });
    return () => { active = false; };
  }, [router]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <NursingLoadingState label="Opening medication education" />
      </div>
    );
  }

  return <MedicationEducationShell user={user} title={title}>{typeof children === 'function' ? children(user) : children}</MedicationEducationShell>;
}

function MedicationHero({ eyebrow, title, description, image = medicationImages.library, children }) {
  return (
    <section
      className="relative flex min-h-[280px] items-center overflow-hidden rounded-lg border border-slate-800 bg-slate-950 p-6 text-white shadow-xl sm:min-h-[320px] sm:p-8"
      style={{
        backgroundImage: `linear-gradient(90deg, rgba(2,6,23,0.98) 0%, rgba(15,23,42,0.92) 38%, rgba(15,23,42,0.48) 62%, rgba(15,23,42,0.12) 100%), url(${image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="relative max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-200">{eyebrow}</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-normal text-white sm:text-4xl">{title}</h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-100">{description}</p>
        {children ? <div className="mt-5 flex flex-wrap gap-3">{children}</div> : null}
      </div>
    </section>
  );
}

function SourcePrinciples() {
  const principles = [
    [ShieldCheck, 'Official source', 'Current public NIH DailyMed label data'],
    [BookOpenCheck, 'Grounded practice', 'Questions retain their source sections'],
    [NotebookPen, 'Private notes', 'Student ownership enforced by the server'],
  ];
  return (
    <section className="grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-3">
      {principles.map(([Icon, title, detail]) => (
        <div key={title} className="flex items-start gap-3 bg-white p-5">
          <span className="rounded-lg bg-teal-50 p-2 text-teal-700"><Icon className="h-5 w-5" /></span>
          <div><p className="font-semibold text-slate-950">{title}</p><p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p></div>
        </div>
      ))}
    </section>
  );
}

export function MedicationLibraryPage() {
  return (
    <MedicationSessionBoundary title="Medication Library">
      {(user) => (
        <div className="grid gap-6">
          <MedicationHero
            eyebrow="DailyMed medication education"
            title="Study official medication labels with nursing-focused learning tools"
            description="Search current medication labels by generic name, brand name, or active ingredient, then review official sections without turning label data into unsupported clinical advice."
          >
            {user.role === 'student' ? (
              <>
                <Button asChild className="bg-white text-slate-950 hover:bg-teal-50"><Link href="/ng/education/medication-notes"><NotebookPen className="mr-2 h-4 w-4" />My notes</Link></Button>
                <Button asChild variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white hover:text-slate-950"><Link href="/ng/education/medication-quizzes"><ClipboardCheck className="mr-2 h-4 w-4" />Practice quiz</Link></Button>
              </>
            ) : null}
          </MedicationHero>
          <SourcePrinciples />
          <EducationalDisclaimer compact />
          <MedicationSearchPanel />
        </div>
      )}
    </MedicationSessionBoundary>
  );
}

function useMedicationLabel(setId) {
  const [medication, setMedication] = useState(null);
  const [loading, setLoading] = useState(Boolean(setId));
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!setId) return;
    setLoading(true);
    setError('');
    try {
      const data = await api(`/medications/${encodeURIComponent(setId)}`);
      setMedication(data.medication);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [setId]);

  useEffect(() => { load(); }, [load]);
  return { medication, loading, error, retry: load };
}

function MedicationMetadata({ medication }) {
  const fields = [
    [Tablets, 'Dosage form', medication.dosageForms?.join(', ') || 'Not listed'],
    [Route, 'Route', medication.routes?.join(', ') || 'Not listed'],
    [CalendarDays, 'Label updated', formatDate(medication.updatedDate)],
    [ShieldCheck, 'Labeler', medication.labeler || 'Not listed'],
  ];
  return (
    <dl className="grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
      {fields.map(([Icon, label, value]) => (
        <div key={label} className="flex items-start gap-3 bg-white p-4">
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
          <div className="min-w-0"><dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-slate-900">{value}</dd></div>
        </div>
      ))}
    </dl>
  );
}

function MedicationLoadError({ message, retry }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-rose-900">
      <p className="font-semibold">Medication label unavailable</p>
      <p className="mt-2 text-sm">{message}</p>
      <Button type="button" variant="outline" className="mt-4 bg-white" onClick={retry}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>
    </div>
  );
}

export function MedicationDetailsPage({ setId }) {
  return (
    <MedicationSessionBoundary title="Medication Details">
      {(user) => <MedicationDetailsContent setId={setId} user={user} />}
    </MedicationSessionBoundary>
  );
}

function MedicationDetailsContent({ setId, user }) {
  const { medication, loading, error, retry } = useMedicationLabel(setId);
  if (loading) return <NursingLoadingState label="Loading official medication label" />;
  if (error) return <MedicationLoadError message={error} retry={retry} />;
  if (!medication) return null;

  return (
    <div className="grid gap-6">
      <Link href="/ng/education/medications" className="inline-flex w-fit items-center gap-2 text-sm font-medium text-teal-800 hover:text-teal-950"><ArrowLeft className="h-4 w-4" />Back to medication library</Link>
      <MedicationHero eyebrow={medication.labelType || 'Official medication label'} title={medication.drugName} description="Structured medication information retrieved from the selected NIH DailyMed label.">
        <Button asChild className="bg-white text-slate-950 hover:bg-teal-50"><a href={medication.source.labelUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open original DailyMed label</a></Button>
        {user.role === 'student' ? (
          <>
            <Button asChild variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white hover:text-slate-950"><Link href={`/ng/education/medication-notes?setId=${medication.setId}`}><NotebookPen className="mr-2 h-4 w-4" />Create note</Link></Button>
            <Button asChild variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white hover:text-slate-950"><Link href={`/ng/education/medication-quizzes?setId=${medication.setId}`}><ClipboardCheck className="mr-2 h-4 w-4" />Start quiz</Link></Button>
            <Button asChild variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white hover:text-slate-950"><Link href={`/ng/education/medication-flashcards?setId=${medication.setId}`}><Layers3 className="mr-2 h-4 w-4" />Flashcards</Link></Button>
          </>
        ) : null}
      </MedicationHero>

      <MedicationMetadata medication={medication} />
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Active ingredients</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {medication.activeIngredients?.length ? medication.activeIngredients.map((ingredient) => <Badge key={ingredient} className="bg-teal-50 text-teal-900 hover:bg-teal-50">{ingredient}</Badge>) : <span className="text-sm text-slate-600">No active ingredient was parsed from the product data.</span>}
        </div>
      </section>
      <EducationalDisclaimer />

      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)] xl:items-start">
        <aside className="rounded-lg border border-slate-200 bg-white p-4 xl:sticky xl:top-24">
          <p className="text-sm font-semibold text-slate-950">Label contents</p>
          <nav className="mt-3 grid gap-1" aria-label="Drug label table of contents">
            {medication.sections.map((section) => (
              <a key={section.key} href={`#label-section-${section.key}`} className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-teal-50 hover:text-teal-900">{section.title}</a>
            ))}
            <a href="#interaction-checker-placeholder" className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-teal-50 hover:text-teal-900">Future interaction service</a>
          </nav>
        </aside>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {medication.sections.length ? medication.sections.map((section, index) => <DrugLabelSection key={section.key} section={section} defaultOpen={index < 2} />) : (
            <div className="p-6 text-sm text-slate-600">No requested narrative sections were available in this label.</div>
          )}
        </div>
      </div>

      <div id="interaction-checker-placeholder" className="scroll-mt-24"><DrugInteractionPlaceholder /></div>
      <p className="text-sm leading-6 text-slate-600">Source: NIH DailyMed API v2. Set ID <span className="font-mono text-xs">{medication.setId}</span>{medication.splVersion ? `, SPL version ${medication.splVersion}` : ''}.</p>
    </div>
  );
}

export function MedicationNotesPage({ setId = null }) {
  return (
    <MedicationSessionBoundary title="My Medication Notes">
      <MedicationNotesContent setId={setId} />
    </MedicationSessionBoundary>
  );
}

function MedicationNotesContent({ setId }) {
  const [notes, setNotes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const medicationState = useMedicationLabel(setId);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const data = await api(`/medication-notes?${params}`);
      setNotes(data.notes || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, query]);

  useEffect(() => {
    const timer = setTimeout(loadNotes, 300);
    return () => clearTimeout(timer);
  }, [loadNotes]);

  function saved(note) {
    setNotes((current) => [note, ...current.filter((item) => item.id !== note.id)]);
    setSelected(note);
  }

  function deleted(noteId) {
    setNotes((current) => current.filter((item) => item.id !== noteId));
    setSelected(null);
  }

  return (
    <div className="grid gap-6">
      <MedicationHero
        eyebrow="Private student workspace"
        title="Build a medication study notebook"
        description="Capture learning points by official DailyMed set ID. Notes are private to the authenticated student account and must never contain identifiable patient information."
        image={medicationImages.notes}
      />
      <EducationalDisclaimer compact />

      <section className="grid gap-4 border-y border-slate-200 bg-white px-4 py-5 sm:grid-cols-[minmax(0,1fr)_160px_160px_auto] sm:px-6">
        <label className="relative">
          <span className="sr-only">Filter medication notes</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Filter by medication or title" />
        </label>
        <label className="grid gap-1 text-xs font-medium text-slate-600">From<Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label>
        <label className="grid gap-1 text-xs font-medium text-slate-600">To<Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label>
        <Button type="button" variant="outline" onClick={() => { setQuery(''); setDateFrom(''); setDateTo(''); }}>Clear filters</Button>
      </section>

      {error ? <MedicationLoadError message={error} retry={loadNotes} /> : null}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)] xl:items-start">
        <section className="rounded-lg border border-slate-200 bg-white xl:sticky xl:top-24">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <div><h2 className="font-semibold text-slate-950">Saved notes</h2><p className="mt-1 text-xs text-slate-500">{notes.length} notes</p></div>
            <Button type="button" size="sm" variant="outline" onClick={() => setSelected(null)}>New note</Button>
          </div>
          <div className="max-h-[640px] overflow-y-auto p-2">
            {loading ? <NursingLoadingState label="Loading notes" /> : null}
            {!loading && !notes.length ? <p className="p-5 text-sm leading-6 text-slate-600">No notes match the current filters.</p> : null}
            {notes.map((note) => (
              <button key={note.id} type="button" onClick={() => setSelected(note)} className={`mb-1 block w-full rounded-lg border p-3 text-left ${selected?.id === note.id ? 'border-teal-300 bg-teal-50' : 'border-transparent hover:bg-slate-50'}`}>
                <p className="font-medium text-slate-950">{note.title}</p>
                <p className="mt-1 text-sm text-slate-600">{note.medicationName}</p>
                <p className="mt-2 text-xs text-slate-500">Updated {formatDate(note.updatedAt)}</p>
              </button>
            ))}
          </div>
        </section>

        {selected || medicationState.medication ? (
          <MedicationNotesEditor note={selected} medication={selected ? null : medicationState.medication} onSaved={saved} onDeleted={deleted} />
        ) : (
          <section className="rounded-lg border border-dashed border-slate-300 bg-white p-6">
            <div className="flex items-start gap-3"><FileSearch className="mt-0.5 h-5 w-5 text-teal-700" /><div><h2 className="font-semibold text-slate-950">Choose a medication for a new note</h2><p className="mt-1 text-sm leading-6 text-slate-600">Use the search below, then select Create note on the appropriate official label.</p></div></div>
          </section>
        )}
      </div>

      {!selected && !medicationState.medication ? <MedicationSearchPanel purpose="note" /> : null}
      {setId && medicationState.loading ? <NursingLoadingState label="Opening selected medication" /> : null}
      {setId && medicationState.error ? <MedicationLoadError message={medicationState.error} retry={medicationState.retry} /> : null}
    </div>
  );
}

function SelectedMedicationHeader({ medication, changeHref }) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-teal-200 bg-teal-50 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="rounded-lg bg-white p-2 text-teal-700 ring-1 ring-teal-100"><Pill className="h-5 w-5" /></span>
        <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-700">Selected medication</p><h2 className="mt-1 text-xl font-semibold tracking-normal text-slate-950">{medication.drugName}</h2><p className="mt-1 text-sm text-slate-600">{medication.activeIngredients?.join(', ') || medication.genericNames?.join(', ') || 'Official DailyMed label'}</p></div>
      </div>
      <Button asChild variant="outline" className="border-teal-300 bg-white text-teal-800"><Link href={changeHref}>Choose another medication</Link></Button>
    </section>
  );
}

export function MedicationQuizzesPage({ setId = null }) {
  return (
    <MedicationSessionBoundary title="Medication Quizzes">
      <MedicationStudyContent mode="quiz" setId={setId} />
    </MedicationSessionBoundary>
  );
}

export function MedicationFlashcardsPage({ setId = null }) {
  return (
    <MedicationSessionBoundary title="Medication Flashcards">
      <MedicationStudyContent mode="flashcards" setId={setId} />
    </MedicationSessionBoundary>
  );
}

function MedicationStudyContent({ mode, setId }) {
  const medicationState = useMedicationLabel(setId);
  const isQuiz = mode === 'quiz';
  return (
    <div className="grid gap-6">
      <MedicationHero
        eyebrow={isQuiz ? 'Source-grounded assessment' : 'Spaced medication review'}
        title={isQuiz ? 'Medication quizzes from official label content' : 'Medication flashcards with source sections'}
        description={isQuiz
          ? 'Practice multiple-choice, true-or-false, matching, and select-all questions whose answers are validated against the selected DailyMed label.'
          : 'Flip, shuffle, restart, and mark cards for review. A card is created only when the selected label clearly supports its answer.'}
        image={medicationImages.practice}
      />
      <EducationalDisclaimer compact />

      {!setId ? (
        <>
          <section className="rounded-lg border border-dashed border-slate-300 bg-white p-6">
            <div className="flex items-start gap-3">{isQuiz ? <ClipboardCheck className="mt-0.5 h-5 w-5 text-teal-700" /> : <Layers3 className="mt-0.5 h-5 w-5 text-teal-700" />}<div><h2 className="font-semibold text-slate-950">Choose an official medication label</h2><p className="mt-1 text-sm text-slate-600">Search below to begin this learning activity.</p></div></div>
          </section>
          <MedicationSearchPanel purpose={isQuiz ? 'quiz' : 'flashcards'} />
        </>
      ) : null}

      {setId && medicationState.loading ? <NursingLoadingState label="Opening selected medication" /> : null}
      {setId && medicationState.error ? <MedicationLoadError message={medicationState.error} retry={medicationState.retry} /> : null}
      {setId && medicationState.medication ? (
        <>
          <SelectedMedicationHeader medication={medicationState.medication} changeHref={isQuiz ? '/ng/education/medication-quizzes' : '/ng/education/medication-flashcards'} />
          {isQuiz ? <MedicationQuizEngine setId={setId} /> : <MedicationFlashcardEngine setId={setId} />}
        </>
      ) : null}
    </div>
  );
}
