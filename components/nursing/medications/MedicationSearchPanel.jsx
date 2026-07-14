'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, Search } from 'lucide-react';
import MedicationResultCard from '@/components/nursing/medications/MedicationResultCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const searchModes = [
  { id: 'generic', label: 'Generic name' },
  { id: 'brand', label: 'Brand name' },
  { id: 'ingredient', label: 'Active ingredient' },
];

const quickSearches = ['Metformin', 'Amoxicillin', 'Lisinopril'];

function actionFor(purpose, setId) {
  if (purpose === 'quiz') return { href: `/ng/education/medication-quizzes?setId=${setId}`, label: 'Choose for quiz' };
  if (purpose === 'flashcards') return { href: `/ng/education/medication-flashcards?setId=${setId}`, label: 'Choose for flashcards' };
  if (purpose === 'note') return { href: `/ng/education/medication-notes?setId=${setId}`, label: 'Create note' };
  return { href: `/ng/education/medications/${setId}`, label: 'Review label' };
}

async function request(path, signal) {
  const response = await fetch(`/api/nursing${path}`, { credentials: 'same-origin', signal });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Medication search is unavailable');
  return data;
}

function SearchSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading medication results">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-[390px] animate-pulse rounded-lg border border-slate-200 bg-white p-5">
          <div className="h-4 w-28 rounded bg-slate-200" />
          <div className="mt-4 h-7 w-3/4 rounded bg-slate-200" />
          <div className="mt-8 h-20 rounded bg-slate-100" />
          <div className="mt-5 h-28 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export default function MedicationSearchPanel({ purpose = 'details', initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [searchBy, setSearchBy] = useState('generic');
  const [results, setResults] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const searchRequest = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 450);
    return () => clearTimeout(timer);
  }, [query]);

  const runSearch = useCallback(async (value, page = 1, append = false) => {
    const clean = String(value || '').trim();
    if (clean.length < 2) {
      if (!append) {
        setResults([]);
        setPagination(null);
        setSearched(false);
      }
      return;
    }
    const requestId = searchRequest.current + 1;
    searchRequest.current = requestId;
    append ? setLoadingMore(true) : setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ q: clean, searchBy, page: String(page), pageSize: '12' });
      const data = await request(`/medications/search?${params}`);
      if (requestId !== searchRequest.current) return;
      setResults((current) => append ? [...current, ...(data.results || [])] : (data.results || []));
      setPagination(data.pagination || null);
      setSearched(true);
    } catch (searchError) {
      if (requestId === searchRequest.current) setError(searchError.message);
    } finally {
      if (requestId === searchRequest.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [searchBy]);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSuggestions([]);
      return undefined;
    }
    const controller = new AbortController();
    const params = new URLSearchParams({ q: debouncedQuery, searchBy, limit: '8' });
    request(`/medications/suggestions?${params}`, controller.signal)
      .then((data) => setSuggestions(data.suggestions || []))
      .catch((suggestionError) => {
        if (suggestionError.name !== 'AbortError') setSuggestions([]);
      });
    runSearch(debouncedQuery, 1, false);
    return () => controller.abort();
  }, [debouncedQuery, runSearch, searchBy]);

  function submit(event) {
    event.preventDefault();
    setSuggestionsOpen(false);
    setDebouncedQuery(query.trim());
    runSearch(query, 1, false);
  }

  function chooseSuggestion(value) {
    setQuery(value);
    setDebouncedQuery(value);
    setSuggestions([]);
    setSuggestionsOpen(false);
    runSearch(value, 1, false);
  }

  return (
    <div className="grid gap-6">
      <section className="border-y border-slate-200 bg-white px-4 py-6 sm:px-6">
        <form onSubmit={submit} className="grid gap-4">
          <div className="inline-flex w-full max-w-2xl rounded-lg border border-slate-200 bg-slate-100 p-1" role="group" aria-label="Medication search type">
            {searchModes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  setSearchBy(mode.id);
                  setSuggestionsOpen(false);
                }}
                className={cn('min-w-0 flex-1 rounded-md px-2 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 sm:px-4', searchBy === mode.id ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-950')}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div
            className="relative max-w-4xl"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setSuggestionsOpen(false);
            }}
          >
            <label htmlFor="medication-search" className="sr-only">Search medications</label>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input
              id="medication-search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSuggestionsOpen(true);
              }}
              onFocus={() => setSuggestionsOpen(true)}
              className="h-12 border-slate-300 bg-white pl-11 pr-28 text-base"
              placeholder={`Search by ${searchModes.find((mode) => mode.id === searchBy)?.label.toLowerCase()}`}
              autoComplete="off"
            />
            <Button type="submit" className="absolute right-1.5 top-1.5 h-9 bg-teal-700 text-white hover:bg-teal-800" disabled={query.trim().length < 2}>
              Search
            </Button>
            {suggestionsOpen && suggestions.length && query.trim().length >= 2 ? (
              <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-xl" role="listbox" aria-label="Medication suggestions">
                {suggestions.map((suggestion) => (
                  <button key={suggestion} type="button" className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-teal-50 hover:text-teal-900" onClick={() => chooseSuggestion(suggestion)}>
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500">Quick search:</span>
            {quickSearches.map((name) => (
              <button key={name} type="button" className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:border-teal-300 hover:text-teal-800" onClick={() => chooseSuggestion(name)}>
                {name}
              </button>
            ))}
          </div>
        </form>
      </section>

      {loading ? <SearchSkeleton /> : null}

      {error && !loading ? (
        <div className="flex flex-col gap-4 rounded-lg border border-rose-200 bg-rose-50 p-5 text-rose-900 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <div className="flex items-start gap-3"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">Medication search unavailable</p><p className="mt-1 text-sm">{error}</p></div></div>
          <Button type="button" variant="outline" size="sm" className="bg-white" onClick={() => runSearch(query, 1, false)}>Retry</Button>
        </div>
      ) : null}

      {!loading && !error && searched && !results.length ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <p className="font-semibold text-slate-950">No matching DailyMed labels</p>
          <p className="mt-2 text-sm text-slate-600">Check the spelling, change the search type, or try another official medication name.</p>
        </div>
      ) : null}

      {!loading && results.length ? (
        <>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-950">DailyMed labels</p>
              <p className="mt-1 text-sm text-slate-500">{pagination?.totalResults?.toLocaleString() || results.length} matching labels</p>
            </div>
            <p className="text-xs text-slate-500">Page {pagination?.page || 1} of {pagination?.totalPages || 1}</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {results.map((medication) => {
              const action = actionFor(purpose, medication.setId);
              return <MedicationResultCard key={`${medication.setId}-${medication.splVersion || ''}`} medication={medication} actionHref={action.href} actionLabel={action.label} />;
            })}
          </div>
          {pagination?.hasNextPage ? (
            <div className="flex justify-center">
              <Button type="button" variant="outline" onClick={() => runSearch(debouncedQuery, (pagination.page || 1) + 1, true)} disabled={loadingMore}>
                {loadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loadingMore ? 'Loading...' : 'Load more labels'}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}

      {!searched && !loading ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="font-semibold text-slate-950">Search current official medication labels</p>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">Enter at least two characters. Results come from the public NIH DailyMed v2 service through the DoctaRx server.</p>
        </div>
      ) : null}
    </div>
  );
}
