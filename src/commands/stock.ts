// src/commands/echo.ts

import { Command, TelegramUpdate } from '../types';
import { ValidatedEnv } from '../utils/env';
import {
	FmpQuote,
	formatStockDataForTelegram,
	getStockQuote,
} from '../utils/stocks';
import { sendTelegramMessage } from '../utils/telegram';

const stockCommand: Command = {
	name: 'stock',
	description: 'Get interested stock information',
	requiresInput: true,
	async execute(
		chatId: number,
		messageText: string,
		telegramApiUrl: string,
		env: ValidatedEnv
	) {
		const symbolsInput = messageText.replace('/' + this.name, '').trim();
		if (symbolsInput === '') {
			await sendTelegramMessage(
				telegramApiUrl,
				chatId,
				'Please provide a stock symbol. E.g., `/stock AAPL`'
			);
			return new Response('OK', { status: 200 }); // Always return OK to Telegram
		}

		// Split by comma to allow multiple symbols, then trim and filter empty strings
		const symbolsToFetch = symbolsInput
			.split(';')
			.map((s) => s.trim().toUpperCase())
			.filter((s) => s.length > 0);

		if (symbolsToFetch.length === 0) {
			await sendTelegramMessage(
				telegramApiUrl,
				chatId,
				'No valid stock symbols provided. E.g., `/stock AAPL`'
			);
			return new Response('OK', { status: 200 });
		}

		try {
			const fetchedQuotes: FmpQuote[] = [];
			const failedSymbols: string[] = [];
			// Loop through each symbol and fetch its data
			for (const symbol of symbolsToFetch) {
				try {
					const quote = await getStockQuote(env, symbol);
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
				info = formatStockDataForTelegram(fetchedQuotes);
				await sendTelegramMessage(telegramApiUrl, chatId, info, 'MarkdownV2');
			}

			if (failedSymbols.length > 0) {
				info = `*Error:* Could not retrieve data for the following symbols: ${failedSymbols.join(', ')}. Please check the symbols or try again later.`;
				await sendTelegramMessage(
					telegramApiUrl,
					chatId,
					'No stock information could be retrieved for the provided symbols.'
				);
			}
			return new Response('OK', { status: 200 }); // Always return 200 OK to Telegram
		} catch (error: any) {
			// This catch block handles errors from the overall execution, not just individual symbol fetches
			console.error('Error occurred while fetching stock info:', error);

			const errorMessage = `Failed to get stock information. Please try again later. (Error: ${error.message || 'Unknown error'})`;

			await sendTelegramMessage(telegramApiUrl, chatId, errorMessage);
			return new Response('Internal Server Error', { status: 200 }); // Return 200 to Telegram
		}
	},
};

export default stockCommand;
