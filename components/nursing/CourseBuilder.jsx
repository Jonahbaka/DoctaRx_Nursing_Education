import { Plus, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function CourseBuilder({ title, onTitleChange, onCreateCourse, lessonTitle, onLessonTitleChange, lessonMinutes, onLessonMinutesChange, onAddLesson }) {
  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl tracking-normal">
          <Settings2 className="h-5 w-5 text-teal-700" />
          Course Builder
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form className="grid gap-2 sm:grid-cols-[1fr_auto]" onSubmit={onCreateCourse}>
          <Input value={title} onChange={(event) => onTitleChange(event.target.value)} placeholder="Course title" />
          <Button type="submit" className="bg-teal-700 text-white hover:bg-teal-800">
            <Plus className="mr-2 h-4 w-4" />
            Create Course
          </Button>
        </form>
        <form className="grid gap-2 sm:grid-cols-[1fr_120px_auto]" onSubmit={onAddLesson}>
          <Input value={lessonTitle} onChange={(event) => onLessonTitleChange(event.target.value)} placeholder="Lesson title" />
          <Input type="number" min="5" value={lessonMinutes} onChange={(event) => onLessonMinutesChange(event.target.value)} />
          <Button type="submit" variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Add Lesson
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
