import { NursingDashboardPage } from '@/components/nursing/NursingPlatformClient';

export const metadata = {
  title: 'Course Workspace | DoctaRx Nursing',
};

export default function Page() {
  return <NursingDashboardPage initialTab="courses" />;
}
