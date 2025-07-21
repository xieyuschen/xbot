// src/commands/echo.ts

import { Command } from '../types';
import { addContentToGitHubFile } from '../utils/github';
import { sendTelegramMessage } from '../utils/telegram';

const noteCommand: Command = {
	name: 'note',
	description: 'Note the input down',
	requiresInput: true,
	async execute(chatId, messageText, telegramApiUrl, env) {
		const text = messageText.replace('/note', '').trimStart();
    if (text === ""){
      return new Response('OK', { status: 200 });
    }

		try {
			// Attempt to add content to the GitHub file
			await addContentToGitHubFile(text, env);

			// If successful, send success message to the user
			await sendTelegramMessage(
				telegramApiUrl,
				chatId,
				'Recorded successfully.'
			);
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
