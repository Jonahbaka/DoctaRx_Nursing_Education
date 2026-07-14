import Link from 'next/link';
import { ArrowRight, Building2, CalendarDays, PillBottle, Route, Tablets } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function MedicationResultCard({ medication, actionHref, actionLabel = 'Review label' }) {
  const href = actionHref || `/ng/education/medications/${medication.setId}`;
  return (
    <Card className="flex h-full flex-col overflow-hidden border-slate-200 bg-white shadow-sm transition hover:border-teal-200 hover:shadow-lg">
      <CardHeader className="border-b border-slate-100 bg-slate-50/80 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
              {medication.brandName ? 'Brand and generic label' : 'Generic label'}
            </p>
            <CardTitle className="mt-2 break-words text-lg tracking-normal text-slate-950">
              {medication.drugName}
            </CardTitle>
          </div>
          <span className="rounded-lg bg-teal-50 p-2 text-teal-700 ring-1 ring-teal-100">
            <PillBottle className="h-5 w-5" />
          </span>
        </div>
        {medication.brandName && medication.genericName ? (
          <p className="mt-2 text-sm text-slate-600">Generic: {medication.genericName}</p>
        ) : null}
      </CardHeader>

      <CardContent className="grid flex-1 gap-4 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Active ingredient</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {medication.activeIngredients?.length
              ? medication.activeIngredients.map((ingredient) => <Badge key={ingredient} variant="secondary">{ingredient}</Badge>)
              : <span className="text-sm text-slate-500">Available in the full label when listed</span>}
          </div>
        </div>

        <dl className="grid gap-3 text-sm">
          <div className="flex items-start gap-3">
            <Tablets className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <div><dt className="font-medium text-slate-700">Dosage form</dt><dd className="text-slate-600">{medication.dosageForm || 'See full label'}</dd></div>
          </div>
          <div className="flex items-start gap-3">
            <Route className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <div><dt className="font-medium text-slate-700">Route</dt><dd className="text-slate-600">{medication.route || 'See full label'}</dd></div>
          </div>
          <div className="flex items-start gap-3">
            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <div><dt className="font-medium text-slate-700">Labeler</dt><dd className="break-words text-slate-600">{medication.labeler || 'Not listed in search summary'}</dd></div>
          </div>
          {medication.publishedDate ? (
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              <div><dt className="font-medium text-slate-700">Published</dt><dd className="text-slate-600">{medication.publishedDate}</dd></div>
            </div>
          ) : null}
        </dl>
      </CardContent>

      <CardFooter className="border-t border-slate-100 p-4">
        <Button asChild className="w-full bg-teal-700 text-white hover:bg-teal-800">
          <Link href={href}>
            {actionLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
