const Router = require('express').Router;

const BalanceController = require('./controllers/BalanceController');

const router = new Router();

router.get('/balance/history/:provider', BalanceController.listHistory);

module.exports = router;
