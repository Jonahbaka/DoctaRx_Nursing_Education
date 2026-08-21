import { useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck, Download, PlayCircle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function LessonPlayer({ course, lessons, completedLessonIds, canCompleteLesson, onComplete, activities = [], onSaveEngagement }) {
  const [activeLessonId, setActiveLessonId] = useState(lessons[0]?.id || '');
  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) || lessons[0];
  const currentActivity = activities.find((activity) => activity.lessonId === activeLesson?.id);
  const [note, setNote] = useState(currentActivity?.note || '');
  const [resumeSeconds, setResumeSeconds] = useState(currentActivity?.resumeSeconds || 0);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const completedCount = lessons.filter((lesson) => completedLessonIds.has(lesson.id)).length;
  const percent = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;

  useEffect(() => {
    setNote(currentActivity?.note || '');
    setResumeSeconds(currentActivity?.resumeSeconds || 0);
  }, [activeLessonId, currentActivity?.note, currentActivity?.resumeSeconds]);

  useEffect(() => {
    setSaved(false);
  }, [activeLessonId]);

  async function saveEngagement(patch = {}) {
    if (!activeLesson || !onSaveEngagement) return;
    setSaving(true);
    setSaved(false);
    try {
      await onSaveEngagement(activeLesson, {
        note,
        resumeSeconds: Number(resumeSeconds) || 0,
        progressPercent: currentActivity?.progressPercent || 0,
        bookmarked: currentActivity?.bookmarked || false,
        ...patch,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader>
        <CardTitle className="text-xl tracking-normal">Course Player</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg bg-slate-950 p-6 text-white">
          <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-white/10 bg-slate-900 p-5 text-center">
            {activeLesson?.contentType === 'audio' && activeLesson.audioUrl?.startsWith('http') ? (
              <audio className="w-full" controls src={activeLesson.audioUrl}><track kind="captions" src={activeLesson.captionsUrl} /></audio>
            ) : activeLesson?.contentType === 'video' && activeLesson.videoUrl?.startsWith('http') ? (
              <video className="max-h-[320px] w-full" controls src={activeLesson.videoUrl}>
                {activeLesson.captionsUrl ? <track kind="captions" src={activeLesson.captionsUrl} srcLang="en" label="English" default /> : null}
              </video>
            ) : (
              <>
                <PlayCircle className="h-12 w-12 text-teal-300" />
                <p className="mt-4 text-lg font-semibold">{activeLesson?.title || course?.title}</p>
                <p className="mt-2 max-w-md text-sm text-slate-300">{activeLesson?.contentBody || activeLesson?.description || 'Select a lesson to begin.'}</p>
              </>
            )}
          </div>
          <div className="mt-4">
            <div className="mb-2 flex justify-between text-sm">
              <span>Course progress</span>
              <span>{percent}%</span>
            </div>
            <Progress value={percent} className="bg-slate-800" aria-label="Course progress" />
          </div>
          {activeLesson?.transcript || activeLesson?.captionsText ? (
            <details className="mt-4 rounded-lg border border-white/10 bg-slate-900 p-3 text-sm text-slate-200">
              <summary className="cursor-pointer font-semibold">Transcript and captions</summary>
              <p className="mt-2 whitespace-pre-wrap text-left">{activeLesson.transcript || activeLesson.captionsText}</p>
            </details>
          ) : null}
          {canCompleteLesson ? (
            <div className="mt-4 grid gap-3 rounded-lg border border-white/10 bg-slate-900 p-3 text-left">
              <Label htmlFor="private-lesson-note" className="text-white">Private lesson notes</Label>
              <Textarea id="private-lesson-note" className="border-white/10 bg-slate-950 text-white placeholder:text-slate-400" rows={4} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Write a private study note" />
              <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                <div>
                  <Label htmlFor="resume-position" className="text-white">Resume position (seconds)</Label>
                  <Input id="resume-position" type="number" min="0" value={resumeSeconds} onChange={(event) => setResumeSeconds(event.target.value)} className="mt-1 border-white/10 bg-slate-950 text-white" />
                </div>
                <Button type="button" variant="outline" disabled={saving} onClick={() => saveEngagement({ bookmarked: !currentActivity?.bookmarked })}>
                  {currentActivity?.bookmarked ? <BookmarkCheck className="mr-2 h-4 w-4" /> : <Bookmark className="mr-2 h-4 w-4" />}
                  {currentActivity?.bookmarked ? 'Bookmarked' : 'Bookmark'}
                </Button>
                <Button type="button" disabled={saving} onClick={() => saveEngagement()}><Save className="mr-2 h-4 w-4" />{saving ? 'Saving…' : 'Save notes'}</Button>
              </div>
              {saved ? <p role="status" className="text-xs text-teal-200">Lesson notes and resume position saved.</p> : null}
            </div>
          ) : null}
        </div>
        <div className="grid gap-2">
          {lessons.map((lesson) => (
            <div key={lesson.id} className={`rounded-lg border p-3 ${activeLesson?.id === lesson.id ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/30' : 'border-slate-200 dark:border-slate-800'}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <button type="button" className="text-left font-medium hover:text-teal-700" onClick={() => setActiveLessonId(lesson.id)}>{lesson.title}</button>
                  <p className="text-sm text-slate-500">{lesson.estimatedMinutes} minutes</p>
                </div>
                {canCompleteLesson && !completedLessonIds.has(lesson.id) ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => onComplete(lesson)}>Complete</Button>
                ) : (
                  <span className="text-xs font-medium text-emerald-700">Complete</span>
                )}
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" disabled={!activeLesson?.resourceUrl} asChild={Boolean(activeLesson?.resourceUrl?.startsWith('http'))}>
            {activeLesson?.resourceUrl?.startsWith('http') ? <a href={activeLesson.resourceUrl} target="_blank" rel="noreferrer"><Download className="mr-2 h-4 w-4" />Open protected resource</a> : <><Download className="mr-2 h-4 w-4" />Resources</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
