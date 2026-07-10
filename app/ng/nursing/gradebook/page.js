import { NursingDashboardPage } from '@/components/nursing/NursingPlatformClient';

export const metadata = {
  title: 'Gradebook | DoctaRx Nursing',
};

export default function Page() {
  return <NursingDashboardPage initialTab="gradebook" />;
}
