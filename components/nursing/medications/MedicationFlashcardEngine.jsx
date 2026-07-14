'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  RotateCcw,
  Shuffle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import NursingLoadingState from '@/components/nursing/NursingLoadingState';
import { cn } from '@/lib/utils';

async function api(path, options = {}) {
  const response = await fetch(`/api/nursing${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'The medication flashcards could not be loaded');
  return data;
}

function shuffled(values) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

export default function MedicationFlashcardEngine({ setId }) {
  const [medication, setMedication] = useState(null);
  const [cards, setCards] = useState([]);
  const [order, setOrder] = useState([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!setId) return;
    setLoading(true);
    setError('');
    try {
      const [cardData, progressData] = await Promise.all([
        api(`/medications/${encodeURIComponent(setId)}/flashcards`),
        api(`/medication-flashcards/progress?setId=${encodeURIComponent(setId)}`),
      ]);
      const nextCards = cardData.cards || [];
      setMedication(cardData.medication);
      setCards(nextCards);
      setOrder(nextCards.map((_, cardIndex) => cardIndex));
      setProgress(Object.fromEntries((progressData.progress || []).map((item) => [item.cardKey, item])));
      setIndex(0);
      setFlipped(false);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [setId]);

  useEffect(() => { load(); }, [load]);

  const currentCard = cards[order[index]];
  const counts = useMemo(() => Object.values(progress).reduce((summary, item) => {
    if (item.status === 'know_it') summary.known += 1;
    if (item.status === 'review_again') summary.review += 1;
    return summary;
  }, { known: 0, review: 0 }), [progress]);

  function move(direction) {
    if (!order.length) return;
    setIndex((current) => (current + direction + order.length) % order.length);
    setFlipped(false);
  }

  async function mark(status) {
    if (!currentCard || !medication) return;
    setSaving(true);
    setError('');
    try {
      const data = await api('/medication-flashcards/progress', {
        method: 'PUT',
        body: JSON.stringify({
          dailyMedSetId: setId,
          medicationName: medication.medicationName,
          cardKey: currentCard.cardKey,
          status,
        }),
      });
      setProgress((current) => ({ ...current, [currentCard.cardKey]: data.progress }));
      move(1);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <NursingLoadingState label="Preparing medication flashcards" />;
  if (error && !cards.length) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-rose-900">
        <p className="font-semibold">Flashcards unavailable</p>
        <p className="mt-1 text-sm">{error}</p>
        <Button type="button" variant="outline" size="sm" className="mt-4 bg-white" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>
      </div>
    );
  }
  if (!cards.length) {
    return <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">This label does not contain enough clearly supported content to create flashcards.</p>;
  }

  return (
    <div className="grid gap-5">
      <section className="flex flex-col gap-4 border-y border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-sm font-semibold text-slate-950">{medication?.medicationName}</p>
          <p className="mt-1 text-xs text-slate-500">Card {index + 1} of {order.length} - Known {counts.known} - Review {counts.review}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" title="Previous card" onClick={() => move(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button type="button" variant="outline" size="sm" title="Next card" onClick={() => move(1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button type="button" variant="outline" size="sm" title="Shuffle cards" onClick={() => { setOrder(shuffled(order)); setIndex(0); setFlipped(false); }}><Shuffle className="h-4 w-4" /></Button>
          <Button type="button" variant="outline" size="sm" title="Restart cards" onClick={() => { setOrder(cards.map((_, cardIndex) => cardIndex)); setIndex(0); setFlipped(false); }}><RotateCcw className="h-4 w-4" /></Button>
        </div>
      </section>

      <button
        type="button"
        onClick={() => setFlipped((value) => !value)}
        className={cn(
          'flex min-h-[360px] w-full flex-col justify-between rounded-lg border p-6 text-left shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 sm:min-h-[400px] sm:p-8',
          flipped ? 'border-teal-300 bg-teal-950 text-white' : 'border-slate-200 bg-white text-slate-950'
        )}
        aria-label={flipped ? 'Show flashcard question' : 'Show flashcard answer'}
      >
        <div>
          <p className={cn('text-xs font-semibold uppercase tracking-[0.14em]', flipped ? 'text-teal-200' : 'text-teal-700')}>{currentCard.topic}</p>
          <p className={cn('mt-8 text-2xl font-semibold leading-9 tracking-normal sm:text-3xl', flipped ? 'text-white' : 'text-slate-950')}>
            {flipped ? currentCard.answer : currentCard.prompt}
          </p>
        </div>
        <div>
          {flipped ? (
            <p className="rounded-lg border border-white/15 bg-white/10 p-4 text-sm leading-6 text-slate-200">
              Source: {currentCard.source.title}{currentCard.source.code ? ` (${currentCard.source.code})` : ''}
            </p>
          ) : null}
          <p className={cn('mt-4 text-sm', flipped ? 'text-teal-200' : 'text-slate-500')}>Select the card to {flipped ? 'return to the question' : 'reveal the answer'}.</p>
        </div>
      </button>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button type="button" variant="outline" className="min-h-12 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100" disabled={saving} onClick={() => mark('review_again')}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Review again
        </Button>
        <Button type="button" className="min-h-12 bg-emerald-700 text-white hover:bg-emerald-800" disabled={saving} onClick={() => mark('know_it')}>
          <Check className="mr-2 h-4 w-4" />
          Know it
        </Button>
      </div>
      {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</p> : null}
    </div>
  );
}
