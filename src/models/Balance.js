const { Schema, model } = require('mongoose');

const BalanceSchema = new Schema({
    user: { type: String, required: true },
    timeStamp: { type: Number, required: true },
    time: Schema.Types.Mixed,
    value: { type: Number, required: true },
    balances: Schema.Types.Mixed,
});

const Balance = model('Balance', BalanceSchema);

module.exports = Balance;
