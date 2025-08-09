// src/commands/help.ts

import { Command, CommandRequest } from '../types';
import { Registerable } from '../utils/registry';
import { Commander } from '../utils/commader';

export class HelpCommand implements Command, Registerable {
	constructor(private cmd: Commander) {}
	name = 'help';
	description = 'Shows available commands and their descriptions.';
	requiresInput = false;
	async run(_req: CommandRequest) {
		const allCommands = this.cmd.registry.topCommands();
		let responseText = 'Here are the available commands:\n\n';
		responseText += allCommands
			.map((cmd) => `/${cmd.name} - ${cmd.description}`)
			.join('\n');
		responseText += `\n/help - ${this.description}`;

		await this.cmd.telegram_client().sendTelegramMessage(responseText);

		// Set bot commands for Telegram clients (so "/" shows suggestions)
		const commandsForTelegram = [
			...allCommands.map((cmd) => ({
				command: cmd.name,
				description: cmd.description,
			})),
			{ command: 'help', description: this.description },
		];

		await this.cmd.telegram_client().setMyCommands(commandsForTelegram);
		return new Response('OK', { status: 200 });
	}

	register(): void {
		this.cmd.registry.register(this.name, {
			command: this,
		});
	}
}
