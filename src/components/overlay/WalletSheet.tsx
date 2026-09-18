import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { requestNonce, verifyWallet } from "@/lib/auth.functions";
import { connectEvm, connectSolana, detectWallets, type Chain } from "@/lib/wallet";
import { useGlobeStore } from "@/lib/store";
import { useAuth } from "@/hooks/useAuth";
import { OverlayPanel } from "./OverlayPanel";

export function WalletSheet() {
  const setPanel = useGlobeStore((s) => s.setPanel);
  const { refreshProfile } = useAuth();
  const getNonce = useServerFn(requestNonce);
  const verify = useServerFn(verifyWallet);
  const [busy, setBusy] = useState<Chain | null>(null);
  const detected = detectWallets();

  const connect = async (chain: Chain) => {
    setBusy(chain);
    try {
      const wallet = chain === "solana" ? await connectSolana() : await connectEvm();
      const { nonce, message } = await getNonce({ data: { chain, address: wallet.address } });
      const signature = await wallet.signMessage(message);
      const { tokenHash, isNew } = await verify({ data: { chain, address: wallet.address, nonce, signature } });
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
      if (error) throw error;
      await refreshProfile();
      setPanel(isNew ? "edit" : "none");
      toast.success(isNew ? "Wallet linked — pick a username" : "Signed in");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not connect wallet";
      toast.error(/rejected|denied|cancel/i.test(msg) ? "Signature request cancelled" : msg);
    } finally {
      setBusy(null);
    }
  };

  return (
    <OverlayPanel title="Connect wallet" onClose={() => setPanel("none")} size="sm">
      <p className="text-sm text-muted-foreground">
        Your wallet is your identity. You'll sign a message to prove ownership — no transaction, no fees, and your keys never leave your wallet.
      </p>
      <div className="mt-5 grid gap-2">
        <WalletButton
          label="Solana"
          hint={detected.solana ? "Phantom / Solflare detected" : "Phantom or Solflare"}
          colorClass="bg-solana"
          busy={busy === "solana"}
          disabled={busy !== null}
          onClick={() => connect("solana")}
        />
        <WalletButton
          label="Ethereum / EVM"
          hint={detected.evm ? "Browser wallet detected" : "MetaMask, Rabby, Coinbase"}
          colorClass="bg-ethereum"
          busy={busy === "evm"}
          disabled={busy !== null}
          onClick={() => connect("evm")}
        />
      </div>
      <p className="mt-4 eyebrow">Private keys and seed phrases are never requested or stored.</p>
    </OverlayPanel>
  );
}

function WalletButton({
  label,
  hint,
  colorClass,
  busy,
  disabled,
  onClick,
}: {
  label: string;
  hint: string;
  colorClass: string;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex w-full items-center gap-3 rounded-xl border border-border bg-secondary px-4 py-3 text-left transition-colors hover:bg-accent disabled:opacity-60"
    >
      <span className={`h-2.5 w-2.5 rounded-full ${colorClass} shadow-[0_0_12px_currentColor]`} />
      <span className="flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{busy ? "Waiting for signature…" : hint}</span>
      </span>
      <span className="text-muted-foreground transition-transform group-hover:translate-x-0.5">→</span>
    </button>
  );
}
