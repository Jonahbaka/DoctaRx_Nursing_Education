import { NursingDashboardPage } from '@/components/nursing/NursingPlatformClient';

export const metadata = {
  title: 'Telehealth Skills Lab | DoctaRx Nursing',
};

export default function Page() {
  return <NursingDashboardPage initialTab="telehealth" />;
}
