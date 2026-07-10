import { NursingDashboardPage } from '@/components/nursing/NursingPlatformClient';

export const metadata = {
  title: 'Simulation Case | DoctaRx Nursing',
};

export default function Page() {
  return <NursingDashboardPage initialTab="simulation" />;
}
