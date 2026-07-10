import { CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function PaymentStatusCard({ record, studentName, formatCurrency, canManage, onVerify }) {
  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <span className="rounded-lg bg-blue-50 p-2 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
              <CreditCard className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">{studentName}</p>
              <p className="mt-1 text-sm text-slate-500">{record.paymentReference}</p>
            </div>
          </div>
          <Badge variant={record.paymentStatus === 'paid' ? 'success' : record.paymentStatus === 'sponsored' ? 'info' : 'warning'}>{record.paymentStatus}</Badge>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <span>Expected: {formatCurrency(record.amountExpected)}</span>
          <span>Paid: {formatCurrency(record.amountPaid)}</span>
          <span>Access: {record.accessStatus}</span>
          <span>Receipt: {record.receiptStatus}</span>
        </div>
        {canManage && record.paymentStatus === 'pending' ? (
          <Button type="button" size="sm" className="mt-4 bg-teal-700 text-white hover:bg-teal-800" onClick={onVerify}>Verify Access</Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
