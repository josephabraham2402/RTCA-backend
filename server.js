require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./Config/db');
const Message = require('./Models/messageModel');

// Connect to database
connectDB();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.io (can be used later)
const { Server } = require('socket.io');
const allowedOrigins = [
    'http://localhost:5173',
    'https://rtca-frontend.vercel.app',
    process.env.FRONTEND_URL
].filter(Boolean);

const io = new Server(server, { 
    cors: { 
        origin: function (origin, callback) {
            if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://localhost:')) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ["GET", "POST"],
        credentials: true
    } 
});

const onlineUsers = new Set();

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // User joins their own room to receive private messages/events
    socket.on('register', (userId) => {
        if (userId) {
            socket.userId = userId;
            socket.join(userId);
            console.log(`User ${userId} joined their personal room`);
            
            onlineUsers.add(userId);
            io.emit('user_online', userId);
            socket.emit('online_users', Array.from(onlineUsers));
        }
    });

    socket.on('send_message', async (data) => {
        try {
            const newMessage = new Message({
                sender: data.sender,
                receiver: data.receiver,
                text: data.text || '',
                fileUrl: data.fileUrl,
                fileType: data.fileType,
                fileName: data.fileName,
                status: 'sent'
            });
            await newMessage.save();

            const Group = require('./Models/groupModel');
            const group = await Group.findById(data.receiver).catch(() => null);

            if (group) {
                let newlyDeliveredTo = [];
                // Emit to all group members
                for (const memberId of group.members) {
                    if (memberId.toString() !== data.sender.toString()) {
                        const memberSockets = await io.in(memberId.toString()).fetchSockets();
                        if (memberSockets.length > 0) {
                            newlyDeliveredTo.push(memberId);
                        }
                        io.to(memberId.toString()).emit('receive_message', newMessage);
                    }
                }
                
                if (newlyDeliveredTo.length > 0) {
                    newMessage.deliveredTo = newlyDeliveredTo;
                    if (newlyDeliveredTo.length >= group.members.length - 1) {
                        newMessage.status = 'delivered';
                    }
                    await newMessage.save();
                }

                socket.emit('message_sent', newMessage);
                
                if (newlyDeliveredTo.length > 0) {
                    io.to(data.sender).emit('message_status_update', {
                        messageId: newMessage._id,
                        status: newMessage.status,
                        receiverId: data.receiver
                    });
                }
            } else {
                // Emit to single receiver
                io.to(data.receiver).emit('receive_message', newMessage);
                socket.emit('message_sent', newMessage);

                // Check if receiver is online to mark as delivered
                const receiverSockets = await io.in(data.receiver).fetchSockets();
                if (receiverSockets.length > 0) {
                    newMessage.status = 'delivered';
                    await newMessage.save();
                    io.to(data.sender).emit('message_status_update', {
                        messageId: newMessage._id,
                        status: 'delivered',
                        receiverId: data.receiver
                    });
                    io.to(data.receiver).emit('message_status_update', {
                        messageId: newMessage._id,
                        status: 'delivered',
                        receiverId: data.receiver
                    });
                }
            }
        } catch (error) {
            console.error("Error sending message", error);
        }
    });

    socket.on('mark_seen', async ({ messageIds, senderId, receiverId }) => {
        try {
            const Group = require('./Models/groupModel');
            const group = await Group.findById(senderId).catch(() => null);

            if (group) {
                const messages = await Message.find({ _id: { $in: messageIds } });
                let fullySeenMessageIds = [];
                let sendersToNotify = new Set();
                for (let message of messages) {
                    if (message.sender.toString() !== receiverId && !message.seenBy.includes(receiverId)) {
                        message.seenBy.push(receiverId);
                        if (message.seenBy.length >= group.members.length - 1) {
                            message.status = 'seen';
                            fullySeenMessageIds.push(message._id);
                        }
                        await message.save();
                        sendersToNotify.add(message.sender.toString());
                    }
                }
                
                if (fullySeenMessageIds.length > 0) {
                    sendersToNotify.forEach(sender => {
                        io.to(sender).emit('messages_seen', { messageIds: fullySeenMessageIds, receiverId: senderId });
                    });
                }
            } else {
                await Message.updateMany(
                    { _id: { $in: messageIds } },
                    { $set: { status: 'seen' } }
                );
                
                // Notify the sender that their messages were seen
                io.to(senderId).emit('messages_seen', { messageIds, receiverId });
            }
        } catch (error) {
            console.error("Error marking seen", error);
        }
    });

    socket.on('edit_message', async ({ messageId, newText, receiverId }) => {
        try {
            const message = await Message.findById(messageId);
            if (message && message.sender.toString() === socket.userId) {
                message.text = newText;
                message.isEdited = true;
                await message.save();
                
                io.to(receiverId).emit('message_edited', { messageId, newText });
                socket.emit('message_edited', { messageId, newText });
            }
        } catch (error) {
            console.error("Error editing message", error);
        }
    });

    socket.on('delete_message', async ({ messageId, receiverId }) => {
        try {
            const message = await Message.findById(messageId);
            if (message && message.sender.toString() === socket.userId) {
                message.isDeleted = true;
                await message.save();
                
                io.to(receiverId).emit('message_deleted', { messageId });
                socket.emit('message_deleted', { messageId });
            }
        } catch (error) {
            console.error("Error deleting message", error);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (socket.userId) {
            onlineUsers.delete(socket.userId);
            io.emit('user_offline', socket.userId);
        }
    });
});

// Make io accessible in controllers
app.set('io', io);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown for nodemon restarts to prevent EADDRINUSE
process.once('SIGUSR2', () => {
    server.close(() => {
        process.kill(process.pid, 'SIGUSR2');
    });
});

process.on('SIGINT', () => {
    server.close(() => {
        process.exit(0);
    });
});
