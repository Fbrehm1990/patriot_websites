# patriot_websites

# SiteForge

Done-for-you web design storefront and client dashboard, built for small businesses in the Martinsburg, WV area.

## Overview

SiteForge is a full-stack website service business platform. It includes a public-facing storefront for lead generation, a secured admin dashboard for managing clients and leads, and a set of production/portfolio templates used to deliver client sites.

Three service tiers are offered: **Starter**, **Standard**, and **Premium**.

## Tech Stack

- **[Supabase](https://supabase.com)** — Auth and database (leads table with RLS policies)
- **[Netlify](https://netlify.com)** — Hosting and deployment
- **[Formspree](https://formspree.io)** — Lead form fallback handling
- **[Anthropic API](https://www.anthropic.com)** (Claude Sonnet 4.6) — Dashboard AI content generation and automated lead acknowledgment emails
- **[Resend](https://resend.com)** — Transactional email for the lead auto-responder

## Project Structure

```
├── index.html                  # Main storefront landing page
├── SiteForge_Storefront.html   # Storefront variant
├── SiteForge_Dashboard.html    # Admin dashboard (auth-protected)
├── reset.html                  # Password reset flow
├── privacy-policy.html
├── terms-of-service.html
├── Template_Blank.html         # Base template for new client builds
├── Template_Restaurant.html    # Portfolio/production template
├── Template_Retail.html        # Portfolio/production template
├── Template_Salon.html         # Portfolio/production template
└── Tattoo_shop_website.html    # Portfolio/production template
```

## Dashboard Access

The admin dashboard is hidden behind a nav lock icon and the `Ctrl+Shift+D` shortcut, protected by Supabase Auth (email/password with optional "remember me"). Sessions auto-lock after 30 minutes of inactivity.

## Setup

1. Create a [Supabase](https://supabase.com) project and set up the `leads` table with RLS policies.
2. Replace the following placeholders in `index.html`, `SiteForge_Dashboard.html`, and `reset.html`:
   - `YOUR_SUPABASE_URL`
   - `YOUR_SUPABASE_ANON_KEY`
3. Set up a [Formspree](https://formspree.io) form as a fallback lead-capture endpoint.
4. Deploy to [Netlify](https://netlify.com) and connect your domain, verifying nameservers point to Netlify.
5. (Optional) Deploy the Supabase Edge Function for automated lead acknowledgment emails via Resend. Controlled by an `AUTO_SEND` secret — defaults to draft-only mode.

## Status

Actively in development. Current focus: automating lead processing end-to-end (Supabase migration → AI-drafted acknowledgment emails → scheduled follow-up sequences).

## License

Proprietary — all rights reserved.
