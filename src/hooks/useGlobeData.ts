import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGlobeStore } from "@/lib/store";
import type { Ecosystem, Profile } from "@/lib/types";

export const ecosystemsQuery = {
  queryKey: ["ecosystems"] as const,
  queryFn: async (): Promise<Ecosystem[]> => {
    const { data, error } = await supabase.from("ecosystems").select("*").order("sort_order");
    if (error) throw error;
    return data;
  },
  staleTime: Infinity,
};

export const profilesQuery = {
  queryKey: ["profiles"] as const,
  queryFn: async (): Promise<Profile[]> => {
    const { data, error } = await supabase.from("profiles").select("*").limit(5000);
    if (error) throw error;
    return data;
  },
  staleTime: 60_000,
};

export const useEcosystems = () => useQuery(ecosystemsQuery);
export const useProfiles = () => useQuery(profilesQuery);

/** Tracks presence for the current user and keeps the online set in the store. Refreshes profiles on change. */
export function usePresence(userId: string | undefined) {
  const setOnline = useGlobeStore((s) => s.setOnline);
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase.channel("globe-presence", { config: { presence: { key: userId ?? crypto.randomUUID() } } });
    const sync = () => {
      const state = channel.presenceState<{ user_id?: string }>();
      const ids = new Set<string>();
      for (const key of Object.keys(state)) {
        for (const p of state[key] ?? []) if (p.user_id) ids.add(p.user_id);
      }
      setOnline(ids);
    };
    channel
      .on("presence", { event: "sync" }, sync)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && userId) {
          await channel.track({ user_id: userId, at: Date.now() });
        }
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, setOnline]);

  useEffect(() => {
    const channel = supabase
      .channel("profiles-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        void qc.invalidateQueries({ queryKey: ["profiles"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
