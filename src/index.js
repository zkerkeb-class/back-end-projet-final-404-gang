const express = require('express');  
const bodyParser = require('body-parser'); 

require('dotenv').config();


console.log('MONGO_URI:', process.env.MONGO_URI);
//const swaggerUi = require('swagger-ui-express');  
//const swaggerDocument = require('./swagger.json');  

const connectDB = require('./config/db');
connectDB();
const app = express();  
 
const logger = require('./config/logger');
logger.info('Application started');
logger.error('An error occurred');
app.use(bodyParser.json());  
//app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/test', (req, res) => {
    res.send('Test route is working!');
  });  

app.listen(3000, () => console.log('Server running on http://localhost:3000'));  
module.exports = app;  
//user =dalidhouib08
//password = h8YOqg9Lk6KQ0f5E