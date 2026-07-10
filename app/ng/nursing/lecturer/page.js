import { NursingDashboardPage } from '@/components/nursing/NursingPlatformClient';
import { NURSING_ROLES } from '@/lib/nursingEducationData';

export const metadata = {
  title: 'Lecturer Dashboard | DoctaRx Nursing',
};

export default function Page() {
  return <NursingDashboardPage role={NURSING_ROLES.LECTURER} />;
}
