// src/utils/telegram.ts

/**
 * Sends a message back to a Telegram chat.
 * @param {string} telegramApiUrl - The base URL for the Telegram Bot API (e.g., `https://api.telegram.org/bot<BOT_TOKEN>`).
 * @param {number} chatId - The ID of the chat to send the message to.
 * @param {string} text - The text message to send.
 * @returns {Promise<Response>} - The fetch response.
 */
export async function sendTelegramMessage(
	telegramApiUrl: string,
	chatId: number,
	text: string
): Promise<Response> {
	const sendMessageUrl = `${telegramApiUrl}/sendMessage`;
	return fetch(sendMessageUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			chat_id: chatId,
			text: text,
		}),
	});
}
