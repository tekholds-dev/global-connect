# Global Connect

you have access to feeless github 
Build this now as a working app — do not give me a plan first.

Create a premium minimal crypto social globe.

CORE:

- Full-screen interactive 3D Earth on a pure black background.

- Visual style: dark, cinematic, futuristic, extremely clean.

- Use Three.js / React Three Fiber.

- Earth slowly rotates and can be dragged/zoomed.

- Small glowing dots across Earth represent REAL registered users.

- Users may optionally share approximate location; otherwise assign a persistent random position. Never expose precise location.

- Larger glowing 3D markers protrude slightly from the globe for crypto communities: SOLANA, ETHEREUM, PUMP, BASE and FEELESS.

- Clicking a marker smoothly focuses it and opens that ecosystem's realtime community chat.

- Clicking a user dot opens a compact profile card.

- Add wallet connection for Solana + EVM.

- Wallet = identity; allow username/profile creation.

- Supabase for profiles, chats, realtime presence, follows and persistent globe positions.

- Never store private keys/seed phrases.

- No fake users, messages, online counts, activity or locations. Empty states are okay.

- Mobile + desktop responsive.

IMPORTANT:

This is NOT a dashboard, city, metaverse, trading terminal or generic landing page.

THE GLOBE IS THE PRODUCT.

Keep UI controls minimal and let the globe dominate the screen.

No giant hero text, cards everywhere, fake metrics or unnecessary pages.

BUILD ORDER:

1. Make the 3D globe visually exceptional and fully interactive.

2. Make ecosystem markers beautiful and clickable.

3. Add user dots.

4. Add wallet/profile system.

5. Add realtime ecosystem chats.

6. Polish animations, performance, loading/error states and mobile.

7. Run and test the actual app and fix errors.

Use one maintainable production architecture and keep dependencies reasonable.

START BUILDING IMMEDIATELY.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e5a87686-60da-4480-8184-8f13cb112cb4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
