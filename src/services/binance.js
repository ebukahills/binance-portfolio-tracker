const BinanceAPI = require('node-binance-api');

const User = require('../models/User');
const Balance = require('../models/Balance');

const Math = require('../utils/math');

const { GLOBAL_BINANCE_API_KEY, GLOBAL_BINANCE_API_SECRET } = process.env;

class Binance {
    constructor() {
        this.name = 'binance';
        this.globalAPI = null;
        this.prices = {};
        this.instances = {}
    }

    static name = 'binance';

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
        const timeStamp = Math.Native.floor(date.getTime() / 1000);
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
                    balances[code].price = price;
                    balances[code].value = value;
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

        const fiatValue = Math.multiply(fiatPrice, total);
        return { value: fiatValue, price: fiatPrice };
    }

    convertValueFromBasePair(coin, base) {
        const basePair = `${coin}${base}`;
        const fiatPair = `${base}USDT`;

        return Math.multiply(this.getPairPrice(basePair), this.getPairPrice(fiatPair));
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
        }, 25000);
    }

    async updatePrices() {
        const currentPrices = await this.getGlobalInstance().prices();
        Object.entries(currentPrices).forEach(([ticker, price]) => {
            this.prices[ticker] = Math.getValue(price);
        });
    }

    async listBalanceHistory(user, start, end, cb) {
        const result = await Balance.find({
            user, timeStamp: { $gte: start, $lte: end }
        }).select('timeStamp value balances -_id');

        return cb ? cb(result) : result;
    }

    formatBalanceHistoryForChart(history) {
        const meta = { highestValue: 0, highestTime: 0 }
        const keys = new Set();

        const formatted = history.map((obj) => {

            const highestValue = Math.Native.max(obj.value, meta.highestValue);
            if (highestValue > meta.highestValue) {
                meta.highestValue = highestValue;
                meta.highestTime = obj.timeStamp;
            }

            const valuesObject = {};

            Object.entries(obj.balances).forEach(([code, balance]) => {
                valuesObject[code] = balance.value;
                keys.add(code);

                obj.balances[code].percentage = Math.percentage(balance.value, obj.value);

                delete obj.balances[code].available;
                delete obj.balances[code].order;
                delete obj.balances[code].code;
            });

            return { ...valuesObject, ...obj.toJSON() };
        });

        return { keys: [...keys], history: formatted, meta }
    }

    // Static Utilities
    static filterBalancesWithValue(balances) {
        const result = {};
        Object.entries(balances).forEach(([code, { available, onOrder }]) => {
            const availableValue = Math.getValue(available);
            const orderValue = Math.getValue(onOrder);
            const total = Math.add(availableValue, orderValue);
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
