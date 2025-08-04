import { Command, CommandRequest } from '../types';

export interface Next {
	command?: Command;
	next?: Map<string, Next>;
}

export interface Registerable {
	register(): void;
}

export class Registry {
	commandsMap: Map<string, Next>;
	constructor() {
		this.commandsMap = new Map([]);
	}

	public findCommand(
		names: string[]
	): (req: CommandRequest) => Promise<Response> {
		let cmd = this.commandsMap.get('note')!.command; // use note command if no command is found.
		let m: Map<string, Next> | undefined = this.commandsMap;

		const trace: string[] = [];
		for (const name of names) {
			if (m === undefined || !m.has(name)) {
				break; // stop when we no longer can find a name for this name.
			}
			trace.push(name);
			cmd = m.get(name)!.command;
			m = m.get(name)!.next;
		}
		console.log(
			`found command '${trace.join(' ')}' from input '${names.join(' ')}'`
		);

		// todo: check why the this lose if i return cmd!.run directly.
		return (req: CommandRequest) => cmd!.run(req);
	}

	public register(name: string, command: Next): void {
		if (this.commandsMap.has(name)) {
			throw new Error(`Command ${name} already exists`);
		}
		this.commandsMap.set(name, command);
	}

	topCommands(): Command[] {
		return [...this.commandsMap.values()]
			.filter((cmd): cmd is Next & { command: Command } => cmd.command != null) // Type guard for cmd.command
			.filter((cmd) => cmd.command.name !== 'help') // Exclude commands with name 'help'
			.map((cmd) => cmd.command); // Extract the Command object
	}
}
