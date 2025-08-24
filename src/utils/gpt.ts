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

export const GEMINI_20_FLASH = 'gemini-2.0-flash';
export const GEMINI_25_PRO = 'gemini-2.5-pro';
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

export class LLMClient {
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
				const chatCompletion = await this.poe.chat.completions.create({
					model: model,
					messages: request.messages!,
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

	public async summarize(question: string, answer: string): Promise<string | AsyncIterable<string>>  {
		const q = `{summarizePrompt} 
		
{QStart} 
{question}
{QEnd}

{AStart}
{answer}
{AEnd}`

		return await this.generateResponse({
			model: GEMINI_20_FLASH,
			messages: [{ role: 'user', content: q }],
		})
	}
}

const QStart = '$QStart$';
const QEnd = '$QEnd$';
const AStart = '$AStart$';
const AEnd = '$AEnd$';

const summarizePrompt = `
The following input contains a QA thread from another llm bot. It might use
English or Chinese, but you should translate it first if any to English so you can understand it via English,
then you should summarize the question and answer.
The question is quoted by {QStart} and {QEnd}, and answer is quoted by {AStart} and {AEnd}.  
During summarizing, you should focus on the following items and meet these requirements.

1. essential: brief, don't verbose
2. the question is human input so you need to tidy it up, don't change the original question.
3. the answer is usually, you need to summarize it by focusing on the terminology and the thinking models.
`
