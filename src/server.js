const express = require('express');

const routes = require('./routes');

const {
    SERVER_PORT,
    PORT,
} = process.env;

const app = express();

app.use(routes);

module.exports = {
    start() {
        return new Promise((resolve, reject) => {
            const port = SERVER_PORT || PORT || 3000;
            app.listen({port}, (err) => {
                if(err) return reject(err);
                console.log(`Server started on port: ${port} 🔥`);
                return resolve();
            });
        });
    }
}
