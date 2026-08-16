# How changes reach the site — versions, branches and previews

Plain-English guide for the owner. The technical rules for anyone editing the
repo are in `CLAUDE.md`; this page explains what you will see and what to ask for.

## The one idea

The site has **one live version** and any number of **trial versions**.

| | Where it lives | Where you see it |
|---|---|---|
| **Live** | the `main` branch | https://alexwilco2012-cyber.github.io/gac-connect/ (and `/presenter.html`) |
| **A trial** | its own branch, e.g. `change/hero-copy` | https://alexwilco2012-cyber.github.io/gac-connect/preview/change-hero-copy/ (and `/presenter.html` under it) |

A trial never touches the live site. You look at it on its own link, and then:

- **Like it** → it is *merged* into `main` and goes live within a few minutes.
- **Don't like it** → its branch is *deleted*. The preview link disappears on
  the next publish and nothing else changes.
- **Not sure yet** → leave it. Trials can sit for as long as you like, and
  several can exist side by side (each has its own link).

## Asking for a change

Say what you want changed. Unless you say "straight to live", the change is
made on a new branch and you get back a **preview link** to look at, plus a
one-line description of what to check. Nothing goes live until you say so.

Useful phrases:

- *"Try X on a branch"* — you'll get a preview link.
- *"Make it live"* / *"merge it"* — the trial becomes the live version.
- *"Bin it"* / *"delete that branch"* — the trial is discarded.
- *"Straight to live"* — skip the trial for something small and safe.
- *"Roll back to how it was on Tuesday"* / *"undo the last change"* — see below.

Branch names follow `change/<short-description>` (the slash becomes a dash in
the preview link). Several changes on the same theme can share a branch.

## Every live version is kept

Each time something is merged into `main`, that exact version is saved for
good (git history). So "if not liked, go back" works after the fact too:

- **Undo the last change**: the live site is put back to the version before it,
  as a new saved step — nothing is lost, the undone change can be brought back.
- **Go back to a specific version**: name the day or the change ("before the
  hotels went in") and the live site is restored to that state.

The list of saved versions is on GitHub:
https://github.com/alexwilco2012-cyber/gac-connect/commits/main — one line per
change, newest first.

## What "publish" involves (so the timings make sense)

Every push to any branch triggers two automatic jobs on GitHub:

1. **CI** — lint, 67 unit tests, the Playwright smoke journeys, the brand-string
   guard, and a full build. Red/green next to the change.
2. **Deploy** — builds the live site from `main` *and* a preview for every other
   branch, then publishes the whole set to GitHub Pages in one go. This is why
   deleting a branch removes its preview: the next publish simply doesn't
   include it.

Deploy takes roughly 2–4 minutes plus about a minute per open trial branch.
Progress and the preview links are listed under
https://github.com/alexwilco2012-cyber/gac-connect/actions (open the latest
"Deploy to GitHub Pages" run — the summary at the top has the links).

If a trial branch doesn't build, the live site still publishes; that branch is
listed as "build failed, no preview" in the summary and needs fixing before it
can be looked at.

After a publish, **hard-refresh** any tab that was already open (Ctrl+F5 /
Cmd+Shift+R) so it picks up the new files.

## What is on the site, and where its source is

| On the site | Source in the repo | Notes |
|---|---|---|
| The platform (`/`, `/app/…`, `/for-clients` …) | `src/` | Vite + React app; each screen is its own small file so the first visit loads only what it needs and the rest is fetched quietly in the background |
| The presenter (`/presenter.html`) | `presenter/src/` | Modular: one partial per screen in `presenter/src/partials/`, behaviour in `presenter/src/app/`, styles in `presenter/src/styles/`. Built by `npm run build:presenter` into a small page plus separate, cacheable files under `/presenter/` — no longer a single half-megabyte file that unpacks itself |

Neither is edited on GitHub directly; both are edited as source files on a
branch and built by the deploy job.
