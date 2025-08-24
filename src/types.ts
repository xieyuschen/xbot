// src/types.ts

/**
 * Represents the environment variables available to the Worker.
 * All required variables are listed here.
 */
export interface TypedEnv {
	// TELEGRAM_BOT_TOKEN is the token to interact with telegram bot,
	// the token could be got from bot father.
	TELEGRAM_BOT_TOKEN: string;
	// TELEGRAM_SECRET_TOKEN is used to ensure the request comes from the real telegram,
	// rather than a malicous attacker.
	TELEGRAM_SECRET_TOKEN: string;

	// GITHUB_TOKEN is token to interact with github,
	// it's not necessary if you don't use any github feature.
	GITHUB_TOKEN: string;
	// FMP_API_KEY is the token to interact with https://site.financialmodelingprep.com/
	// to access finance data.
	FMP_API_KEY: string;
	// OpenAI API key for GPT commands
	OPEN_AI_API_KEY: string;
	// Poe.com key for GPT commands
	POE_API_KEY: string;
	// POE_BOT_ACCESS_KEY is the key to ensure the requests come from poe.com platform,
	// rather than a untrusted party.
	POE_BOT_ACCESS_KEY: string;

	/* the fields below are bound by cloudflare when started and they're not config from env*/
	KV_BINDING: KVNamespace; // Cloudflare Workers KV namespace binding
	WEBSITE_BUCKET: R2Bucket; // R2 bucket for static website hosting

	RAG_DB: D1Database;
	Vector_Index: VectorizeIndex;
	RAG_WORKFLOW: Workflow;
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
