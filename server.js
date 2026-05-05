require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./Config/db');

// Connect to database
connectDB();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.io (can be used later)
const { Server } = require('socket.io');
const io = new Server(server, { 
    cors: { 
        origin: 'http://localhost:5173',
        methods: ["GET", "POST"],
        credentials: true
    } 
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // User joins their own room to receive private messages/events
    socket.on('register', (userId) => {
        if (userId) {
            socket.join(userId);
            console.log(`User ${userId} joined their personal room`);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Make io accessible in controllers
app.set('io', io);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
