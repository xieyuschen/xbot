import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'; // Import the specific type for messages

/**
 * Defines the structure for a ChatGPT API request.
 * This simplifies the `messages` and `model` parameters.
 */
export interface ChatGPTRequest {
	model: string; // e.g., "gpt-4o", "gpt-3.5-turbo"
	messages: ChatCompletionMessageParam[]; // Array of message objects (role, content)
	stream?: boolean; // Optional: whether to stream the response
}

export const GPT_4O_MINI = 'gpt-4o-mini';
export const TEXT_EMBEDDING = 'text-embedding-ada-002';

export class OpenAIClient {
	apiKey: string;
	openai: OpenAI;
	constructor(apiKey: string) {
		this.apiKey = apiKey;
		this.openai = new OpenAI({
			apiKey: apiKey,
		});
	}
	public async generateResponse(
		request: ChatGPTRequest
	): Promise<string | AsyncIterable<string>> {
		try {
			if (request.stream) {
				// Handle streaming responses
				const stream = await this.openai.chat.completions.create({
					model: request.model,
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
				const chatCompletion = await this.openai.chat.completions.create({
					model: request.model,
					messages: request.messages,
				});

				// Return the content of the first choice
				return (
					chatCompletion.choices[0]?.message?.content || 'No response content.'
				);
			}
		} catch (error: any) {
			console.error('Error calling OpenAI API:', error);
			if (error.response) {
				// Log more details if it's an Axios error (common with fetch wrappers)
				console.error('Status:', error.response.status);
				console.error('Data:', error.response.data);
			}
			throw new Error(`Failed to get response from ChatGPT: ${error.message}`);
		}
	}
}
