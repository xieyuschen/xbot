# xbot

Xbot is a telegram bot running inside cloudflare worker for personal usages.

## Feature

- `note`: append the input to a specified github repo branch file, it's used for me to add my daily whispers and random thoughts.
- `echo`: an inital command
- `help`: a command to print all available commands.

If no commands is provided, the bot will note it down by default.

## Setting up

1. Create a bot via bot father
2. Set up all necessary secrets described via wrangler:
```
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put GITHUB_REPO_OWNER
npx wrangler secret put GITHUB_REPO_NAME
npx wrangler secret put GITHUB_FILE_PATH
npx wrangler secret put GITHUB_COMMIT_MESSAGE
npx wrangler secret put GITHUB_BRANCH_NAME
```

3. Bind your bot to your running domain, for example, I use `xbot.dangui.org`.
```sh
export TELEGRAM_BOT_TOKEN=xxx
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \  
-d "url=https://xbot.dangui.org/"
```

4. run `npm run deploy` to deploy to cloudflare worker.