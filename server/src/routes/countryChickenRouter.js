const express = require("express");
const router = express.Router();
const app = express();
app.use(express.json());

const onlineSalesOrder = require("../controller/onlineSalesOrder");
const onAuthorizeSo = require("../controller/onAuthorizeSo");

router.post("/", onlineSalesOrder.onlineSalesOrder);
router.post("/onAuthorizeSo", onAuthorizeSo.onAuthorizeSo);

module.exports = router;
