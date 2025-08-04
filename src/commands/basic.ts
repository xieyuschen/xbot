import { Command, CommandRequest } from '../types';
import { Config, guardEmpty } from '../utils/config';
import { FmpQuote, formatFmpDataForTelegram, getQuote } from '../utils/fmp';
import { Commander } from '../utils/commader';
import { Registerable, Registry } from '../utils/registry';

type StringKeysOf<T> = {
	[K in keyof T]: T[K] extends string ? K : never;
}[keyof T];

export class BasicCmd implements Command, Registerable {
	cfg: Config;
	name: string;
	description: string;
	requiresInput = true;
	constructor(
		private cmd: Commander,
		private cmdName: string,
		private desc: string,
		private kvKey: string,
		private symbolExample: string,
		private cfgFieldName: StringKeysOf<Config>
	) {
		this.cfg = this.cmd.config();
		this.name = this.cmdName;
		this.description = this.desc;
	}

	async run(req: CommandRequest) {
		const { trimedText: messageText } = req;
		const cfg = this.cfg;
		guardEmpty(cfg.fmpAPIKey, 'FMP_API_KEY', 'env');
		const shareList = messageText === '' ? cfg[this.cfgFieldName] : messageText;
		const symbolsToFetch = shareList
			.split(';')
			.map((s) => s.trim().toUpperCase())
			.filter((s) => s.length > 0);

		if (symbolsToFetch.length === 0) {
			await this.cmd
				.telegram_client()
				.sendTelegramMessage(
					'No valid symbols provided. E.g., `/${this.cmdName} ${this.symbolExample}`'
				);
			return new Response('OK', { status: 200 });
		}

		try {
			const fetchedQuotes: FmpQuote[] = [];
			const failedSymbols: string[] = [];
			// Loop through each symbol and fetch its data
			for (const symbol of symbolsToFetch) {
				try {
					const quote = await getQuote(cfg, symbol);
					if (quote) {
						fetchedQuotes.push(quote);
					} else {
						failedSymbols.push(symbol);
					}
				} catch (innerError: any) {
					console.error(`Failed to fetch data for ${symbol}:`, innerError);
					failedSymbols.push(symbol);
				}
			}

			if (fetchedQuotes.length > 0) {
				// Format the collected data for Telegram
				const info = formatFmpDataForTelegram(
					`Daily ${this.cmdName} Update`,
					fetchedQuotes
				);
				await this.cmd
					.telegram_client()
					.sendTelegramMessage(info, 'MarkdownV2');
			}

			if (failedSymbols.length > 0) {
				await this.cmd
					.telegram_client()
					.sendTelegramMessage(
						'No information could be retrieved for the provided symbols.'
					);
			}
			return new Response('OK', { status: 200 }); // Always return 200 OK to Telegram
		} catch (error: any) {
			// This catch block handles errors from the overall execution, not just individual symbol fetches
			console.error('Error occurred while fetching info:', error);
			const errorMessage = `Failed to get information. Please try again later. (Error: ${error.message || 'Unknown error'})`;
			await this.cmd.telegram_client().sendTelegramMessage(errorMessage);
			return new Response('Internal Server Error', { status: 200 }); // Return 200 to Telegram
		}
	}

	async list(_: CommandRequest) {
		const symbols = await this.cfg.KV_BINDING.get(this.kvKey);
		this.cmd
			.telegram_client()
			.sendTelegramMessage(`Symbols ${symbols} are watching now.`);
		return new Response('OK', { status: 200 });
	}

	async add(req: CommandRequest) {
		const { trimedText: messageText } = req;
		const input = messageText
			.replace(/^add\s+/i, '')
			.trim()
			.toUpperCase();
		if (!input) {
			await this.cmd
				.telegram_client()
				.sendTelegramMessage(
					'Please provide a symbol to add. E.g., `/${this.cmdName} add ${this.symbolExample}`'
				);
			return new Response('OK', { status: 200 });
		}

		const symbols = input.split(';');
		const nsym = Array.from(
			new Set([...this.cfg[this.cfgFieldName].split(';'), ...symbols])
		);

		await this.cfg.KV_BINDING.put(this.kvKey, nsym.join(';'));
		await this.cmd
			.telegram_client()
			.sendTelegramMessage(`Symbol ${input} added to your watchlist.`);
		return new Response('OK', { status: 200 });
	}

	async remove(req: CommandRequest) {
		const { trimedText: messageText } = req;
		const input = messageText
			.replace(/^remove\s+/i, '')
			.trim()
			.toUpperCase();
		if (!input) {
			await this.cmd
				.telegram_client()
				.sendTelegramMessage(
					'Please provide a symbol to remove. E.g., `/${this.cmdName} remove <symbol>`'
				);
			return new Response('OK', { status: 200 });
		}
		const symbolsToRemove = input.split(';');
		const old = this.cfg[this.cfgFieldName].split(';');
		const nsym = old.filter((item) => !symbolsToRemove.includes(item));
		if (old.length !== nsym.length) {
			await this.cfg.KV_BINDING.put(this.kvKey, nsym.join(';'));
			await this.cmd
				.telegram_client()
				.sendTelegramMessage(
					`Symbol ${symbolsToRemove} are removed from your watchlist.`
				);
		}
		return new Response('OK', { status: 200 });
	}

	register(): void {
		// Register the command with the command registry
		this.cmd.registry.register(this.name, {
			command: this,
			next: new Map([
				[
					'list',
					{
						command: {
							name: 'list',
							description: 'List all watched symbols',
							requiresInput: false,
							run: this.list.bind(this),
						},
					},
				],
				[
					'add',
					{
						command: {
							name: 'add',
							description: 'Add an interested symbol',
							requiresInput: true,
							run: this.add.bind(this),
						},
					},
				],
				[
					'remove',
					{
						command: {
							name: 'remove',
							description:
								'Remove symbols from watchlist. Multiple symbols should be separated by ;',
							requiresInput: true,
							run: this.remove.bind(this),
						},
					},
				],
			]),
		});
	}
}
