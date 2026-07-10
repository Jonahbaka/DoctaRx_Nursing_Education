'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Headphones,
  MessageSquare,
  Phone,
  RefreshCw,
  Send,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const supportRoles = new Set([
  'super_admin',
  'institution_admin',
  'hod',
  'support_admin',
  'lecturer',
  'clinical_coordinator',
  'supervisor',
]);

const reasonOptions = [
  ['course_question', 'Course question'],
  ['assignment_help', 'Assignment help'],
  ['clinical_logbook_issue', 'Clinical logbook issue'],
  ['simulation_help', 'Simulation help'],
  ['telehealth_lab_help', 'Telehealth skills lab help'],
  ['payment_access_issue', 'Payment or access issue'],
  ['technical_support', 'Technical support'],
  ['general_academic_support', 'General academic support'],
  ['office_hour_request', 'Office-hour request'],
];

const officeHourTypes = [
  ['course_office_hour', 'Course office hour'],
  ['assignment_clinic', 'Assignment clinic'],
  ['clinical_logbook_support', 'Clinical logbook support'],
  ['simulation_review', 'Simulation review session'],
  ['telehealth_skills_support', 'Telehealth skills support'],
  ['department_qa', 'Department Q&A'],
  ['technical_support', 'Technical support'],
];

const queueActions = [
  ['in_progress', 'Accept'],
  ['resolved', 'Resolve'],
  ['escalated', 'Escalate'],
  ['follow_up_needed', 'Follow up'],
  ['no_show', 'No show'],
];

