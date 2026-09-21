import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { MARKET_SLUGS, type MarketSnapshot } from "./market.server";

const Input = z.object({ slug: z.enum(MARKET_SLUGS as [string, ...string[]]) });

export const getEcosystemMarket = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<MarketSnapshot> => {
    const { fetchMarketSnapshot } = await import("./market.server");
    return fetchMarketSnapshot(data.slug);
  });
