import { Heart, MessageCircle, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function TimelinePostCard({
  post,
  author,
  initials,
  comments = [],
  reactions = [],
  commentDraft,
  onCommentDraft,
  onComment,
  onReact,
  onModerate,
  canModerate,
  renderUser,
}) {
  return (
    <Card className={cn('rounded-lg border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950', post.pinned && 'border-teal-500')}>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <Avatar className="h-11 w-11">
            <AvatarFallback className="bg-slate-900 text-white">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{author.firstName} {author.lastName}</p>
              <Badge variant="info">{post.scope}</Badge>
              {post.pinned ? <Badge variant="success">Pinned</Badge> : null}
              {post.status === 'hidden' ? <Badge variant="warning">Hidden</Badge> : null}
            </div>
            <p className="mt-1 text-xs text-slate-500">{post.createdAt}</p>
            <h3 className="mt-3 font-semibold">{post.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{post.body}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={onReact}>
                <Heart className="mr-2 h-4 w-4" />
                Helpful {reactions.length}
              </Button>
              <Button size="sm" variant="outline" disabled>
                <MessageCircle className="mr-2 h-4 w-4" />
                {comments.length}
              </Button>
              {canModerate ? (
                <Button size="sm" variant="outline" onClick={onModerate}>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {post.status === 'hidden' ? 'Restore' : 'Hide'}
                </Button>
              ) : null}
            </div>
            <div className="mt-4 grid gap-2">
              {comments.map((comment) => {
                const commenter = renderUser(comment.authorId);
                return (
                  <div key={comment.id} className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
                    <p className="font-medium">{commenter.firstName} {commenter.lastName}</p>
                    <p className="mt-1 text-slate-700 dark:text-slate-300">{comment.body}</p>
                  </div>
                );
              })}
              <div className="flex gap-2">
                <Input value={commentDraft || ''} onChange={(event) => onCommentDraft(event.target.value)} placeholder="Write a professional reply" />
                <Button type="button" variant="outline" onClick={onComment}>Reply</Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
