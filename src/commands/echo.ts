// src/commands/echo.ts

import { Command } from '../types';
import { sendTelegramMessage } from '../utils/telegram';

/**
 * Handles the /echo command.
 */
const echoCommand: Command = {
	name: 'echo',
	description: 'Repeats back the provided text.',
	requiresInput: false,
	async execute(chatId, messageText, telegramApiUrl) {
		const echoText = messageText.replace('/echo ', '');
		const responseText = `You said: ${echoText}`;
		await sendTelegramMessage(telegramApiUrl, chatId, responseText);
		return new Response('OK', { status: 200 });
	},
};

export default echoCommand;
