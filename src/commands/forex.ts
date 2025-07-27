import { Next } from '.';
import { Command } from '../types';
import { Config, guardEmpty } from '../utils/config';
import { FmpQuote, formatFmpDataForTelegram, getQuote } from '../utils/fmp';
import { sendTelegramMessage } from '../utils/telegram';

// todo: forex and stock logic are exactly the same, try to unify them.
export function createForexCommand(): Next {
	return {
		command: forexCommand,
		next: new Map([
			['add', { command: addCommand }],
			['list', { command: listCommand }],
			['remove', { command: removeCommand }],
		]),
	};
}

export const forexCommand: Command = {
	name: 'forex',
	description: 'Get interested forex information',
	requiresInput: true,
	async execute(
		chatId: number,
		messageText: string,
		telegramApiUrl: string,
		cfg: Config
	) {
		guardEmpty(cfg.fmpAPIKey, 'FMP_API_KEY', 'env');
		const shareList = messageText === '' ? cfg.forexSymbols : messageText;
		const symbolsToFetch = shareList
			.split(';')
			.map((s) => s.trim().toUpperCase())
			.filter((s) => s.length > 0);

		if (symbolsToFetch.length === 0) {
			await sendTelegramMessage(
				telegramApiUrl,
				chatId,
				'No valid forex symbols provided. E.g., `/forex SGDUSD`'
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

			let info = '';
			if (fetchedQuotes.length > 0) {
				// Format the collected data for Telegram
				info = formatFmpDataForTelegram('Daily Forex Update', fetchedQuotes);
				await sendTelegramMessage(telegramApiUrl, chatId, info, 'MarkdownV2');
			}

			if (failedSymbols.length > 0) {
				info = `*Error:* Could not retrieve data for the following symbols: ${failedSymbols.join(', ')}. Please check the symbols or try again later.`;
				await sendTelegramMessage(
					telegramApiUrl,
					chatId,
					'No forex information information could be retrieved for the provided symbols.'
				);
			}
			return new Response('OK', { status: 200 }); // Always return 200 OK to Telegram
		} catch (error: any) {
			// This catch block handles errors from the overall execution, not just individual symbol fetches
			console.error('Error occurred while fetching forex info:', error);

			const errorMessage = `Failed to get forex information. Please try again later. (Error: ${error.message || 'Unknown error'})`;

			await sendTelegramMessage(telegramApiUrl, chatId, errorMessage);
			return new Response('Internal Server Error', { status: 200 }); // Return 200 to Telegram
		}
	},
};

const addCommand: Command = {
	name: 'add',
	description: 'Add an interested forex',
	requiresInput: true,
	async execute(
		chatId: number,
		messageText: string,
		telegramApiUrl: string,
		env: Config
	) {
		const input = messageText
			.replace(/^add\s+/i, '')
			.trim()
			.toUpperCase();
		if (!input) {
			await sendTelegramMessage(
				telegramApiUrl,
				chatId,
				'Please provide a forex symbol to add. E.g., `/forex add SGDUSD`'
			);
			return new Response('OK', { status: 200 });
		}

		const symbols = input.split(';');
		const nforex = Array.from(
			new Set([...env.forexSymbols.split(';'), ...symbols])
		);

		await env.KV_BINDING.put('FOREX_SYMBOLS', nforex.join(';'));
		await sendTelegramMessage(
			telegramApiUrl,
			chatId,
			`Forex symbol ${input} added to your watchlist.`
		);
		return new Response('OK', { status: 200 });
	},
};

const listCommand: Command = {
	name: 'list',
	description: 'List all watched forex',
	requiresInput: false,
	async execute(
		chatId: number,
		messageText: string,
		telegramApiUrl: string,
		env: Config
	) {
		const symbols = await env.KV_BINDING.get('FOREX_SYMBOLS');

		await sendTelegramMessage(
			telegramApiUrl,
			chatId,
			`Forex symbols ${symbols} are watching now.`
		);
		return new Response('OK', { status: 200 });
	},
};

const removeCommand: Command = {
	name: 'remove',
	description:
		'Remove forex symbols from watchlist. Multiple forex should be separated by ;',
	requiresInput: true,
	async execute(
		chatId: number,
		messageText: string,
		telegramApiUrl: string,
		env: Config
	) {
		const input = messageText
			.replace(/^remove\s+/i, '')
			.trim()
			.toUpperCase();
		if (!input) {
			await sendTelegramMessage(
				telegramApiUrl,
				chatId,
				'Please provide a forex symbol to remove. E.g., `/forex remove AAPL`'
			);
			return new Response('OK', { status: 200 });
		}
		let symbolsToRemove = input.split(';');
		const old = env.forexSymbols.split(';');
		let nforex = old.filter((item) => !symbolsToRemove.includes(item));
		if (old.length !== nforex.length) {
			await env.KV_BINDING.put('FOREX_SYMBOLS', nforex.join(';'));
			await sendTelegramMessage(
				telegramApiUrl,
				chatId,
				`Symbol ${symbolsToRemove} are removed from your forex watchlist.`
			);
		}
		return new Response('OK', { status: 200 });
	},
};
