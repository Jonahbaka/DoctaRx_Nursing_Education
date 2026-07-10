import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function StudentProfileHeader({ user, profile, institution, department, cohort, initials, coverImage }) {
  return (
    <Card className="overflow-hidden rounded-lg border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div
        className="h-36 bg-[linear-gradient(135deg,#0f766e,#0369a1_55%,#0f172a)] bg-cover bg-center"
        style={coverImage ? { backgroundImage: `linear-gradient(90deg, rgba(15,23,42,0.72), rgba(15,23,42,0.16)), url(${coverImage})` } : undefined}
      />
      <CardContent className="-mt-10 p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
          <Avatar className="h-24 w-24 border-4 border-white shadow-md dark:border-slate-950">
            <AvatarImage src={profile?.avatarUrl || ''} alt={`${user.firstName} ${user.lastName}`} />
            <AvatarFallback className="bg-teal-700 text-2xl font-semibold text-white">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-normal">{user.firstName} {user.lastName}</h2>
              <Badge variant="info">{cohort?.level || user.title || 'Academic staff'}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{user.matricNumber || user.email}</p>
            <div className="mt-4 grid gap-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-3">
              <span>{institution?.name}</span>
              <span>{department?.name}</span>
              <span>{cohort?.name || 'Faculty profile'}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
