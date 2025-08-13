import * as cheerio from 'cheerio';

export function verification_code(htmlSnippet: string): string | null {
	const $ = cheerio.load(htmlSnippet);

	// A regex to find a 4- to 6-digit number, often a verification code.
	const codeRegex = /\b(\d{4,6})\b/;

	// Check the text content of the entire body.
	const snippetText = $.text();
	const snippetMatch = snippetText.match(codeRegex);
	if (snippetMatch && snippetMatch[1]) {
		return snippetMatch[1];
	}

	// Fallback: iterate over common elements if the first check fails.
	const possibleCodeElements = $(
		'p, strong, b, span, div, h1, h2, h3, h4, h5, h6'
	);
	for (const element of possibleCodeElements) {
		const elementText = $(element).text();
		const elementMatch = elementText.match(codeRegex);
		if (elementMatch && elementMatch[1]) {
			return elementMatch[1];
		}
	}

	return null;
}
