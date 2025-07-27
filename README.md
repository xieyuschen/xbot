# xbot

Xbot is a telegram bot running inside cloudflare worker for personal usages.

## Feature

- `note`: append the input to a specified github repo branch file, it's used for me to add my daily whispers and random thoughts.
- `stock`: show the changes of a stock, separated by `;`.
     - `add`: add a symbol to watch.
     - `list`: list all watched symbols.
     - `remove`: remove some symbols, allow to remove in a batch seperated by `;`.
- `help`: a command to print all available commands.

If no commands is provided, the bot will note it down by default.

## Setting up
### 1. Create a telegram Bot

Xbot not supports telegram bot only, so it requires a telegram bot.
Use [bot father](https://telegram.me/BotFather) to create one.

### 2. Connected with Cloudflare Worker

Xbot is used to serve on cloudflare worker, and it's recommned to use `wrangler` to interact with cloudflare.
See the [install and update](https://developers.cloudflare.com/workers/wrangler/install-and-update/) for more details.

Basically, you need to `wrangler login` and try `npm run deploy`, the wrangler will help you to create a worker.

Then, xbot requires some secrets and setting up to start.
```
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put GITHUB_TOKEN
# this is used to ensure the request comes from the real telegram, rather than a malicous attacker.
npx wrangler secret put TELEGRAM_SECRET_TOKEN
npx wrangler secret put FMP_API_KEY
```

Thenm put some configurations inside bound [cloudflare kv storage](https://developers.cloudflare.com/kv/).
To use your own cloudflare kv, you need to change the `id` filed of `kv_namespaces` in `wrangler.jsonc`.

Besides, github configuration fields are not compulsory if you don't use github related features.
`ALLOWED_USER_ID` is used to limit only you can use your own bot, you can retrieve your telegram user id via some bots,
e.g, [getidbot](https://t.me/getidsbot).

```
GITHUB_REPO_OWNER
GITHUB_REPO_NAME
GITHUB_FILE_PATH
GITHUB_COMMIT_MESSAGE
GITHUB_BRANCH_NAME
ALLOWED_USER_ID
```

### 3. Deploy and Update Telegram Hook

Run `npm run deploy` to deploy xbot into cloudflare worker, and then cloudflare provides a free domain for you to use.
Here, I have bound my own domain.

You need to send a post request to telegram and give it 2 things:

- your domain, so if your bot receives some requests, it knows where to send webhook requests.
- a webhook secret, telegram will send you webhook requests with this secret, so we know the request comes from telegram offical server.

You can generate the secret by this way:

```sh
# Generate a 64-character alphanumeric string (letters and numbers) in macos
head -c 1024 /dev/urandom | LC_ALL=C tr -dc 'A-Za-z0-9' | head -c 64; echo
```

```sh


export TELEGRAM_BOT_TOKEN="the secret you set to TELEGRAM_BOT_TOKEN"
export TELEGRAM_SECRET_TOKEN="the secret you set to TELEGRAM_SECRET_TOKEN"
export XBOT_DOMAIN="https://xbot.dangui.org/"

curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
     -F "url=${XBOT_DOMAIN}" \
     -F "secret_token=${TELEGRAM_SECRET_TOKEN}"
```

After all setting up, you need to run `npm run deploy` again and then you can use your bot via telegram.

## Dev

```
npx prettier --write "**/*.ts"
```
