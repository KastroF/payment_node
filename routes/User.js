const express = require("express"); 

const router = express.Router(); 

const userCtrl = require("../controllers/User"); 



router.post("/adduser", userCtrl.addUser); 
router.post("/signin", userCtrl.signIn); 

module.exports = router; 