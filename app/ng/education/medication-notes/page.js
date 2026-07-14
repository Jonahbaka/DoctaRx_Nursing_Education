import { MedicationNotesPage } from '@/components/nursing/medications/MedicationEducationClient';

export const metadata = {
  title: 'My Medication Notes | DoctaRx Nursing Education',
};

export default async function Page({ searchParams }) {
  const query = await searchParams;
  return <MedicationNotesPage setId={query?.setId || null} />;
}
