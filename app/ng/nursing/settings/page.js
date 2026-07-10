import { NursingDashboardPage } from '@/components/nursing/NursingPlatformClient';

export const metadata = {
  title: 'Settings | DoctaRx Nursing',
};

export default function Page() {
  return <NursingDashboardPage initialTab="settings" />;
}
