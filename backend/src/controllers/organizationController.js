const Organization = require('../models/Organization');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const crypto = require('crypto');
const { sendEmail, emailTemplates } = require('../services/emailService');

exports.createOrganization = async (req, res, next) => {
  try {
    const { name } = req.body;
    
    const organization = await Organization.create({
      name,
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'admin' }]
    });

    // Set as current organization
    await User.findByIdAndUpdate(req.user._id, { currentOrganization: organization._id });

    res.status(201).json({
      status: 'success',
      data: { organization }
    });
  } catch (err) {
    logger.error('Create Organization Error:', err);
    next(err);
  }
};

exports.getOrganizations = async (req, res, next) => {
  try {
    const organizations = await Organization.find({
      'members.user': req.user._id,
      isActive: true
    });

    res.status(200).json({
      status: 'success',
      results: organizations.length,
      data: { organizations }
    });
  } catch (err) {
    next(err);
  }
};

exports.switchOrganization = async (req, res, next) => {
  try {
    const { organizationId } = req.params;

    // Check if user is member of this organization
    const org = await Organization.findOne({
      _id: organizationId,
      'members.user': req.user._id,
      isActive: true
    });

    if (!org) {
      return next(new AppError('Organization not found or access denied', 404));
    }

    await User.findByIdAndUpdate(req.user._id, { currentOrganization: organizationId });

    res.status(200).json({
      status: 'success',
      message: 'Switched organization successfully',
      data: { organization: org }
    });
  } catch (err) {
    next(err);
  }
};

exports.getOrganizationDetails = async (req, res, next) => {
  try {
    const { organizationId } = req.params;
    const org = await Organization.findOne({
      _id: organizationId,
      'members.user': req.user._id
    }).populate('members.user', 'name email');

    if (!org) {
      return next(new AppError('Organization not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { organization: org }
    });
  } catch (err) {
    next(err);
  }
};

exports.inviteMember = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    const organizationId = req.organization._id;
    
    // Check limits
    const limits = await req.user.getPlanLimits();
    if (req.organization.members.length >= limits.teamMembers) {
      return next(new AppError(`Team member limit exceeded. Plan allows ${limits.teamMembers} members.`, 403));
    }
    
    // Find user by email
    let invitedUser = await User.findOne({ email });
    let isNewUser = false;
    
    if (!invitedUser) {
      // Create a new inactive user with a random secure password
      const tempPassword = crypto.randomBytes(16).toString('hex') + 'A1!';
      invitedUser = new User({
        email,
        name: email.split('@')[0], // Default name from email
        password: tempPassword,
        isActive: false, // Wait for them to set password / signup
        isEmailVerified: false
      });
      
      await invitedUser.save({ validateBeforeSave: false });
      isNewUser = true;

      // Send invite email for new user
      try {
        const { subject, html } = emailTemplates.teamInviteNew(email);
        await sendEmail({ to: email, subject, html });
        logger.info(`Invite email (new) sent to ${email} for organization ${organizationId}`);
      } catch (emailErr) {
        logger.error(`Failed to send invite email to ${email}: ${emailErr.message}`);
      }
    } else {
      // User exists, send invite email for existing user
      try {
        const { subject, html } = emailTemplates.teamInviteExisting(email);
        await sendEmail({ to: email, subject, html });
        logger.info(`Invite email (existing) sent to ${email} for organization ${organizationId}`);
      } catch (emailErr) {
        logger.error(`Failed to send invite email to ${email}: ${emailErr.message}`);
      }
    }
    
    // Check if already member
    const isMember = req.organization.members.find(m => m.user.toString() === invitedUser._id.toString());
    if (isMember) {
      return next(new AppError('User is already a member', 400));
    }
    
    // Add to members
    req.organization.members.push({ user: invitedUser._id, role });
    await req.organization.save();
    
    logger.info(`User ${email} added to organization ${organizationId} as ${role}`);
    
    res.status(200).json({
      status: 'success',
      message: isNewUser ? 'Invitation email sent.' : 'User added to team.',
      data: {
        member: {
          id: invitedUser._id,
          name: invitedUser.name,
          email: invitedUser.email,
          role,
          status: invitedUser.isActive ? 'active' : 'invited'
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.removeMember = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const organization = req.organization;
    
    // Prevent owner from being removed
    if (organization.owner.toString() === userId.toString()) {
      return next(new AppError('Cannot remove the organization owner', 400));
    }
    
    const memberIndex = organization.members.findIndex(m => m.user.toString() === userId.toString());
    if (memberIndex === -1) {
      return next(new AppError('User is not a member of this organization', 404));
    }
    
    organization.members.splice(memberIndex, 1);
    await organization.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Member removed successfully'
    });
  } catch (err) {
    next(err);
  }
};

exports.getActivityLogs = async (req, res, next) => {
  try {
    // Mock audit logs for now. In production, this would query an AuditLog model
    const logs = [
      { id: 1, action: 'FLOW_PUBLISHED', user: 'Jane Doe', timestamp: new Date(Date.now() - 3600000) },
      { id: 2, action: 'BROADCAST_SENT', user: 'John Smith', timestamp: new Date(Date.now() - 7200000) },
      { id: 3, action: 'MEMBER_INVITED', user: 'Alice Admin', timestamp: new Date(Date.now() - 86400000) }
    ];
    
    res.status(200).json({
      status: 'success',
      data: { logs }
    });
  } catch (err) {
    next(err);
  }
};

exports.exportData = async (req, res, next) => {
  try {
    // Mock export bundling logic
    const exportData = {
      organization: req.organization.name,
      exportDate: new Date(),
      data: { contacts: [], messages: [], flows: [] }
    };
    
    res.status(200).json({
      status: 'success',
      message: 'Export generated successfully',
      data: { export: exportData }
    });
  } catch (err) {
    next(err);
  }
};
