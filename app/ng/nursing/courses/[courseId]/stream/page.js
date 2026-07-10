import { NursingDashboardPage } from '@/components/nursing/NursingPlatformClient';

export const metadata = {
  title: 'Course Stream | DoctaRx Nursing',
};

export default function Page() {
  return <NursingDashboardPage initialTab="timeline" />;
}
