import { NursingDashboardPage } from '@/components/nursing/NursingPlatformClient';

export const metadata = {
  title: 'LMS Courses | DoctaRx Nursing',
};

export default function Page() {
  return <NursingDashboardPage initialTab="courses" />;
}
