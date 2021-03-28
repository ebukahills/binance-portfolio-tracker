const numeral = require('numeral');

module.exports = {
    getValue(val) {
        return numeral(val).value();
    },

    multiply(a, b) {
        return numeral(a).multiply(this.getValue(b)).value();
    },

    divide(a, b) {
        return numeral(a).divide(this.getValue(b)).value();
    },

    add(a, b) {
        return numeral(a).add(this.getValue(b)).value();
    }
}
