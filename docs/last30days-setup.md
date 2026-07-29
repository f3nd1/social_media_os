# Extra social listening sources (last30days)

Social Listening reads real public posts from Reddit, X, YouTube and a public
web search. This document covers the optional extra source group, which adds
Hacker News, Polymarket, GitHub, StockTwits, arXiv and Techmeme for free, and
TikTok, Instagram, Threads, Pinterest and LinkedIn for a fee.

Bluesky is deliberately not wired up. The tool supports it and it is free, but
it was judged not worth the setup for this college's audience, so the app asks
for no Bluesky credentials and offers no Bluesky field. Nothing needs undoing if
that changes later: adding it back means adding the handle and app password to
Settings and passing them through as `BSKY_HANDLE` and `BSKY_APP_PASSWORD`.

Those sources come from [last30days-skill](https://github.com/mvanhorn/last30days-skill),
an open-source tool by Matt Van Horn, MIT licensed, Copyright (c) 2026. The app
runs it as a subprocess and reads its `--emit=json` export. That is the same
pattern already used for sc-research.

## Nothing here is required

If the tool is not installed, Social Listening works exactly as it did before:
Reddit, X, YouTube and the public web. Every failure path is a quiet skip, never
an error. Install this only when you want the extra platforms.

## 1. Python 3.12

The tool needs Python 3.12 or newer. Check what the droplet has:

```bash
python3 --version
```

If that is older than 3.12, install a newer one alongside it. The system Python
is left untouched, and nothing about the Node or npm setup changes:

```bash
sudo apt update
sudo apt install -y python3.12
```

If `python3.12` ends up somewhere unusual, point the app at it directly by
adding this to `.env.production`:

```
LAST30DAYS_PYTHON=/usr/bin/python3.12
```

## 2. The tool itself

`./deploy.sh` clones and updates it automatically, into a `last30days-skill`
directory beside the app directory. It is deliberately kept out of this repo:
it is a separate project with its own releases, and vendoring it would bloat
this one.

The deploy prints the interpreter it found and warns if that interpreter is
older than 3.12. A failed clone never blocks the deploy.

To install it somewhere else, set the full path to the script:

```
LAST30DAYS_SCRIPT=/opt/last30days-skill/skills/last30days/scripts/last30days.py
```

To skip it during a deploy: `SKIP_LAST30DAYS=1 ./deploy.sh`

## 3. YouTube transcripts and comments (free)

The tool reads YouTube through the `yt-dlp` binary rather than an API key:

```bash
sudo apt install -y yt-dlp
```

This is separate from the YouTube Data API key in Settings, which the app's own
YouTube comment search uses. Both can be present; they are different paths.

## 4. Which key unlocks which platform

All of these are entered in the app under Settings, stored with the rest of the
workspace, and passed to the tool per run. None is required.

| Platforms | Where the key goes | Cost |
| --- | --- | --- |
| Reddit, Hacker News, Polymarket, GitHub, StockTwits | No key at all | Free |
| arXiv, Techmeme | No key. The tool installs small helper CLIs itself on first run | Free |
| YouTube | No key, needs the `yt-dlp` binary above | Free |
| X | Settings, xAI API key (the same key X search already uses) | Paid |
| TikTok, Instagram, Threads, Pinterest, LinkedIn | Settings, ScrapeCreators API key | Paid |

### ScrapeCreators

One key covers TikTok, Instagram, Threads, Pinterest and LinkedIn. Sign up at
scrapecreators.com.

A correction worth recording: the tool's own README states 10,000 free calls.
ScrapeCreators' published pricing is **100 free credits**, then paid plans from
about 10 US dollars. Cached results cost 0 credits and credits do not expire.
Budget against the 100 figure, not the 10,000 one.

## 5. Checking it works

Run a listening search on a topic you know has TikTok discussion. The result
header lists the sources actually read. It is written to be honest rather than
flattering, so it will say things like:

- `TikTok, Instagram not searched (no ScrapeCreators key)` when the key is absent
- `GitHub, Polymarket returned nothing this run` when a source was quiet

If none of the extra platforms ever appear, work through it in this order:

1. Is the directory there? `ls ../last30days-skill`
2. Is the interpreter new enough? `python3 --version`
3. Does the tool run by hand?
   `python3 ../last30days-skill/skills/last30days/scripts/last30days.py "test topic" --emit=json`

That third command is the useful one. The app deliberately swallows the tool's
errors so a bad run cannot break a manager's search, which does mean the real
error message only shows up when you run it directly.

## 6. A note on source quality

Several of the free sources are a poor fit for a Singapore private college:
Hacker News, StockTwits, GitHub and Polymarket rarely carry anything relevant to
education marketing. They are enabled because they cost nothing, but they are
noisy.

To stop them crowding out the Reddit and TikTok posts that do matter, no single
source may contribute more than `LAST30DAYS_PER_SOURCE_CAP` posts (currently 12)
out of the 60 the analysis step receives, and posts are taken in relevance order
rather than arrival order. That cap lives in `lib/last30days.ts` and is one line
to change.

If a source is pure noise for your topics, exclude it. The tool reads
`EXCLUDE_SOURCES` from the environment, so this in `.env.production` drops the
four least relevant:

```
EXCLUDE_SOURCES=hackernews,stocktwits,github,polymarket
```

## 7. Checking the parser still matches

The app parses the tool's JSON export, and that export belongs to a project we
do not control. If a future version changes its schema, this check fails loudly
instead of the app quietly returning no evidence:

```bash
npm run check:listening
```

Worth running after any `./deploy.sh` that pulled a new version of the tool.
