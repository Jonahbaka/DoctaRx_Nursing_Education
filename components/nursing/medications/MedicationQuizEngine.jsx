'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardCheck, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const difficulties = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

async function api(path, options = {}) {
  const response = await fetch(`/api/nursing${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'The medication quiz could not be completed');
  return data;
}

function displayAnswer(answer) {
  if (Array.isArray(answer)) return answer.join(', ');
  if (answer && typeof answer === 'object') return Object.entries(answer).map(([left, right]) => `${left}: ${right}`).join(' | ');
  return String(answer || 'No answer');
}

function questionAnswered(question, answer) {
  if (question.type === 'select_all') return Array.isArray(answer) && answer.length > 0;
  if (question.type === 'matching') return answer && question.matchingPrompts.every((prompt) => answer[prompt]);
  return Boolean(answer);
}

export default function MedicationQuizEngine({ setId }) {
  const [difficulty, setDifficulty] = useState('beginner');
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!setId) return () => { active = false; };
    api(`/medication-quizzes/attempts?setId=${encodeURIComponent(setId)}`)
      .then((data) => { if (active) setHistory(data.attempts || []); })
      .catch(() => { if (active) setHistory([]); });
    return () => { active = false; };
  }, [setId]);

  async function startQuiz() {
    setLoading(true);
    setError('');
    setResults(null);
    setAttempt(null);
    try {
      const data = await api(`/medications/${encodeURIComponent(setId)}/quizzes`, {
        method: 'POST',
        body: JSON.stringify({ difficulty }),
      });
      setQuiz(data.quiz);
      setAnswers({});
    } catch (startError) {
      setError(startError.message);
    } finally {
      setLoading(false);
    }
  }

  function setSingle(questionId, value) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  }

  function toggleMultiple(questionId, value) {
    setAnswers((current) => {
      const selected = Array.isArray(current[questionId]) ? current[questionId] : [];
      return {
        ...current,
        [questionId]: selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value],
      };
    });
  }

  function setMatch(questionId, prompt, value) {
    setAnswers((current) => ({
      ...current,
      [questionId]: { ...(current[questionId] || {}), [prompt]: value },
    }));
  }

  async function submitQuiz() {
    if (!quiz.questions.every((question) => questionAnswered(question, answers[question.id]))) {
      setError('Answer every question before submitting the quiz.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await api('/medication-quizzes/attempts', {
        method: 'POST',
        body: JSON.stringify({
          dailyMedSetId: quiz.dailyMedSetId,
          difficulty: quiz.difficulty,
          attemptKey: quiz.attemptKey,
          answers,
        }),
      });
      setResults(data.results || []);
      setAttempt(data.attempt);
      setHistory((current) => [data.attempt, ...current]);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  if (!setId) return null;

  return (
    <div className="grid gap-6">
      {!quiz ? (
        <section className="border-y border-slate-200 bg-white px-4 py-6 sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">Choose quiz difficulty</p>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Questions are generated deterministically from facts and sections present in the selected official DailyMed label.</p>
              <div className="mt-4 inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1" role="group" aria-label="Quiz difficulty">
                {difficulties.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDifficulty(item.id)}
                    className={cn('rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600', difficulty === item.id ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-950')}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <Button type="button" onClick={startQuiz} disabled={loading} className="bg-teal-700 text-white hover:bg-teal-800">
              <ClipboardCheck className="mr-2 h-4 w-4" />
              {loading ? 'Preparing quiz...' : 'Start grounded quiz'}
            </Button>
          </div>
        </section>
      ) : null}

      {quiz && !results ? (
        <div className="grid gap-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">{quiz.difficulty} quiz</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">{quiz.medicationName}</h2>
            </div>
            <p className="text-sm text-slate-500">{quiz.questions.length} questions</p>
          </div>

          {quiz.questions.map((question, index) => (
            <Card key={question.id} className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Question {index + 1} - {question.type.replaceAll('_', ' ')}</p>
                <CardTitle className="mt-2 text-base leading-7 tracking-normal text-slate-950">{question.prompt}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 p-5">
                {question.type === 'matching' ? question.matchingPrompts.map((prompt) => (
                  <label key={prompt} className="grid gap-2 text-sm font-medium text-slate-800">
                    {prompt}
                    <select
                      className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                      value={answers[question.id]?.[prompt] || ''}
                      onChange={(event) => setMatch(question.id, prompt, event.target.value)}
                    >
                      <option value="">Select the matching statement</option>
                      {question.options.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </label>
                )) : question.options.map((option) => {
                  const multiple = question.type === 'select_all';
                  const checked = multiple
                    ? (answers[question.id] || []).includes(option)
                    : answers[question.id] === option;
                  return (
                    <label key={option} className={cn('flex cursor-pointer items-start gap-3 rounded-lg border p-4 text-sm leading-6 transition', checked ? 'border-teal-300 bg-teal-50 text-teal-950' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300')}>
                      <input
                        type={multiple ? 'checkbox' : 'radio'}
                        name={question.id}
                        checked={checked}
                        onChange={() => multiple ? toggleMultiple(question.id, option) : setSingle(question.id, option)}
                        className="mt-1 h-4 w-4 accent-teal-700"
                      />
                      <span>{option}</span>
                    </label>
                  );
                })}
              </CardContent>
            </Card>
          ))}

          {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</p> : null}
          <div className="flex justify-end">
            <Button type="button" onClick={submitQuiz} disabled={loading} className="bg-teal-700 text-white hover:bg-teal-800">
              {loading ? 'Scoring...' : 'Submit quiz'}
            </Button>
          </div>
        </div>
      ) : null}

      {results && attempt ? (
        <div className="grid gap-5">
          <section className="rounded-lg border border-teal-200 bg-teal-50 p-6">
            <p className="text-sm font-semibold text-teal-900">Completed</p>
            <p className="mt-2 text-4xl font-semibold tracking-normal text-slate-950">{attempt.score}%</p>
            <p className="mt-2 text-sm text-slate-700">Review every answer and its official source section below.</p>
            <Button type="button" variant="outline" className="mt-4 border-teal-300 bg-white text-teal-800" onClick={() => { setQuiz(null); setResults(null); setAttempt(null); setAnswers({}); }}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retake quiz
            </Button>
          </section>

          {results.map((result, index) => (
            <Card key={result.questionId} className={cn('border-l-4 bg-white shadow-sm', result.correct ? 'border-l-emerald-500' : 'border-l-rose-500')}>
              <CardContent className="grid gap-3 p-5">
                <div className="flex items-start gap-3">
                  {result.correct ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Question {index + 1}</p>
                    <p className="mt-1 font-medium leading-7 text-slate-950">{result.prompt}</p>
                  </div>
                </div>
                <dl className="grid gap-2 rounded-lg bg-slate-50 p-4 text-sm">
                  <div><dt className="font-semibold text-slate-700">Your answer</dt><dd className="mt-1 text-slate-600">{displayAnswer(result.studentAnswer)}</dd></div>
                  <div><dt className="font-semibold text-slate-700">Correct answer</dt><dd className="mt-1 text-slate-600">{displayAnswer(result.correctAnswer)}</dd></div>
                  <div><dt className="font-semibold text-slate-700">Explanation</dt><dd className="mt-1 text-slate-600">{result.explanation}</dd></div>
                  <div><dt className="font-semibold text-slate-700">DailyMed source</dt><dd className="mt-1 text-slate-600">{result.source.title}{result.source.code ? ` (${result.source.code})` : ''}</dd></div>
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {error && !quiz ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</p> : null}

      {history.length ? (
        <section className="border-t border-slate-200 pt-6">
          <h2 className="text-lg font-semibold tracking-normal text-slate-950">Recent attempts</h2>
          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3">Medication</th><th className="px-4 py-3">Difficulty</th><th className="px-4 py-3">Score</th><th className="px-4 py-3">Completed</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {history.slice(0, 8).map((item) => <tr key={item.id}><td className="px-4 py-3 font-medium text-slate-900">{item.medicationName}</td><td className="px-4 py-3 capitalize text-slate-600">{item.difficulty}</td><td className="px-4 py-3 text-slate-600">{item.score}%</td><td className="px-4 py-3 text-slate-600">{new Date(item.completedAt).toLocaleDateString()}</td></tr>)}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
