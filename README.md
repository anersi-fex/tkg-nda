# Ink by TKG

Agreements signed on a phone, with a record of every tap. Built for The Koka Group (Troy, MI) to have office visitors sign a non-disclosure agreement before they come in.

- **Owner side** (password): make a signing link for a person, hand them the phone, scan a QR code or text the link; see every agreement, its full record (time, IP address, location, device for every step) and the signed PDF; void an unsigned link; set the company names printed on the agreement.
- **Signer side** (the link, no sign-in): type your legal name, agree to sign electronically, adopt a signature (typed in a script style or drawn), tap the gold tab at the end of each of seven key sections to initial it, sign. An unsigned copy can be opened or printed first. A PDF with a certificate of completion is made at once and the link opens it any time.
- Every tap is stamped by the server (time, network address, Vercel's location for it, browser) the moment it happens, the agreement wording is frozen when the link is issued, and the completed agreement and its PDF carry SHA-256 fingerprints.

Stack: Next.js 16, React 19, Tailwind 4, Supabase Postgres (server only, service key), pdf-lib, Vercel. See `SETUP.md` for the owner's steps, `CLAUDE.md` for the rules, `HANDOFF.md` for the state.

## Run it
```
npm install
npm run dev
```
Checks before a push: `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`. End to end: `scripts/local-db/start.sh --reset`, then build and start the app with the env in `.local-db/env` plus `OWNER_PASSWORD` and `APP_URL`, then `node scripts/smoke.mjs`.

The agreement text is a draft prepared with care but not legal advice: have a Michigan attorney read `src/lib/nda-text.ts` once before relying on it.
