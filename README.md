# xbot

Xbot is a telegram bot running inside cloudflare worker for personal usages.

## Feature

- `note`: append the input to a specified github repo branch file, it's used for me to add my daily whispers and random thoughts.
- `stock`: show the changes of a stock, separated by `;`.
- `echo`: an inital command
- `help`: a command to print all available commands.

If no commands is provided, the bot will note it down by default.

## Setting up

1. Create a bot via bot father
2. Set up all necessary secrets described via wrangler:
```
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put GITHUB_TOKEN
# this is used to ensure the request comes from the real telegram, rather than a malicous attacker.
npx wrangler secret put TELEGRAM_SECRET_TOKEN
npx wrangler secret put FMP_API_KEY
```
3. put some configurations inside bound cloudflare kv store. You may update the `id` filed of `kv_namespaces` inside `wrangler.jsonc`.
```
GITHUB_REPO_OWNER
GITHUB_REPO_NAME
GITHUB_FILE_PATH
GITHUB_COMMIT_MESSAGE
GITHUB_BRANCH_NAME
ALLOWED_USER_ID
```

4. Bind your bot to your running domain, for example, I use `xbot.dangui.org`.
```sh
# Generate a 64-character alphanumeric string (letters and numbers) in macos
head -c 1024 /dev/urandom | LC_ALL=C tr -dc 'A-Za-z0-9' | head -c 64; echo

export TELEGRAM_BOT_TOKEN="YOUR_ACTUAL_BOT_TOKEN_HERE"
export TELEGRAM_WEBHOOK_SECRET="YOUR_GENERATED_STRONG_SECRET_TOKEN_HERE"

curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
     -F "url=https://xbot.dangui.org/" \
     -F "secret_token=${TELEGRAM_WEBHOOK_SECRET}"
```

5. run `npm run deploy` to deploy to cloudflare worker.

## Dev

```
npx prettier --write "**/*.ts"
```
