const Group = require('../Models/groupModel');
const User = require('../Models/userModel');
const Message = require('../Models/messageModel');

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

const deleteGroup = async (req, res) => {
    try {
        const groupId = req.params.id;
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: 'Group not found' });
        
        if (group.admin.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'Only admin can delete group' });
        }
        
        await Message.deleteMany({ receiver: groupId });
        await Group.findByIdAndDelete(groupId);
        res.status(200).json({ message: 'Group deleted successfully' });
    } catch (error) {
        console.error("Delete group error:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

const addGroupMembers = async (req, res) => {
    try {
        const { members } = req.body;
        const groupId = req.params.id;
        
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: 'Group not found' });
        
        if (group.admin.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'Only admin can manage members' });
        }
        
        const newMembers = Array.isArray(members) ? members : [members];
        const updatedGroup = await Group.findByIdAndUpdate(
            groupId, 
            { $addToSet: { members: { $each: newMembers } } },
            { new: true }
        ).populate('members', 'name username email avatar').populate('admin', 'name username email avatar');
        
        res.status(200).json(updatedGroup);
    } catch (error) {
        console.error("Add members error:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

const removeGroupMember = async (req, res) => {
    try {
        const groupId = req.params.id;
        const memberId = req.params.memberId;
        
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: 'Group not found' });
        
        if (group.admin.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'Only admin can manage members' });
        }
        
        if (memberId === group.admin.toString()) {
            return res.status(400).json({ message: 'Cannot remove the admin' });
        }
        
        const updatedGroup = await Group.findByIdAndUpdate(
            groupId, 
            { $pull: { members: memberId } },
            { new: true }
        ).populate('members', 'name username email avatar').populate('admin', 'name username email avatar');
        
        res.status(200).json(updatedGroup);
    } catch (error) {
        console.error("Remove member error:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createGroup,
    getGroups,
    deleteGroup,
    addGroupMembers,
    removeGroupMember
};
