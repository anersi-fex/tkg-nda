# Ink setup (Anersi's clicks)

One step at a time. Each step says what you should see when it worked. Nothing here costs money (Supabase free tier and your existing Vercel plan are enough).

## Step 1. Put the app on `main`
Vercel builds the `main` branch. Right now `main` holds only a one-line README: the app lives on the pull request.
1. Open the pull request in https://github.com/anersi-fex/tkg-nda/pulls (signed in as anersi-fex).
2. Tap **Ready for review**, then **Merge pull request**, then **Confirm merge**.
3. You should see "Pull request successfully merged and closed".

## Step 2. Make a new Supabase project
1. Go to supabase.com and sign in (the same account as Sales Coach and Scorecard).
2. Tap **New project**. Name: `ink`. Region: **East US (Ohio)**. Tap **Generate a password**, save it in your password manager, then **Create new project**.
3. Wait about 2 minutes until the project dashboard shows.

## Step 3. Set up the database
1. Open https://github.com/anersi-fex/tkg-nda/blob/main/supabase/migrations/0001_init.sql, tap the **Raw** button, select all, copy.
2. In Supabase, open **SQL Editor** (left menu), tap **New query**, paste, tap **Run**.
3. You should see **Success. No rows returned**.

## Step 4. Copy two values
1. **Project Settings** (gear) > **Data API**: copy the **Project URL** (it looks like `https://abcd.supabase.co`, nothing after `.co`).
2. **Project Settings** > **API Keys**: copy the **secret** key (starts with `sb_secret_`; on older screens it is the `service_role` key). Keep it private.

## Step 5. Put the app on Vercel
1. Go to vercel.com > **Add New** > **Project** > import `anersi-fex/tkg-nda`.
2. Before **Deploy**, open **Environment Variables** and add (names exactly as written):

| Name | Value |
|---|---|
| `SUPABASE_URL` | the Project URL from step 4 |
| `SUPABASE_SERVICE_ROLE_KEY` | the secret key from step 4 |
| `OWNER_PASSWORD` | a new strong password just for you (save it in your password manager) |

3. Tap **Deploy**. When it is done you get an address like `tkg-nda-xxxx.vercel.app`.

## Step 6. Tell the app its address
1. In Vercel, **Settings** > **Environment Variables** > **Add** `APP_URL` = `https://` + the address from step 5 (no slash at the end).
2. **Deployments** > the top one > **…** > **Redeploy**.

## Step 7. Your company's names
1. Open the address on your phone, sign in with your password.
2. Tap your initials (top right) > **Settings**. Type the company's **legal** name as it is registered (for example "The Koka Group, LLC"), the office address, your name and title. **Save**.
3. **Share** button > **Add to Home Screen** > **Add**. The icon is the pen nib.

## Step 8. The first NDA
1. Tap **New NDA**, type the person's name, tap **Make the signing link**.
2. Hand them your phone with **Open it here to hand over the phone**, or let them scan the QR code, or **Text it**.
3. They type their name, check the box, pick a signature style, tap the 6 gold tabs, and tap **Sign and finish**. About 3 minutes.
4. Back on your phone, the agreement shows **Signed** with **Open PDF** and the record of every step (time, network address, location, device).

That is release 1. Send Claude a screenshot of the first signed record: that is the proof.

## Optional: email a copy of each signed PDF
Without this, the signer downloads their copy from the "Signed" screen (the link keeps working) and you open yours from the app.
1. Make a Resend account (resend.com), verify your sending domain, make an API key.
2. In Vercel, add `RESEND_API_KEY` = the key and `EMAIL_FROM` = `Ink <ink@yourdomain.com>` (a verified sender). Redeploy.
3. In the app, Settings > type your email under "Your email for signed copies". Each signed PDF is then emailed to the signer (if they gave an email) and to you.

## Reference: all settings
- Required: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OWNER_PASSWORD`.
- Recommended: `APP_URL` (the links the app hands out use it; without it they use the address you are on).
- Optional: `RESEND_API_KEY` + `EMAIL_FROM` (email copies), `SESSION_SECRET` (32+ characters; otherwise made from the Supabase key).
- Changing the owner password signs out every device that used it.
- Ten wrong passwords in 15 minutes lock that one phone or computer out for 15 minutes; everyone else is unaffected.
- Signing links work for 14 days unsigned, then expire; you can void one any time before it is signed. Signed agreements are never deleted.
