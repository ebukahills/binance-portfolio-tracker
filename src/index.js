const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), debug: process.env.DEBUG });

const DB = require('./db');
const Server = require('./server');
const Binance = require('./services/binance');

(async () => {
    try {
        await DB.connect();
        await Server.start();
        // await Binance.initialize();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
