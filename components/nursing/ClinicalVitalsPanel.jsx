import { HeartPulse } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ClinicalVitalsPanel({ caseContext }) {
  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl tracking-normal">
          <HeartPulse className="h-5 w-5 text-rose-600" />
          Vitals and Context
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
          <p className="font-semibold">Patient</p>
          <p>{caseContext.patientName}, {caseContext.age || 'community'} years, {caseContext.sex}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
          <p className="font-semibold">Vitals</p>
          <p>{caseContext.vitalSigns}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900 sm:col-span-2">
          <p className="font-semibold">Setting</p>
          <p>{caseContext.setting}</p>
        </div>
      </CardContent>
    </Card>
  );
}
