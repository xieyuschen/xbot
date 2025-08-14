// src/utils/telegram.ts

export const MARKDOWN_V2 = 'MarkdownV2';
interface File {
	file_id: string;
	file_unique_id: string;
	file_size?: number;
	file_path: string;
}

export class TelegramClient {
	static API_URL: string = 'https://api.telegram.org';
	requestUrl: string;
	constructor(
		private token: string,
		private chatID: string
	) {
		this.requestUrl = `${TelegramClient.API_URL}/bot${token}`;
		this.chatID = chatID;
	}

	async sendMessage(text: string, parse_mode: string = ''): Promise<Response> {
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

	async getFile(fileId: string): Promise<File> {
		try {
			const response = await fetch(`${this.requestUrl}/getFile`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ file_id: fileId }),
			});

			interface ApiResponse {
				ok: boolean;
				result: File; // The result contains the file data
			}
			if (!response.ok) {
				throw new Error(
					`Failed to fetch file: ${response.status} ${response.statusText}`
				);
			}

			const data: ApiResponse = await response.json();
			if (!data.ok) {
				throw new Error(`API error: ${JSON.stringify(data)}`);
			}

			return data.result;
		} catch (error) {
			console.error('Error fetching file:', error);
			throw error; // Re-throw the error for the caller to handle
		}
	}

	// Download a file from Telegram using the file_path returned by getFile
	async downloadFile(filePath: string): Promise<ArrayBuffer> {
		const fileUrl = `${TelegramClient.API_URL}/file/bot${this.token}/${filePath}`;

		try {
			const response = await fetch(fileUrl);

			if (!response.ok) {
				throw new Error(
					`Failed to download file: ${response.status} ${response.statusText}`
				);
			}

			// Read the response as an ArrayBuffer (raw binary data)
			return await response.arrayBuffer();
		} catch (error) {
			console.error('Error downloading file:', error);
			throw error; // Re-throw the error for the caller to handle
		}
	}

	// telegram supports limited reaction emoji,
	// see https://core.telegram.org/bots/api#reactiontype
	async setMessageReaction(
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
