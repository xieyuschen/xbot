// src/utils/env.ts

import { Env } from '../types';

/**
 * Defines the structure for validated and parsed environment variables.
 */
export interface ValidatedEnv {
	telegramBotToken: string;
	allowedUserId: number;
	githubToken: string;
	githubRepoOwner: string;
	githubRepoName: string;
	githubFilePath: string;
	githubCommitMessage: string;
	githubBranchName: string;
}

/**
 * Validates and parses environment variables.
 * Throws an error if any required variable is missing or invalid.
 * @param {Env} env - The raw environment variables object from the Worker.
 * @returns {ValidatedEnv} - The validated and parsed environment variables.
 * @throws {Error} If any required environment variable is missing or invalid.
 */
export function validateAndParseEnv(env: Env): ValidatedEnv {
	// Validate TELEGRAM_BOT_TOKEN
	if (!env.TELEGRAM_BOT_TOKEN) {
		throw new Error('Missing environment variable: TELEGRAM_BOT_TOKEN');
	}

	// Validate and parse ALLOWED_USER_ID
	if (!env.ALLOWED_USER_ID) {
		throw new Error('Missing environment variable: ALLOWED_USER_ID');
	}
	const allowedUserId = parseInt(env.ALLOWED_USER_ID, 10);
	if (isNaN(allowedUserId)) {
		throw new Error(
			'Invalid environment variable: ALLOWED_USER_ID must be a number.'
		);
	}

	// Validate GitHub variables
	if (!env.GITHUB_TOKEN) {
		throw new Error('Missing environment variable: GITHUB_TOKEN');
	}
	if (!env.GITHUB_REPO_OWNER) {
		throw new Error('Missing environment variable: GITHUB_REPO_OWNER');
	}
	if (!env.GITHUB_REPO_NAME) {
		throw new Error('Missing environment variable: GITHUB_REPO_NAME');
	}
	if (!env.GITHUB_FILE_PATH) {
		throw new Error('Missing environment variable: GITHUB_FILE_PATH');
	}
	if (!env.GITHUB_COMMIT_MESSAGE) {
		throw new Error('Missing environment variable: GITHUB_COMMIT_MESSAGE');
	}
	if (!env.GITHUB_BRANCH_NAME) {
		throw new Error('Missing environment variable: GITHUB_BRANCH_NAME');
	}

	return {
		telegramBotToken: env.TELEGRAM_BOT_TOKEN,
		allowedUserId: allowedUserId,
		githubToken: env.GITHUB_TOKEN,
		githubRepoOwner: env.GITHUB_REPO_OWNER,
		githubRepoName: env.GITHUB_REPO_NAME,
		githubFilePath: env.GITHUB_FILE_PATH,
		githubCommitMessage: env.GITHUB_COMMIT_MESSAGE,
		githubBranchName: env.GITHUB_BRANCH_NAME,
	};
}
