import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell, Check } from "lucide-react";
import { listMyNotifications, markNotificationRead } from "@/lib/marketplace.functions";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const fetch = useServerFn(listMyNotifications);
  const markRead = useServerFn(markNotificationRead);
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["notifications"], queryFn: () => fetch() });
  const mut = useMutation({
    mutationFn: (id: string) => markRead({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <div className="min-h-screen bg-soft-clay pb-20">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="mx-auto max-w-md px-4 py-3 flex items-center gap-3">
          <Link to="/" className="size-9 grid place-items-center rounded-full hover:bg-muted"><ArrowLeft className="size-4" /></Link>
          <h1 className="font-display text-lg">Notifications</h1>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 pt-4 space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && !data.length && (
          <div className="text-center py-16">
            <Bell className="size-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">You're all caught up.</p>
          </div>
        )}
        {data.map((n) => (
          <div
            key={n.id}
            className={`bg-card border rounded-2xl p-4 flex gap-3 ${n.read ? "border-border" : "border-heritage-gold/50 ring-1 ring-heritage-gold/20"}`}
          >
            <div className="size-9 rounded-full bg-heritage-gold/15 grid place-items-center shrink-0">
              <Bell className="size-4 text-heritage-gold" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{n.title}</p>
              {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
              <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
            </div>
            {!n.read && (
              <button onClick={() => mut.mutate(n.id)} className="size-7 grid place-items-center rounded-full hover:bg-muted" aria-label="Mark read">
                <Check className="size-3.5" />
              </button>
            )}
          </div>
        ))}
      </main>
    </div>
  );
}