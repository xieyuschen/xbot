// src/index.ts

import { Env, TelegramUpdate } from './types';
import { getCommand } from './commands';
import { sendTelegramMessage } from './utils/telegram';
import { validateAndParseEnv, ValidatedEnv } from './utils/env';
import noteCommand from './commands/note';

export default {
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

		let validatedEnv: ValidatedEnv;
		try {
			// Validate and parse environment variables first
			validatedEnv = validateAndParseEnv(env);
		} catch (error: any) {
			console.error('Environment variable error:', error.message);
			return new Response(`Configuration Error: ${error.message}`, {
				status: 200,
			});
		}

		try {
			const update: TelegramUpdate = await request.json();

			// Pass the validated and parsed environment variables to the update handler
			return handleTelegramUpdate(update, validatedEnv);
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

/**
 * Handles incoming Telegram updates, validating user and processing commands.
 * @param {TelegramUpdate} update - The incoming Telegram update object.
 * @param {ValidatedEnv} env - The validated and parsed environment variables.
 * @returns {Promise<Response>} - A Cloudflare Worker Response object.
 */
async function handleTelegramUpdate(
	update: TelegramUpdate,
	env: ValidatedEnv // Use the validated environment here
): Promise<Response> {
	const chatId = update.message?.chat?.id;
	const messageText = update.message?.text;
	const userId = update.message?.from?.id;

	// If essential message details are missing, return OK without further action.
	if (!chatId || !messageText) {
		return new Response('No valid message or chat ID found', { status: 200 });
	}

	const telegramApiUrl = `https://api.telegram.org/bot${env.telegramBotToken}`;
	// Authorize user: only the allowed user can interact with the bot.
	if (userId !== env.allowedUserId) {
		await sendTelegramMessage(
			telegramApiUrl,
			chatId,
			'You are not authorized to use this bot.'
		);
		return new Response('Unauthorized user', { status: 200 });
	}

	// --- Command Parsing and Execution ---
	// Commands are expected to start with a '/'
	if (messageText.startsWith('/')) {
		const parts = messageText.split(' ');
		const commandName = parts[0].toLowerCase().substring(1); // Remove '/' and convert to lowercase

		const commandHandler = getCommand(commandName);

		if (commandHandler) {
			// Pass the validatedEnv to the command's execute method
			return commandHandler.execute(
				chatId,
				messageText,
				telegramApiUrl,
				env,
				update
			);
		}
	}

	// note down the things we want.
	return noteCommand.execute(chatId, messageText, telegramApiUrl, env, update);
}
