# Twitter Bomb Disposal

Sometimes you tweet something and it bombs.

Delete all those.

## Usage

To run this barely complete script:

* go request an export of all your twitter activity and wait a few days
* go register yourself a twitter app at https://developer.twitter.com/
* clone this repo
* copy `.env.sample` to `.env` and fill in env vars with credentials from your twitter app and the path to your exported archive
* `npm run start`

If you want different rules for what to delete just hack them into `src/index.ts`

It uses a CSV file as a "database" to store progress on what's already been deleted so it can be restarted/re-run safely.

## Licence

MIT &copy; John Barton 2021

## Contributions

I probably don't want any. Try your luck.
