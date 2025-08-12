// src/utils/telegram.ts

export const MARKDOWN_V2 = 'MarkdownV2';
export class TelegramClient {
	static API_URL: string = 'https://api.telegram.org';
	requestUrl: string;
	chatID: string;
	constructor(token: string, chatID: string) {
		this.requestUrl = `${TelegramClient.API_URL}/bot${token}`;
		this.chatID = chatID;
	}

	async sendTelegramMessage(
		text: string,
		parse_mode: string = ''
	): Promise<Response> {
		return fetch(`${this.requestUrl}/sendMessage`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chat_id: this.chatID,
				text: text,
				...(parse_mode && { parse_mode: parse_mode }),
				disable_web_page_preview: true,
			}),
		});
	}

	// telegram supports limited reaction emoji,
	// see https://core.telegram.org/bots/api#reactiontype
	async sendTelegramReaction(
		messageId: number,
		emoji: string = '👀'
	): Promise<Response> {
		return fetch(`${this.requestUrl}/setMessageReaction`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chat_id: this.chatID,
				message_id: messageId,
				reaction: [{ type: 'emoji', emoji: emoji }],
				is_big: false, // Set to true for a bigger animation
			}),
		});
	}

	async setMyCommands(commands: TelegramCommand[]): Promise<Response> {
		// Call Telegram setMyCommands API
		return await fetch(`${this.requestUrl}/setMyCommands`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ commands: commands }),
		});
	}
}

type TelegramCommand = {
	command: string;
	description: string;
};
