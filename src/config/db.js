const mongoose = require('mongoose');
require('dotenv').config();
console.log('MONGO_URI:', process.env.MONGO_URI);

const connectDB = async () => {
  try {
    await mongoose.connect("mongodb+srv://dalidhouib08:MO2mbp8aDLADIig3@cluster0.ug70j.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
