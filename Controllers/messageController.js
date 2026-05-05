const Message = require('../Models/messageModel');

exports.getMessages = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;

        const messages = await Message.find({
            $or: [
                { sender: currentUserId, receiver: userId },
                { sender: userId, receiver: currentUserId }
            ]
        }).sort('createdAt');

        res.status(200).json(messages);
    } catch (error) {
        console.error("Error in getMessages", error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.markMessagesAsSeen = async (req, res) => {
    try {
        const { senderId } = req.body;
        const receiverId = req.user.id;

        await Message.updateMany(
            { sender: senderId, receiver: receiverId, status: { $ne: 'seen' } },
            { $set: { status: 'seen' } }
        );

        res.status(200).json({ message: 'Messages marked as seen' });
    } catch (error) {
        console.error("Error in markMessagesAsSeen", error);
        res.status(500).json({ error: 'Server error' });
    }
};
