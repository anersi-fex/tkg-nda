# HANDOFF — Ink (tkg-nda)

Read `CLAUDE.md` first (rules, stack, flow), then this file (state and backlog).

## State (2026-10-29, session 1)
Release 1 built in one session from the owner's ask of 2026-10-28 ("a simple one screen where you basically do a docu sign ... captures a receipt of your physical IP address every time you click the sections where you adopt and sign your name"). Branch `claude/nda-signing-app-zj8dhh`, draft PR open. Not deployed yet: the owner runs SETUP.md steps 1 to 8 (new Supabase project, the migration paste, the Vercel project, the three env vars, APP_URL, Settings).

What works (verified end to end on the local database with `scripts/smoke.mjs`, 57 checks, phone-sized Chromium, plus `scripts/check-db-guards.sh`):
- Owner: password sign-in with the throttle; Settings (company legal name, address, owner name and title, owner email); New NDA (name, email, note) makes a link, a QR code, Text it (sms:) and "Open it here to hand over the phone"; the detail page shows the status, the signed PDF (open or download), the agreement and PDF SHA-256, the record of every step (time in Eastern time, IP, Vercel's city/region/country, device and browser); Void for an unsigned link; the home list in three groups.
- Signer: name + optional email + consent checkbox, Create my signature (Type: three script styles with initials preview; Draw: finger pads for signature and initials), gold "Initial here" tabs at the end of the seven key sections (the next one pulses; the bottom bar shows "N of 7" and a Next tab button), an unsigned-copy PDF to read or print first, Sign and finish, then a Signed card with Open / Download the PDF. A reload restores the state; a voided or expired link says so; link previews never count as an open.
- The PDF (pdf-lib, standard fonts, the signer's PNGs): the agreement with a gold box under each initialed section ("Initialed by ... on ... from IP ... (city)"), the acknowledgment, the signature block (recipient and company), then a Certificate of Completion with the envelope id, the agreement SHA-256, how it was signed, and the timeline of every event with UTC instants, IP, location, device. Deterministic (tests), stored in `signed_pdfs` with its SHA-256; rebuilt from the same inputs if the first store failed.
- Email copies through Resend are optional (`RESEND_API_KEY` + `EMAIL_FROM`): not tested against the real API in this session (the sandbox cannot reach resend.com); the code path is small (`src/lib/email.ts`).

Checks: `npm run lint`, `npx tsc --noEmit`, `npm test` (18 tests: document freezing and hashing, the frozen consent text, instant normalization, PNG checks, name and email cleaning, request info and device labels, PDF determinism and odd characters, session tokens), `npm run build`, `node scripts/smoke.mjs`, `scripts/check-db-guards.sh`.

## The agreement text
`src/lib/nda-text.ts`, version in the file. Drafted by a panel in this session (three drafters with different lenses, two judges, a synthesizer, three adversarial reviewers for Michigan enforceability, E-SIGN/UETA evidence, and language, a fixer, a final critic). The owner was told it is not legal advice and to have a Michigan attorney read it once; the panel's notes for the owner are at the bottom of that file. The sections marked `initial: true` are the seven a signer taps. 13 sections, about 5,200 words: thorough on purpose ("bulletproof"); the owner can ask for a shorter version.

## Backlog (not approved yet; ask the owner)
- Owner countersignature with his own adopted signature image (today the Company's acceptance is the issue event: name, time, IP, printed in the PDF).
- A second document type (an employment or contractor agreement) once the NDA is in use: the template, the frozen document and the PDF are already data-driven.
- A Resend test send and a "Resend the copy" button on the detail page.
- The record export is JSON (`/api/nda/<id>/record`); a CSV of the events if the owner wants a spreadsheet.
- Non-Latin names in the PDF text (the signature image is fine; Helvetica turns other scripts into "?"): embed a Unicode font if it ever matters.
- An expired/voided link could offer "Ask for a new link" (a tap that texts the owner).

## Review round (2026-10-29, same session)
An adversarial code review (five reviewers: security, correctness, evidence, phone UX, Next 16; every finding verified by two skeptics) found and this session fixed: the agreement SHA-256 was not reproducible from the stored row (the app's ISO string and PostgREST's differ; now `normalizeIso`); completion was claimed before the signing tap's evidence was written (now one transaction, `complete_envelope`); a signer could re-adopt a different name or signature after initialing (now locked after the first initial); anyone with the link could flood `opened` events up to the cap and freeze the envelope (caps per kind; `opened` stops being recorded after 25); PNG dimensions were unbounded (IHDR check); consent and adoption statements were not part of the frozen agreement (now they are, and the certificate prints them); the PDF hash lived only on the mutable row (now in the `sealed` event too, and the database refuses rewrites); a blank drawn signature could be adopted after switching tabs (real ink check); the signature sheet could not scroll on small phones; errors showed far from the tap; the email field promised a copy with email off; the New NDA form lost its fields on a validation error (React 19 reset); the iPhone opening screens were not listed; a lapsed session threw to Next's error page; the login flood cap could lock the owner out. Left as is, with a reason: the 500-row flood cap stays (it only stops new rows now); non-Latin names in the PDF text (Helvetica) show "?" (the signature image is unaffected).

## Gotchas
- `server-only` cannot be imported in node tests: `src/lib/pdf.ts` and `src/lib/png.ts` are pure and do not import it; the modules that do (`envelopes.ts`, `signing.ts`, `settings.ts`, `email.ts`) are covered by the smoke test instead.
- `page.textContent("body")` in Playwright includes the React flight payload in `<script>` tags, so string counts double; count elements instead.
- The QR code is an SVG string from the `qrcode` package rendered with `dangerouslySetInnerHTML` (our own URL, never user text).
- In the smoke test the "issued" event shows IP 127.0.0.1 (no proxy headers); on Vercel it is the owner's address.
- `pkill -f "next start"` kills the shell that runs it (its own command line matches); use `fuser -k 3000/tcp`.
- The triggers mean a second `storePdf` must be `ignoreDuplicates` and `saveHashes` must write the same values or nothing; `sealEnvelope` is written for that.

## Kickoff prompt for the next session
"Read CLAUDE.md and HANDOFF.md in tkg-nda. The owner's next step is SETUP.md step N (ask which). Then: [the backlog item the owner picked]."
