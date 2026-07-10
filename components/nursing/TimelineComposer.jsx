import { Paperclip, Send } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

export default function TimelineComposer({ user, initials, scope, onScopeChange, body, onBodyChange, onSubmit }) {
  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardContent className="p-4">
        <form className="grid gap-3" onSubmit={onSubmit}>
          <div className="flex gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-slate-900 text-white">{initials}</AvatarFallback>
            </Avatar>
            <Textarea
              value={body}
              onChange={(event) => onBodyChange(event.target.value)}
              rows={4}
              placeholder={`Share an academic update as ${user.firstName}`}
              className="resize-none"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <select value={scope} onChange={(event) => onScopeChange(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950">
              <option value="cohort">Cohort feed</option>
              <option value="course">Course feed</option>
              <option value="department">Department feed</option>
              <option value="institution">Institution announcement</option>
            </select>
            <div className="flex gap-2">
              <Button type="button" variant="outline">
                <Paperclip className="mr-2 h-4 w-4" />
                Attach
              </Button>
              <Button type="submit" className="bg-teal-700 text-white hover:bg-teal-800">
                <Send className="mr-2 h-4 w-4" />
                Publish
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
