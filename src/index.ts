// src/index.ts

import { Env, TelegramUpdate } from './types';
import { getCommand } from './commands';
import { sendTelegramMessage } from './utils/telegram';
import { initConfig, Config } from './utils/config';

// todo: why after removing export default stockCommand, i need use {} to quote it?
import { stockCommand } from './commands/stock';

export default {
	async scheduled(
		controller: ScheduledController,
		env: Env,
		ctx: ExecutionContext
	) {
		let cfg: Config;
		try {
			cfg = await initConfig(env);
		} catch (error: any) {
			console.error('Init configuration error:', error.message);
			return new Response(`Configuration Error: ${error.message}`, {
				status: 200,
			});
		}
		const chatId = await env.KV_BINDING.get('CHAT_ID');
		if (!chatId) {
			console.warn('No chat ID found in KV, cannot send scheduled message');
			return new Response('No chat ID found', { status: 200 });
		}
		const update: TelegramUpdate = {};

		stockCommand
			.execute(
				Number(chatId),
				cfg.stockSymbols,
				`https://api.telegram.org/bot${cfg.telegramBotToken}`,
				cfg,
				update
			)
			.then(() => {
				console.log('Scheduled stock command executed successfully');
			})
			.catch((error: any) => {
				console.error(
					'Error executing scheduled stock command:',
					error.message
				);
			});
	},
	/**
	 * Main fetch handler for the Cloudflare Worker.
	 * @param {Request} request - The incoming request.
	 * @param {Env} env - The environment variables.
	 * @returns {Response} - The response to be returned.
	 */
	async fetch(request: Request, env: Env): Promise<Response> {
		// Only process POST requests, as Telegram sends updates via POST.
		if (request.method !== 'POST') {
			return new Response('Telegram Bot is running on Cloudflare Workers', {
				headers: { 'Content-Type': 'text/plain' },
			});
		}
		const telegramSecretToken = request.headers.get(
			'X-Telegram-Bot-Api-Secret-Token'
		);
		if (telegramSecretToken !== env.TELEGRAM_SECRET_TOKEN) {
			console.error('Invalid Telegram secret token');
			return new Response('Invalid secret token', { status: 403 });
		}

		let cfg: Config;
		try {
			cfg = await initConfig(env);
		} catch (error: any) {
			console.error('Init configuration error:', error.message);
			return new Response(`Configuration Error: ${error.message}`, {
				status: 200,
			});
		}

		try {
			const update: TelegramUpdate = await request.json();

			// Pass the validated and parsed environment variables to the update handler
			return handleTelegramUpdate(update, cfg);
		} catch (error: any) {
			console.error('Error processing request:', error);
			// For general request processing errors, return 200 OK to Telegram
			// to prevent excessive retries, but log the error.
			return new Response(`Error processing request: ${error.message}`, {
				status: 200,
			});
		}
	},
};

async function handleTelegramUpdate(
	update: TelegramUpdate,
	cfg: Config
): Promise<Response> {
	const chatId = update.message?.chat?.id;
	const messageText = update.message?.text;
	const userId = update.message?.from?.id;

	// If essential message details are missing, return OK without further action.
	if (!chatId || !messageText) {
		return new Response('No valid message or chat ID found', { status: 200 });
	}

	const telegramApiUrl = `https://api.telegram.org/bot${cfg.telegramBotToken}`;
	// Authorize user: only the allowed user can interact with the bot.
	if (userId !== cfg.allowedUserId) {
		await sendTelegramMessage(
			telegramApiUrl,
			chatId,
			'You are not authorized to use this bot.'
		);
		return new Response('Unauthorized user', { status: 200 });
	}

	// store the chat id in kv so the cron could use it to send messages to the user.
	let kvChatId = await cfg.KV_BINDING.get('CHAT_ID');
	if (kvChatId === null || chatId.toString() != kvChatId) {
		console.warn(`Chat ID mismatch: expected ${kvChatId}, got ${chatId}`);
		await cfg.KV_BINDING.put('CHAT_ID', chatId.toString());
	}

	let arr: string[] = [];
	let msgText = messageText;
	if (messageText.startsWith('/')) {
		const parts = messageText.split(' ');
		const start = parts[0].toLowerCase();
		arr = parts.slice(1);
		arr.unshift(start.substring(1));
		msgText = messageText.replace(`${start}`, '').trim();
	}

	return getCommand(arr).execute(chatId, msgText, telegramApiUrl, cfg, update);
}
