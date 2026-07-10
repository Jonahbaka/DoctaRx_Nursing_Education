import { NursingDashboardPage } from '@/components/nursing/NursingPlatformClient';

export const metadata = {
  title: 'Profile | DoctaRx Nursing',
};

export default function Page() {
  return <NursingDashboardPage initialTab="profile" />;
}
