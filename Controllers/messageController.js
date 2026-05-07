const Message = require('../Models/messageModel');
const Group = require('../Models/groupModel');

exports.getMessages = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;

        const group = await Group.findById(userId).catch(() => null);
        
        let messages;
        if (group) {
            messages = await Message.find({ receiver: userId }).sort('createdAt');
        } else {
            messages = await Message.find({
                $or: [
                    { sender: currentUserId, receiver: userId },
                    { sender: userId, receiver: currentUserId }
                ]
            }).sort('createdAt');
        }

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

        const group = await Group.findById(senderId).catch(() => null);

        if (group) {
            // For groups, senderId is the groupId. The messages are those where receiver is the group.
            const messages = await Message.find({ receiver: senderId, status: { $ne: 'seen' } });
            for (let message of messages) {
                // Ensure the user hasn't seen it and the user didn't send it
                if (message.sender.toString() !== receiverId && !message.seenBy.includes(receiverId)) {
                    message.seenBy.push(receiverId);
                    if (message.seenBy.length >= group.members.length - 1) {
                        message.status = 'seen';
                    }
                    await message.save();
                }
            }
        } else {
            await Message.updateMany(
                { sender: senderId, receiver: receiverId, status: { $ne: 'seen' } },
                { $set: { status: 'seen' } }
            );
        }

        res.status(200).json({ message: 'Messages marked as seen' });
    } catch (error) {
        console.error("Error in markMessagesAsSeen", error);
        res.status(500).json({ error: 'Server error' });
    }
};
