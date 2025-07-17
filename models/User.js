const mongoose = require("mongoose"); 

const userSchema = mongoose.Schema({

        username: {type: String}, 
        password: {type: String}, 
        app: {type: String}
})

module.exports = mongoose.model("User", userSchema);