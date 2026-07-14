import { MedicationFlashcardsPage } from '@/components/nursing/medications/MedicationEducationClient';

export const metadata = {
  title: 'Medication Flashcards | DoctaRx Nursing Education',
};

export default async function Page({ searchParams }) {
  const query = await searchParams;
  return <MedicationFlashcardsPage setId={query?.setId || null} />;
}
