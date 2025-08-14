import { ChatGPTRequest, GPT_4O_MINI, OpenAIClient } from '../utils/gpt';
import { Command, CommandRequest } from '../types';
import { Registerable } from '../utils/registry';
import { guardEmpty } from '../utils/config';
import { Commander } from '../utils/commader';

export class LlmCommand implements Command, Registerable {
	name = 'llm';
	description = 'Generates a response from the llm model.';
	requiresInput = true;
	constructor(private cmd: Commander) {}
	async run(req: CommandRequest) {
		const { trimedText: messageText } = req;
		const cfg = this.cmd.config();
		guardEmpty(cfg.openaiApiKey, 'OPEN_AI_API_KEY', 'env');
		const openaiClient = new OpenAIClient(cfg.openaiApiKey);
		const gptRequest: ChatGPTRequest = {
			model: cfg.gptModel || GPT_4O_MINI,
			messages: [{ role: 'user', content: messageText }],
		};

		try {
			const gptResponse = (await openaiClient.generateResponse(
				gptRequest
			)) as string;
			await this.cmd.telegram_client().sendMessage(gptResponse);
		} catch (error) {
			console.error('Error calling GPT API:', error);
			await this.cmd
				.telegram_client()
				.sendMessage(
					`Sorry, I couldn't get a response from the GPT model: ${error}`
				);
		}

		return new Response('OK', { status: 200 });
	}
	register(): void {
		this.cmd.registry.register(this.name, {
			command: this,
		});
	}
}
