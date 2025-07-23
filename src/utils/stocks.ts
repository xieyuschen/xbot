import { ValidatedEnv } from './env';

// This interface assumes a basic structure of the stock quote response.
// You might need to adjust it based on the exact FMP response.
export interface FmpQuote {
	symbol: string;
	name: string;
	price: number;
	changesPercentage: number;
	change: number;
	dayLow: number;
	dayHigh: number;
	yearHigh: number;
	yearLow: number;
	marketCap: number;
	// ... potentially many more fields
}

export async function getStockQuote(
	env: ValidatedEnv,
	symbol: string
): Promise<FmpQuote | null> {
	const apiUrl = `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${env.fmpAPIKey}`;

	try {
		const response = await fetch(apiUrl);

		if (!response.ok) {
			console.error(
				`FMP API HTTP error for ${symbol}: status ${response.status} - ${await response.text()}`
			);
			throw new Error(`FMP API HTTP error! status: ${response.status}`);
		}

		const data: FmpQuote[] = await response.json();
		if (data && data.length > 0) {
			console.log(
				`Fetched data for ${symbol}:`,
				JSON.stringify(data[0], null, 2)
			);
			return data[0]; // FMP /quote returns an array, take the first element
		}
		console.warn(`No data returned for symbol: ${symbol}`);
		return null;
	} catch (error) {
		console.error(`Error fetching stock data for ${symbol}:`, error);
		return null; // Return null on error so the process can continue for other symbols
	}
}

/**
 * Formats stock data into a Telegram-friendly message with improved readability.
 * @param data An array of FmpQuote objects from the Financial Modeling Prep API.
 * @returns A formatted string suitable for Telegram.
 */
export function formatStockDataForTelegram(data: FmpQuote[]): string {
	if (!data || data.length === 0) {
		return 'No stock data available or fetched.';
	}

	let messageParts: string[] = [];
	messageParts.push('*Daily Stock Update:*');
	messageParts.push('`---------------------------`'); // Visual separator

	data.forEach((stock) => {
		const sign = stock.change >= 0 ? '🟢' : '🔴';
		const changeStr = escapeMarkdownV2(stock.change.toFixed(2));
		const percentageStr = escapeMarkdownV2(stock.changesPercentage.toFixed(2));

		// Escape all potentially problematic characters in the raw data values
		const escapedName = escapeMarkdownV2(stock.name);
		const escapedSymbol = escapeMarkdownV2(stock.symbol);
		const escapedPrice = escapeMarkdownV2(stock.price.toFixed(2));
		const escapedDayLow = escapeMarkdownV2(stock.dayLow.toFixed(2));
		const escapedDayHigh = escapeMarkdownV2(stock.dayHigh.toFixed(2));
		const escapedMarketCap = escapeMarkdownV2(
			(stock.marketCap / 1_000_000_000).toFixed(2)
		); // Convert to billions

		// Add stock data to the message
		messageParts.push(`*${escapedName}* \\(${escapedSymbol}\\)`); // Escaped parentheses
		messageParts.push(
			`  Price: \`${escapedPrice}\` ${sign} \\(${changeStr}, ${percentageStr}\\%\\)`
		); // Escaped parentheses and percentage sign
		messageParts.push(
			`  Day Range: \`${escapedDayLow}\` \\- \`${escapedDayHigh}\``
		); // Escaped dash
		messageParts.push(`  Market Cap: \`${escapedMarketCap}B\``);
		messageParts.push(''); // Empty line for spacing between stocks
	});

	// Join all parts with a newline
	return messageParts.join('\n');
}

function escapeMarkdownV2(text: string | number): string {
	// Convert to string in case it's a number
	const str = String(text);
	// These characters must be escaped when not part of formatting.
	// Order matters: escape backslash first.
	return str.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}
