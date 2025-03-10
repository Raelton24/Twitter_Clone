import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";

import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";

export const getUserProfile = async (req, res) => {
    const { username } = req.params;

    try {
        const user = await User.findOne({ username }).select("-password");
        if (!user) return res.status(404).json({ error: "User not found" });

        res.status(200).json(user);
    } catch (error) {
        console.log("Error in getUserProfile:", error.message);
        res.status(500).json({ error: error.message });
    }
};

export const followUnfollowUser = async (req, res) => {
    try {
        const { id } = req.params;
        const userToModify = await User.findById(id);
        const currentUser = await User.findById(req.user._id);

        if (id === req.user._id.toString()) {
            return res.status(400).json({ error: "You can't follow/unfollow yourself" });
        }

        if (!userToModify || !currentUser) return res.status(400).json({ error: "User not found" });

        const isFollowing = currentUser.following.includes(id);

        if (isFollowing) {
            // Unfollow the user
            await User.findByIdAndUpdate(id, { $pull: { followers: req.user._id } });
            await User.findByIdAndUpdate(req.user._id, { $pull: { following: id } });

            res.status(200).json({ message: "User unfollowed successfully" });
        } else {
            // Follow the user
            await User.findByIdAndUpdate(id, { $push: { followers: req.user._id } });
            await User.findByIdAndUpdate(req.user._id, { $push: { following: id } });

            // Send notification to the user
            const newNotification = new Notification({
                type: "follow",
                from: req.user._id,
                to: userToModify._id,
            });

            await newNotification.save();
            res.status(200).json({ message: "User followed successfully" });
        }
    } catch (error) {
        console.log("Error in followUnfollowUser:", error.message);
        res.status(500).json({ error: error.message });
    }
};

export const getSuggestedUsers = async (req, res) => {
    try {
        const userId = req.user._id;

        // Get the users the current user is following
        const user = await User.findById(userId).select("following");
        const usersFollowedByMe = user?.following || [];

        // Get suggested users (excluding the current user and already followed users)
        const suggestedUsers = await User.find({
            _id: { $nin: [userId, ...usersFollowedByMe] },
        })
            .select("-password")
            .limit(4);

        res.status(200).json(suggestedUsers);
    } catch (error) {
        console.error("Error in getSuggestedUsers:", error.message);
        res.status(500).json({ error: error.message });
    }
};

export const updateUser = async (req, res) => {
    const { fullName, email, username, currentPassword, newPassword, bio, link } = req.body;
    let { profileImg, coverImg } = req.body;

    const userId = req.user._id;

    try {
        // Fetch user from DB
        let user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Check if email is unique before updating
        if (email && email !== user.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ error: "Invalid email format" });
            }
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ error: "Email is already in use" });
            }
        }

        // Validate password update
        if ((!newPassword && currentPassword) || (!currentPassword && newPassword)) {
            return res.status(400).json({ error: "Please provide both current password and new password" });
        }

        if (currentPassword && newPassword) {
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) return res.status(400).json({ error: "Current password is incorrect" });

            if (newPassword.length < 6) {
                return res.status(400).json({ error: "Password must be at least 6 characters long" });
            }

            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
        }

        // Handle profile image upload
        if (profileImg) {
            try {
                if (user.profileImg) {
                    await cloudinary.uploader.destroy(user.profileImg.split("/").pop().split(".")[0]);
                }
                const uploadedResponse = await cloudinary.uploader.upload(profileImg);
                profileImg = uploadedResponse.secure_url;
            } catch (error) {
                console.error("Cloudinary Profile Image Upload Error:", error);
                return res.status(500).json({ error: "Profile image upload failed" });
            }
        }

        // Handle cover image upload
        if (coverImg) {
            try {
                if (user.coverImg) {
                    await cloudinary.uploader.destroy(user.coverImg.split("/").pop().split(".")[0]);
                }
                const uploadedResponse = await cloudinary.uploader.upload(coverImg);
                coverImg = uploadedResponse.secure_url;
            } catch (error) {
                console.error("Cloudinary Cover Image Upload Error:", error);
                return res.status(500).json({ error: "Cover image upload failed" });
            }
        }

        // Update user fields
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                fullname: fullName || user.fullname,
                email: email || user.email,
                username: username || user.username,
                bio: bio || user.bio,
                link: link || user.link,
                profileImg: profileImg || user.profileImg,
                coverImg: coverImg || user.coverImg,
                
            },
            { new: true }
        ).select("-password");

        // console.log("Received fullName:", fullName);
        // console.log("Current user fullName:", user.fullname);

        res.status(200).json(updatedUser);
    } catch (error) {
        console.log("Error in updateUser:", error.message);
        res.status(500).json({ error: error.message });
    }
};
