import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGlobeStore } from "@/lib/store";
import { resetToRandomLocation, shareApproxLocation } from "@/lib/auth.functions";
import { OverlayPanel } from "./OverlayPanel";
import type { Profile } from "@/lib/types";

export function ProfileEditor({ profile }: { profile: Profile }) {
  const setPanel = useGlobeStore((s) => s.setPanel);
  const { refreshProfile, signOut } = useAuth();
  const qc = useQueryClient();
  const share = useServerFn(shareApproxLocation);
  const reset = useServerFn(resetToRandomLocation);
  const [username, setUsername] = useState(profile.username ?? "");
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [locBusy, setLocBusy] = useState(false);

  const save = async () => {
    const u = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(u)) return toast.error("Username: 3–20 letters, numbers or _");
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username: u, display_name: displayName.trim() || null, bio: bio.trim() || null })
      .eq("id", profile.id);
    setSaving(false);
    if (error) return toast.error(/unique|duplicate/i.test(error.message) ? "That username is taken" : error.message);
    await refreshProfile();
    void qc.invalidateQueries({ queryKey: ["profiles"] });
    toast.success("Profile saved");
    setPanel("none");
  };

  const shareLocation = async () => {
    if (!navigator.geolocation) return toast.error("Location not available on this device");
    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await share({ data: { lat: pos.coords.latitude, lng: pos.coords.longitude } });
          await refreshProfile();
          void qc.invalidateQueries({ queryKey: ["profiles"] });
          toast.success("Approximate location set");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Could not save location");
        } finally {
          setLocBusy(false);
        }
      },
      () => {
        setLocBusy(false);
        toast.error("Location permission denied");
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  const randomize = async () => {
    setLocBusy(true);
    try {
      await reset();
      await refreshProfile();
      void qc.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Position randomized");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLocBusy(false);
    }
  };

  const field = "h-10 w-full rounded-xl border border-border bg-input px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring/40";

  return (
    <OverlayPanel
      title={profile.username ? "Your profile" : "Create your profile"}
      subtitle={profile.username ? undefined : "Choose how you appear on the globe"}
      onClose={() => setPanel("none")}
      size="sm"
      footer={
        <div className="flex gap-2">
          <button type="button" onClick={() => void signOut().then(() => setPanel("none"))} className="h-10 rounded-xl border border-border bg-secondary px-3 text-xs text-muted-foreground hover:bg-accent">
            Disconnect
          </button>
          <button type="button" onClick={save} disabled={saving} className="h-10 flex-1 rounded-xl bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      }
    >
      <div className="grid gap-4">
        <label className="grid gap-1.5">
          <span className="eyebrow">Username</span>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} maxLength={20} className={`${field} pl-7`} placeholder="satoshi" autoFocus={!profile.username} />
          </div>
        </label>
        <label className="grid gap-1.5">
          <span className="eyebrow">Display name</span>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} className={field} placeholder="Optional" />
        </label>
        <label className="grid gap-1.5">
          <span className="eyebrow">Bio</span>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={160} rows={3} className={`${field} h-auto resize-none py-2`} placeholder="Optional · 160 chars" />
        </label>

        <div className="rounded-xl border border-border bg-secondary p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Globe position</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{profile.location_shared ? "approximate" : "random"}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Share your rough area (rounded to ~100 km, never exact) or keep a persistent random spot.
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={shareLocation} disabled={locBusy} className="h-8 flex-1 rounded-lg bg-accent text-xs hover:bg-accent/80 disabled:opacity-50">
              Share approx.
            </button>
            <button type="button" onClick={randomize} disabled={locBusy} className="h-8 flex-1 rounded-lg border border-border text-xs hover:bg-accent disabled:opacity-50">
              Randomize
            </button>
          </div>
        </div>
      </div>
    </OverlayPanel>
  );
}
