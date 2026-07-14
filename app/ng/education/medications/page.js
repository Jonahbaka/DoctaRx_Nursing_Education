import { MedicationLibraryPage } from '@/components/nursing/medications/MedicationEducationClient';

export const metadata = {
  title: 'Medication Library | DoctaRx Nursing Education',
  description: 'Search official NIH DailyMed medication labels for nursing education.',
};

export default function Page() {
  return <MedicationLibraryPage />;
}
