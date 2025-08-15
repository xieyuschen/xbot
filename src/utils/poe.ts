export interface PoeResponseChunk {
	text: string;
}

export interface PoeRequest {
	version: string;
	type:
		| 'query'
		| 'settings'
		| 'report_feedback'
		| 'report_reaction'
		| 'report_error';
	query?: Array<{
		role: 'system' | 'user' | 'bot';
		content: string;
		content_type: string;
		timestamp: number;
		message_id: string;
		feedback?: Array<{
			type: string;
			reason?: string;
		}>;
		attachments?: Array<{
			url: string;
			content_type: string;
			name: string;
			parsed_content?: string;
		}>;
		metadata?: string | null;
	}>;
	message_id?: string;
	user_id?: string;
	conversation_id?: string;
	metadata?: string;
	temperature?: number;
	skip_system_prompt?: boolean;
	stop_sequences?: string[];
	logit_bias?: Record<string, number>;
}

export interface PoeResponse {
	meta?: {
		content_type: string;
		suggested_replies: boolean;
	};
	text?: string;
	data?: {
		metadata?: string;
	};
	replace_response?: PoeResponseChunk;
	suggested_replies?: PoeResponseChunk;
	// todo: add more fields as needed
}
