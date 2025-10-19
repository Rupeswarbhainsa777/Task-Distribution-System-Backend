const express = require('express');
const { body, validationResult } = require('express-validator');
const Agent = require('../models/Agent');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// @route   GET /api/agents
// @desc    Get all agents
// @access  Private
router.get('/', async (req, res) => {
  try {
    const agents = await Agent.find({ isActive: true }).select('-password');
    
    res.status(200).json({
      success: true,
      count: agents.length,
      data: {
        agents
      }
    });
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agents',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/agents/:id
// @desc    Get single agent
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id).select('-password');
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        agent
      }
    });
  } catch (error) {
    console.error('Get agent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agent',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/agents
// @desc    Create new agent
// @access  Private
router.post('/', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('mobileNumber').trim().isLength({ min: 10 }).withMessage('Valid mobile number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, mobileNumber, password } = req.body;

    // Check if agent already exists
    const existingAgent = await Agent.findOne({ email });
    if (existingAgent) {
      return res.status(400).json({
        success: false,
        message: 'Agent with this email already exists'
      });
    }

    // Create new agent
    const agent = new Agent({
      name,
      email,
      mobileNumber,
      password
    });

    await agent.save();

    res.status(201).json({
      success: true,
      message: 'Agent created successfully',
      data: {
        agent: {
          id: agent._id,
          name: agent.name,
          email: agent.email,
          mobileNumber: agent.mobileNumber,
          role: agent.role,
          isActive: agent.isActive,
          createdAt: agent.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Create agent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create agent',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   PUT /api/agents/:id
// @desc    Update agent
// @access  Private
router.put('/:id', [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('mobileNumber').optional().trim().isLength({ min: 10 }).withMessage('Valid mobile number is required')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, mobileNumber } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (mobileNumber) updateData.mobileNumber = mobileNumber;

    // Check if email already exists for another agent
    if (email) {
      const existingAgent = await Agent.findOne({ 
        email, 
        _id: { $ne: req.params.id } 
      });
      if (existingAgent) {
        return res.status(400).json({
          success: false,
          message: 'Agent with this email already exists'
        });
      }
    }

    const agent = await Agent.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Agent updated successfully',
      data: {
        agent
      }
    });

  } catch (error) {
    console.error('Update agent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update agent',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   DELETE /api/agents/:id
// @desc    Delete agent (soft delete)
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const agent = await Agent.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Agent deleted successfully'
    });

  } catch (error) {
    console.error('Delete agent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete agent',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
