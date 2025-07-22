// src/types.ts

import { ValidatedEnv } from './utils/env';

/**
 * Represents the environment variables available to the Worker.
 * All required variables are listed here.
 */
export interface Env {
	TELEGRAM_BOT_TOKEN: string;
	TELEGRAM_SECRET_TOKEN: string; // Used to verify requests from Telegram
	ALLOWED_USER_ID: string; // Stored as string, parsed to number in code
	GITHUB_TOKEN: string; // Your GitHub Personal Access Token
	GITHUB_REPO_OWNER: string; // e.g., "xieyuschen"
	GITHUB_REPO_NAME: string; // e.g., "site"
	GITHUB_FILE_PATH: string; // e.g., "docs/glossary/sync.md"
	GITHUB_COMMIT_MESSAGE: string; // e.g., "Update file content"
	GITHUB_BRANCH_NAME: string; // e.g., "main" or "xxx"
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
		env: ValidatedEnv,
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
