# çábTech

**Let's Sail into Technology.** A fast, installable hub for apps, games and links. Every item has its own page with details, official download links, and comments and questions from visitors. Content is managed from a private admin page, so there is no need to edit code to add something new.

**Live site:** https://x.cabtech.workers.dev

## Follow

- [TikTok: @xcab521](https://www.tiktok.com/@xcab521)
- [Instagram](https://www.instagram.com/cabtechtiktok)
- [YouTube](https://youtube.com/@mfsquoted)
- [Facebook](https://www.facebook.com/share/1FPhXANVyZ/)

## Features

- Store-style home page: search, filters (All, Games, Apps, Links), featured banner, app list and games
- Own page for every item (`/app/<name>`) with details, up to 4 download links, and comments and questions
- Light and dark mode, remembered on each device
- Contact, Ask and Social links in a bottom bar; questions go straight to the admin
- Private admin page with login: upload, edit, delete, reply to and remove comments, read visitor questions
- Installable as an app on a phone or computer (the site and a separate admin app)
- Sitemap and search-engine notifications for faster indexing

## Built with

- HTML, CSS and JavaScript (no framework)
- [Cloudflare Workers](https://workers.cloudflare.com) with static assets: hosting, item pages, sitemap
- [Supabase](https://supabase.com): database, photo storage and admin login
- GitHub: every commit to `main` redeploys the site

## Project structure

```
Aydan-Hub/
├── Aydan Hub/            # served website
│   ├── index.html        # home page
│   ├── admin.html        # private admin page (login required)
│   ├── manifest.json     # site install settings
│   └── admin-manifest.json
├── src/worker.js         # item pages, comments, sitemap, search notifications
├── wrangler.jsonc        # Cloudflare config
├── setup.sql             # database and security rules
├── comments.sql          # comments and questions on item pages
├── questions.sql         # "Ask us" box on the home page
└── README.md
```

## Using the admin page

1. Go to `https://x.cabtech.workers.dev/admin.html` and log in
2. Enter a title, pick a photo, choose a section and add the link or links
3. Tap **Push to Hub**. The item shows on the site right away

## Security notes

- The Supabase **publishable** key in the page code is meant to be public. Never put a `service_role` or secret key in this repo.
- Protection comes from row-level security rules in the SQL files, not from hiding the admin page.
- Visitors can only send comments and questions through checked database functions (no links allowed, rate-limited).
- Keep sign-ups turned off in Supabase, and use a strong, unique admin password.

## License

Personal project. All rights reserved.
