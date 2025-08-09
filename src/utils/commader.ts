import { Common } from './config';
import { TelegramUpdate, TypedEnv } from '../types';
import { Registry } from './registry';
import { TelegramClient } from './telegram';
import { HelpCommand } from '../commands/help';
import { LlmCommand } from '../commands/llm';
import { NoteCommand } from '../commands/note';
import { StockCommand } from '../commands/stock';
import { ForexCommand } from '../commands/forex';
import { StartCommand } from '../commands/start';

export class Commander extends Common {
	private telegramClient: TelegramClient | null = null;
	public registry: Registry;

	private commands = [
		HelpCommand,
		LlmCommand,
		NoteCommand,
		StockCommand,
		ForexCommand,
		StartCommand,
	];

	constructor(env: TypedEnv, registry: Registry) {
		super(env);
		this.registry = registry;
	}

	async create() {
		await super.create();
		this.telegramClient = new TelegramClient(
			this.env.TELEGRAM_BOT_TOKEN,
			this.config().allowedUserId.toString()
		);
		// TOOD(yuchen): this part of logic relies on the create to be done,
		// this is not a good pattern, find an approach in typescript to tackle this.
		this.commands.forEach((CommandClass) => {
			console.log('Instantiating command:', CommandClass.name);
			new CommandClass(this).register();
		});
	}

	telegram_client(): TelegramClient {
		if (!this.telegramClient) {
			throw new Error(
				'telegram client is not initialized, please call Commander.create beforehand.'
			);
		}
		return this.telegramClient;
	}

	async guard(request: Request): Promise<TelegramUpdate> {
		// Only process POST requests, as Telegram sends updates via POST.
		if (request.method !== 'POST') {
			throw new Error('Telegram Bot is running on Cloudflare Workers');
		}
		const telegramSecretToken = request.headers.get(
			'X-Telegram-Bot-Api-Secret-Token'
		);
		if (telegramSecretToken !== this.env.TELEGRAM_SECRET_TOKEN) {
			console.error('Invalid Telegram secret token');
			throw new Error('Invalid secret token');
		}

		const update: TelegramUpdate = await request.json();
		const chatId = update.message?.chat?.id;
		const messageText = update.message?.text;
		const userId = update.message?.from?.id;

		// If essential message details are missing, return OK without further action.
		if (!chatId || !messageText) {
			throw new Error('No valid message or chat ID found');
		}

		// Authorize user: only the allowed user can interact with the bot.
		if (userId !== this.config().allowedUserId) {
			throw new Error('Unauthorized user');
		}
		return update;
	}

	public async serveTelegramMessages(request: Request): Promise<Response> {
		try {
			const update: TelegramUpdate = await this.guard(request);
			if (!update.message || !update.message.text) {
				throw new Error(
					'telegram update(message or message.text is undefined) is invalid'
				);
			}
			let messageText = update.message.text!;

			let arr: string[] = [];
			if (messageText.startsWith('/')) {
				const parts = messageText.split(' ');
				const start = parts[0].toLowerCase();
				arr = parts.slice(1);
				arr.unshift(start.substring(1));
				// trim the top command and pass it to a handler.
				messageText = messageText.replace(`${start}`, '').trim();
			}

			const cmdHandler = this.registry.findCommand(arr);
			return await cmdHandler({
				trimedText: messageText,
				telegramUpdate: update,
			});
		} catch (error: unknown) {
			if (error instanceof Error) {
				console.error('Error processing request:', error, error.stack);
				// For general request processing errors, return 200 OK to Telegram
				// to prevent excessive retries, but log the error.
				return new Response(`Error processing request: ${error.message}`, {
					status: 200,
				});
			}
			return new Response(`An unknown error occurred: ${error}`, {
				status: 200,
			});
		}
	}

	public async serveCronJob() {
		const cfg = this.config();
		await this.registry
			.findCommand(['stock'])({ trimedText: cfg.stockSymbols })
			.then(() => {
				console.log('Scheduled stock command executed successfully');
			})
			.catch((error: unknown) => {
				console.error(`Error executing scheduled stock command: ${error}`);
			});

		await this.registry
			.findCommand(['forex'])({ trimedText: cfg.forexSymbols })
			.then(() => {
				console.log('Scheduled forex command executed successfully');
			})
			.catch((error: unknown) => {
				console.error(`Error executing scheduled stock command: ${error}`);
			});
	}
}
