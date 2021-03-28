const BinanceAPI = require('node-binance-api');

const User = require('../models/User');
const Balance = require('../models/Balance');

const math = require('../utils/math');

const { GLOBAL_BINANCE_API_KEY, GLOBAL_BINANCE_API_SECRET } = process.env;

class Binance {
    constructor() {
        this.globalAPI = null;
        this.prices = {};
        this.instances = {}
    }

    async initialize() {
        const users = await User.find({ active: true });

        const globalInstance = await this.initializeBinanceAPI({
            key: GLOBAL_BINANCE_API_KEY,
            secret: GLOBAL_BINANCE_API_SECRET,
        });

        this.globalAPI = globalInstance;

        await this.runPriceTickerTask();

        await Promise.all(users.map(user => this.initializeUser(user)));

        console.log('Binance API Tasks started');
    }


    async initializeBinanceAPI({ key, secret }) {
        const binance = new BinanceAPI().options({
            APIKEY: key,
            APISECRET: secret,
        });

        await binance.useServerTime();
        return binance;
    }

    async initializeUser(user) {
        const userInstance = await this.initializeBinanceAPI({
            key: user.binanceKey,
            secret: user.binanceSecret,
        });
        this.instances[user.id] = userInstance;

        this.runUserBalanceTask(user.id);

        return userInstance;
    }

    getUserInstance(userId) {
        if (!userId) throw new Error('Invalid User ID');
        if (this.instances[userId]) {
            return this.instances[userId];
        }
        throw new Error(`User ID ${userId} not initialized for Binance API`);
    }

    saveUserBalances(userId, balances) {
        const date = new Date();
        const timeStamp = Math.floor(date.getTime() / 1000);
        const time = {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            date: date.getDate() + 1,
            day: date.getDay() + 1,
            hour: date.getHours(),
            minute: date.getMinutes(),
            second: date.getSeconds(),
        }

        const value = Binance.sumBalances(balances);

        Balance.create({
            user: userId,
            timeStamp,
            time,
            value: value,
            balances,
        });
    }

    async runUserBalanceTask(userId) {
        setInterval(() => {
            this.getUserBalances(userId)
                .then(balances => this.saveUserBalances(userId, balances))
                .catch(console.error);
        }, 60000);
    }

    async getUserBalances(userId) {
        return new Promise((resolve, reject) => {
            this.getUserInstance(userId).balance((err, allBalances) => {
                if (err) return reject(err);

                const balances = Binance.filterBalancesWithValue(allBalances);

                Object.keys(balances).forEach(code => {
                    const { price, value } = this.getFiatValue(code, balances[code].total);
                    balances[code].value = value;
                    balances[code].price = price;
                });

                return resolve(balances);
            });
        })
    }

    getFiatValue(code, total) {
        const usdtPair = `${code}USDT`;
        const busdPair = `${code}USDT`;

        const btcPair = `${code}BTC`;
        const ethPair = `${code}ETH`;

        let fiatPrice = this.getPairPrice(usdtPair) || this.getPairPrice(busdPair)

        if (['USDT', 'BUSD'].includes(code)) {
            fiatPrice = 1;
        }

        if (!fiatPrice) {
            // USDT and BUSD pair do not exist for this coin/token
            if (this.getPairPrice(btcPair)) {
                // Attempt {coin}/BTC => BTC/USDT conversion
            } else if (this.getPairPrice(ethPair)) {
                // Attempt {coin}/ETH => ETH/USDT conversion
            } else {
                fiatPrice = 0; // TODO: figure out if this can happen and handle it
            }
        }

        const fiatValue = math.multiply(fiatPrice, total);
        return { value: fiatValue, price: fiatPrice };
    }

    convertValueFromBasePair(coin, base) {
        const basePair = `${coin}${base}`;
        const fiatPair = `${base}USDT`;

        return math.multiply(this.getPairPrice(basePair), this.getPairPrice(fiatPair));
    }

    getPairPrice(pair) {
        return this.prices[pair] || null;
    }

    getGlobalInstance() {
        return this.globalAPI;
    }

    async runPriceTickerTask() {
        await this.updatePrices();
        setInterval(() => {
            this.updatePrices()
                .catch(console.error);
        }, 10000);
    }

    async updatePrices() {
        const currentPrices = await this.getGlobalInstance().prices();
        Object.entries(currentPrices).forEach(([ticker, price]) => {
            this.prices[ticker] = math.getValue(price);
        });
    }

    // Static Utilities
    static filterBalancesWithValue(balances) {
        const result = {};
        Object.entries(balances).forEach(([code, { available, onOrder }]) => {
            const availableValue = math.getValue(available);
            const orderValue = math.getValue(onOrder);
            const total = math.add(availableValue, orderValue);
            if (total > 0) {
                result[code] = {
                    available: availableValue,
                    order: orderValue,
                    total,
                    code,
                }
            }
        });

        return result;
    }

    static sumBalances(balances) {
        return Object.values(balances).map(({ value }) => value).reduce((a, b) => a + b, 0);
    }
}

module.exports = new Binance();
