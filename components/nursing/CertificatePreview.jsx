import { Award, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function CertificatePreview({ certificate, studentName, institutionName, onPrint }) {
  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardContent className="p-6">
        <div className="rounded-lg border border-teal-200 bg-teal-50/60 p-6 text-center dark:border-teal-900 dark:bg-teal-950/30">
          <Award className="mx-auto h-10 w-10 text-teal-700 dark:text-teal-200" />
          <p className="mt-4 text-sm uppercase tracking-[0.18em] text-teal-800 dark:text-teal-200">Certificate</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-normal">{studentName}</h3>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{certificate.programName}</p>
          <p className="mt-2 text-sm font-medium">{institutionName}</p>
          <p className="mt-4 text-xs text-slate-500">Verification code: {certificate.verificationCode}</p>
        </div>
        <Button type="button" variant="outline" className="mt-4 w-full" onClick={onPrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </CardContent>
    </Card>
  );
}
