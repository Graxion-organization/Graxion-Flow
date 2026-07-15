const Organization = require('../models/Organization');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

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
      return next(new AppError(`Team member limit exceeded. Plan allows \${limits.teamMembers} members.`, 403));
    }
    
    // Find user by email
    const invitedUser = await User.findOne({ email });
    if (!invitedUser) {
      // In production: send invite email to register
      logger.info(`Mock Email: Inviting \${email} to join platform and organization \${organizationId}`);
      return res.status(200).json({ status: 'success', message: 'Invitation email sent (mock)' });
    }
    
    // Check if already member
    const isMember = req.organization.members.find(m => m.user.toString() === invitedUser._id.toString());
    if (isMember) {
      return next(new AppError('User is already a member', 400));
    }
    
    // Add to members
    req.organization.members.push({ user: invitedUser._id, role });
    await req.organization.save();
    
    logger.info(`Mock Email: \${email} added to organization \${organizationId} as \${role}`);
    
    res.status(200).json({
      status: 'success',
      message: 'User added successfully'
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
