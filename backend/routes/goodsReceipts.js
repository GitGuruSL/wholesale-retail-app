const express = require('express');
const router = express.Router();
const controller = require('../controllers/goodsReceiptController');

router.get('/', controller.listGoodsReceipts);
router.get('/:id', controller.getGoodsReceipt);
router.post('/', controller.createGoodsReceipt);

module.exports = router;