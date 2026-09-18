import { useAuth } from "@/hooks/useAuth";
import { useGlobeStore } from "@/lib/store";
import { shortAddress } from "@/lib/geo";
import type { Ecosystem } from "@/lib/types";

export function TopBar() {
  const { session, profile, loading } = useAuth();
  const setPanel = useGlobeStore((s) => s.setPanel);
  const selectUser = useGlobeStore((s) => s.selectUser);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-4 md:px-6">
      <div className="pointer-events-auto flex items-center gap-2.5 animate-fade-in">
        <span className="h-1.5 w-1.5 rounded-full bg-feeless shadow-[0_0_12px_var(--color-feeless)]" />
        <span className="font-mono text-[11px] tracking-[0.3em] text-foreground/90">FEELESS</span>
        <span className="font-mono text-[11px] tracking-[0.3em] text-muted-foreground">GLOBE</span>
      </div>
      <div className="pointer-events-auto animate-fade-in">
        {loading ? null : session && profile ? (
          <button
            type="button"
            onClick={() => (profile.username ? selectUser(profile.id, { lat: profile.lat, lng: profile.lng }) : setPanel("edit"))}
            className="glass flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-xs transition-colors hover:bg-accent"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-secondary font-mono text-[11px]">
              {(profile.username ?? profile.wallet_address).slice(0, 1).toUpperCase()}
            </span>
            <span className="font-medium">{profile.username ? `@${profile.username}` : shortAddress(profile.wallet_address)}</span>
            {!profile.username && <span className="font-mono text-[10px] text-muted-foreground">set username</span>}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setPanel("wallet")}
            className="glass rounded-full px-4 py-2 text-xs font-medium tracking-wide transition-colors hover:bg-accent"
          >
            Connect wallet
          </button>
        )}
      </div>
    </header>
  );
}

export function BottomBar({ ecosystems, userCount }: { ecosystems: Ecosystem[]; userCount: number }) {
  const selected = useGlobeStore((s) => s.selectedEcosystem);
  const selectEcosystem = useGlobeStore((s) => s.selectEcosystem);
  const onlineCount = useGlobeStore((s) => s.onlineIds.size);

  return (
    <footer className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex items-end justify-between gap-4 px-4 pb-4 md:px-6 md:pb-5">
      <nav className="pointer-events-auto flex max-w-full gap-1 overflow-x-auto scrollbar-thin animate-fade-in [scrollbar-width:none]">
        {ecosystems.map((e) => {
          const active = selected === e.slug;
          return (
            <button
              key={e.slug}
              type="button"
              onClick={() => selectEcosystem(active ? null : e.slug, { lat: e.lat, lng: e.lng })}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] tracking-[0.2em] transition-all ${
                active ? "glass border-glass-border text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: e.color, boxShadow: active ? `0 0 10px ${e.color}` : undefined }} />
              {e.name}
            </button>
          );
        })}
      </nav>
      <div className="pointer-events-none hidden shrink-0 items-center gap-4 font-mono text-[10px] tracking-[0.2em] text-muted-foreground md:flex animate-fade-in">
        {onlineCount > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-online shadow-[0_0_8px_var(--color-online)]" />
            {onlineCount} ONLINE
          </span>
        )}
        <span>{userCount} ON GLOBE</span>
      </div>
    </footer>
  );
}
