const express = require('express');
const cors = require('cors');
const routes = require('./routes/indexRoutes');
const logger = require('./middlewares/loggerMiddleware');
const notFound = require('./middlewares/notFoundMiddleware');
const errorHandler = require('./middlewares/errorMiddleware');
const healthController = require('./controllers/healthController');



app.use(cors({
  origin: 'http://localhost:5174',
  credentials: true
}));


const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

app.get('/api/health', healthController.check);

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
