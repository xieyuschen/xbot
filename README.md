# xbot

Xbot is a telegram bot running inside cloudflare worker for personal usages.

## Feature

All commands are put [src/utils/commader.ts](src/utils/commader.ts#L21).
If no commands is provided, the bot will note it down by default.

## Setting up

### 1. Create a telegram Bot

Xbot not supports telegram bot only, so it requires a telegram bot.
Use [bot father](https://telegram.me/BotFather) to create one.

### 2. Connected with Cloudflare Worker

Xbot is used to serve on cloudflare worker, and it's recommned to use `wrangler` to interact with cloudflare.
See the [install and update](https://developers.cloudflare.com/workers/wrangler/install-and-update/) for more details.

Basically, you need to `wrangler login` and try `npm run deploy`, the wrangler will help you to create a worker.

Some secrets are required to run xbot, the secrets are defined at [TypedEnv](./src/types.ts#L7):

```
npx wrangler secret put <ENV_KEY_NAME>
```

Thenm put some configurations inside bound [cloudflare kv storage](https://developers.cloudflare.com/kv/).
To use your own cloudflare kv, you need to change the `id` filed of `kv_namespaces` in `wrangler.jsonc`.

Some of the configuration are put inside kv because they're not sensitive.

See [enum KV_CONFIG_KEY](./src/utils/config.ts#L3)

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
# you may use your own domain with path /telegram
export XBOT_DOMAIN="https://xbot.dangui.org/telegram"

curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
     -F "url=${XBOT_DOMAIN}" \
     -F "secret_token=${TELEGRAM_SECRET_TOKEN}"
```

After all setting up, you need to run `npm run deploy` again and then you can use your bot via telegram.
