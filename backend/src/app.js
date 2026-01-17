const express = require('express');
const cors = require('cors');
const routes = require('./routes/index.routes');
const errorHandler = require('./middlewares/error.middleware');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

app.use('/api', routes);
app.use(errorHandler);

module.exports = app;
