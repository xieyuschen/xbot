import { Registerable } from '../utils/registry';
import { Command, CommandRequest } from '../types';
import { Commander } from '../utils/commader';
import moment from 'moment';
import path from 'path';

export class ImageCommand implements Command, Registerable {
	constructor(private cmd: Commander) {}
	name = 'image';
	description = 'Store an image to the R2';
	requiresInput = true;

	register(): void {
		this.cmd.registry.register(this.name, {
			command: this,
		});
	}

	async run(req: CommandRequest) {
		const { telegramUpdate: telegramUpdate } = req;
		const photos = telegramUpdate?.message.photo;
		if (photos === undefined || photos.length === 0) {
			return new Response('OK', { status: 200 });
		}

		try {
			// telegram helps to compress the image into different sizes,
			// we will use the last one which is the largest.
			const fileId = photos[photos.length - 1].file_id;
			const tgClient = this.cmd.telegram_client();

			const file = await tgClient.getFile(fileId);
			if (!file.file_path) {
				throw new Error(`file_path is empty when getting file from: ${fileId}`);
			}

			const fileBytes = await tgClient.downloadFile(file.file_path);

			const ext = path.extname(file.file_path);
			const id = moment().format('YYYYMMDD_HHmmss') + ext;
			await this.cmd.config().WEBSITE_BUCKET.put(id, fileBytes);
			this.cmd
				.telegram_client()
				.sendMessage(`Your image has been stored successfully with ID: ${id}`);
			const messageId = telegramUpdate!.message.message_id;
			if (messageId === undefined) {
				throw new Error('Message ID is undefined, cannot send reaction');
			}
			await this.cmd.telegram_client().setMessageReaction(messageId);
			return new Response('OK', { status: 200 });
		} catch (error: unknown) {
			const errorMessage = `Failed to run store image, some internal error happened. Error:\n${String(error) || 'Unknown error'}`;
			await this.cmd.telegram_client().sendMessage(errorMessage);
			return new Response('Internal Server Error', { status: 200 });
		}
	}
}
