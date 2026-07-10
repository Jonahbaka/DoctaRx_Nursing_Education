import { NursingDashboardPage } from '@/components/nursing/NursingPlatformClient';

export const metadata = {
  title: 'Logbook Entry | DoctaRx Nursing',
};

export default function Page() {
  return <NursingDashboardPage initialTab="logbook" />;
}
