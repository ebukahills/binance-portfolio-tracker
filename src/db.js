const mongoose = require('mongoose');

const {
    DB_URL
} = process.env;

module.exports = {
    connect() {
        return new Promise((resolve, reject) => {
            mongoose.connect(DB_URL, { useNewUrlParser: true, useUnifiedTopology: true }, (err) => {
                if(err) return reject(err);
                console.log('DB Connected 🔌')
                return resolve();
            })
        });
    }
}
