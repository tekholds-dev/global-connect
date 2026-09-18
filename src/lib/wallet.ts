import bs58 from "bs58";

export type Chain = "solana" | "evm";

export interface ConnectedWallet {
  chain: Chain;
  address: string;
  signMessage: (message: string) => Promise<string>;
}

type SolanaProvider = {
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey: { toString(): string } }>;
  signMessage: (msg: Uint8Array, enc: "utf8") => Promise<{ signature: Uint8Array }>;
};

type EvmProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

declare global {
  interface Window {
    solana?: SolanaProvider;
    phantom?: { solana?: SolanaProvider };
    solflare?: SolanaProvider;
    ethereum?: EvmProvider;
  }
}

export function detectWallets() {
  if (typeof window === "undefined") return { solana: false, evm: false };
  return {
    solana: Boolean(window.phantom?.solana ?? window.solana ?? window.solflare),
    evm: Boolean(window.ethereum),
  };
}

export async function connectSolana(): Promise<ConnectedWallet> {
  const provider = window.phantom?.solana ?? window.solana ?? window.solflare;
  if (!provider) throw new Error("No Solana wallet found. Install Phantom or Solflare.");
  const res = await provider.connect();
  const address = res.publicKey.toString();
  return {
    chain: "solana",
    address,
    signMessage: async (message) => {
      const { signature } = await provider.signMessage(new TextEncoder().encode(message), "utf8");
      return bs58.encode(signature);
    },
  };
}

export async function connectEvm(): Promise<ConnectedWallet> {
  const provider = window.ethereum;
  if (!provider) throw new Error("No EVM wallet found. Install MetaMask, Rabby or Coinbase Wallet.");
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const address = accounts?.[0];
  if (!address) throw new Error("No account selected");
  return {
    chain: "evm",
    address,
    signMessage: async (message) => {
      const hex = "0x" + Array.from(new TextEncoder().encode(message), (b) => b.toString(16).padStart(2, "0")).join("");
      return (await provider.request({ method: "personal_sign", params: [hex, address] })) as string;
    },
  };
}
