// src/types.ts

/**
 * Represents the environment variables available to the Worker.
 * All required variables are listed here.
 */
export interface TypedEnv {
	TELEGRAM_BOT_TOKEN: string;
	TELEGRAM_SECRET_TOKEN: string; // Used to verify requests from Telegram
	GITHUB_TOKEN: string; // Your GitHub Personal Access Token
	FMP_API_KEY: string;
	OPEN_AI_API_KEY: string; // OpenAI API key for GPT commands
	KV_BINDING: KVNamespace; // Cloudflare Workers KV namespace binding
	WEBSITE_BUCKET: R2Bucket; // R2 bucket for static website hosting
}

/**
 * Represents a simplified Telegram message update.
 */
export interface TelegramUpdate {
	message: {
		message_id: number;
		chat: {
			id: number;
		};
		text?: string;
		from?: {
			id: number;
		};
		photo?: Array<{
			file_id: string;
			file_unique_id: string;
			width: number;
			height: number;
		}>;
	};
}

export interface CommandRequest {
	// trimedText is the original data trimed the possible starting command.
	trimedText: string;
	telegramUpdate?: TelegramUpdate;
}

/**
 * Interface for a command handler.
 */
export interface Command {
	name: string;
	description: string;
	requiresInput: boolean;
	run: (req: CommandRequest) => Promise<Response>;
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
