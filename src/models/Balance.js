const { Schema, model } = require('mongoose');

const BalanceSchema = new Schema({
    user: { type: String, required: true },
    timeStamp: { type: Number, required: true },
    time: Schema.Types.Mixed,
    value: { type: Number, required: true },
    balances: Schema.Types.Mixed,
});

BalanceSchema.methods.toJSON = function () {
    const object = this.toObject();
    // delete object._id;
    // delete object.createdAt;
    // delete object.updatedAt;
    // delete object.__v;
    // delete object.time;
    // delete object.user;
    return object;
}

const Balance = model('Balance', BalanceSchema);

module.exports = Balance;
