const express = require('express');  
const bodyParser = require('body-parser');  
const swaggerUi = require('swagger-ui-express');  
const swaggerDocument = require('./swagger.json');  
require('dotenv').config(); // Load environment variables
const connectDB = require('./config/db'); // Import the connectDB function

const app = express();  
app.use(bodyParser.json());  
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Connect to MongoDB
connectDB();

app.get('/test', (req, res) => {
    res.send('Test route is working!');
});  

app.listen(3000, () => console.log('Server running on http://localhost:3000'));  
module.exports = app;
