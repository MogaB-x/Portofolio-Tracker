import axios from 'axios';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs';

interface CryptoAsset {
    symbol: string;
    amount: number;
}

const PORTFOLIO_FILE = 'portfolio.json';

// Fetch current cryptocurrency prices
async function getCryptoPrice(symbol: string): Promise<number> {
    try {
        const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${symbol}&vs_currencies=usd`);
        return response.data[symbol]?.usd || 0;
    } catch (error) {
        console.error(chalk.red(`Error fetching price for ${symbol}`));
        return 0;
    }
}

// Load portfolio from file
function loadPortfolio(): CryptoAsset[] {
    if (fs.existsSync(PORTFOLIO_FILE)) {
        const data = fs.readFileSync(PORTFOLIO_FILE, 'utf8');
        return JSON.parse(data);
    }
    return [];
}

// Save portfolio to file
function savePortfolio(portfolio: CryptoAsset[]) {
    fs.writeFileSync(PORTFOLIO_FILE, JSON.stringify(portfolio, null, 2), 'utf8');
}

// Collect user portfolio data
async function getUserPortfolio(): Promise<CryptoAsset[]> {
    let portfolio = loadPortfolio();
    let addMore = true;

    while (addMore) {
        const answers = await inquirer.prompt([
            { type: 'input', name: 'symbol', message: 'Enter cryptocurrency symbol:' },
            { type: 'input', name: 'amount', message: 'Enter amount owned:',
			validate: (value: string) => {
				// Verify number
				if (!isNaN(parseFloat(value)) && parseFloat(value) > 0) {
					return true;
				}
				return 'Please enter a valid number greater than 0';
			}
			},
            { type: 'confirm', name: 'addMore', message: 'Add another cryptocurrency?', default: true }
        ]);

        portfolio.push({ symbol: answers.symbol.toLowerCase(), amount: answers.amount });
        addMore = answers.addMore;
    }

    savePortfolio(portfolio);
    return portfolio;
}

// Calculate and display portfolio value
async function calculatePortfolioValue() {
    const portfolio = await getUserPortfolio();
    let totalValue = 0;
    const values: { [key: string]: number } = {};

    console.log(chalk.blue('\nCalculating portfolio value...'));
    for (const asset of portfolio) {
        const price = await getCryptoPrice(asset.symbol);
        const value = asset.amount * price;
        totalValue += value;
        values[asset.symbol] = value;
        console.log(chalk.green(`${asset.symbol.toUpperCase()}: ${asset.amount} x $${price.toFixed(2)} = $${value.toFixed(2)}`));
    }

    console.log(chalk.yellow(`\nTotal portfolio value: $${totalValue.toFixed(2)}`));
    displayPortfolioDistribution(values, totalValue);
}

// Display portfolio distribution
function displayPortfolioDistribution(values: { [key: string]: number }, totalValue: number) {
    console.log(chalk.magenta('\nPortfolio Distribution:'));
    for (const symbol in values) {
        const percentage = (values[symbol] / totalValue) * 100;
        console.log(chalk.cyan(`${symbol.toUpperCase()}: ${percentage.toFixed(2)}%`));
    }
}

(async () => {
    console.log(chalk.cyan('Crypto Portfolio Tracker!'));
    await calculatePortfolioValue();
})();
