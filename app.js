const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./Routes/authRoutes');
const userRoutes = require('./Routes/userRoutes');
const messageRoutes = require('./Routes/messageRoutes');
const uploadRoutes = require('./Routes/uploadRoutes');
const groupRoutes = require('./Routes/groupRoutes');
const path = require('path');

const app = express();

// Middleware
app.use(cors({
    origin: 'http://localhost:5173', // Vite default port
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/groups', groupRoutes);

app.get('/', (req, res) => {
    res.send('API is running...');
});

module.exports = app;
