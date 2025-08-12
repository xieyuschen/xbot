import { Octokit } from '@octokit/rest'; // Import Octokit
import { GithubConfig } from './config';

export class GithubClient extends Octokit {
	constructor(
		token: string,
		private config: GithubConfig
	) {
		super({ auth: token });
	}
	private async getGitHubFileContent(): Promise<{
		content: string;
		sha: string;
	}> {
		const config = this.config;
		try {
			const response = await this.repos.getContent({
				owner: config.githubRepoOwner,
				repo: config.githubRepoName,
				path: config.githubFilePath,
				ref: config.githubBranchName,
			});

			// Octokit's getContent response type is complex, check for file type
			if (Array.isArray(response.data)) {
				throw new Error(
					`Path ${config.githubFilePath} is a directory, not a file.`
				);
			}

			const data = response.data;

			// The content property is base64 encoded by default for files
			if (
				'content' in data &&
				typeof data.content === 'string' &&
				data.encoding === 'base64'
			) {
				const decodedContent = base64ToUtf8(data.content);
				return { content: decodedContent, sha: data.sha };
			} else {
				throw new Error(
					'Failed to decode file content: Expected base64 encoded string content.'
				);
			}
		} catch (error: unknown) {
			interface StatusError extends Error {
				status?: number;
			}
			if (error instanceof Error) {
				const statusError = error as StatusError;

				if (statusError.status === 404) {
					throw new Error(
						`File not found: ${config.githubFilePath} on branch ${config.githubBranchName}`
					);
				}
				// Handle other Error instances
				throw new Error(`Failed to get file content: ${error.message}`);
			}

			// Handle non-Error cases (e.g., strings, objects, etc.)
			throw new Error(`Failed to get file content: ${String(error)}`);
		}
	}
	private async updateGitHubFileContent(
		updatedContent: string,
		sha: string
	): Promise<void> {
		const encodedContent = utf8ToBase64(updatedContent);
		const config = this.config;
		try {
			await this.repos.createOrUpdateFileContents({
				owner: config.githubRepoOwner,
				repo: config.githubRepoName,
				path: config.githubFilePath,
				message: config.githubCommitMessage,
				content: encodedContent,
				sha: sha || undefined, // SHA is optional for new files, required for updates
				branch: config.githubBranchName,
			});
		} catch (error: unknown) {
			if (error instanceof Error) {
				throw new Error(`Failed to update file: ${error.message || error}`);
			}
			throw new Error(`Failed to sync up file: ${error}`);
		}
	}
	async addContentToGitHubFile(newContent: string): Promise<void> {
		let fileContent: string;
		let fileSha: string;

		try {
			const { content, sha } = await this.getGitHubFileContent();
			fileContent = content;
			fileSha = sha;
		} catch (error: unknown) {
			if (error instanceof Error) {
				if (error.message.includes('File not found')) {
					console.warn(
						`File ${this.config.githubFilePath} not found. Creating new file.`
					);
					fileContent = '';
					fileSha = ''; // No SHA for a new file
				} else {
					throw new Error(`Failed to retrieve file content: ${error.message}`);
				}
			}
			throw error;
		}

		// Process the file content
		const updatedContent = processFile(new Date(), fileContent, newContent);

		// 7. Update the file in the repository
		try {
			await this.updateGitHubFileContent(
				updatedContent,
				fileSha // Pass empty string if new file, otherwise the existing SHA
			);
		} catch (error: unknown) {
			if (error instanceof Error) {
				throw new Error(`Failed to sync up file: ${error.message}`);
			}
			throw new Error(`Failed to sync up file: ${error}`);
		}
	}
}

function utf8ToBase64(content: string): string {
	const encoder = new TextEncoder();
	const utf8Bytes = encoder.encode(content); // Encode string to UTF-8 bytes
	return btoa(String.fromCharCode(...utf8Bytes)); // Convert bytes to Base64
}

function base64ToUtf8(base64Content: string): string {
	const decodedBytes = atob(base64Content); // Decode Base64 to a string of bytes (each char is a byte)
	const utf8Bytes = new Uint8Array(decodedBytes.length);

	for (let i = 0; i < decodedBytes.length; i++) {
		utf8Bytes[i] = decodedBytes.charCodeAt(i);
	}

	const decoder = new TextDecoder('utf-8'); // Decode UTF-8 bytes to a string
	return decoder.decode(utf8Bytes);
}

/**
 * Processes the file content to check for a matching date and appends new content to today's section.
 * If today's section does not exist, it creates a new section for today and prepends it to the file.
 * @param {Date} today - The current date.
 * @param {string} fileContent - The original file content.
 * @param {string} newContent - The content to add.
 * @returns {string} The updated file content.
 */
export function processFile(
	today: Date,
	fileContent: string,
	newContent: string
): string {
	// 1. Format the provided `today` date in the required format "02 Jan 2006"
	// Using Intl.DateTimeFormat for robust date formatting.
	const formatter = new Intl.DateTimeFormat('en-GB', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	});
	const todayFormatted = formatter
		.format(today)
		.replace(/ /g, ' ')
		.replace(',', ''); // "02 Jan 2006" format

	const sectionHeader = `#### ${todayFormatted}`;

	// 2. Split the file content into lines
	const lines = fileContent.split('\n');

	// 3. Regular expression to match the section header format `#### <time>`
	const todaySectionRegex = /^#### (\d{2} \w{3} \d{4})$/;
	const daySectionRegex = new RegExp(`^####.*$`);

	const updatedLines: string[] = [];
	const headerLines: string[] = [];
	let foundTodaySection = false;
	let i = 0;
	// stop until we encounter a section header,
	// so we start to check whether we insert new content under this section,
	// or we need to create a new section for today.
	while (i < lines.length) {
		const line = lines[i];
		if (line.match(daySectionRegex)) {
			break;
		}
		i++;
		// Copy all other lines as-is
		headerLines.push(line);
	}

	while (i < lines.length) {
		const line = lines[i];
		const matches = line.match(todaySectionRegex);

		// Check if the line matches the section header format and this is today's section.
		if (matches && matches[1] === todayFormatted) {
			foundTodaySection = true;
			updatedLines.push(line); // Add the current section header

			// Copy all lines in today's section until the next section or end of file
			let contentAdded = false;
			for (let j = i + 1; j < lines.length; j++) {
				if (todaySectionRegex.test(lines[j])) {
					// Found next section header, insert new content before it
					updatedLines.push(newContent);
					updatedLines.push(''); // Add a blank line after new content for spacing
					i = j; // Move main loop index to this line
					contentAdded = true;
					break;
				}
				updatedLines.push(lines[j]);
			}

			// If end of file is reached within today's section, append new content here
			if (!contentAdded) {
				updatedLines.push(newContent);
				updatedLines.push(''); // Add a blank line after new content for spacing
				i = lines.length; // Move main loop index to end
			}
			continue; // Continue to next iteration of outer while loop
		}

		// Copy all other lines as-is
		updatedLines.push(line);
		i++;
	}

	const headerLineStr = headerLines.join('\n') + '\n';
	const updatedLineStr = updatedLines.join('\n');

	// If today's section was not found, prepend it to the file
	if (!foundTodaySection) {
		const newSection = `${sectionHeader}\n${newContent}\n\n`;
		return headerLineStr + newSection + updatedLineStr;
	}

	return headerLineStr + updatedLineStr;
}
