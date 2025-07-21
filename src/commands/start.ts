// src/commands/start.ts

import { Command } from '../types';
import { ValidatedEnv } from '../utils/env';
import { sendTelegramMessage } from '../utils/telegram';

/**
 * Handles the /start command.
 */
const startCommand: Command = {
	name: 'start',
	requiresInput: false,
	description: 'Starts the bot and sends a welcome message.',
	async execute(chatId, messageText, telegramApiUrl, env: ValidatedEnv) {
		const responseText =
			'Hello! Welcome to xbot. Type /help to see what I can do!';
		await sendTelegramMessage(telegramApiUrl, chatId, responseText);
		return new Response('OK', { status: 200 });
	},
};

export default startCommand;
