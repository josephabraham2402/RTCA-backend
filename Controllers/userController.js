const User = require('../Models/userModel');

exports.searchUsers = async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ message: 'Search query is required' });
        }

        const currentUserId = req.user.id;

        // Search by email, name, or username. 
        // Exclude current user from results.
        const users = await User.find({
            _id: { $ne: currentUserId },
            $or: [
                { email: { $regex: query, $options: 'i' } },
                { name: { $regex: query, $options: 'i' } },
                { username: { $regex: query, $options: 'i' } }
            ]
        }).select('-password').limit(20);

        const formattedUsers = users.map(user => ({
            id: user._id,
            email: user.email,
            name: user.name || user.email.split('@')[0], 
            username: user.username || `@${user.email.split('@')[0]}`,
            avatar: user.avatar || `https://ui-avatars.com/api/?name=${user.email.charAt(0)}&background=random`
        }));

        res.status(200).json(formattedUsers);
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ message: 'Server error during search' });
    }
};

exports.getFriendRequests = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const user = await User.findById(currentUserId).populate('friendRequests', '-password');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const formattedRequests = user.friendRequests.map(reqUser => ({
            id: reqUser._id,
            email: reqUser.email,
            name: reqUser.name || reqUser.email.split('@')[0],
            username: reqUser.username || `@${reqUser.email.split('@')[0]}`,
            avatar: reqUser.avatar || `https://ui-avatars.com/api/?name=${reqUser.email.charAt(0)}&background=random`
        }));

        res.status(200).json(formattedRequests);
    } catch (error) {
        console.error('Error fetching friend requests:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.sendFriendRequest = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const targetUserId = req.body.userId;

        if (currentUserId === targetUserId) {
            return res.status(400).json({ message: "You cannot add yourself" });
        }

        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({ message: 'Target user not found' });
        }

        // Add current user to target user's friendRequests if not already there
        // And ensure they are not already friends
        if (!targetUser.friendRequests.includes(currentUserId) && !targetUser.friends.includes(currentUserId)) {
            targetUser.friendRequests.push(currentUserId);
            await targetUser.save();

            // Emit socket event to target user
            const io = req.app.get('io');
            if (io) {
                const currentUser = await User.findById(currentUserId).select('-password');
                const formattedRequest = {
                    id: currentUser._id,
                    email: currentUser.email,
                    name: currentUser.name || currentUser.email.split('@')[0],
                    username: currentUser.username || `@${currentUser.email.split('@')[0]}`,
                    avatar: currentUser.avatar || `https://ui-avatars.com/api/?name=${currentUser.email.charAt(0)}&background=random`
                };
                
                io.to(targetUserId.toString()).emit('newFriendRequest', formattedRequest);
            }
        }

        res.status(200).json({ message: 'Friend request sent successfully' });
    } catch (error) {
        console.error('Error sending friend request:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.respondFriendRequest = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const { requestId, status } = req.body; // status: 'accept' or 'reject'

        const user = await User.findById(currentUserId);
        const requester = await User.findById(requestId);

        if (!user || !requester) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Remove from friend requests
        user.friendRequests = user.friendRequests.filter(id => id.toString() !== requestId);

        if (status === 'accept') {
            // Add to friends lists if not already there
            if (!user.friends.includes(requestId)) user.friends.push(requestId);
            if (!requester.friends.includes(currentUserId)) requester.friends.push(currentUserId);
            
            await requester.save();

            // Notify requester that request was accepted
            const io = req.app.get('io');
            if (io) {
                const formattedUser = {
                    id: user._id,
                    email: user.email,
                    name: user.name || user.email.split('@')[0],
                    username: user.username || `@${user.email.split('@')[0]}`,
                    avatar: user.avatar || `https://ui-avatars.com/api/?name=${user.email.charAt(0)}&background=random`
                };
                io.to(requestId.toString()).emit('friendRequestAccepted', formattedUser);
            }
        }

        await user.save();
        
        // Let the current user know who they just accepted/rejected (to update UI if needed)
        const formattedRequester = {
            id: requester._id,
            email: requester.email,
            name: requester.name || requester.email.split('@')[0],
            username: requester.username || `@${requester.email.split('@')[0]}`,
            avatar: requester.avatar || `https://ui-avatars.com/api/?name=${requester.email.charAt(0)}&background=random`
        };

        res.status(200).json({ message: `Friend request ${status}ed`, user: formattedRequester });
    } catch (error) {
        console.error('Error responding to friend request:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getFriends = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const user = await User.findById(currentUserId).populate('friends', '-password');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const formattedFriends = user.friends.map(friend => ({
            id: friend._id,
            email: friend.email,
            name: friend.name || friend.email.split('@')[0],
            username: friend.username || `@${friend.email.split('@')[0]}`,
            avatar: friend.avatar || `https://ui-avatars.com/api/?name=${friend.email.charAt(0)}&background=random`
        }));

        res.status(200).json(formattedFriends);
    } catch (error) {
        console.error('Error fetching friends:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.removeFriend = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const friendId = req.params.friendId;

        const user = await User.findById(currentUserId);
        const friend = await User.findById(friendId);

        if (!user || !friend) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.friends = user.friends.filter(id => id.toString() !== friendId);
        friend.friends = friend.friends.filter(id => id.toString() !== currentUserId);

        await user.save();
        await friend.save();

        const io = req.app.get('io');
        if (io) {
            io.to(friendId.toString()).emit('friend_removed', currentUserId);
        }

        res.status(200).json({ message: 'Friend removed successfully' });
    } catch (error) {
        console.error('Error removing friend:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.blockUser = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const targetUserId = req.body.userId;

        if (currentUserId === targetUserId) {
            return res.status(400).json({ message: "You cannot block yourself" });
        }

        const user = await User.findById(currentUserId);
        const targetUser = await User.findById(targetUserId);

        if (!user || !targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.blockedUsers) user.blockedUsers = [];
        if (!user.blockedUsers.includes(targetUserId)) {
            user.blockedUsers.push(targetUserId);
        }

        user.friends = user.friends.filter(id => id.toString() !== targetUserId);
        targetUser.friends = targetUser.friends.filter(id => id.toString() !== currentUserId);

        await user.save();
        await targetUser.save();

        const io = req.app.get('io');
        if (io) {
            io.to(targetUserId.toString()).emit('user_blocked', currentUserId);
        }

        res.status(200).json({ message: 'User blocked successfully' });
    } catch (error) {
        console.error('Error blocking user:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.toggleMute = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const targetUserId = req.body.userId;

        const user = await User.findById(currentUserId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.mutedChats) user.mutedChats = [];
        
        let isMuted = false;
        const index = user.mutedChats.indexOf(targetUserId);
        if (index > -1) {
            user.mutedChats.splice(index, 1);
        } else {
            user.mutedChats.push(targetUserId);
            isMuted = true;
        }

        await user.save();
        res.status(200).json({ message: isMuted ? 'Chat muted' : 'Chat unmuted', isMuted, mutedChats: user.mutedChats });
    } catch (error) {
        console.error('Error toggling mute:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getMutedChats = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user.mutedChats || []);
    } catch (error) {
        console.error('Error getting muted chats:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, username, avatar } = req.body;
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (username && username !== user.username) {
            const existingUsername = await User.findOne({ username });
            if (existingUsername) {
                return res.status(400).json({ message: 'Username is already taken' });
            }
            user.username = username;
        }

        if (name !== undefined) user.name = name;
        if (avatar !== undefined) user.avatar = avatar;

        await user.save();

        res.status(200).json({
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                username: user.username,
                avatar: user.avatar
            }
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect current password' });
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
