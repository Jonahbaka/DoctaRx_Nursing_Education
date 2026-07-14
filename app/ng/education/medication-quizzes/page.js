import { MedicationQuizzesPage } from '@/components/nursing/medications/MedicationEducationClient';

export const metadata = {
  title: 'Medication Quizzes | DoctaRx Nursing Education',
};

export default async function Page({ searchParams }) {
  const query = await searchParams;
  return <MedicationQuizzesPage setId={query?.setId || null} />;
}
