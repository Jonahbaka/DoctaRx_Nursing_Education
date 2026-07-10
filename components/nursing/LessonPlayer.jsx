import { Download, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';

export default function LessonPlayer({ course, lessons, completedLessonIds, canCompleteLesson, onComplete }) {
  const activeLesson = lessons[0];
  const completedCount = lessons.filter((lesson) => completedLessonIds.has(lesson.id)).length;
  const percent = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader>
        <CardTitle className="text-xl tracking-normal">Course Player</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg bg-slate-950 p-6 text-white">
          <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-white/10 bg-slate-900 text-center">
            <PlayCircle className="h-12 w-12 text-teal-300" />
            <p className="mt-4 text-lg font-semibold">{activeLesson?.title || course?.title}</p>
            <p className="mt-2 max-w-md text-sm text-slate-300">Lesson content area supports video, readings, resources, notes, and Q&A.</p>
          </div>
          <div className="mt-4">
            <div className="mb-2 flex justify-between text-sm">
              <span>Course progress</span>
              <span>{percent}%</span>
            </div>
            <Progress value={percent} className="bg-slate-800" />
          </div>
          <Textarea className="mt-4 border-white/10 bg-slate-900 text-white placeholder:text-slate-400" rows={4} placeholder="Private lesson notes" />
        </div>
        <div className="grid gap-2">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{lesson.title}</p>
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
          <Button type="button" variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Resources
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
