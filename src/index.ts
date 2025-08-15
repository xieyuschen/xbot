import { TypedEnv } from './types';
import { Commander } from './utils/commader';
import { Registry } from './utils/registry';

export default {
	async scheduled(
		_controller: ScheduledController,
		env: TypedEnv,
		_ctx: ExecutionContext
	) {
		const commander = new Commander(env, new Registry());
		return await commander.serveCronJob();
	},

	async fetch(request: Request, env: TypedEnv): Promise<Response> {
		const commander = new Commander(env, new Registry());
		return await commander.serve(request);
	},

	async email(
		message: ForwardableEmailMessage,
		env: TypedEnv,
		ctx: ExecutionContext
	) {
		const commander = new Commander(env, new Registry());
		return await commander.serveEmail(message, env, ctx);
	},
};
