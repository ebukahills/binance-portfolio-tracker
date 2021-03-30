const moment = require('moment');

module.exports = {
    getUnixTime(date) {
        return moment(date).unix();
    },

    subtractTime(date, value = 1, unit = 'hours') {
        return moment(date).subtract(value, unit).toDate();
    }
}