# How the site stays in sync (read this if you inherit the site)

**Short version:** edit in the editor, then (if nothing happens by itself) open the repo's **Actions → Sync site data → Run workflow** and click the green button. The site updates 2–3 minutes later. That manual click always works and needs no setup.

## Why it's built this way

School computers block `supabase.co`, so the public pages never talk to Supabase. Instead:

1. The editor saves your changes to **Supabase** (the database).
2. The **"Sync site data"** GitHub Action copies them into the repo as `assets/site-data.json` and `assets/meetings-data.json`.
3. **GitHub Pages** deploys the repo. Every public page reads only those two files from its own domain, so school PCs can load them.

## Three ways the sync starts

| Trigger | Needs setup? | Speed |
| --- | --- | --- |
| **Manual:** Actions → Sync site data → Run workflow | No | ~2–3 min after the click |
| **Automatic on save:** a Supabase database trigger calls GitHub right after an editor save | Yes: a GitHub token stored in Supabase (below) | ~2–3 min after the save |
| **GitHub schedule** (every 5 min in the file) | No | Best-effort only. GitHub often delays scheduled runs by hours. |

If the token is missing, expired, or revoked, **nothing breaks**: saves still work, and the site still updates via the schedule (slowly) or the manual button.

## Setting up (or renewing) the automatic trigger

1. GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token.
2. **Resource owner:** `bvswmathnhs` (it's an organization; pick it from the dropdown, otherwise the repo won't be listed).
3. **Repository access:** only select repositories → `bvswmathnhs.github.io`.
4. **Permissions:** Repository permissions → **Actions: Read and write**. Nothing else.
5. In the Supabase SQL editor run (replace the placeholder; never put the token in the repo or in chat):
   - First time: `select vault.create_secret('PASTE_TOKEN_HERE', 'github_dispatch_token');`
   - Renewing: `select vault.update_secret((select id from vault.secrets where name = 'github_dispatch_token'), 'PASTE_NEW_TOKEN_HERE');`
6. Check that it works: save something in the editor, then run
   `select status_code, created from net._http_response order by created desc limit 5;`
   A status of **204** means GitHub accepted the request. **401/403/404** means the token is wrong, expired, or lacks permission; renew it with step 5.

If the organization blocks fine-grained tokens: org Settings → Third-party access → Personal access tokens → allow fine-grained tokens (and approve the pending token if approval is required).

## Where the pieces live

- Workflow: `.github/workflows/sync-site-data.yml`
- Supabase function and triggers: `notify_github_sync()` and `trg_notify_github_sync` on `site_content`, `meeting_notes`, `current_slides`
- Fallback loader: `assets/supabase-lite.js` (snapshot-only mode), with each page's `<head>` starting the snapshot fetch immediately
- Supabase project ref: `rydpwtehxjgmshpaxlbj`
