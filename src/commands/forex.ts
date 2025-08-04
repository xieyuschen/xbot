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
			'forexSymbols'
		);
	}
}
