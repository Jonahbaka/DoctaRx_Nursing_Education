import { NursingDashboardPage } from '@/components/nursing/NursingPlatformClient';

export const metadata = {
  title: 'Reports | DoctaRx Nursing',
};

export default function Page() {
  return <NursingDashboardPage initialTab="reports" />;
}
