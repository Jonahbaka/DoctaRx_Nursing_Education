import { NursingDashboardPage } from '@/components/nursing/NursingPlatformClient';

export const metadata = {
  title: 'Assignments | DoctaRx Nursing',
};

export default function Page() {
  return <NursingDashboardPage initialTab="assignments" />;
}
