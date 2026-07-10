import { NursingDashboardPage } from '@/components/nursing/NursingPlatformClient';

export const metadata = {
  title: 'Simulation Lab | DoctaRx Nursing',
};

export default function Page() {
  return <NursingDashboardPage initialTab="simulation" />;
}
