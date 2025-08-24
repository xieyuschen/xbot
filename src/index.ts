import { TypedEnv } from './types';
import { Commander } from './utils/commader';
import { Registry } from './utils/registry';
import {
	WorkflowEntrypoint,
	WorkflowEvent,
	WorkflowStep,
} from 'cloudflare:workers';
import { GEMINI_20_FLASH, LLMClient, TEXT_EMBEDDING } from './utils/gpt';

type Params = {
	question: string;
};

// TODO: this could be more complex.
type QueryRow = {
	Id: string;
	Question: string;
	Response: string;
	Summary: string;
};

export class RAGWorkflow extends WorkflowEntrypoint<TypedEnv, Params> {
	async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
		const env: TypedEnv = this.env;
		const client = new LLMClient("todo", "todo");
		const { question } = event.payload;
		const prompt = 'todo';

		const refinedQuestion = await step.do(
			`refine question with predefined prompt`,
			async () => {
				const d = await client.generateResponse({
					model: GEMINI_20_FLASH,
					messages: [{ role: 'user', content: question + prompt }],
				});
				return d.toString();
			}
		);

		const originalEmbedding = await step.do(
			`generate embedding for refined question`,
			async () => {
				const result = await client.embedding({
					model: TEXT_EMBEDDING,
					input: refinedQuestion as string,
				});
				const values = result.data?.[0];
				if (!values) throw new Error('Failed to generate vector embedding');
				return values.embedding;
			}
		);

		const vectorQuery = await env.Vector_Index.query(originalEmbedding, {
			topK: 1,
		});
		let vecId;
		if (
			vectorQuery.matches &&
			vectorQuery.matches.length > 0 &&
			vectorQuery.matches[0]
		)
			vecId = vectorQuery.matches[0].id;
		let notes: string[] = [];
		if (vecId) {
			const query = `SELECT * FROM notes WHERE id = ?`;
			const { results } = await env.RAG_DB.prepare(query)
				.bind(vecId)
				.all<QueryRow>();
			if (results) notes = results.map((vec) => vec.Summary);
		}

		const realAnswer = await step.do(
			`refine question with predefined prompt`,
			async () => {
				const d = await client.generateResponse({
					model: GEMINI_20_FLASH,
					messages: [{ role: 'user', content: question + notes.join('\n\n') }],
				});
				return d.toString();
			}
		);

		const record = await step.do(`create database record`, async () => {
			const query = 'INSERT INTO notes (text) VALUES (?) RETURNING *';

			const results = await env.RAG_DB.prepare(query)
				.bind(realAnswer)
				.run<QueryRow>();

			const r = results.results?.[0];
			if (!r) throw new Error('Failed to create note');
			return r;
		});

		if (!record) {
			return;
		}

		const embedding = await step.do(`generate embedding`, async () => {
			const result = await client.embedding({
				model: TEXT_EMBEDDING,
				messages: [],
			});
			const values = result.data?.[0];
			if (!values) throw new Error('Failed to generate vector embedding');
			return values.embedding;
		});

		await step.do(`write the final processed answer into rag`, async () => {
			return env.Vector_Index.upsert([
				{
					id: record?.Id.toString(),
					values: embedding,
				},
			]);
		});
	}
}

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
