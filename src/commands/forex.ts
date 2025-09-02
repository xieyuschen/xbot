import { Commander } from '../utils/commader';
import { BasicCmd } from './basic';

export class ForexCommand extends BasicCmd {
	constructor(cmd: Commander) {
		super(
			cmd,
			'forex',
			'Get interested forex information',
			'FOREX_SYMBOLS',
			'USDCNY',
			'forexSymbols',
			1000 // forex should use 1000 factor so the change is more obvious.
		);
	}
}
