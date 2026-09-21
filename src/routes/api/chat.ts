import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayResponseHeaders,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai-gateway.server";

type ChatRequestBody = { messages?: unknown; slug?: unknown };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as ChatRequestBody;
        const messages = body.messages;
        const slug = typeof body.slug === "string" ? body.slug : "";
        if (!Array.isArray(messages) || messages.length === 0) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("AI is not configured", { status: 500 });

        const { fetchMarketSnapshot, MARKET_SLUGS, summarizeForPrompt } = await import("@/lib/market.server");
        let context = "Live market data is unavailable right now — say so instead of guessing numbers.";
        let label = "crypto";
        if (MARKET_SLUGS.includes(slug)) {
          try {
            const snap = await fetchMarketSnapshot(slug);
            label = snap.networkLabel;
            context = summarizeForPrompt(snap);
          } catch {
            /* keep the honest unavailable message */
          }
        }

        const system = [
          `You are the ${label} ecosystem assistant inside the Feeless Globe app.`,
          "Answer free-form crypto questions about this ecosystem, its tokens, DEXes and platforms.",
          "Ground every factual claim about prices, volume or liquidity in the live snapshot below; if a value is missing, say it is unavailable rather than inventing one.",
          "When a user asks about a token, include its full on-chain contract/mint address in a code span so it can be copied, and name the DEX or platform it trades on.",
          "Be concise: short paragraphs or tight bullet lists, under ~180 words unless asked for more.",
          "You are not a financial advisor. Add a brief 'not financial advice' note when the user asks what to buy, sell or hold.",
          "",
          context,
        ].join("\n");

        const initialRunId = getLovableAiGatewayRunId(request);
        const runIdFetch = createLovableAiGatewayRunIdFetch(initialRunId);
        const lovable = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey: key,
          headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          fetch: runIdFetch.fetch,
        });

        const result = streamText({
          model: lovable.responses("openai/gpt-6-astra"),
          system,
          messages: await convertToModelMessages(messages as UIMessage[]),
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "low",
              reasoningSummary: "auto",
              store: false,
              include: ["reasoning.encrypted_content"],
            },
          },
          abortSignal: request.signal,
        });

        return withLovableAiGatewayRunIdHeader(
          result.toUIMessageStreamResponse({
            originalMessages: messages as UIMessage[],
            sendReasoning: true,
            headers: getLovableAiGatewayResponseHeaders(undefined, {
              ...(initialRunId ? { "X-Lovable-AIG-Run-ID": initialRunId } : {}),
            }),
          }),
          runIdFetch,
        );
      },
    },
  },
});
