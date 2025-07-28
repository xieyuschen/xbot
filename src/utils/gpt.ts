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

/**
 * Sends a request to the OpenAI ChatGPT API and returns the AI's response.
 *
 * @param apiKey Your OpenAI API key.
 * @param request The request object containing the model and messages.
 * @returns A Promise that resolves to the AI's response content (string)
 * or an AsyncIterable if `stream` is true.
 * @throws Error if the API call fails or the API key is missing.
 */
export async function getChatGPTResponse(
	apiKey: string,
	request: ChatGPTRequest
): Promise<string | AsyncIterable<string>> {
	if (!apiKey) {
		throw new Error('OpenAI API key is missing. Please provide it.');
	}

	const openai = new OpenAI({
		apiKey: apiKey,
	});

	try {
		if (request.stream) {
			// Handle streaming responses
			const stream = await openai.chat.completions.create({
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
			const chatCompletion = await openai.chat.completions.create({
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