async function api(path, { method = 'GET', body } = {}) {
  const response = await fetch(`/api/nursing${path}`, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Support request could not be completed');
  return data;
}

function formatDateTime(value) {
  if (!value) return 'Not scheduled';
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function statusClass(status) {
  if (['resolved', 'open'].includes(status)) return 'bg-emerald-100 text-emerald-800';
  if (['in_progress', 'scheduled'].includes(status)) return 'bg-cyan-100 text-cyan-800';
  if (['escalated', 'no_show'].includes(status)) return 'bg-rose-100 text-rose-800';
  return 'bg-amber-100 text-amber-900';
}

function StatusBadge({ status }) {
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize', statusClass(status))}>
      {String(status || '').replaceAll('_', ' ')}
    </span>
  );
}

export default function NursingSupportCenter() {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [overview, setOverview] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [internalNote, setInternalNote] = useState(false);
  const [joinForm, setJoinForm] = useState({ reason: 'course_question', description: '' });
  const [questionDrafts, setQuestionDrafts] = useState({});
  const [supportProfile, setSupportProfile] = useState({
    whatsappNumber: '',
    whatsappDisplayName: '',
    whatsappAvailable: false,
    whatsappSupportRole: '',
    whatsappSupportHours: '',
  });
  const [officeForm, setOfficeForm] = useState({
    title: '',
    description: '',
    type: 'course_office_hour',
    startsAt: '',
    durationMinutes: 45,
    capacity: 30,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const isSupportUser = supportRoles.has(user?.role);
  const selectedRoom = overview?.waitingRooms?.find((room) => room.id === selectedRoomId) || overview?.waitingRooms?.[0];
  const queue = useMemo(
    () => (overview?.queue || []).filter((entry) => !selectedRoom || entry.roomId === selectedRoom.id),
    [overview, selectedRoom]
  );

  const loadOverview = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const [sessionResponse, waitingResponse] = await Promise.all([api('/session'), api('/waiting-rooms')]);
      setUser(sessionResponse.user);
      setOverview(waitingResponse);
      const routeRoomId = pathname.match(/\/waiting-room\/([^/]+)/)?.[1];
      setSelectedRoomId((current) => routeRoomId || current || waitingResponse.waitingRooms?.[0]?.id || null);
      const ownProfile = waitingResponse.supportProfiles?.find((profile) => profile.userId === sessionResponse.user.id);
      if (ownProfile) setSupportProfile(ownProfile);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [pathname]);

  const loadMessages = useCallback(async (roomId, { quiet = false } = {}) => {
    if (!roomId) return;
    try {
      const response = await api(`/waiting-rooms/${roomId}/messages`);
      setMessages(response.messages || []);
      if (!quiet) setError('');
    } catch (requestError) {
      if (!quiet) setError(requestError.message);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (!selectedRoom?.id) return undefined;
    loadMessages(selectedRoom.id);
    const timer = window.setInterval(() => {
      loadOverview({ quiet: true });
      loadMessages(selectedRoom.id, { quiet: true });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [loadMessages, loadOverview, selectedRoom?.id]);

  async function run(action, successMessage) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(successMessage);
      await loadOverview({ quiet: true });
      if (selectedRoom?.id) await loadMessages(selectedRoom.id, { quiet: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function joinQueue(event) {
    event.preventDefault();
    await run(
      () => api(`/waiting-rooms/${selectedRoom.id}/join`, { method: 'POST', body: joinForm }),
      'Your support request is in the queue.'
    );
    setJoinForm((current) => ({ ...current, description: '' }));
  }

  async function updateQueue(entryId, status) {
    await run(
      () => api(`/waiting-rooms/queue/${entryId}`, { method: 'PATCH', body: { status } }),
      `Queue entry marked ${status.replaceAll('_', ' ')}.`
    );
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (!messageDraft.trim() || !selectedRoom) return;
    await run(
      () => api(`/waiting-rooms/${selectedRoom.id}/messages`, {
        method: 'POST',
        body: { message: messageDraft, visibility: internalNote ? 'internal' : 'room' },
      }),
      internalNote ? 'Internal note saved.' : 'Message sent.'
    );
    setMessageDraft('');
  }

  async function createOfficeHour(event) {
    event.preventDefault();
    await run(
      () => api('/office-hours', { method: 'POST', body: officeForm }),
      'Office-hour session created.'
    );
    setOfficeForm((current) => ({ ...current, title: '', description: '', startsAt: '' }));
  }

  async function joinOfficeHour(sessionId) {
    await run(
      () => api(`/office-hours/${sessionId}/join`, { method: 'POST' }),
      'Office-hour registration confirmed.'
    );
  }

  async function submitQuestion(sessionId) {
    const question = questionDrafts[sessionId] || '';
    await run(
      () => api(`/office-hours/${sessionId}/questions`, { method: 'POST', body: { question } }),
      'Question submitted to the host.'
    );
    setQuestionDrafts((current) => ({ ...current, [sessionId]: '' }));
  }

  async function saveSupportProfile(event) {
    event.preventDefault();
    await run(
      () => api('/support-profile', { method: 'PUT', body: supportProfile }),
      'Support contact preferences saved.'
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[440px] items-center justify-center rounded-lg border border-slate-200 bg-white">
        <RefreshCw className="h-6 w-6 animate-spin text-emerald-700" />
        <span className="ml-3 text-sm font-medium text-slate-600">Opening academic support</span>
      </div>
    );
  }

  return (
    <section className="grid gap-5">
      <div className="overflow-hidden rounded-lg border border-emerald-900/20 bg-slate-950 text-white shadow-xl">
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-teal-200">
              <Headphones className="h-5 w-5" />
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">Virtual Waiting Room & Academic Office Hours</p>
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-normal text-white">Live academic and clinical support</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-200">
              Join the support queue, speak with authorized staff, and manage scheduled office-hour sessions. Do not share identifiable patient information.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-dark rounded-lg p-3">
              <p className="text-xs text-teal-100">Queue</p>
              <p className="mt-1 text-2xl font-semibold text-white">{queue.filter((item) => item.status === 'waiting').length}</p>
            </div>
            <div className="glass-dark rounded-lg p-3">
              <p className="text-xs text-teal-100">Office hours</p>
              <p className="mt-1 text-2xl font-semibold text-white">{overview?.officeHours?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {error ? <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">{error}</div> : null}
      {notice ? <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">{notice}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.6fr)]">
        <div className="grid gap-5">
          <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-xl tracking-normal">{selectedRoom?.title || 'Academic support room'}</CardTitle>
                  <CardDescription>{selectedRoom?.description}</CardDescription>
                </div>
                <StatusBadge status={selectedRoom?.status || 'closed'} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 rounded-lg border border-cyan-100 bg-cyan-50 p-3 text-sm text-cyan-900">
                {selectedRoom?.announcement}
              </div>

              {!isSupportUser ? (
                <form className="grid gap-3" onSubmit={joinQueue}>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="support-reason">Reason for visit</Label>
                      <select
                        id="support-reason"
                        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950"
                        value={joinForm.reason}
                        onChange={(event) => setJoinForm((current) => ({ ...current, reason: event.target.value }))}
                      >
                        {reasonOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Estimated wait</p>
                      <p className="mt-1 text-lg font-semibold text-slate-950">{selectedRoom?.estimatedWaitMinutes || 10} minutes</p>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="support-description">How can the support team help?</Label>
                    <Textarea id="support-description" rows={4} value={joinForm.description} onChange={(event) => setJoinForm((current) => ({ ...current, description: event.target.value }))} required />
                  </div>
                  <Button type="submit" className="w-fit bg-emerald-700 text-white hover:bg-emerald-800" disabled={busy || !selectedRoom}>
                    <Users className="mr-2 h-4 w-4" />
                    Join Waiting Room
                  </Button>
                </form>
              ) : null}

              <div className={cn('grid gap-3', !isSupportUser && 'mt-5')}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-slate-950">Queue</h3>
                  <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={() => loadOverview()} aria-label="Refresh queue">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
                {queue.length ? queue.map((entry) => (
                  <div key={entry.id} className="grid gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={entry.status} />
                        <span className="text-xs text-slate-500">Joined {formatDateTime(entry.joinedAt)}</span>
                      </div>
                      <p className="mt-2 font-semibold capitalize text-slate-950">{entry.reason.replaceAll('_', ' ')}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{entry.description}</p>
                    </div>
                    <div className="flex max-w-sm flex-wrap gap-2">
                      {isSupportUser ? queueActions.map(([status, label]) => (
                        <Button key={status} type="button" size="sm" variant={status === 'in_progress' ? 'default' : 'outline'} onClick={() => updateQueue(entry.id, status)} disabled={busy}>
                          {label}
                        </Button>
                      )) : !['resolved', 'left', 'no_show'].includes(entry.status) ? (
                        <Button type="button" size="sm" variant="outline" onClick={() => updateQueue(entry.id, 'left')} disabled={busy}>Leave Queue</Button>
                      ) : null}
                    </div>
                  </div>
                )) : (
                  <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No active support requests.</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl tracking-normal"><MessageSquare className="h-5 w-5 text-emerald-700" /> Room Chat</CardTitle>
              <CardDescription>Messages are retained with the support-room history.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 space-y-3 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3" aria-live="polite">
                {messages.length ? messages.map((message) => (
                  <div key={message.id} className={cn('max-w-[85%] rounded-lg border p-3 text-sm shadow-sm', message.senderId === user?.id ? 'ml-auto border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white', message.visibility === 'internal' && 'border-amber-200 bg-amber-50')}>
                    <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                      <span className="font-semibold capitalize">{message.senderRole.replaceAll('_', ' ')}</span>
                      <span>{formatDateTime(message.createdAt)}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap leading-6 text-slate-800">{message.message}</p>
                    {message.visibility === 'internal' ? <p className="mt-2 text-xs font-semibold text-amber-800">Internal support note</p> : null}
                  </div>
                )) : <div className="flex h-full items-center justify-center text-sm text-slate-500">The room conversation will appear here.</div>}
              </div>
              <form className="mt-3 grid gap-3" onSubmit={sendMessage}>
                <Textarea value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} rows={3} placeholder="Write a support message" />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {isSupportUser ? (
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input type="checkbox" checked={internalNote} onChange={(event) => setInternalNote(event.target.checked)} />
                      Internal note
                    </label>
                  ) : <span />}
                  <Button type="submit" className="bg-emerald-700 text-white hover:bg-emerald-800" disabled={busy || !messageDraft.trim()}>
                    <Send className="mr-2 h-4 w-4" />
                    Send
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <aside className="grid content-start gap-5">
          <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg tracking-normal"><Phone className="h-5 w-5 text-emerald-700" /> WhatsApp Support</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {overview?.supportProfiles?.length ? overview.supportProfiles.map((profile) => (
                <div key={profile.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="font-semibold text-slate-950">{profile.whatsappDisplayName}</p>
                  <p className="text-sm text-slate-600">{profile.whatsappSupportRole}</p>
                  <p className="mt-1 text-xs text-slate-500">{profile.whatsappSupportHours || 'Available during published office hours'}</p>
                  <a href={`https://wa.me/${String(profile.whatsappNumber).replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Chat on WhatsApp</a>
                </div>
              )) : <p className="text-sm leading-6 text-slate-500">No administrator has enabled WhatsApp contact.</p>}
            </CardContent>
          </Card>

          {isSupportUser ? (
            <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg tracking-normal">Support Contact Settings</CardTitle>
                <CardDescription>Only enable this if you want students to contact you through WhatsApp.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="grid gap-3" onSubmit={saveSupportProfile}>
                  <Input value={supportProfile.whatsappDisplayName || ''} onChange={(event) => setSupportProfile((current) => ({ ...current, whatsappDisplayName: event.target.value }))} placeholder="Display name" />
                  <Input value={supportProfile.whatsappNumber || ''} onChange={(event) => setSupportProfile((current) => ({ ...current, whatsappNumber: event.target.value }))} placeholder="+2348012345678" inputMode="tel" />
                  <Input value={supportProfile.whatsappSupportRole || ''} onChange={(event) => setSupportProfile((current) => ({ ...current, whatsappSupportRole: event.target.value }))} placeholder="Support role" />
                  <Input value={supportProfile.whatsappSupportHours || ''} onChange={(event) => setSupportProfile((current) => ({ ...current, whatsappSupportHours: event.target.value }))} placeholder="Mon-Fri, 14:00-16:00 WAT" />
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={Boolean(supportProfile.whatsappAvailable)} onChange={(event) => setSupportProfile((current) => ({ ...current, whatsappAvailable: event.target.checked }))} />
                    WhatsApp contact available
                  </label>
                  <Button type="submit" variant="outline" disabled={busy}>Save Contact Settings</Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.75fr]">
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl tracking-normal"><CalendarClock className="h-5 w-5 text-emerald-700" /> Office Hours</CardTitle>
            <CardDescription>Scheduled academic help, assignment clinics, and clinical support sessions.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {overview?.officeHours?.length ? overview.officeHours.map((session) => (
              <article key={session.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{session.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{session.description}</p>
                  </div>
                  <StatusBadge status={session.status} />
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                  <span className="flex items-center gap-2"><Clock3 className="h-4 w-4" /> {formatDateTime(session.startsAt)}</span>
                  <span>{session.durationMinutes} minutes</span>
                  <span>Capacity {session.capacity}</span>
                </div>
                {!isSupportUser ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr_auto]">
                    <Button type="button" variant="outline" onClick={() => joinOfficeHour(session.id)} disabled={busy}><UserCheck className="mr-2 h-4 w-4" /> Join</Button>
                    <Input value={questionDrafts[session.id] || ''} onChange={(event) => setQuestionDrafts((current) => ({ ...current, [session.id]: event.target.value }))} placeholder="Submit a question before the session" />
                    <Button type="button" onClick={() => submitQuestion(session.id)} disabled={busy || !(questionDrafts[session.id] || '').trim()}>Submit Question</Button>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" size="sm" onClick={() => run(() => api(`/office-hours/${session.id}`, { method: 'PATCH', body: { status: 'open' } }), 'Office hour opened.')} disabled={busy}>Open Session</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => run(() => api(`/office-hours/${session.id}`, { method: 'PATCH', body: { status: 'closed' } }), 'Office hour closed.')} disabled={busy}>Close Session</Button>
                  </div>
                )}
              </article>
            )) : <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No office hours are scheduled yet.</div>}
          </CardContent>
        </Card>

        {isSupportUser ? (
          <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl tracking-normal">Schedule Office Hours</CardTitle>
              <CardDescription>Create a scoped academic support session.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-3" onSubmit={createOfficeHour}>
                <div className="grid gap-2"><Label htmlFor="office-title">Title</Label><Input id="office-title" value={officeForm.title} onChange={(event) => setOfficeForm((current) => ({ ...current, title: event.target.value }))} required /></div>
                <div className="grid gap-2"><Label htmlFor="office-description">Description</Label><Textarea id="office-description" rows={3} value={officeForm.description} onChange={(event) => setOfficeForm((current) => ({ ...current, description: event.target.value }))} /></div>
                <div className="grid gap-2"><Label htmlFor="office-type">Session type</Label><select id="office-type" className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm" value={officeForm.type} onChange={(event) => setOfficeForm((current) => ({ ...current, type: event.target.value }))}>{officeHourTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                <div className="grid gap-2"><Label htmlFor="office-start">Date and time</Label><Input id="office-start" type="datetime-local" value={officeForm.startsAt} onChange={(event) => setOfficeForm((current) => ({ ...current, startsAt: event.target.value }))} required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2"><Label htmlFor="office-duration">Minutes</Label><Input id="office-duration" type="number" min="15" max="240" value={officeForm.durationMinutes} onChange={(event) => setOfficeForm((current) => ({ ...current, durationMinutes: event.target.value }))} /></div>
                  <div className="grid gap-2"><Label htmlFor="office-capacity">Capacity</Label><Input id="office-capacity" type="number" min="1" max="250" value={officeForm.capacity} onChange={(event) => setOfficeForm((current) => ({ ...current, capacity: event.target.value }))} /></div>
                </div>
                <Button type="submit" className="bg-emerald-700 text-white hover:bg-emerald-800" disabled={busy}><CalendarClock className="mr-2 h-4 w-4" /> Create Session</Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl tracking-normal"><ShieldCheck className="h-5 w-5 text-emerald-700" /> Support Standards</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm leading-6 text-slate-600">
              <p className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-700" /> Messages and queue history are retained for continuity and accountability.</p>
              <p className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-700" /> WhatsApp contacts appear only when an administrator explicitly enables visibility.</p>
              <p className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-700" /> Emergencies and clinical deterioration should follow approved escalation channels.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
