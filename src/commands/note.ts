// src/commands/echo.ts

import { Next, Registerable, Registry } from '../utils/registry';
import { Command, CommandRequest, TelegramUpdate } from '../types';
import { Common, Config, guardEmpty, newGithubScret } from '../utils/config';
import { addContentToGitHubFile } from '../utils/github';
import { Commander } from '../utils/commader';

export class NoteCommand implements Command, Registerable {
	constructor(private cmd: Commander) {}
	name = 'note';
	description = 'Note the input down';
	requiresInput = true;

	register(): void {
		this.cmd.registry.register(this.name, {
			command: this,
		});
	}

	async run(req: CommandRequest) {
		const { trimedText: messageText, telegramUpdate: telegramUpdate } = req;
		if (messageText === '') {
			return new Response('OK', { status: 200 });
		}
		try {
			const cfg = this.cmd.config();
			cfg.github = await newGithubScret(cfg.KV_BINDING);
			guardEmpty(cfg.githubToken, 'GITHUB_TOKEN', 'env');

			await addContentToGitHubFile(messageText, cfg);
			const messageId = telegramUpdate!.message?.message_id;
			if (messageId === undefined) {
				throw new Error('Message ID is undefined, cannot send reaction');
			}
			await this.cmd.telegram_client().sendTelegramReaction(messageId);
			return new Response('OK', { status: 200 });
		} catch (error: any) {
			// Log the error for debugging
			console.error('Error occurred while recording note:', error);

			// Send error message back to the user
			const errorMessage = `Failed to record your note. Please try again later. (Error: ${error.message || 'Unknown error'})`;

			await this.cmd.telegram_client().sendTelegramMessage(errorMessage);
			return new Response('Internal Server Error', { status: 200 });
		}
	}
}
