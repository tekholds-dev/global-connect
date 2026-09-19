# Ecosystem intelligence and Feeless terminal

## What I’ll build

- Keep the full-screen globe as the main product, with a luminous green galaxy field and a central Feeless brand signal that does not block rotation or markers.
- Expand every ecosystem panel into three focused views:
  - **Community** — the existing realtime member chat.
  - **Ask AI** — a streaming crypto assistant grounded in the selected ecosystem, with clear non-financial-advice framing and readable markdown answers.
  - **Movers** — live top tokens for that ecosystem; selecting a token opens price, change, volume, liquidity, market cap, and source links.
- Add a prominent Feeless action that opens a new `/feeless` terminal inspired by the supplied reference: compact green-on-black navigation, branded headline, live market overview, selected-token panel, movers table, and ecosystem links. It will use real available market data and honest unavailable states rather than fabricated metrics or activity.
- Use the new Feeless mark throughout the globe, terminal, and favicon.

## Technical details

- Add a streaming `/api/chat` TanStack server route using Lovable AI Gateway and `openai/gpt-6-astra`, with complete chat history, ecosystem-specific server instructions, reasoning enabled, and gateway error messages surfaced in the panel.
- Build the assistant surface from the installed AI Elements `Conversation`, `Message`, `PromptInput`, and `Shimmer` primitives.
- Add a validated server-side market-data function using public live endpoints, with caching, ecosystem allowlisting, compact normalized results, and graceful rate-limit/failure states.
- Add a dedicated `/feeless` content route with unique metadata; preserve the root globe metadata.
- Create the galaxy/logo scene with React Three Fiber primitives and generated imagery, respecting reduced motion and mobile performance.
- Replace raw action buttons touched by this work with the project Button control where applicable.

## Verification

- Exercise the AI stream with a real request and confirm a visible answer or report the exact account/credit blocker.
- Verify live movers, token selection, the Feeless terminal link, globe interaction, loading/error states, and no fake fallback values.
- Check desktop and mobile screenshots, browser console/network signals, and the latest preview build status.
