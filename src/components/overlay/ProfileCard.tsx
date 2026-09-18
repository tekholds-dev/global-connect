import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGlobeStore } from "@/lib/store";
import { CHAIN_LABEL, shortAddress } from "@/lib/geo";
import type { Profile } from "@/lib/types";

export function ProfileCard({ profile }: { profile: Profile }) {
  const selectUser = useGlobeStore((s) => s.selectUser);
  const setPanel = useGlobeStore((s) => s.setPanel);
  const online = useGlobeStore((s) => s.onlineIds.has(profile.id));
  const { session } = useAuth();
  const qc = useQueryClient();
  const me = session?.user.id;
  const isMe = me === profile.id;

  const { data: stats } = useQuery({
    queryKey: ["follow-stats", profile.id, me],
    queryFn: async () => {
      const [followers, following, mine] = await Promise.all([
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profile.id),
        me ? supabase.from("follows").select("follower_id").eq("follower_id", me).eq("following_id", profile.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      return { followers: followers.count ?? 0, following: following.count ?? 0, isFollowing: Boolean(mine.data) };
    },
  });

  const toggleFollow = async () => {
    if (!me) return setPanel("wallet");
    const res = stats?.isFollowing
      ? await supabase.from("follows").delete().eq("follower_id", me).eq("following_id", profile.id)
      : await supabase.from("follows").insert({ follower_id: me, following_id: profile.id });
    if (res.error) toast.error(res.error.message);
    void qc.invalidateQueries({ queryKey: ["follow-stats", profile.id] });
  };

  const initial = (profile.username ?? profile.wallet_address).slice(0, 1).toUpperCase();
  const chainColor = profile.chain === "solana" ? "var(--color-solana)" : "var(--color-ethereum)";

  return (
    <div className="glass pointer-events-auto fixed inset-x-2 bottom-2 z-30 w-auto rounded-2xl p-4 animate-slide-in-up md:inset-x-auto md:bottom-auto md:left-4 md:top-1/2 md:w-[300px] md:-translate-y-1/2 md:animate-fade-up">
      <button
        type="button"
        onClick={() => selectUser(null)}
        aria-label="Close"
        className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-3">
        <div className="relative grid h-12 w-12 place-items-center rounded-full border border-border bg-secondary font-mono text-lg">
          {initial}
          {online && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-online shadow-[0_0_10px_var(--color-online)]" />}
        </div>
        <div className="min-w-0">
          <div className="truncate text-base font-semibold">{profile.username ? `@${profile.username}` : "Unnamed"}</div>
          <div className="mt-0.5 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: chainColor }} />
            {CHAIN_LABEL[profile.chain]} · {shortAddress(profile.wallet_address)}
          </div>
        </div>
      </div>
      {profile.display_name && <div className="mt-3 text-sm">{profile.display_name}</div>}
      {profile.bio && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{profile.bio}</p>}
      <div className="mt-4 flex items-center gap-4 font-mono text-[11px] text-muted-foreground">
        <span>
          <span className="text-foreground">{stats?.followers ?? "–"}</span> followers
        </span>
        <span>
          <span className="text-foreground">{stats?.following ?? "–"}</span> following
        </span>
        <span className="ml-auto flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {profile.location_shared ? "approx." : "random"}
        </span>
      </div>
      <div className="mt-4">
        {isMe ? (
          <button type="button" onClick={() => setPanel("edit")} className="h-9 w-full rounded-xl border border-border bg-secondary text-sm hover:bg-accent">
            Edit profile
          </button>
        ) : (
          <button
            type="button"
            onClick={toggleFollow}
            className={`h-9 w-full rounded-xl text-sm font-medium transition-colors ${
              stats?.isFollowing ? "border border-border bg-secondary hover:bg-accent" : "bg-primary text-primary-foreground hover:opacity-90"
            }`}
          >
            {stats?.isFollowing ? "Following" : "Follow"}
          </button>
        )}
      </div>
    </div>
  );
}
