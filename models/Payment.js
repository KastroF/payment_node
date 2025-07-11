const mongoose = require("mongoose"); 


const PaymentSchema = mongoose.Schema({
    
      amount: {type: Number}, 
      userId: {type: String}, 
      phone: {type: String}, 
      referenceId: {type: String}, 
      country_code: {type: String}, 
      bill_id: {type: String}, 
      app_name: {type: String}, 
      money_type: {type: String}, 
      amount2: {type: Number}, 
      client_phone: {type: String},
      date: {type: Date, default: new Date()}, 
      status: {type: String}
})

module.exports = mongoose.model("Payment", PaymentSchema)