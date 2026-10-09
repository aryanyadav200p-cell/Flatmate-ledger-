# Flatmate Ledger: Shared Household App

A responsive, installable-feeling web app for six flatmates: shared expenses, settlement suggestions, personal spending, nutrition logs, learning journal, chores, CSV exports and JSON backup/restore.

## Important status: local-first starter, not yet cloud-synchronized

This version includes the user interface, local browser storage, PWA shell, a starter Supabase schema and a setup screen. **Entering a Supabase URL and public key does not turn on cloud sync.** The data repository still uses local storage until Supabase authentication, household membership, CRUD calls and realtime subscriptions are implemented and tested. Do not use it as the household's sole financial record until that work is complete.

## Run locally

- Open `index.html` directly, or run `python -m http.server 8000` in this directory and visit `http://localhost:8000`.
- To test the service worker/PWA, use localhost or an HTTPS deployment. Service workers do not work from a `file://` URL.

## Publish on GitHub Pages

1. Create a public repository such as `flatmate-ledger`.
2. Upload `index.html`, `app.js`, `sw.js`, `manifest.webmanifest`, `icon.svg`, `README.md`, `LICENSE`, and `supabase_schema.sql` at the repository root.
3. Open **Settings → Pages**, deploy from the `main` branch and `/ (root)`.
4. Open the published HTTPS URL on each phone and use the browser menu's **Add to Home screen** / **Install app** option.

GitHub Pages only hosts the static website. It does not provide shared database storage.

## Enable true six-phone synchronization (required extra work)

1. Create a Supabase project.
2. Review `supabase_schema.sql` carefully and run it in the Supabase SQL Editor.
3. Create an owner/admin-only setup flow that creates one household and inserts six `household_members` rows mapping each user's Supabase Auth UUID to their member record.
4. Add sign-up/sign-in/sign-out/reset-password UI and a Supabase JS client.
5. Replace local-only `save()` / `load()` calls with database CRUD for each table, filtering personal tables by `owner_id`.
6. Subscribe to `shared_expenses` changes through Supabase Realtime and refresh shared records on all signed-in devices.
7. Add authorization checks for household and private records, validate all data, and test access from six separate accounts.
8. Do not place a Supabase service-role key in the browser. A public anon/publishable key is intended for browser use only when RLS is correctly configured.

The SQL is a starter schema and must be reviewed before real use. In particular, the initial household creation/membership onboarding flow is intentionally not exposed in this static demo. RLS policies must be tested against the exact role and invitation flow you implement.

## Features

- Six configured flatmates: Daksh, Nikhil, Anuj, Ritik, Babu, Nini.
- Shared household and Saturday Market expense pools.
- Equal-split settlement calculator using integer paise.
- Personal expense tracking, separate from shared settlement.
- Food/supplement nutrient logging, learning journal and chore tracker.
- CSV exports, JSON backup/restore with confirmation, print-to-PDF.
- Light/dark theme, responsive layout, PWA manifest and service worker shell.

## Privacy

Personal spending, nutrition and learning records are personal data. The intended cloud design restricts these tables by `owner_id`; do not share personal records across the household by default. Local records remain in the current browser only.

## License

MIT.
