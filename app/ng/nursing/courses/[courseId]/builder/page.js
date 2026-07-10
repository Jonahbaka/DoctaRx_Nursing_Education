import { NursingDashboardPage } from '@/components/nursing/NursingPlatformClient';

export const metadata = {
  title: 'Course Builder | DoctaRx Nursing',
};

export default function Page() {
  return <NursingDashboardPage initialTab="courses" />;
}
