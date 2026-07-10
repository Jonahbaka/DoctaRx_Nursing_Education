import { NursingDashboardPage } from '@/components/nursing/NursingPlatformClient';

export const metadata = {
  title: 'Cohort Stream | DoctaRx Nursing',
};

export default function Page() {
  return <NursingDashboardPage initialTab="timeline" />;
}
