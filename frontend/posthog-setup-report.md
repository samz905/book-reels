<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Oddega Next.js App Router project. The integration covers client-side initialization via `instrumentation-client.ts` (the recommended approach for Next.js 15.3+), a server-side PostHog client in `lib/posthog-server.ts`, a reverse proxy via `next.config.ts` rewrites, user identification on login and session restore, error tracking via `captureException`, and 12 custom events across 7 files spanning both client and server code. Environment variables are stored in `.env.local` and never hardcoded.

## Events instrumented

| Event | Description | File |
|-------|-------------|------|
| `user_signed_up` | User submitted the signup/request-access form with email and password | `app/login/page.tsx` |
| `user_logged_in` | User successfully logged in with email/password | `app/login/page.tsx` |
| `user_google_sign_in_started` | User clicked "Continue with Google" to initiate OAuth login | `app/login/page.tsx` |
| `user_signed_out` | User clicked the log out button from the header | `app/components/Header.tsx` |
| `story_created` | Creator successfully created a new story (title, type, genres, status) | `app/create/page.tsx` |
| `episode_created` | Creator successfully created a new episode for a story | `app/create/page.tsx` |
| `ebook_added` | Creator successfully added an ebook to a story | `app/create/page.tsx` |
| `cart_item_added` | User added a subscription or ebook item to their shopping cart | `app/context/CartContext.tsx` |
| `cart_item_removed` | User removed a subscription or ebook item from their shopping cart | `app/context/CartContext.tsx` |
| `checkout_completed` | User successfully completed checkout — subscriptions and ebook purchases processed (server-side) | `app/api/cart/checkout/route.ts` |
| `video_generation_started` | Creator started an AI video generation job via Veo (server-side) | `app/api/generate-video/route.ts` |
| `auth_callback_completed` | OAuth callback resolved — user identified and redirected to home or waitlist (server-side) | `app/auth/callback/route.ts` |

## Files created

| File | Purpose |
|------|---------|
| `instrumentation-client.ts` | Client-side PostHog initialization (Next.js 15.3+ pattern) with session replay, error tracking, and reverse proxy |
| `lib/posthog-server.ts` | Singleton server-side PostHog client (posthog-node) for API routes |
| `next.config.ts` | Added `/ingest/*` reverse proxy rewrites and `skipTrailingSlashRedirect: true` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://us.posthog.com/project/319878/dashboard/1297728
- **Insight — User Acquisition Trend**: https://us.posthog.com/project/319878/insights/sNwT8KFz
- **Insight — User Signup Funnel**: https://us.posthog.com/project/319878/insights/a7bgOfPD
- **Insight — Cart to Checkout Conversion**: https://us.posthog.com/project/319878/insights/ZCqQyaeY
- **Insight — Creator Content Activity**: https://us.posthog.com/project/319878/insights/znONl7o6
- **Insight — Revenue Events: Cart & Checkout**: https://us.posthog.com/project/319878/insights/vT9f7gLU

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
