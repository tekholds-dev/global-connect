import { useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import feelessMark from "@/assets/feeless-mark.png";
import type { Ecosystem } from "@/lib/types";

const SUGGESTIONS = ["What's moving right now?", "Explain the top coin here", "Which platforms matter in this ecosystem?"];

/**
 * Free-form crypto Q&A grounded in the selected ecosystem's live market snapshot.
 * One conversation per ecosystem, held in memory for the session.
 */
export function AskAiPanel({ eco }: { eco: Ecosystem }) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { messages, sendMessage, status, error, stop } = useChat({
    id: `ask-ai-${eco.slug}`,
    transport: new DefaultChatTransport({ api: "/api/chat", body: { slug: eco.slug } }),
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!busy) inputRef.current?.focus();
  }, [busy, eco.slug]);

  const ask = (text: string) => {
    const value = text.trim();
    if (!value || busy) return;
    void sendMessage({ text: value });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="gap-5 px-4 py-4">
          {messages.length === 0 && (
            <div className="my-auto text-center">
              <img src={feelessMark} alt="" className="mx-auto h-10 w-10 opacity-90" />
              <p className="mt-3 text-sm">Ask anything about {eco.name}.</p>
              <p className="mt-1 text-xs text-muted-foreground">Live prices, volume, coin addresses and platforms. Not financial advice.</p>
              <div className="mt-4 flex flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => ask(s)}
                    className="rounded-xl border border-border bg-input/60 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <Message from={m.role} key={m.id}>
              <MessageContent>
                {m.parts.map((part, i) =>
                  part.type === "text" ? (
                    <MessageResponse key={i}>{part.text}</MessageResponse>
                  ) : part.type === "reasoning" && m.role === "assistant" && part.text ? (
                    <p key={i} className="text-xs text-muted-foreground/70 italic">
                      {part.text}
                    </p>
                  ) : null,
                )}
              </MessageContent>
            </Message>
          ))}

          {status === "submitted" && <Shimmer className="text-sm">Reading live {eco.name} market data…</Shimmer>}
          {error && <p className="text-xs text-destructive">{error.message || "The assistant is unavailable right now."}</p>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border px-3 py-3">
        <PromptInput
          onSubmit={(message, event) => {
            event.preventDefault();
            ask(message.text);
            event.currentTarget.reset();
          }}
        >
          <PromptInputTextarea ref={inputRef} placeholder={`Ask about ${eco.name}, a coin, an address…`} />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
