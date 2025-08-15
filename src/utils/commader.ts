import { Common } from './config';
import { TelegramUpdate, TypedEnv } from '../types';
import { Registry } from './registry';
import { TelegramClient } from './telegram';
import { HelpCommand } from '../commands/help';
import { LlmCommand } from '../commands/llm';
import { NoteCommand } from '../commands/note';
import { StockCommand } from '../commands/stock';
import { ForexCommand } from '../commands/forex';
import { StartCommand } from '../commands/start';
import { GithubClient } from './github';
import { FmpClient } from './fmp';
import { verification_code } from './verification';
import PostalMime from 'postal-mime';
import { ImageCommand } from '../commands/image';
import { Hono } from 'hono';
import { PoeRequest, PoeResponse } from './poe';

export class Commander extends Common {
	private telegramClient: TelegramClient | null = null;
	private githubClient: GithubClient | null = null;
	private fmpClient: FmpClient | null = null;
	public registry: Registry;

	private commands = [
		HelpCommand,
		LlmCommand,
		NoteCommand,
		StockCommand,
		ForexCommand,
		StartCommand,
		ImageCommand,
	];

	constructor(env: TypedEnv, registry: Registry) {
		super(env);
		this.registry = registry;
	}
	public async serve(request: Request): Promise<Response> {
		await this.create();
		const app = new Hono();
		app.all('/', async (c) => {
			return await this.serveTelegramMessages(c.req.raw);
		});
		app.all('/telegram', async (c) => {
			return await this.serveTelegramMessages(c.req.raw);
		});
		app.all('/poe', async (c) => {
			return await this.servePoe(c.req.raw);
		});
		return app.fetch(request);
	}

	async create() {
		await super.create();
		this.telegramClient = new TelegramClient(
			this.env.TELEGRAM_BOT_TOKEN,
			this.config().allowedUserId.toString()
		);
		if (this.config().github) {
			this.githubClient = new GithubClient(
				this.config().githubToken,
				this.config().github!
			);
		} else {
			console.warn(
				'Github configuration is not set, skipping Github client initialization.'
			);
		}

		if (this.config().fmpAPIKey) {
			this.fmpClient = new FmpClient(this.config().fmpAPIKey);
		} else {
			console.warn(
				'FMP API key is not set, skipping FMP client initialization.'
			);
		}

		// TOOD(yuchen): this part of logic relies on the create to be done,
		// this is not a good pattern, find an approach in typescript to tackle this.
		this.commands.forEach((CommandClass) => {
			console.log('Instantiating command:', CommandClass.name);
			new CommandClass(this).register();
		});
	}

	fmp_client(): FmpClient {
		if (!this.fmpClient) {
			throw new Error(
				'fmp client is not initialized, please call Commander.create beforehand.'
			);
		}
		return this.fmpClient;
	}

	github_client(): GithubClient {
		if (!this.githubClient) {
			throw new Error(
				'github client is not initialized, please call Commander.create beforehand.'
			);
		}
		return this.githubClient;
	}
	telegram_client(): TelegramClient {
		if (!this.telegramClient) {
			throw new Error(
				'telegram client is not initialized, please call Commander.create beforehand.'
			);
		}
		return this.telegramClient;
	}

	private async guard(request: Request): Promise<TelegramUpdate> {
		// Only process POST requests, as Telegram sends updates via POST.
		if (request.method !== 'POST') {
			throw new Error('Telegram Bot is running on Cloudflare Workers');
		}
		const telegramSecretToken = request.headers.get(
			'X-Telegram-Bot-Api-Secret-Token'
		);
		if (telegramSecretToken !== this.env.TELEGRAM_SECRET_TOKEN) {
			console.error('Invalid Telegram secret token');
			throw new Error('Invalid secret token');
		}

		const update: TelegramUpdate = await request.json();
		const chatId = update.message.chat?.id;
		const userId = update.message.from?.id;

		// If essential message details are missing, return OK without further action.
		if (!chatId) {
			throw new Error('No valid message or chat ID found');
		}

		// Authorize user: only the allowed user can interact with the bot.
		if (userId !== this.config().allowedUserId) {
			throw new Error('Unauthorized user');
		}
		return update;
	}

