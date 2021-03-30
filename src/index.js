const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), debug: process.env.DEBUG });

const DB = require('./db');
const Server = require('./server');
const Binance = require('./services/binance');

const { INSTANCE_TYPE } = process.env;

const instanceTypes = ['SERVER', 'BOTH', 'JOB'];

(async () => {
    try {
        await DB.connect();
        if (instanceTypes.slice(0, 2).includes(INSTANCE_TYPE)) {
            await Server.start();
        }
        if (instanceTypes.slice(1, 3).includes(INSTANCE_TYPE)) {
            await Binance.initialize();
        }
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
