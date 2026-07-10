import { NursingDashboardPage } from '@/components/nursing/NursingPlatformClient';

export const metadata = {
  title: 'Academic Timeline | DoctaRx Nursing',
};

export default function Page() {
  return <NursingDashboardPage initialTab="timeline" />;
}
