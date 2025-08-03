// src/utils/github.ts

import { Config } from './config';
import { Octokit } from '@octokit/rest'; // Import Octokit

/**
 * Creates an authenticated Octokit client.
 * @param {string} token - The GitHub Personal Access Token.
 * @returns {Octokit} An Octokit client instance.
 */
function createGitHubClient(token: string): Octokit {
	return new Octokit({
		auth: token,
		// Optional: User-Agent header is automatically added by Octokit
		// baseUrl: 'https://api.github.com', // Default, can be omitted
	});
}

/**
 * Fetches the content of a file from a GitHub repository using Octokit.
 * @param {Octokit} client - The authenticated Octokit client.
 * @param {string} owner - The repository owner.
 * @param {string} repo - The repository name.
 * @param {string} filePath - The path to the file.
 * @param {string} branchName - The branch name.
 * @returns {Promise<{ content: string; sha: string }>} - The file content (decoded) and its SHA.
 * @throws {Error} If the file cannot be fetched or decoded.
 */
export async function getGitHubFileContent(
	client: Octokit, // Now takes Octokit client
	owner: string,
	repo: string,
	filePath: string,
	branchName: string
): Promise<{ content: string; sha: string }> {
	try {
		const response = await client.repos.getContent({
			owner,
			repo,
			path: filePath,
			ref: branchName,
		});

		// Octokit's getContent response type is complex, check for file type
		if (Array.isArray(response.data)) {
			throw new Error(`Path ${filePath} is a directory, not a file.`);
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
	} catch (error: any) {
		if (error.status === 404) {
			// Re-throw with specific message for file not found
			throw new Error(`File not found: ${filePath} on branch ${branchName}`);
		}
		throw new Error(`Failed to get file content: ${error.message || error}`);
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
 * Updates the content of a file in a GitHub repository using Octokit.
 * @param {Octokit} client - The authenticated Octokit client.
 * @param {string} owner - The repository owner.
 * @param {string} repo - The repository name.
 * @param {string} filePath - The path to the file.
 * @param {string} commitMessage - The commit message.
 * @param {string} updatedContent - The new content for the file.
 * @param {string} sha - The SHA of the file's current version (for optimistic locking).
 * @param {string} branchName - The branch name.
 * @throws {Error} If the file update fails.
 */
export async function updateGitHubFileContent(
	client: Octokit, // Now takes Octokit client
	owner: string,
	repo: string,
	filePath: string,
	commitMessage: string,
	updatedContent: string,
	sha: string,
	branchName: string
): Promise<void> {
	const encodedContent = utf8ToBase64(updatedContent);

	try {
		await client.repos.createOrUpdateFileContents({
			owner,
			repo,
			path: filePath,
			message: commitMessage,
			content: encodedContent,
			sha: sha || undefined, // SHA is optional for new files, required for updates
			branch: branchName,
		});
	} catch (error: any) {
		throw new Error(`Failed to update file: ${error.message || error}`);
	}
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
	const sectionRegex = /^#### (\d{2} \w{3} \d{4})$/;

	let updatedLines: string[] = [];
	let foundTodaySection = false;
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];
		const matches = line.match(sectionRegex);

		// Check if the line matches the section header format and this is today's section.
		if (matches && matches[1] === todayFormatted) {
			foundTodaySection = true;
			updatedLines.push(line); // Add the current section header

			// Copy all lines in today's section until the next section or end of file
			let contentAdded = false;
			for (let j = i + 1; j < lines.length; j++) {
				if (sectionRegex.test(lines[j])) {
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

	// If today's section was not found, prepend it to the file
	if (!foundTodaySection) {
		const newSection = `${sectionHeader}\n${newContent}\n\n`;
		return newSection + updatedLines.join('\n');
	}

	return updatedLines.join('\n');
}

/**
 * Adds new content to the specified GitHub file, processing it based on date sections.
 * This is the main function that orchestrates the GitHub API calls and file processing.
 * @param {string} newContent - The content to add to the file.
 * @param {Config} cfg - The validated environment variables.
 * @returns {Promise<void>}
 * @throws {Error} If any step of the process fails.
 */
export async function addContentToGitHubFile(
	newContent: string,
	cfg: Config
): Promise<void> {
	const {
		githubRepoOwner,
		githubRepoName,
		githubFilePath,
		githubCommitMessage,
		githubBranchName,
	} = cfg.github!;
	const githubToken = cfg.githubToken;

	// Create the Octokit client once
	const githubClient = createGitHubClient(githubToken);

	let fileContent: string;
	let fileSha: string;

	try {
		const { content, sha } = await getGitHubFileContent(
			githubClient, // Pass the client
			githubRepoOwner,
			githubRepoName,
			githubFilePath,
			githubBranchName
		);
		fileContent = content;
		fileSha = sha;
	} catch (error: any) {
		if (error.message.includes('File not found')) {
			console.warn(`File ${githubFilePath} not found. Creating new file.`);
			fileContent = '';
			fileSha = ''; // No SHA for a new file
		} else {
			throw new Error(`Failed to retrieve file content: ${error.message}`);
		}
	}

	// Process the file content
	const updatedContent = processFile(new Date(), fileContent, newContent);

	// 7. Update the file in the repository
	try {
		await updateGitHubFileContent(
			githubClient, // Pass the client
			githubRepoOwner,
			githubRepoName,
			githubFilePath,
			githubCommitMessage,
			updatedContent,
			fileSha, // Pass empty string if new file, otherwise the existing SHA
			githubBranchName
		);
	} catch (error: any) {
		throw new Error(`Failed to sync up file: ${error.message}`);
	}
}
