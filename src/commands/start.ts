// src/commands/start.ts

import { Next } from '.';
import { Command } from '../types';
import { sendTelegramMessage } from '../utils/telegram';

export function createStartCommand(): Next {
	return {
		command: startCommand,
	};
}

const startCommand: Command = {
	name: 'start',
	requiresInput: false,
	description: 'Starts the bot and sends a welcome message.',
	async execute(chatId, _, telegramApiUrl) {
		const responseText =
			'Hello! Welcome to xbot. Type /help to see what I can do!';
		await sendTelegramMessage(telegramApiUrl, chatId, responseText);
		return new Response('OK', { status: 200 });
	},
};

export default startCommand;
