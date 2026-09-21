/**
 * Live market data from the public GeckoTerminal API (no key required).
 * Only real values are returned; missing numbers stay null so the UI can show
 * an honest "—" instead of a fabricated figure.
 */

export interface MarketToken {
  /** On-chain token (mint / contract) address. */
  address: string;
  symbol: string;
  name: string;
  priceUsd: number | null;
  change24h: number | null;
  volume24h: number | null;
  liquidityUsd: number | null;
  marketCapUsd: number | null;
  poolAddress: string;
  poolName: string;
  dex: string | null;
  network: string;
}

export interface MarketPlatform {
  id: string;
  name: string;
}

export interface MarketSnapshot {
  slug: string;
  network: string;
  networkLabel: string;
  tokens: MarketToken[];
  platforms: MarketPlatform[];
  totalVolume24h: number | null;
  updatedAt: string;
  note: string | null;
}

const NETWORKS: Record<string, { network: string; label: string; note: string | null; dexFilter?: string[] }> = {
  solana: { network: "solana", label: "Solana", note: null },
  ethereum: { network: "eth", label: "Ethereum", note: null },
  base: { network: "base", label: "Base", note: null },
  pump: {
    network: "solana",
    label: "Pump",
    note: "Pump.fun and PumpSwap pools on Solana.",
    dexFilter: ["pump-fun", "pumpswap", "pumpfun", "pump"],
  },
  feeless: { network: "solana", label: "Feeless", note: "Feeless is Solana-first — showing live Solana market data." },
};

export const MARKET_SLUGS = Object.keys(NETWORKS);

const BASE = "https://api.geckoterminal.com/api/v2";
const TTL = 60_000;
const cache = new Map<string, { at: number; value: MarketSnapshot }>();

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number.parseFloat(v) : typeof v === "number" ? v : Number.NaN;
  return Number.isFinite(n) ? n : null;
};

interface GtPool {
  attributes?: Record<string, unknown>;
  relationships?: Record<string, { data?: { id?: string } | null }>;
}

const STABLE = new Set(["USDC", "USDT", "WSOL", "SOL", "WETH", "ETH", "USDE", "DAI", "USD1"]);

function toToken(pool: GtPool, network: string): MarketToken | null {
  const a = pool.attributes ?? {};
  const poolAddress = typeof a["address"] === "string" ? a["address"] : "";
  const poolName = typeof a["name"] === "string" ? a["name"] : "";
  const baseId = pool.relationships?.["base_token"]?.data?.id ?? "";
  const address = baseId.includes("_") ? baseId.slice(baseId.indexOf("_") + 1) : "";
  if (!poolAddress || !address) return null;
  const symbol = (poolName.split("/")[0] ?? "").trim() || "?";
  const dexId = pool.relationships?.["dex"]?.data?.id ?? null;
  const changes = (a["price_change_percentage"] ?? {}) as Record<string, unknown>;
  const volumes = (a["volume_usd"] ?? {}) as Record<string, unknown>;
  const liq = (a["reserve_in_usd"] ?? null) as unknown;
  return {
    address,
    symbol,
    name: poolName,
    priceUsd: num(a["base_token_price_usd"]),
    change24h: num(changes["h24"]),
    volume24h: num(volumes["h24"]),
    liquidityUsd: num(liq),
    marketCapUsd: num(a["market_cap_usd"]) ?? num(a["fdv_usd"]),
    poolAddress,
    poolName,
    dex: dexId,
    network,
  };
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Market data unavailable (${res.status})`);
  return res.json();
}

export async function fetchMarketSnapshot(slug: string): Promise<MarketSnapshot> {
  const cfg = NETWORKS[slug];
  if (!cfg) throw new Error(`Unknown ecosystem: ${slug}`);

  const cached = cache.get(slug);
  if (cached && Date.now() - cached.at < TTL) return cached.value;

  const [trending, top, dexes] = await Promise.all([
    getJson(`${BASE}/networks/${cfg.network}/trending_pools?page=1`).catch(() => null),
    getJson(`${BASE}/networks/${cfg.network}/pools?page=1&sort=h24_volume_usd_liquidity_desc`).catch(() => null),
    getJson(`${BASE}/networks/${cfg.network}/dexes`).catch(() => null),
  ]);

  const pools: GtPool[] = [];
  for (const payload of [trending, top]) {
    const data = (payload as { data?: unknown })?.data;
    if (Array.isArray(data)) pools.push(...(data as GtPool[]));
  }

  const seen = new Set<string>();
  const tokens: MarketToken[] = [];
  for (const pool of pools) {
    const t = toToken(pool, cfg.network);
    if (!t) continue;
    if (cfg.dexFilter && !(t.dex && cfg.dexFilter.some((d) => t.dex === d))) continue;
    if (STABLE.has(t.symbol.toUpperCase()) && tokens.length > 2) continue;
    if (seen.has(t.address)) continue;
    seen.add(t.address);
    tokens.push(t);
    if (tokens.length >= 20) break;
  }

  const dexData = (dexes as { data?: unknown })?.data;
  const platforms: MarketPlatform[] = Array.isArray(dexData)
    ? (dexData as { id?: string; attributes?: { name?: string } }[])
        .slice(0, 12)
        .map((d) => ({ id: String(d.id ?? ""), name: String(d.attributes?.name ?? d.id ?? "") }))
        .filter((d) => d.id)
    : [];

  const volumes = tokens.map((t) => t.volume24h).filter((v): v is number => v != null);

  const snapshot: MarketSnapshot = {
    slug,
    network: cfg.network,
    networkLabel: cfg.label,
    tokens,
    platforms,
    totalVolume24h: volumes.length ? volumes.reduce((a, b) => a + b, 0) : null,
    updatedAt: new Date().toISOString(),
    note: cfg.note,
  };

  cache.set(slug, { at: Date.now(), value: snapshot });
  return snapshot;
}

/** Compact text summary used to ground the AI assistant. */
export function summarizeForPrompt(snap: MarketSnapshot): string {
  const fmt = (n: number | null, prefix = "") => (n == null ? "unknown" : `${prefix}${n.toLocaleString("en-US", { maximumFractionDigits: 6 })}`);
  const lines = snap.tokens
    .slice(0, 12)
    .map(
      (t) =>
        `- ${t.symbol} (${t.poolName}) address ${t.address} · price ${fmt(t.priceUsd, "$")} · 24h ${t.change24h == null ? "unknown" : `${t.change24h.toFixed(2)}%`} · 24h vol ${fmt(t.volume24h, "$")} · liquidity ${fmt(t.liquidityUsd, "$")} · dex ${t.dex ?? "unknown"}`,
    );
  return [
    `Live ${snap.networkLabel} market snapshot (${snap.updatedAt}):`,
    lines.length ? lines.join("\n") : "No live pools returned right now.",
    snap.platforms.length ? `Active platforms/DEXes: ${snap.platforms.map((p) => p.name).join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
