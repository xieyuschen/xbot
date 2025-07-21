// src/commands/index.ts

import { Command } from '../types';
import startCommand from './start';
import helpCommand from './help';
import noteCommand from './note';
import echoCommand from './echo';

const commands: { [key: string]: Command } = {
	start: startCommand,
	help: helpCommand,
	echo: echoCommand,
	note: noteCommand,
};

/**
 * Retrieves a command handler by its name.
 * @param {string} commandName - The name of the command (e.g., 'start', 'echo').
 * @returns {Command | undefined} The command handler object, or undefined if not found.
 */
export function getCommand(commandName: string): Command | undefined {
	return commands[commandName];
}

/**
 * Returns an array of all registered command objects.
 * @returns {Command[]} An array of all command objects.
 */
export function getAllCommands(): Command[] {
	// Filter out the 'help' command itself from the list if you don't want it to list itself.
	// Or, you can include it if you want the help command to show its own entry.
	return Object.values(commands).filter((cmd) => cmd.name !== 'help');
}
