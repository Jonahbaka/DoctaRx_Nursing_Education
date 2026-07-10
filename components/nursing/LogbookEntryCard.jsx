import { ClipboardCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function LogbookEntryCard({ entry }) {
  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
              <ClipboardCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">{entry.clinicalSite}</p>
              <p className="mt-1 text-sm text-slate-500">{entry.wardUnit} - {entry.hoursCompleted} hours</p>
            </div>
          </div>
          <Badge variant={entry.status === 'approved' ? 'success' : entry.status === 'pending' ? 'warning' : 'secondary'}>{entry.status}</Badge>
        </div>
        <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{entry.reflection}</p>
      </CardContent>
    </Card>
  );
}
