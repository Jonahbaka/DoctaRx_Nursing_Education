import { NursingDashboardPage } from '@/components/nursing/NursingPlatformClient';

export const metadata = {
  title: 'Notifications | DoctaRx Nursing',
};

export default function Page() {
  return <NursingDashboardPage initialTab="messages" />;
}
