import { Commander } from '../utils/commader';
import { BasicCmd as BasicCmd } from './basic';

export class StockCommand extends BasicCmd {
	constructor(cmd: Commander) {
		super(
			cmd,
			'stock',
			'Get interested stock information',
			'STOCK_SYMBOLS',
			'AAPL',
			'stockSymbols'
		);
	}
}
