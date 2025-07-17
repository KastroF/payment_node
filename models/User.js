const mongoose = require("mongoose"); 

const userSchema = mongoose.Schema({

        name: {type: String},
        username: {type: String}, 
        password: {type: String}, 
        app: {type: String}, 
        userActive: {type: Boolean}
})

module.exports = mongoose.model("User", userSchema);