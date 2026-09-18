import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const chainSchema = z.enum(["solana", "evm"]);

function normalizeAddress(chain: "solana" | "evm", address: string) {
  return chain === "evm" ? address.toLowerCase() : address;
}

export function buildSignMessage(address: string, nonce: string) {
  return `Sign in to Feeless Globe\n\nThis signature proves you own this wallet. It does not trigger a transaction or cost anything.\n\nWallet: ${address}\nNonce: ${nonce}`;
}

/** Random persistent globe position, biased slightly toward inhabited latitudes. */
function randomPosition() {
  const lat = (Math.random() * 2 - 1) * 62;
  const lng = Math.random() * 360 - 180;
  return { lat, lng };
}

export const requestNonce = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ chain: chainSchema, address: z.string().min(20).max(80) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const address = normalizeAddress(data.chain, data.address);
    const nonce = crypto.randomUUID();
    const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { error } = await supabaseAdmin.from("wallet_nonces").insert({ nonce, address, chain: data.chain, expires_at });
    if (error) throw new Error("Could not create sign-in challenge");
    return { nonce, message: buildSignMessage(data.address, nonce) };
  });

export const verifyWallet = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ chain: chainSchema, address: z.string().min(20).max(80), nonce: z.string().uuid(), signature: z.string().min(20) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const address = normalizeAddress(data.chain, data.address);

    // 1. Validate nonce
    const { data: nonceRow } = await supabaseAdmin.from("wallet_nonces").select("*").eq("nonce", data.nonce).maybeSingle();
    await supabaseAdmin.from("wallet_nonces").delete().eq("nonce", data.nonce);
    if (!nonceRow || nonceRow.address !== address || nonceRow.chain !== data.chain || new Date(nonceRow.expires_at) < new Date()) {
      throw new Error("Sign-in challenge expired. Please try again.");
    }

    // 2. Verify signature
    const message = buildSignMessage(data.address, data.nonce);
    let valid = false;
    if (data.chain === "solana") {
      const nacl = (await import("tweetnacl")).default;
      const bs58 = (await import("bs58")).default;
      try {
        valid = nacl.sign.detached.verify(new TextEncoder().encode(message), bs58.decode(data.signature), bs58.decode(data.address));
      } catch {
        valid = false;
      }
    } else {
      const { verifyMessage } = await import("viem");
      try {
        valid = await verifyMessage({ address: data.address as `0x${string}`, message, signature: data.signature as `0x${string}` });
      } catch {
        valid = false;
      }
    }
    if (!valid) throw new Error("Signature could not be verified");

    // 3. Find or create the account behind this wallet
    const { data: identity } = await supabaseAdmin
      .from("wallet_identities")
      .select("user_id")
      .eq("chain", data.chain)
      .eq("address", address)
      .maybeSingle();

    const email = `${data.chain}.${address.toLowerCase()}@wallet.local`;
    let userId = identity?.user_id;

    if (!userId) {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { wallet_address: address, chain: data.chain },
      });
      if (createErr || !created.user) throw new Error("Could not create account");
      userId = created.user.id;
      const pos = randomPosition();
      const { error: idErr } = await supabaseAdmin.from("wallet_identities").insert({ chain: data.chain, address, user_id: userId });
      if (idErr) throw new Error("Could not link wallet");
      const { error: profErr } = await supabaseAdmin
        .from("profiles")
        .insert({ id: userId, wallet_address: address, chain: data.chain, lat: pos.lat, lng: pos.lng });
      if (profErr) throw new Error("Could not create profile");
    }

    // 4. Mint a one-time login token for this account
    const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
    if (linkErr || !link.properties?.hashed_token) throw new Error("Could not start session");
    return { tokenHash: link.properties.hashed_token, isNew: !identity };
  });

/** Store an approximate (rounded + jittered) location. Precise coordinates are never persisted. */
export const shareApproxLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).parse(d))
  .handler(async ({ data, context }) => {
    const jitter = () => (Math.random() - 0.5) * 1.2;
    const lat = Math.max(-85, Math.min(85, Math.round(data.lat) + jitter()));
    const lng = Math.round(data.lng) + jitter();
    const { error } = await context.supabase.from("profiles").update({ lat, lng, location_shared: true }).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { lat, lng };
  });

export const resetToRandomLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const pos = randomPosition();
    const { error } = await context.supabase.from("profiles").update({ ...pos, location_shared: false }).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return pos;
  });
