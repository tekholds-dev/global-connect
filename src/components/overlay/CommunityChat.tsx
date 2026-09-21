import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfiles } from "@/hooks/useGlobeData";
import { useGlobeStore } from "@/lib/store";
import type { Ecosystem, Message } from "@/lib/types";
import { shortAddress } from "@/lib/geo";

/** Realtime member chat for one ecosystem. Manages its own scroll area + composer. */
export function CommunityChat({ eco }: { eco: Ecosystem }) {
  const setPanel = useGlobeStore((s) => s.setPanel);
  const selectUser = useGlobeStore((s) => s.selectUser);
  const { session, profile } = useAuth();
  const { data: profiles } = useProfiles();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const key = ["messages", eco.slug] as const;
  const { data: messages = [], isLoading, isError } = useQuery({
    queryKey: key,
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("ecosystem_slug", eco.slug)
        .order("created_at", { ascending: false })
        .limit(80);
      if (error) throw error;
      return data.reverse();
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`chat-${eco.slug}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `ecosystem_slug=eq.${eco.slug}` },
        (payload) => {
          const m = payload.new as Message;
          qc.setQueryData<Message[]>(key, (old = []) => (old.some((x) => x.id === m.id) ? old : [...old, m]));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eco.slug, qc]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const byId = useMemo(() => new Map((profiles ?? []).map((p) => [p.id, p])), [profiles]);

  const send = async () => {
    const content = text.trim();
    if (!content || !session || !profile) return;
    if (!profile.username) {
      setPanel("edit");
      toast("Pick a username first");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("messages").insert({ ecosystem_slug: eco.slug, user_id: session.user.id, content });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setText("");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={listRef} className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {isLoading && <p className="eyebrow animate-pulse-soft">Loading…</p>}
        {isError && <p className="text-xs text-destructive">Couldn't load messages.</p>}
        {!isLoading && !isError && messages.length === 0 && (
          <div className="my-auto py-10 text-center">
            <div className="mx-auto mb-3 h-1.5 w-1.5 rounded-full" style={{ background: eco.color, boxShadow: `0 0 16px ${eco.color}` }} />
            <p className="text-sm text-muted-foreground">Nothing here yet.</p>
            <p className="mt-1 text-xs text-muted-foreground/70">Be the first to say something in {eco.name}.</p>
          </div>
        )}
        {messages.map((m) => {
          const p = byId.get(m.user_id);
          const mine = m.user_id === session?.user.id;
          const name = p?.username ? `@${p.username}` : p ? shortAddress(p.wallet_address) : "unknown";
          return (
            <div key={m.id} className="animate-fade-up">
              <div className="flex items-baseline gap-2">
                <button
                  type="button"
                  onClick={() => p && selectUser(p.id)}
                  className={`text-xs font-semibold tracking-wide ${mine ? "text-foreground" : "text-muted-foreground"} hover:underline`}
                >
                  {name}
                </button>
                <span className="font-mono text-[10px] text-muted-foreground/60">
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="mt-0.5 text-sm leading-relaxed break-words">{m.content}</p>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border px-3 py-3">
        {session ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              placeholder={`Message ${eco.name.toLowerCase()}…`}
              className="h-10 flex-1 rounded-xl border border-border bg-input px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring/40"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              aria-label="Send"
              className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-30"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setPanel("wallet")}
            className="h-10 w-full rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Connect wallet to chat
          </button>
        )}
      </div>
    </div>
  );
}
