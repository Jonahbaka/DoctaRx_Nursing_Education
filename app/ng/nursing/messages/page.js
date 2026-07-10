import { NursingDashboardPage } from '@/components/nursing/NursingPlatformClient';

export const metadata = {
  title: 'Messages | DoctaRx Nursing',
};

export default function Page() {
  return <NursingDashboardPage initialTab="messages" />;
}
