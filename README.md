# Portfolio — tanel.dev

Personal portfolio built with **Astro 5** + **Tailwind CSS**, based on the [AstroWind](https://github.com/onwidget/astrowind) template.

Deployed to **AWS S3 + CloudFront** via GitHub Actions.

## Setup

```bash
npm install
cp .env.example .env   # add your GITHUB_TOKEN and GITHUB_USERNAME
npm run dev             # local dev server
npm run build           # production build
```

## Project structure

- `src/pages/` — Pages (`/`, `/activity`)
- `src/components/` — Astro components
- `src/navigation.ts` — Header links
- `goals.yaml` — Education & milestones data (drives the activity page)
- `scripts/fetch-github-activity.mjs` — Fetches GitHub data at build time → `src/data/github-activity.json`
- `.github/workflows/actions.yaml` — CI/CD: builds on push to `master` + daily cron for fresh GitHub stats

## GitHub activity

The activity page pulls public repos, languages, and recent commits from the GitHub API.
The fetch script runs during CI and requires a `GH_TOKEN` secret with repo read access.

## License

MIT — see [LICENSE.md](LICENSE.md).
