import { TypedEnv } from './types';
import { Commander } from './utils/commader';
import { Registry } from './utils/registry';

export default {
	async scheduled(
		controller: ScheduledController,
		env: TypedEnv,
		ctx: ExecutionContext
	) {
		const registry = new Registry();
		const commander = new Commander(env, registry);
		await commander.create();
		return await commander.serveCronJob();
	},

	async fetch(request: Request, env: TypedEnv): Promise<Response> {
		const registry = new Registry();
		const commander = new Commander(env, registry);
		await commander.create();
		return await commander.serveTelegramMessages(request);
	},
};
