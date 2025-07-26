// src/commands/index.ts

import { Command } from '../types';
import { createStartCommand } from './start';
import { createHelpCommand } from './help';
import { createNoteCommand } from './note';
import { createStockCommand } from './stock';

export interface Next {
	command?: Command;
	next?: Map<string, Next>;
}

const commandsMap: Map<string, Next> = new Map([
	['start', createStartCommand()],
	['help', createHelpCommand()],
	['note', createNoteCommand()],
	['stock', createStockCommand()],
]);

/**
 * Retrieves a command handler by its name.
 * @param {string} commandName - The name of the command (e.g., 'start', 'echo').
 * @returns {Command | undefined} The command handler object, or undefined if not found.
 */
export function getCommand(names: string[]): Command {
	let cmd = commandsMap.get('note')!.command; // use note command if no command is found.
	let m: Map<string, Next> | undefined = commandsMap;
	for (const name of names) {
		if (m === undefined || !m.has(name)) {
			break; // stop when we no longer can find a name for this name.
		}
		cmd = commandsMap.get(name)!.command;
		m = commandsMap.get(name)!.next;
	}
	return cmd!;
}

export function topCommands(): Command[] {
  return [...commandsMap.values()]
    .filter((cmd): cmd is Next & { command: Command } => cmd.command != null) // Type guard for cmd.command
    .filter((cmd) => cmd.command.name !== 'help') // Exclude commands with name 'help'
    .map((cmd) => cmd.command); // Extract the Command object
}
