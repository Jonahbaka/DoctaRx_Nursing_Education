import Image from 'next/image';
import { BookOpen, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export default function CourseProgressCard({ course, selected, onSelect, imageSrc }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn('rounded-lg text-left transition', selected && 'ring-2 ring-teal-600')}
    >
      <Card className="h-full overflow-hidden rounded-lg border-white/70 bg-white/90 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950">
        {imageSrc ? (
          <div className="relative h-28 overflow-hidden">
            <Image src={imageSrc} alt={`${course.title} course`} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 to-transparent" />
          </div>
        ) : null}
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <span className="rounded-lg bg-teal-50 p-2 text-teal-700 dark:bg-teal-950 dark:text-teal-200">
              <BookOpen className="h-5 w-5" />
            </span>
            <Badge variant={course.status === 'active' ? 'success' : 'secondary'}>{course.status}</Badge>
          </div>
          <p className="mt-4 font-semibold">{course.title}</p>
          <p className="mt-1 text-sm text-slate-500">{course.code} - {course.level}</p>
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span>Progress</span>
              <span>{course.completionRate}%</span>
            </div>
            <Progress value={course.completionRate} />
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle className="h-4 w-4 text-emerald-700" />
            Certificate tracked
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
