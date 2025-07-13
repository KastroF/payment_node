const express = require("express"); 

const router = express.Router(); 

const paymentCtrl = require("../controllers/Payment"); 



router.post("/initvisa", paymentCtrl.initPayment); 
router.post("/callback", paymentCtrl.useCallback)


module.exports = router; 