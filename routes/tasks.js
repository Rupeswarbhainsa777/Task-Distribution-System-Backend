const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const Agent = require('../models/Agent');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'csv-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only CSV, XLSX, and XLS files
  const allowedTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  const allowedExtensions = ['.csv', '.xlsx', '.xls'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV, XLSX, and XLS files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Function to distribute tasks equally among agents
const distributeTasks = (tasks, agents) => {
  const distributedTasks = [];
  const tasksPerAgent = Math.floor(tasks.length / agents.length);
  const remainingTasks = tasks.length % agents.length;
  
  let taskIndex = 0;
  
  agents.forEach((agent, agentIndex) => {
    const agentTaskCount = tasksPerAgent + (agentIndex < remainingTasks ? 1 : 0);
    
    for (let i = 0; i < agentTaskCount; i++) {
      if (taskIndex < tasks.length) {
        distributedTasks.push({
          ...tasks[taskIndex],
          agentId: agent._id
        });
        taskIndex++;
      }
    }
  });
  
  return distributedTasks;
};

// @route   POST /api/tasks/upload
// @desc    Upload CSV file and distribute tasks
// @access  Private
router.post('/upload', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is required'
      });
    }

    // Get all active agents
    const agents = await Agent.find({ isActive: true });
    
    if (agents.length === 0) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'No active agents found. Please create agents first.'
      });
    }

    // Read and parse CSV file
    const tasks = [];
    const errors = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => {
          // Validate required fields
          if (!row.firstname && !row.FirstName && !row.first_name) {
            errors.push(`Row missing first name: ${JSON.stringify(row)}`);
            return;
          }
          
          if (!row.phone && !row.Phone && !row.phone_number) {
            errors.push(`Row missing phone: ${JSON.stringify(row)}`);
            return;
          }

          // Normalize field names
          const firstName = row.firstname || row.FirstName || row.first_name;
          const phone = row.phone || row.Phone || row.phone_number;
          const notes = row.notes || row.Notes || row.notes_text || '';

          tasks.push({
            firstName: firstName.trim(),
            phone: phone.toString().trim(),
            notes: notes.trim()
          });
        })
        .on('end', async () => {
          try {
            // Clean up uploaded file
            fs.unlinkSync(req.file.path);

            if (tasks.length === 0) {
              return resolve(res.status(400).json({
                success: false,
                message: 'No valid tasks found in CSV file'
              }));
            }

            // Generate batch ID
            const batchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // Distribute tasks among agents
            const distributedTasks = distributeTasks(tasks, agents);
            
            // Save tasks to database
            const savedTasks = await Task.insertMany(distributedTasks.map(task => ({
              ...task,
              batchId
            })));

            // Get distribution summary
            const distributionSummary = agents.map(agent => {
              const agentTasks = savedTasks.filter(task => 
                task.agentId.toString() === agent._id.toString()
              );
              return {
                agentId: agent._id,
                agentName: agent.name,
                agentEmail: agent.email,
                taskCount: agentTasks.length,
                tasks: agentTasks.map(task => ({
                  id: task._id,
                  firstName: task.firstName,
                  phone: task.phone,
                  notes: task.notes,
                  status: task.status
                }))
              };
            });

            resolve(res.status(200).json({
              success: true,
              message: `Successfully uploaded and distributed ${tasks.length} tasks`,
              data: {
                batchId,
                totalTasks: tasks.length,
                distributionSummary,
                errors: errors.length > 0 ? errors : undefined
              }
            }));

          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => {
          // Clean up uploaded file
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          reject(error);
        });
    });

  } catch (error) {
    console.error('Upload CSV error:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Failed to process CSV file',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/tasks
// @desc    Get all tasks with filtering options
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { agentId, batchId, status } = req.query;
    const filter = {};

    if (agentId) filter.agentId = agentId;
    if (batchId) filter.batchId = batchId;
    if (status) filter.status = status;

    const tasks = await Task.find(filter)
      .populate('agentId', 'name email mobileNumber')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: {
        tasks
      }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/tasks/distribution/:batchId
// @desc    Get task distribution for a specific batch
// @access  Private
router.get('/distribution/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;

    const tasks = await Task.find({ batchId })
      .populate('agentId', 'name email mobileNumber')
      .sort({ agentId: 1 });

    if (tasks.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // Group tasks by agent
    const distributionSummary = tasks.reduce((acc, task) => {
      const agentId = task.agentId._id.toString();
      
      if (!acc[agentId]) {
        acc[agentId] = {
          agent: task.agentId,
          tasks: [],
          taskCount: 0
        };
      }
      
      acc[agentId].tasks.push({
        id: task._id,
        firstName: task.firstName,
        phone: task.phone,
        notes: task.notes,
        status: task.status,
        assignedAt: task.assignedAt
      });
      acc[agentId].taskCount++;
      
      return acc;
    }, {});

    const distributionArray = Object.values(distributionSummary);

    res.status(200).json({
      success: true,
      data: {
        batchId,
        totalTasks: tasks.length,
        distribution: distributionArray
      }
    });
  } catch (error) {
    console.error('Get distribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task distribution',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/tasks/batches
// @desc    Get all batches
// @access  Private
router.get('/batches', async (req, res) => {
  try {
    const batches = await Task.aggregate([
      {
        $group: {
          _id: '$batchId',
          totalTasks: { $sum: 1 },
          createdAt: { $min: '$createdAt' },
          statusCounts: {
            $push: '$status'
          }
        }
      },
      {
        $addFields: {
          pendingCount: {
            $size: {
              $filter: {
                input: '$statusCounts',
                cond: { $eq: ['$$this', 'pending'] }
              }
            }
          },
          inProgressCount: {
            $size: {
              $filter: {
                input: '$statusCounts',
                cond: { $eq: ['$$this', 'in-progress'] }
              }
            }
          },
          completedCount: {
            $size: {
              $filter: {
                input: '$statusCounts',
                cond: { $eq: ['$$this', 'completed'] }
              }
            }
          }
        }
      },
      {
        $project: {
          statusCounts: 0
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      count: batches.length,
      data: {
        batches
      }
    });
  } catch (error) {
    console.error('Get batches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batches',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
