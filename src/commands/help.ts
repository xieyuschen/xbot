// src/commands/help.ts

import { Command } from '../types';
import { sendTelegramMessage } from '../utils/telegram';
import { getAllCommands } from './index';

/**
 * Handles the /help command.
 */
const helpCommand: Command = {
	name: 'help',
	description: 'Shows available commands and their descriptions.',
	requiresInput: false,
	async execute(chatId, _, telegramApiUrl) {
		const allCommands = getAllCommands();

		let responseText = 'Here are the available commands:\n\n';
		responseText += allCommands
			.map((cmd) => `/${cmd.name} - ${cmd.description}`)
			.join('\n');
		responseText += `\n/help - ${helpCommand.description}`;

		await sendTelegramMessage(telegramApiUrl, chatId, responseText);

		// Set bot commands for Telegram clients (so "/" shows suggestions)
		const commandsForTelegram = [
			...allCommands.map((cmd) => ({
				command: cmd.name,
				description: cmd.description,
			})),
			{ command: 'help', description: helpCommand.description },
		];

		// Call Telegram setMyCommands API
		await fetch(`${telegramApiUrl}/setMyCommands`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ commands: commandsForTelegram }),
		});

		return new Response('OK', { status: 200 });
	},
};

export default helpCommand;