	private async servePoe(request: Request): Promise<Response> {
		const req: PoeRequest = await request.json();
		// use the last query in the request as the question
		const question = req.query?.[req.query?.length - 1]?.content || '';
		const stream = new ReadableStream({
			async start(controller) {
				const encoder = new TextEncoder();
				const sendEvent = (eventName: string, data: object) => {
					const eventString = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
					controller.enqueue(encoder.encode(eventString));
				};
				if (question) {
					const words = question.split(' ');
					for (const word of words) {
						const response: PoeResponse = {
							text: word + ' ',
						};
						sendEvent('text', response);
						await new Promise((resolve) => setTimeout(resolve, 50));
					}
				}

				sendEvent('done', {});
				controller.close();
			},
		});

		// Return a new Response object with the stream and the correct SSE headers.
		return new Response(stream, {
			status: 200,
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
			},
		});
	}

	private async serveTelegramMessages(request: Request): Promise<Response> {
		try {
			const update: TelegramUpdate = await this.guard(request);
			if (update.message.photo != undefined) {
				const cmdHandler = this.registry.findCommand(['image']);
				return await cmdHandler({
					trimedText: '',
					telegramUpdate: update,
				});
			}

			let messageText = update.message.text!;
			let arr: string[] = [];
			if (messageText.startsWith('/')) {
				const parts = messageText.split(' ');
				const start = parts[0].toLowerCase();
				arr = parts.slice(1);
				arr.unshift(start.substring(1));
				// trim the top command and pass it to a handler.
				messageText = messageText.replace(`${start}`, '').trim();
			}
			const cmdHandler = this.registry.findCommand(arr);
			return await cmdHandler({
				trimedText: messageText,
				telegramUpdate: update,
			});
		} catch (error: unknown) {
			if (error instanceof Error) {
				console.error('Error processing request:', error, error.stack);
				// For general request processing errors, return 200 OK to Telegram
				// to prevent excessive retries, but log the error.
				return new Response(`Error processing request: ${error.message}`, {
					status: 200,
				});
			}
			return new Response(`An unknown error occurred: ${error}`, {
				status: 200,
			});
		}
	}

	public async serveCronJob() {
		await this.create();
		const cfg = this.config();
		await this.registry.findCommand(['stock'])!({
			trimedText: cfg.stockSymbols,
		})
			.then(() => {
				console.log('Scheduled stock command executed successfully');
			})
			.catch((error: unknown) => {
				console.error(`Error executing scheduled stock command: ${error}`);
			});

		await this.registry.findCommand(['forex'])!({
			trimedText: cfg.forexSymbols,
		})
			.then(() => {
				console.log('Scheduled forex command executed successfully');
			})
			.catch((error: unknown) => {
				console.error(`Error executing scheduled stock command: ${error}`);
			});
	}

	public async serveEmail(
		message: ForwardableEmailMessage,
		_env: TypedEnv,
		_ctx: ExecutionContext
	) {
		await this.create();
		const to = message.to;
		const from = message.from;

		const parser = new PostalMime();
		const parsedEmail = await parser.parse(message.raw);
		const textContent = parsedEmail.text;
		const htmlContent = parsedEmail.html;
		console.log(`Email from ${from} to ${to}: 
			title: ${parsedEmail.subject || 'No Subject'},
			text: ${textContent || 'N/A'},
			html: ${htmlContent || 'N/A'}
		`);

		const verificationCode = verification_code(
			htmlContent || textContent || ''
		);
		if (verificationCode) {
			console.log(`Verification code found: ${verificationCode}`);
			await this.telegram_client().sendMessage(
				`${from}: send to ${to}: ${verificationCode}`
			);
		}

		if (this.config().forwardEmail) {
			await message.forward(this.config().forwardEmail);
			console.log(`Email forwarded to ${this.config().forwardEmail}`);
		} else {
			console.warn('No forward email configured, skipping forwarding');
		}

		return new Response('OK', { status: 200 });
	}
}
