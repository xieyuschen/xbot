// src/types.ts

import { Config } from './utils/config';

/**
 * Represents the environment variables available to the Worker.
 * All required variables are listed here.
 */
export interface Env {
	TELEGRAM_BOT_TOKEN: string;
	TELEGRAM_SECRET_TOKEN: string; // Used to verify requests from Telegram
	GITHUB_TOKEN: string; // Your GitHub Personal Access Token
	FMP_API_KEY: string;
	OPEN_AI_API_KEY: string; // OpenAI API key for GPT commands
	KV_BINDING: KVNamespace; // Cloudflare Workers KV namespace binding
}

/**
 * Represents a simplified Telegram message update.
 */
export interface TelegramUpdate {
	message?: {
		message_id: number;
		chat: {
			id: number;
		};
		text?: string;
		from?: {
			id: number;
		};
	};
	// Add other Telegram update types if needed (e.g., callback_query, channel_post)
}

/**
 * Interface for a command handler.
 */
export interface Command {
	name: string;
	description: string;
	requiresInput: boolean;
	execute: (
		chatId: number,
		messageText: string,
		telegramApiUrl: string,
		env: Config,
		update: TelegramUpdate
	) => Promise<Response>;
}

/**
 * Interface for GitHub file content response.
 */
export interface GitHubFileContent {
	name: string;
	path: string;
	sha: string;
	size: number;
	url: string;
	html_url: string;
	git_url: string;
	download_url: string;
	type: string;
	content: string; // Base64 encoded content
	encoding: string;
	_links: {
		git: string;
		html: string;
		self: string;
	};
}
