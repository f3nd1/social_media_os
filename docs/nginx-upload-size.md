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
