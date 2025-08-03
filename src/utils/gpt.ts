import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'; // Import the specific type for messages

/**
 * Defines the structure for a ChatGPT API request.
 * This simplifies the `messages` and `model` parameters.
 */
export interface ChatGPTRequest {
	model: string; // e.g., "gpt-4o", "gpt-3.5-turbo"
	messages?: ChatCompletionMessageParam[]; // Array of message objects (role, content)
	input?: string | string[]; // For embeddings
	stream?: boolean; // Optional: whether to stream the response
}

export const GPT_4O_MINI = 'gpt-4o-mini';
export const TEXT_EMBEDDING = 'text-embedding-ada-002';

interface EmbeddingResponse {
	object: 'list';
	data: Array<{
		object: 'embedding';
		embedding: number[]; // Array of 1536 floats
		index: number;
	}>;
	model: string;
	usage: {
		prompt_tokens: number;
		total_tokens: number;
	};
}

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
					messages: request.messages!,
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
					messages: request.messages!,
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

	public async embedding(request: ChatGPTRequest): Promise<EmbeddingResponse> {
		try {
			if (!request.input) {
				throw new Error('Embedding request must include "input".');
			}

			// Call the embeddings endpoint
			const embeddingResponse = await this.openai.embeddings.create({
				model: request.model, // Specify the embedding model, e.g., "text-embedding-ada-002"
				input: request.input!, // The text or array of texts to embed
			}).catch((error: any) => {
				console.error('Error in OpenAI embeddings API:', error);
				throw new Error(`Failed to fetch embedding: ${error.message}`);
			});

			// Return the response as an EmbeddingResponse type
			return {
				object: embeddingResponse.object,
				data: embeddingResponse.data.map((item) => ({
					object: item.object,
					embedding: item.embedding, // Array of floats
					index: item.index,
				})),
				model: embeddingResponse.model,
				usage: {
					prompt_tokens: embeddingResponse.usage.prompt_tokens,
					total_tokens: embeddingResponse.usage.total_tokens,
				},
			};
		} catch (error: any) {
			console.error('Error calling OpenAI Embedding API:', error);
			if (error.response) {
				console.error('Status:', error.response.status);
				console.error('Data:', error.response.data);
			}
			throw new Error(`Failed to fetch embedding: ${error.message}`);
		}
	}
}