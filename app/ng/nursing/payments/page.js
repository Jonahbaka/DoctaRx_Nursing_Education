import { NursingDashboardPage } from '@/components/nursing/NursingPlatformClient';

export const metadata = {
  title: 'Payments and Access | DoctaRx Nursing',
};

export default function Page() {
  return <NursingDashboardPage initialTab="payments" />;
}
