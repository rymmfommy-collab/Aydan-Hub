# Aydan Hub

A neon-styled hub for games, apps, links and files. Each item is a card with a photo and a button that opens its link. Content is managed from a private admin page, so there is no need to edit code to add something new.

**Live site:** https://x.aydanhub.workers.dev

## Features

- Sections for Games, Apps, Links and Files
- Photo cards with a GET button and a Share button
- Private admin page with login, photo upload, link field and delete
- Installable as an app on a phone (PWA)
- Fast and free to host

## Built with

- HTML, CSS and JavaScript (no framework)
- [Supabase](https://supabase.com): database, photo storage and admin login
- [Cloudflare Workers](https://workers.cloudflare.com): hosting
- GitHub: every commit to `main` redeploys the site

## Project structure

```
Aydan-Hub/
├── Aydan Hub/
│   ├── index.html     # public site
│   └── admin.html     # private admin page (login required)
├── manifest.json      # app install settings
├── sw.js              # service worker
├── wrangler.jsonc     # Cloudflare config
├── setup.sql          # Supabase database and security rules
└── README.md
```

## Using the admin page

1. Go to `https://x.aydanhub.workers.dev/admin.html`
2. Log in with the admin account
3. Enter a title, pick a photo (JPG, PNG, WEBP or GIF, up to 5 MB), choose a section and add the link
4. Tap **Push to Hub**. The item shows on the site right away

To remove an item, tap **Delete** next to it in the list.

## Setting it up from scratch

1. Create a [Supabase](https://supabase.com) project.
2. Create a `files` table with the columns `id`, `title`, `image_url`, `category`, `url` and `created_at`.
3. In Supabase, go to **Authentication → Users** and create your admin account. Then turn off new sign-ups under **Sign In / Providers**.
4. Open `setup.sql`, replace `YOUR_EMAIL_HERE` with your admin email, and run it in the **SQL Editor**. This creates the `photos` bucket and makes sure only your account can add, change or delete anything.
5. Put your Supabase project URL and publishable key at the top of the script in `index.html` and `admin.html`.
6. Connect the repo to Cloudflare Workers. The `wrangler.jsonc` file serves the `Aydan Hub` folder.

## Security notes

- The Supabase **publishable** key in the page code is meant to be public. Never put a `service_role` or secret key in this repo.
- Protection comes from the row-level security rules in `setup.sql`, not from hiding the admin page.
- Keep sign-ups turned off in Supabase, and use a strong, unique admin password.

## License

Personal project. All rights reserved.
