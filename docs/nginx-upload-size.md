# PDF upload size limit: the nginx layer

The app accepts document uploads (Brand Guidelines, Approvals & Compliance
guideline docs, Metricool PDF reports) up to **25 MB**. That limit is set in
one place in the code: `lib/upload-limits.ts` (`MAX_UPLOAD_MB`), and is enforced
both client-side (before upload) and in every extract route.

## The real ceiling in production is nginx, not the app

Production runs on the droplet as a pm2 process behind an **nginx reverse
proxy** (the app is served at `https://apps.unitedceres.edu.sg/social_media_os`).
Every upload passes through nginx first. nginx has its own body-size limit,
`client_max_body_size`, and its **default is 1 MB**. If it is left at the
default, nginx rejects any upload over 1 MB with its own `413 Request Entity
Too Large` (an HTML page) **before the request ever reaches Next.js** — so the
app's 25 MB limit never gets a say.

This is almost certainly the cause of a 413 on a normal-sized PDF: it is nginx,
not our code.

## What to change on the droplet

Edit the nginx server (or location) block that proxies to this app, usually
`/etc/nginx/sites-available/…` or a file under `/etc/nginx/conf.d/`, and set:

```nginx
# Match the app's 25 MB upload limit (a little headroom for multipart overhead).
client_max_body_size 26m;
```

Put it inside the `server { … }` block (applies to the whole site) or inside the
`location /social_media_os { … }` block (applies to just this app). Then:

```bash
sudo nginx -t          # verify the config parses
sudo systemctl reload nginx
```

No app redeploy is needed for the nginx change; reloading nginx is enough.

## If a layer cannot be raised

On this droplet nginx is self-managed, so 25 MB is fully achievable. There is no
Vercel/serverless hard cap here (the Vercel 4.5 MB request-body limit does not
apply, because this is a pm2/nginx deployment, not Vercel). If the deployment
ever moves to a platform with a hard body-size cap below 25 MB, that platform
cap becomes the true ceiling and the app limit should be lowered to match so the
client-side warning stays honest.

---

# Request timeout: the same nginx layer

A Social Listening search fetches real posts from several sources before any
analysis starts, so it can legitimately take a couple of minutes. nginx's
default `proxy_read_timeout` is **60 seconds**. Past that it gives up on the
upstream and serves its own HTML `504 Gateway Time-out` page, exactly as it
does with `client_max_body_size` and a large upload: before Next.js gets a say.

The app's own route allows 300 seconds (`maxDuration` in
`app/api/social-listening/route.ts`), so with nginx left at the default the
proxy is always the binding constraint, not the app.

## What the app now guarantees

The route caps each leg so its total is predictable rather than open-ended:

| Leg | Limit |
| --- | --- |
| sc-research (Reddit, X) | 90s |
| last30days (TikTok, Instagram, and the rest) | 90s |
| Public web search | 30s |
| Analysis (synthesis) | 60s |

The sourcing legs run concurrently, so a run costs the slowest source plus the
analysis: **about 150 seconds worst case**, not the sum of everything.

Before this, each source was allowed 180 seconds and both OpenAI calls were
unbounded, so one slow source could spend a budget the proxy had already
abandoned. The caps do not make a search faster. They make the total knowable.

## What to change on the droplet

Set the timeout **inside the location block for this app only**, so no other
site on the droplet is affected:

```nginx
location /social_media_os {
    # A listening search can legitimately take ~150s; the app caps itself
    # below this. Scoped here so other apps keep the nginx default.
    proxy_read_timeout 180s;
    proxy_send_timeout 180s;

    # ... existing proxy_pass and headers ...
}
```

Then:

```bash
sudo nginx -t          # verify the config parses
sudo systemctl reload nginx
```

No redeploy is needed; reloading nginx is enough.

To see what is currently set before changing anything:

```bash
sudo nginx -T 2>/dev/null | grep -nE "proxy_read_timeout|location .*social_media_os"
```

## If a search still times out

With the caps above, a genuine 504 means a source is hanging past its own
limit, which is worth investigating rather than papering over with a larger
number. Narrowing the source chips on the Social Listening screen is the
quickest way to confirm: fewer sources means less to wait for, and the app now
tells you which source returned nothing and why.
