import { NursingDashboardPage } from '@/components/nursing/NursingPlatformClient';

export const metadata = {
  title: 'Clinical Logbook | DoctaRx Nursing',
};

export default function Page() {
  return <NursingDashboardPage initialTab="logbook" />;
}
