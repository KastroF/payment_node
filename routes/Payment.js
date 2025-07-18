const express = require("express"); 

const router = express.Router(); 

const paymentCtrl = require("../controllers/Payment"); 

const auth = require("../middleware/auth"); 

router.post("/initvisa", paymentCtrl.initPayment); 
router.post("/callback", paymentCtrl.useCallback)
router.post("/getlist", auth, paymentCtrl.paiementsList);

module.exports = router; 