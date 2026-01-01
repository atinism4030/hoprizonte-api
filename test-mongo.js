const mongoose = require('mongoose');
require('dotenv').config();

console.log("Testing Mongo Connection...");
console.log("URI from env:", process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("Successfully connected to MongoDB!");
        process.exit(0);
    })
    .catch((err) => {
        console.error("Connection failed:", err);
        process.exit(1);
    });
