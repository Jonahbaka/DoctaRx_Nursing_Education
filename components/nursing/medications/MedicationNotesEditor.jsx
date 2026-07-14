'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Save, ShieldAlert, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const emptyForm = {
  title: '',
  content: '',
  nursingConsiderations: '',
  warnings: '',
  administrationReminders: '',
  patientEducation: '',
};

async function request(path, options) {
  const response = await fetch(`/api/nursing${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'The medication note could not be saved');
  return data;
}

export default function MedicationNotesEditor({ note, medication, onSaved, onDeleted }) {
  const [form, setForm] = useState(emptyForm);
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (note) {
      setForm({
        title: note.title || '',
        content: note.content || '',
        nursingConsiderations: note.nursingConsiderations || '',
        warnings: note.warnings || '',
        administrationReminders: note.administrationReminders || '',
        patientEducation: note.patientEducation || '',
      });
    } else {
      setForm(emptyForm);
    }
    setPrivacyConfirmed(false);
    setError('');
    setSuccess('');
    setConfirmDelete(false);
  }, [note, medication?.setId]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setSuccess('');
  }

  async function save(event) {
    event.preventDefault();
    const dailyMedSetId = note?.dailyMedSetId || medication?.setId;
    if (!dailyMedSetId) {
      setError('Choose a medication before creating a note.');
      return;
    }
    if (!privacyConfirmed) {
      setError('Confirm that this note contains no identifiable patient information.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data = await request(note ? `/medication-notes/${note.id}` : '/medication-notes', {
        method: note ? 'PATCH' : 'POST',
        body: JSON.stringify({ ...form, dailyMedSetId, confirmNoPatientInfo: true }),
      });
      setSuccess('Medication note saved.');
      onSaved?.(data.note);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!note) return;
    setSaving(true);
    setError('');
    try {
      await request(`/medication-notes/${note.id}`, { method: 'DELETE' });
      onDeleted?.(note.id);
    } catch (deleteError) {
      setError(deleteError.message);
      setConfirmDelete(false);
    } finally {
      setSaving(false);
    }
  }

  const medicationName = note?.medicationName || medication?.drugName || 'No medication selected';

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-xl tracking-normal text-slate-950">{note ? 'Edit medication note' : 'Create medication note'}</CardTitle>
            <CardDescription className="mt-1">{medicationName}</CardDescription>
          </div>
          {note ? (
            <Button type="button" variant="outline" size="sm" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <p className="text-sm leading-6">Use fictional or generalized learning examples only. Do not enter names, dates of birth, record numbers, contact details, or any other identifiable patient information.</p>
        </div>

        {confirmDelete ? (
          <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 p-4">
            <p className="font-medium text-rose-950">Delete this private educational note?</p>
            <p className="mt-1 text-sm text-rose-800">This action cannot be undone.</p>
            <div className="mt-3 flex gap-2">
              <Button type="button" size="sm" variant="destructive" onClick={remove} disabled={saving}>Delete note</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setConfirmDelete(false)} disabled={saving}>Cancel</Button>
            </div>
          </div>
        ) : null}

        <form className="grid gap-5" onSubmit={save}>
          <div className="grid gap-2">
            <Label htmlFor="med-note-title">Note title</Label>
            <Input id="med-note-title" value={form.title} onChange={(event) => update('title', event.target.value)} maxLength={160} required placeholder="e.g. Administration review" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="med-note-content">Study note</Label>
            <Textarea id="med-note-content" value={form.content} onChange={(event) => update('content', event.target.value)} maxLength={12000} rows={5} placeholder="Summarize your learning in your own words." />
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="med-note-considerations">Nursing considerations</Label>
              <Textarea id="med-note-considerations" value={form.nursingConsiderations} onChange={(event) => update('nursingConsiderations', event.target.value)} maxLength={12000} rows={5} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="med-note-warnings">Important warnings</Label>
              <Textarea id="med-note-warnings" value={form.warnings} onChange={(event) => update('warnings', event.target.value)} maxLength={12000} rows={5} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="med-note-administration">Administration reminders</Label>
              <Textarea id="med-note-administration" value={form.administrationReminders} onChange={(event) => update('administrationReminders', event.target.value)} maxLength={12000} rows={5} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="med-note-education">Patient education points</Label>
              <Textarea id="med-note-education" value={form.patientEducation} onChange={(event) => update('patientEducation', event.target.value)} maxLength={12000} rows={5} />
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-teal-700" checked={privacyConfirmed} onChange={(event) => setPrivacyConfirmed(event.target.checked)} />
            <span>I confirm that this note contains no identifiable patient information.</span>
          </label>

          {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</p> : null}
          {success ? (
            <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
              <CheckCircle2 className="h-4 w-4" />
              {success}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" className="bg-teal-700 text-white hover:bg-teal-800" disabled={saving || !privacyConfirmed}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save note'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
