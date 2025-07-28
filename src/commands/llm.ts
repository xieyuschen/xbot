import { ChatGPTRequest, getChatGPTResponse } from '../utils/gpt';
import { Command, TelegramUpdate } from '../types';
import { sendTelegramMessage } from '../utils/telegram';
import { Next } from './index';
import { Config, guardEmpty } from '../utils/config';

export function createGptCommand(): Next {
	return {
		command: llmCOmmand,
	};
}

const llmCOmmand: Command = {
	name: 'llm',
	description: 'Generates a response from the llm model.',
	requiresInput: true,
	async execute(
		chatId: number,
		messageText: string,
		telegramApiUrl: string,
		cfg: Config,
		update: TelegramUpdate
	) {
		guardEmpty(cfg.openaiApiKey, 'OPEN_AI_API_KEY', 'env');
		if (!cfg.gptModel){
			cfg.gptModel = 'gpt-4o-mini';
		}
		
		const gptRequest: ChatGPTRequest = {
			model: cfg.gptModel,
			messages: [{ role: 'user', content: messageText }],
			stream: false,
		};

		try {
			const gptResponse = (await getChatGPTResponse(
				cfg.openaiApiKey,
				gptRequest
			)) as string;
			await sendTelegramMessage(telegramApiUrl, chatId, gptResponse);
		} catch (error) {
			console.error('Error calling GPT API:', error);
			await sendTelegramMessage(
				telegramApiUrl,
				chatId,
				`Sorry, I couldn't get a response from the GPT model: ${error}.`
			);
		}

		return new Response('OK', { status: 200 });
	},
};
