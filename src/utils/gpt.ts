import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'; // Import the specific type for messages

/**
 * Defines the structure for a ChatGPT API request.
 * This simplifies the `messages` and `model` parameters.
 */
export interface ChatGPTRequest {
	model?: string; // e.g., "gpt-4o", "gpt-3.5-turbo"
	messages: ChatCompletionMessageParam[]; // Array of message objects (role, content)
	stream?: boolean; // Optional: whether to stream the response
}

export const GEMINI_20_FLASH = 'gemini-2.0-flash';
export const TEXT_EMBEDDING = 'text-embedding-ada-002';

export class LLMClient {
	// open ai client is used to vectorize requests as poe doesn't have these models.
	openai: OpenAI;
	poe: OpenAI;
	constructor(openAiApiKey: string, poeApiKey: string) {
		this.openai = new OpenAI({ apiKey: openAiApiKey });
		this.poe = new OpenAI({
			apiKey: poeApiKey,
			baseURL: 'https://api.poe.com/v1',
		});
	}
	public async generateResponse(
		request: ChatGPTRequest
	): Promise<string | AsyncIterable<string>> {
		const model = request.model || GEMINI_20_FLASH;
		try {
			if (request.stream) {
				// Handle streaming responses
				const stream = await this.poe.chat.completions.create({
					model: model,
					messages: request.messages,
					stream: true,
				});

				// Return an AsyncIterable for the caller to consume chunks
				return (async function* () {
					for await (const chunk of stream) {
						yield chunk.choices[0]?.delta?.content || '';
					}
				})();
			} else {
				// Handle non-streaming responses
				const chatCompletion = await this.poe.chat.completions.create({
					model: model,
					messages: request.messages,
				});

				// Return the content of the first choice
				return (
					chatCompletion.choices[0]?.message?.content || 'No response content.'
				);
			}
		} catch (error: unknown) {
			console.error('Error calling OpenAI API:', error);
			if (error instanceof Error) {
				throw new Error(
					`Failed to get response from ChatGPT: ${error.message}`
				);
			}
			throw new Error(`Failed to get response from ChatGPT: ${error}`);
		}
	}
}
