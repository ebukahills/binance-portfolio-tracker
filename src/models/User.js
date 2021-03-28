const { Schema, model } = require('mongoose');

const UserSchema = new Schema({
    id: { type: String, required: true },
    name: String,
    binanceKey: String,
    binanceSecret: String,
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: () => new Date() }
});

const User = model('User', UserSchema);

module.exports = User;
