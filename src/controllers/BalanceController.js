const Binance = require('../services/binance');
const Time = require('../utils/time');

module.exports = {
    async listHistory(req, res) {
        try {
            const {
                start = Time.getUnixTime(Time.subtractTime(new Date(), 4, 'hours')),
                end = Time.getUnixTime(),
                user = ''
            } = req.query;

            const { provider } = req.params;

            if (!user) {
                return res.status(400).json({
                    message: 'Invalid User',
                })
            }

            if (provider !== Binance.name) {
                return res.status(400).json({
                    message: `Provider ${provider} balance history not implemented`,
                });
            }

            const { keys, history, meta } = await Binance.listBalanceHistory(user, start, end, Binance.formatBalanceHistoryForChart);

            return res.json({
                keys, history, meta
            })
        } catch (err) {
            console.error(err);
            return res.status(500).json(err);
        }
    }
}
