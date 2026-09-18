import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { GlobeCanvas } from "@/components/globe/GlobeCanvas";
import { TopBar, BottomBar } from "@/components/overlay/TopBar";
import { ChatPanel } from "@/components/overlay/ChatPanel";
import { ProfileCard } from "@/components/overlay/ProfileCard";
import { WalletSheet } from "@/components/overlay/WalletSheet";
import { ProfileEditor } from "@/components/overlay/ProfileEditor";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useEcosystems, usePresence, useProfiles } from "@/hooks/useGlobeData";
import { useGlobeStore } from "@/lib/store";

const TITLE = "Feeless Globe — the crypto social globe";
const DESC = "A live 3D Earth of real wallets and crypto communities. Connect a Solana or EVM wallet, claim your spot, and join Solana, Ethereum, Pump, Base and Feeless chats in realtime.";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#000000" },
    ],
  }),
  component: () => (
    <AuthProvider>
      <GlobePage />
      <Toaster
        position="top-center"
        theme="dark"
        toastOptions={{ className: "!bg-popover !text-popover-foreground !border-border !font-sans !text-sm" }}
      />
    </AuthProvider>
  ),
});

function GlobePage() {
  const { session, profile } = useAuth();
  const { data: ecosystems = [], isError: ecoError } = useEcosystems();
  const { data: profiles = [], isError: profError } = useProfiles();
  usePresence(session?.user.id);

  const panel = useGlobeStore((s) => s.panel);
  const setPanel = useGlobeStore((s) => s.setPanel);
  const selectedEcosystem = useGlobeStore((s) => s.selectedEcosystem);
  const selectedUserId = useGlobeStore((s) => s.selectedUserId);
  const [ready, setReady] = useState(false);
  const [webgl, setWebgl] = useState(true);

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      setWebgl(Boolean(c.getContext("webgl2") || c.getContext("webgl")));
    } catch {
      setWebgl(false);
    }
  }, []);

  useEffect(() => {
    if (!session && panel === "edit") setPanel("none");
  }, [session, panel, setPanel]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPanel("none");
        useGlobeStore.getState().selectEcosystem(null);
        useGlobeStore.getState().selectUser(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPanel]);

  const eco = ecosystems.find((e) => e.slug === selectedEcosystem);
  const selectedProfile = profiles.find((p) => p.id === selectedUserId);

  return (
    <div className="fixed inset-0 bg-background text-foreground">
      {webgl ? (
        <GlobeCanvas ecosystems={ecosystems} profiles={profiles} onReady={() => setReady(true)} />
      ) : (
        <div className="grid h-full place-items-center px-6 text-center text-sm text-muted-foreground">
          This device can't render 3D. Try a modern browser with WebGL enabled.
        </div>
      )}

      {/* Loading veil */}
      <div
        className={`pointer-events-none absolute inset-0 z-40 grid place-items-center bg-background transition-opacity duration-1000 ${ready ? "opacity-0" : "opacity-100"}`}
        aria-hidden={ready}
      >
        <span className="eyebrow animate-pulse-soft">Loading globe</span>
      </div>

      {/* Subtle vignette */}
      <div className="pointer-events-none absolute inset-0 z-10 [background:radial-gradient(ellipse_at_center,transparent_55%,oklch(0_0_0/0.65)_100%)]" />

      <TopBar />
      <BottomBar ecosystems={ecosystems} userCount={profiles.length} />

      {(ecoError || profError) && (
        <div className="pointer-events-none fixed left-1/2 top-16 z-30 -translate-x-1/2 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 font-mono text-[10px] tracking-widest text-destructive">
          CONNECTION ISSUE — RETRYING
        </div>
      )}

      {eco && <ChatPanel key={eco.slug} eco={eco} />}
      {selectedProfile && <ProfileCard key={selectedProfile.id} profile={selectedProfile} />}
      {panel === "wallet" && !session && <WalletSheet />}
      {panel === "edit" && profile && <ProfileEditor key={profile.updated_at} profile={profile} />}
    </div>
  );
}
