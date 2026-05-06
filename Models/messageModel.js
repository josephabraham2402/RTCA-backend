const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        required: false,
        default: ''
    },
    fileUrl: {
        type: String,
        required: false
    },
    fileType: {
        type: String,
        required: false
    },
    fileName: {
        type: String,
        required: false
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['sent', 'delivered', 'seen'],
        default: 'sent'
    }
}, { timestamps: true });

// Compound index for significantly faster querying of conversation histories
messageSchema.index({ sender: 1, receiver: 1, createdAt: 1 });
// Index for fast lookup of unread messages
messageSchema.index({ receiver: 1, status: 1 });

module.exports = mongoose.model('Message', messageSchema);
