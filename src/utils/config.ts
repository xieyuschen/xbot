// src/utils/env.ts

import { Env } from '../types';

/**
 * Represents the secrets used in the application.
 * These should be strictly defined in the environment variables.
 */
export interface Secrets {
	telegramBotToken: string;
	telegramSecretToken: string;
	githubToken: string;
	fmpAPIKey: string;
}

/**
 * Represents the configuration for the application, currently they're retrieved from cloudflare worker kv store.
 * This interface is used to ensure that all required environment variables are present and correctly typed.
 */
export interface Config extends Secrets {
	github: GithubConfig | undefined;
	allowedUserId: number;
	stockSymbols: string;
	KV_BINDING: KVNamespace;
}

export interface GithubConfig {
	githubRepoOwner: string;
	githubRepoName: string;
	githubFilePath: string;
	githubCommitMessage: string;
	githubBranchName: string;
}

/**
 * Asserts that a value is not empty.
 * Throws an error if the value is null or an empty string.
 * @param {string | null} value - The value to check.
 * @param {string} name - The name of the variable for error reporting.
 */
export function guardEmpty(
	value: string | null,
	name: string,
	source: string
): asserts value is string {
	if (value === null || value === '') {
		throw new Error(`${name} inside ${source} cannot be empty`);
	}
}

export async function initConfig(env: Env): Promise<Config> {
	let secrets = newSecret(env);
	let kv = env.KV_BINDING;

	const allowedUserId = await kv.get('ALLOWED_USER_ID');
	guardEmpty(allowedUserId, 'ALLOWED_USER_ID', 'kv namespace');
	if (isNaN(parseInt(allowedUserId, 10))) {
		throw new Error('ALLOWED_USER_ID must be a valid number');
	}


	const stockSymbols = await kv.get('STOCK_SYMBOLS');
	const symbol = stockSymbols === null ? '' : stockSymbols;


	guardEmpty(stockSymbols, 'STOCK_SYMBOLS', 'kv namespace');

	return {
		...secrets,
		github: undefined,
		KV_BINDING: kv,
		allowedUserId: parseInt(allowedUserId, 10),
		stockSymbols: symbol,
	};
}

/**
 * Validates and parses environment variables.
 * Throws an error if any required variable is missing or invalid.
 * @param {Env} env - The raw environment variables object from the Worker.
 * @returns {Config} - The validated and parsed environment variables.
 * @throws {Error} If any required environment variable is missing or invalid.
 */
function newSecret(env: Env): Secrets {
	guardEmpty(env.TELEGRAM_BOT_TOKEN, 'TELEGRAM_BOT_TOKEN', 'env');
	guardEmpty(env.TELEGRAM_SECRET_TOKEN, 'TELEGRAM_SECRET_TOKEN', 'env');
	return {
		telegramBotToken: env.TELEGRAM_BOT_TOKEN,
		telegramSecretToken: env.TELEGRAM_SECRET_TOKEN,
		githubToken: env.GITHUB_TOKEN,
		fmpAPIKey: env.FMP_API_KEY,
	};
}

export async function newGithubScret(kv: KVNamespace): Promise<GithubConfig> {
	const githubRepoOwner = await kv.get('GITHUB_REPO_OWNER');
	const githubRepoName = await kv.get('GITHUB_REPO_NAME');
	const githubFilePath = await kv.get('GITHUB_FILE_PATH');
	const githubCommitMessage = await kv.get('GITHUB_COMMIT_MESSAGE');
	const githubBranchName = await kv.get('GITHUB_BRANCH_NAME');
	guardEmpty(githubRepoOwner, 'GITHUB_REPO_OWNER', 'kv namespace');
	guardEmpty(githubRepoName, 'GITHUB_REPO_NAME', 'kv namespace');
	guardEmpty(githubFilePath, 'GITHUB_FILE_PATH', 'kv namespace');
	guardEmpty(githubCommitMessage, 'GITHUB_COMMIT_MESSAGE', 'kv namespace');
	guardEmpty(githubBranchName, 'GITHUB_BRANCH_NAME', 'kv namespace');
	return {
		githubRepoOwner: githubRepoOwner,
		githubRepoName: githubRepoName,
		githubFilePath: githubFilePath,
		githubCommitMessage: githubCommitMessage,
		githubBranchName: githubBranchName,
	}
}