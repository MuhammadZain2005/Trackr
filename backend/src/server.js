const app = require('./app');
const { PORT } = require('./config/env');

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
});

app.get("/", (req, res) => {
  res.send("Backend API is running. Frontend runs on the React dev server.");
}); 
