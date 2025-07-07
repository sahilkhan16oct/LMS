const connectDB = require('./config/db');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');


const app = express();
app.use(cors({
  origin: '*'
}));

app.use(express.json());

//upload files in uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const buildpath = path.join(__dirname,"dist")
app.use(express.static(buildpath));




// ✅ Serve frontend if not hitting API
app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });


// admin routes
const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);


//training routes
const trainingRoutes = require('./routes/trainingRoutes');
app.use('/api/admin', trainingRoutes);

//test routes
const testRoutes = require('./routes/testRoutes');
app.use('/api/admin', testRoutes);


//batch routes
const batchRoutes = require('./routes/batchRoutes');
app.use('/api/admin', batchRoutes);


//candiate routes
const candidateRoutes = require("./routes/candidateRoutes");
app.use("/api/candidate", candidateRoutes);

//candidate test routes
const candidateTestRoutes = require("./routes/candidateTestRoutes");
app.use("/api/candidate", candidateTestRoutes);

//certificate routes
const certificateRoutes = require('./routes/certificateRoutes');
app.use('/api/candidate', certificateRoutes);

//QueryRoutes
const candidateQueryRoutes = require('./routes/candidateQueryRoutes');
app.use('/api/candidate', candidateQueryRoutes);


//Notice fetch route
const generalRoutes = require("./routes/generalRoutes");
app.use("/api", generalRoutes);

const PORT = 5000;

// Connect to MongoDB using connectDB function
connectDB();

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));



