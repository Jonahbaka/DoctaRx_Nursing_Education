import { NursingDashboardPage } from '@/components/nursing/NursingPlatformClient';

export const metadata = {
  title: 'Lesson Player | DoctaRx Nursing',
};

export default function Page() {
  return <NursingDashboardPage initialTab="courses" />;
}
