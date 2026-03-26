/**
 * Fetch GitHub activity for the configured user.
 *
 * Produces `src/data/github-activity.json` which is read at build time by the
 * activity page.  Private repos are included but only expose the fact that work
 * happened – no names or URLs are leaked.
 *
 * Usage:  node scripts/fetch-github-activity.mjs
 *
 * Required env vars:
 *   GH_TOKEN       – fine-grained PAT with metadata:read on all repos
 *   GH_USERNAME    – your GitHub handle
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.resolve(__dirname, '../src/data/github-activity.json');

const GITHUB_TOKEN = process.env.GH_TOKEN;
const GITHUB_USERNAME = process.env.GH_USERNAME;

if (!GITHUB_TOKEN || !GITHUB_USERNAME) {
  console.error('Missing GH_TOKEN or GH_USERNAME env vars');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function ghFetch(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    // Don't throw on 409 (empty repo) or 403 (rate-limit / no access)
    if (res.status === 409 || res.status === 403) return null;
    throw new Error(`GitHub API ${res.status}: ${res.statusText} – ${url}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Fetch recently active repos (sorted by push date)
// ---------------------------------------------------------------------------

async function fetchRecentRepos() {
  const repos = await ghFetch(
    `https://api.github.com/user/repos?sort=pushed&per_page=30&affiliation=owner,collaborator`
  );

  return repos.map((repo) => ({
    name: repo.private ? 'Private Project' : repo.name,
    fullName: repo.private ? null : repo.full_name,
    url: repo.private ? null : repo.html_url,
    description: repo.private ? 'Worked on a private project' : (repo.description || ''),
    language: repo.private ? null : repo.language,
    isPrivate: repo.private,
    pushedAt: repo.pushed_at,
    updatedAt: repo.updated_at,
    stars: repo.private ? null : repo.stargazers_count,
    forks: repo.private ? null : repo.forks_count,
  }));
}

// ---------------------------------------------------------------------------
// Fetch language breakdown per public repo
// ---------------------------------------------------------------------------

async function fetchRepoLanguages(repos) {
  const publicRepos = repos.filter((r) => !r.isPrivate && r.fullName);

  // Fetch languages in parallel (limited to 15 at a time to be nice)
  const results = {};
  for (let i = 0; i < publicRepos.length; i += 15) {
    const batch = publicRepos.slice(i, i + 15);
    const fetched = await Promise.all(
      batch.map(async (repo) => {
        const data = await ghFetch(`https://api.github.com/repos/${repo.fullName}/languages`);
        return { name: repo.name, languages: data || {} };
      })
    );
    for (const { name, languages } of fetched) {
      results[name] = languages;
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Fetch recent commits per repo (repos API – works with metadata:read + contents:read)
// ---------------------------------------------------------------------------

async function fetchRepoCommits(repos, sinceDaysAgo = 30) {
  const since = new Date(Date.now() - sinceDaysAgo * 86400000).toISOString();
  const results = []; // { date, repo, sha, message, isPrivate }

  // Only fetch for repos pushed recently
  const recentRepos = repos.filter((r) => {
    const pushed = new Date(r.pushedAt);
    return pushed >= new Date(since);
  });

  for (let i = 0; i < recentRepos.length; i += 10) {
    const batch = recentRepos.slice(i, i + 10);
    const fetched = await Promise.all(
      batch.map(async (repo) => {
        // For private repos, use original name from API (fullName won't be set)
        // We need the actual repo full_name for the API call
        if (repo.isPrivate) {
          // We can't fetch commits for private repos without the name;
          // the events API at least told us *something* happened
          return [];
        }
        const data = await ghFetch(
          `https://api.github.com/repos/${repo.fullName}/commits?since=${since}&author=${GITHUB_USERNAME}&per_page=30`
        );
        if (!data) return [];
        return data.map((c) => ({
          date: c.commit.author.date.slice(0, 10),
          repo: repo.name,
          fullName: repo.fullName,
          url: c.html_url,
          sha: c.sha.slice(0, 7),
          message: c.commit.message.split('\n')[0],
          isPrivate: false,
        }));
      })
    );
    results.push(...fetched.flat());
  }

  return results;
}

// ---------------------------------------------------------------------------
// Fetch recent events (to capture private repo activity & non-commit events)
// ---------------------------------------------------------------------------

async function fetchRecentEvents(repoPrivacyMap) {
  const pages = await Promise.all(
    [1, 2, 3].map((page) =>
      ghFetch(`https://api.github.com/users/${GITHUB_USERNAME}/events?per_page=100&page=${page}`)
    )
  );
  const allEvents = pages.filter(Boolean).flat();

  // We only care about PushEvents for private repos (to show "activity happened")
  const privateActivity = {}; // day -> Set of repo names

  for (const event of allEvents) {
    const repoName = event.repo?.name || 'unknown';
    const isPrivate = !(repoName in repoPrivacyMap);
    if (!isPrivate) continue; // we get public commits from the commits API

    const day = event.created_at.slice(0, 10);
    if (!privateActivity[day]) privateActivity[day] = new Set();
    privateActivity[day].add(repoName);
  }

  return { allEvents, privateActivity };
}

// ---------------------------------------------------------------------------
// Build activity feed from commits + private events
// ---------------------------------------------------------------------------

function buildActivityFeed(commits, privateActivity) {
  // Group commits by day -> repo
  const byDay = {};

  for (const commit of commits) {
    if (!byDay[commit.date]) byDay[commit.date] = {};
    const key = commit.fullName || commit.repo;
    if (!byDay[commit.date][key]) {
      byDay[commit.date][key] = {
        name: commit.repo,
        fullName: commit.fullName,
        url: `https://github.com/${commit.fullName}`,
        isPrivate: false,
        commits: [],
      };
    }
    byDay[commit.date][key].commits.push({
      sha: commit.sha,
      message: commit.message,
      url: commit.url,
    });
  }

  // Merge in private repo activity
  for (const [day, repoNames] of Object.entries(privateActivity)) {
    if (!byDay[day]) byDay[day] = {};
    for (const repoName of repoNames) {
      if (!byDay[day][`private:${repoName}`]) {
        byDay[day][`private:${repoName}`] = {
          name: 'Private Project',
          fullName: null,
          url: null,
          isPrivate: true,
          commits: [{ sha: '', message: 'Worked on a private project', url: null }],
        };
      }
    }
  }

  // Sort by date descending, take last 14 days
  const sortedDays = Object.keys(byDay).sort().reverse().slice(0, 14);
  return sortedDays.map((day) => ({
    date: day,
    repos: Object.values(byDay[day]),
  }));
}

// ---------------------------------------------------------------------------
// Aggregate language stats across all repos
// ---------------------------------------------------------------------------

function aggregateLanguages(repoLanguagesMap) {
  const totals = {};
  for (const langs of Object.values(repoLanguagesMap)) {
    for (const [lang, bytes] of Object.entries(langs)) {
      totals[lang] = (totals[lang] || 0) + bytes;
    }
  }
  // Sort by bytes descending
  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, bytes]) => ({ name, bytes }));
}

// ---------------------------------------------------------------------------
// Build stats
// ---------------------------------------------------------------------------

function calculateStats(recentActivity, repos) {
  // Collect all active days
  const days = recentActivity.map((d) => d.date).sort().reverse();
  const totalActiveDays = days.length;

  let streak = 0;
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  let checkDate = days.includes(today) ? new Date() : days.includes(yesterday) ? new Date(Date.now() - 86400000) : null;

  if (checkDate) {
    // Need ALL event days for streak, not just the 14-day window
    const daySet = new Set(days);
    while (true) {
      const dateStr = checkDate.toISOString().slice(0, 10);
      if (daySet.has(dateStr)) {
        streak++;
        checkDate = new Date(checkDate.getTime() - 86400000);
      } else {
        break;
      }
    }
  }

  let totalCommits = 0;
  for (const day of recentActivity) {
    for (const repo of day.repos) {
      totalCommits += repo.commits.filter((c) => c.sha).length;
    }
  }

  return {
    currentStreak: streak,
    totalActiveDays,
    totalCommits,
    totalRepos: repos.length,
    publicRepos: repos.filter((r) => !r.isPrivate).length,
    privateRepos: repos.filter((r) => r.isPrivate).length,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Fetching GitHub activity for ${GITHUB_USERNAME}...`);

  const repos = await fetchRecentRepos();

  // Build privacy map from repos we have access to
  const repoPrivacyMap = {};
  for (const repo of repos) {
    if (repo.fullName) repoPrivacyMap[repo.fullName] = false;
  }

  const [commits, { allEvents, privateActivity }, repoLanguagesMap] = await Promise.all([
    fetchRepoCommits(repos),
    fetchRecentEvents(repoPrivacyMap),
    fetchRepoLanguages(repos),
  ]);

  const recentActivity = buildActivityFeed(commits, privateActivity);
  const stats = calculateStats(recentActivity, repos);

  // Attach top languages to each public repo
  const topRepos = repos.slice(0, 10).map((repo) => {
    const langs = !repo.isPrivate && repo.name && repoLanguagesMap[repo.name]
      ? Object.entries(repoLanguagesMap[repo.name])
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, bytes]) => ({ name, bytes }))
      : [];
    return { ...repo, languages: langs };
  });

  const languages = aggregateLanguages(repoLanguagesMap);

  // All public repos for the "All repositories" section
  const allPublicRepos = repos
    .filter((r) => !r.isPrivate)
    .map((repo) => {
      const langs = repo.name && repoLanguagesMap[repo.name]
        ? Object.entries(repoLanguagesMap[repo.name])
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, bytes]) => ({ name, bytes }))
        : [];
      return { ...repo, languages: langs };
    });

  const output = {
    generatedAt: new Date().toISOString(),
    username: GITHUB_USERNAME,
    stats,
    languages,
    recentActivity,
    recentRepos: topRepos,
    allPublicRepos,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));

  console.log(`GitHub activity written to ${OUT_PATH}`);
  console.log(`  Stats: ${stats.totalCommits} commits, ${stats.currentStreak}-day streak, ${stats.totalRepos} repos`);
  console.log(`  Languages: ${languages.slice(0, 5).map((l) => l.name).join(', ')}`);
}

main().catch((err) => {
  console.error('Failed to fetch GitHub activity:', err);
  process.exit(1);
});
