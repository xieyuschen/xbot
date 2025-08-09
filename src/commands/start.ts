import { Registerable } from '../utils/registry';
import { Command, CommandRequest } from '../types';
import { Commander } from '../utils/commader';

export class StartCommand implements Command, Registerable {
	constructor(private cmd: Commander) {
		console.log('StartCommand initialized with cmd:', cmd);
	}
	name = 'start';
	requiresInput = false;
	description = 'Starts the bot and sends a welcome message.';

	register(): void {
		this.cmd.registry.register(this.name, {
			command: this,
		});
	}

	async run(_req: CommandRequest) {
		const responseText =
			'Hello! Welcome to xbot. Type /help to see what I can do!';
		console.log(
			'run this.cmd.telegram_client().sendTelegramMessage(responseText);'
		);
		await this.cmd.telegram_client().sendTelegramMessage(responseText);
		return new Response('OK', { status: 200 });
	}
}
