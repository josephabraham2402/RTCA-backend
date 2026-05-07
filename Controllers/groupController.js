const Group = require('../Models/groupModel');
const User = require('../Models/userModel');

const createGroup = async (req, res) => {
    try {
        const { name, description, members, avatar } = req.body;
        
        if (!name) {
            return res.status(400).json({ message: 'Group name is required' });
        }

        // Convert members to array of ObjectIds if it's not already
        const memberIds = Array.isArray(members) ? members : [];
        
        // Add the creator (admin) to the members list if not already included
        if (!memberIds.includes(req.user.id.toString())) {
            memberIds.push(req.user.id);
        }

        const newGroup = await Group.create({
            name,
            description,
            avatar,
            admin: req.user.id,
            members: memberIds
        });

        res.status(201).json(newGroup);
    } catch (error) {
        console.error("Create group error:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getGroups = async (req, res) => {
    try {
        // Fetch groups where the user is a member
        const groups = await Group.find({ members: req.user.id })
            .populate('members', 'name username email avatar')
            .populate('admin', 'name username email avatar');
            
        res.status(200).json(groups);
    } catch (error) {
        console.error("Get groups error:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createGroup,
    getGroups
};
