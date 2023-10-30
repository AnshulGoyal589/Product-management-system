const mongoose = require("mongoose");


const reviewSchema = new mongoose.Schema({

    rating:Number,
    text:String, 
    owner:String

})

const Review = mongoose.model("Review", reviewSchema);



module.exports = Review