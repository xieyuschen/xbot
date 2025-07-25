// src/commands/echo.ts

import { Next } from '.';
import { Command, TelegramUpdate } from '../types';
import { Config, guardEmpty, newGithubScret } from '../utils/config';
import { addContentToGitHubFile } from '../utils/github';
import { sendTelegramMessage, sendTelegramReaction } from '../utils/telegram';

export function createNoteCommand(): Next {
	return {
		command: noteCommand,
	};
}

const noteCommand: Command = {
	name: 'note',
	description: 'Note the input down',
	requiresInput: true,
	async execute(
		chatId: number,
		messageText: string,
		telegramApiUrl: string,
		cfg: Config,
		update: TelegramUpdate
	) {
		if (messageText === '') {
			return new Response('OK', { status: 200 });
		}
		try {
			cfg.github = await newGithubScret(cfg.KV_BINDING);
			guardEmpty(cfg.githubToken, 'GITHUB_TOKEN', 'env');

			// Attempt to add content to the GitHub file
			await addContentToGitHubFile(messageText, cfg);
			const messageId = update.message?.message_id;
			if (messageId === undefined) {
				throw new Error('Message ID is undefined, cannot send reaction');
			}
			await sendTelegramReaction(telegramApiUrl, chatId, messageId);
			return new Response('OK', { status: 200 });
		} catch (error: any) {
			// Log the error for debugging
			console.error('Error occurred while recording note:', error);

			// Send error message back to the user
			const errorMessage = `Failed to record your note. Please try again later. (Error: ${error.message || 'Unknown error'})`;

			await sendTelegramMessage(telegramApiUrl, chatId, errorMessage);
			return new Response('Internal Server Error', { status: 200 });
		}
	},
};

export default noteCommand;

