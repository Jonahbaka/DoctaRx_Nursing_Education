import { MedicationDetailsPage } from '@/components/nursing/medications/MedicationEducationClient';

export const metadata = {
  title: 'Medication Details | DoctaRx Nursing Education',
};

export default async function Page({ params }) {
  const { setId } = await params;
  return <MedicationDetailsPage setId={setId} />;
}
