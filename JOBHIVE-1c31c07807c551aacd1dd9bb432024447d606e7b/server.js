const express = require('express');
const bcrypt = require('bcrypt');
const connectDB = require('./config/db');
const cors = require('cors');
const { ObjectId } = require('mongodb');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const jwt = require('jsonwebtoken');

// Admin Authentication Middleware
const authenticateAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, 'your-secret-key');
        
        if (decoded.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        req.adminId = decoded.adminId;
        next();
    } catch (error) {
        console.error('Admin authentication error:', error);
        res.status(401).json({ message: 'Invalid token' });
    }
};

const app = express();
const port = process.env.PORT || 3000;

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        if (file.fieldname === 'profilePhoto') {
            if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
                return cb(new Error('Only image files are allowed!'), false);
            }
        } else if (file.fieldname === 'resume') {
            if (!file.originalname.match(/\.(pdf|doc|docx)$/)) {
                return cb(new Error('Only PDF and Word documents are allowed!'), false);
            }
        }
        cb(null, true);
    }
});

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// Admin login route
app.post('/api/admin/login', async (req, res) => {
    console.log('Admin login route hit');
    console.log('Request body:', req.body);
    
    try {
        const { email, password } = req.body;
        console.log('Attempting to find admin with email:', email);
        
        const admin = await db.collection('admins').findOne({ email });
        console.log('Admin found:', admin ? 'Yes' : 'No');
        
        if (!admin) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        console.log('Password match:', isMatch ? 'Yes' : 'No');
        
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { adminId: admin._id, role: 'admin' },
            'your-secret-key',
            { expiresIn: '24h' }
        );

        console.log('Login successful, sending response');
        res.json({
            token,
            adminId: admin._id,
            message: 'Login successful'
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin Statistics Routes
app.get('/api/admin/stats/jobseekers', async (req, res) => {
    try {
        const count = await db.collection('jobseekers').countDocuments();
        res.json({ count });
    } catch (error) {
        console.error('Error fetching jobseekers count:', error);
        res.status(500).json({ message: 'Error fetching jobseekers count' });
    }
});

app.get('/api/admin/stats/employers', async (req, res) => {
    try {
        const count = await db.collection('employers').countDocuments();
        res.json({ count });
    } catch (error) {
        console.error('Error fetching employers count:', error);
        res.status(500).json({ message: 'Error fetching employers count' });
    }
});

app.get('/api/admin/stats/jobs', async (req, res) => {
    try {
        const count = await db.collection('jobs').countDocuments({ status: 'active' });
        res.json({ count });
    } catch (error) {
        console.error('Error fetching active jobs count:', error);
        res.status(500).json({ message: 'Error fetching active jobs count' });
    }
});

app.get('/api/admin/stats/applications', async (req, res) => {
    try {
        const count = await db.collection('applications').countDocuments();
        res.json({ count });
    } catch (error) {
        console.error('Error fetching applications count:', error);
        res.status(500).json({ message: 'Error fetching applications count' });
    }
});

app.get('/api/admin/jobs/recent', async (req, res) => {
    try {
        const jobs = await db.collection('jobs')
            .find({})
            .sort({ createdAt: -1 })
            .limit(10)
            .toArray();
        res.json(jobs);
    } catch (error) {
        console.error('Error fetching recent jobs:', error);
        res.status(500).json({ message: 'Error fetching recent jobs' });
    }
});

// Admin Jobs Routes
app.get('/api/admin/jobs', authenticateAdmin, async (req, res) => {
    try {
        const jobs = await db.collection('jobs').find({}).toArray();
        res.json(jobs);
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).json({ message: 'Error fetching jobs' });
    }
});

// Admin Monthly Statistics
app.get('/api/admin/stats/monthly', authenticateAdmin, async (req, res) => {
    try {
        const currentDate = new Date();
        const last6Months = new Date(currentDate.setMonth(currentDate.getMonth() - 6));
        
        // Get monthly registrations
        const registrations = await db.collection('jobseekers').aggregate([
            {
                $match: {
                    createdAt: { $gte: last6Months }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    jobseekers: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    month: {
                        $dateFromParts: {
                            year: "$_id.year",
                            month: "$_id.month",
                            day: 1
                        }
                    },
                    jobseekers: 1
                }
            },
            { $sort: { month: 1 } }
        ]).toArray();

        const employerRegistrations = await db.collection('employers').aggregate([
            {
                $match: {
                    createdAt: { $gte: last6Months }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    employers: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    month: {
                        $dateFromParts: {
                            year: "$_id.year",
                            month: "$_id.month",
                            day: 1
                        }
                    },
                    employers: 1
                }
            },
            { $sort: { month: 1 } }
        ]).toArray();

        // Merge jobseeker and employer registrations
        const mergedRegistrations = registrations.map(reg => {
            const employerReg = employerRegistrations.find(er => 
                er.month.getTime() === reg.month.getTime()
            );
            return {
                ...reg,
                employers: employerReg ? employerReg.employers : 0
            };
        });

        // Get monthly job postings
        const jobPostings = await db.collection('jobs').aggregate([
            {
                $match: {
                    createdAt: { $gte: last6Months }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    month: {
                        $dateFromParts: {
                            year: "$_id.year",
                            month: "$_id.month",
                            day: 1
                        }
                    },
                    count: 1
                }
            },
            { $sort: { month: 1 } }
        ]).toArray();

        res.json({
            registrations: mergedRegistrations,
            jobPostings: jobPostings
        });
    } catch (error) {
        console.error('Error fetching monthly stats:', error);
        res.status(500).json({ message: 'Error fetching monthly statistics' });
    }
});

// Admin User Management Routes
app.get('/api/admin/users/jobseekers', async (req, res) => {
    try {
        const jobseekers = await db.collection('jobseekers')
            .aggregate([
                {
                    $lookup: {
                        from: 'users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                { $unwind: '$user' },
                {
                    $project: {
                        _id: 1,
                        firstName: '$user.firstName',
                        lastName: '$user.lastName',
                        email: '$user.email',
                        phone: '$user.phone',
                        location: 1,
                        profileCompleted: 1,
                        createdAt: 1,
                        status: 1
                    }
                }
            ])
            .toArray();
        res.json(jobseekers);
    } catch (error) {
        console.error('Error fetching jobseekers:', error);
        res.status(500).json({ message: 'Error fetching jobseekers' });
    }
});

app.get('/api/admin/users/employers', async (req, res) => {
    try {
        const employers = await db.collection('employers').find({}).toArray();
        console.log('Found employers:', employers.length);
        res.json(employers);
    } catch (error) {
        console.error('Error fetching employers:', error);
        res.status(500).json({ message: 'Error fetching employers' });
    }
});

// Admin Reports Routes
app.get('/api/admin/reports/jobseekers', async (req, res) => {
    try {
        const jobseekers = await db.collection('jobseekers')
            .aggregate([
                {
                    $lookup: {
                        from: 'applications',
                        localField: '_id',
                        foreignField: 'jobseeker',
                        as: 'applications'
                    }
                },
                {
                    $lookup: {
                        from: 'resumes',
                        localField: '_id',
                        foreignField: 'jobseeker',
                        as: 'resume'
                    }
                },
                {
                    $project: {
                        firstName: 1,
                        lastName: 1,
                        email: 1,
                        location: 1,
                        status: 1,
                        createdAt: 1,
                        applications: { $size: '$applications' },
                        resumeUrl: { $arrayElemAt: ['$resume.url', 0] }
                    }
                },
                {
                    $sort: { createdAt: -1 }
                }
            ]).toArray();

        res.json(jobseekers);
    } catch (error) {
        console.error('Error fetching jobseekers report:', error);
        res.status(500).json({ message: 'Error fetching jobseekers report' });
    }
});

app.get('/api/admin/reports/employers', async (req, res) => {
    try {
        const employers = await db.collection('employers')
            .aggregate([
                {
                    $lookup: {
                        from: 'jobs',
                        localField: '_id',
                        foreignField: 'employerId',
                        as: 'jobs'
                    }
                },
                {
                    $lookup: {
                        from: 'applications',
                        localField: '_id',
                        foreignField: 'employerId',
                        as: 'applications'
                    }
                },
                {
                    $project: {
                        companyName: 1,
                        companyEmail: 1,
                        totalJobs: { $size: '$jobs' },
                        activeJobs: {
                            $size: {
                                $filter: {
                                    input: '$jobs',
                                    as: 'job',
                                    cond: { $eq: ['$$job.status', 'active'] }
                                }
                            }
                        },
                        totalApplications: { $size: '$applications' },
                        createdAt: 1,
                        status: 1
                    }
                }
            ]).toArray();

        res.json(employers);
    } catch (error) {
        console.error('Error fetching employers report:', error);
        res.status(500).json({ message: 'Error fetching employers report' });
    }
});

app.get('/api/admin/reports/jobs', async (req, res) => {
    try {
        const jobs = await db.collection('jobs')
            .aggregate([
                {
                    $lookup: {
                        from: 'applications',
                        localField: '_id',
                        foreignField: 'jobId',
                        as: 'applications'
                    }
                },
                {
                    $lookup: {
                        from: 'employers',
                        localField: 'employerId',
                        foreignField: '_id',
                        as: 'employer'
                    }
                },
                {
                    $unwind: '$employer'
                },
                {
                    $project: {
                        title: 1,
                        company: '$employer.companyName',
                        industry: 1,
                        location: 1,
                        type: 1,
                        applications: { $size: '$applications' },
                        createdAt: 1,
                        status: 1,
                        employerId: 1
                    }
                },
                {
                    $sort: { createdAt: -1 }
                }
            ]).toArray();

        res.json(jobs);
    } catch (error) {
        console.error('Error fetching jobs report:', error);
        res.status(500).json({ message: 'Error fetching jobs report' });
    }
});

app.get('/api/admin/reports/applications', async (req, res) => {
    try {
        const applications = await db.collection('applications')
            .aggregate([
                {
                    $lookup: {
                        from: 'jobseekers',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'jobseeker'
                    }
                },
                {
                    $lookup: {
                        from: 'jobs',
                        localField: 'jobId',
                        foreignField: '_id',
                        as: 'job'
                    }
                },
                {
                    $lookup: {
                        from: 'employers',
                        localField: 'employerId',
                        foreignField: '_id',
                        as: 'employer'
                    }
                },
                {
                    $unwind: '$jobseeker'
                },
                {
                    $unwind: '$job'
                },
                {
                    $unwind: '$employer'
                },
                {
                    $project: {
                        _id: 1,
                        applicantName: { $concat: ['$jobseeker.firstName', ' ', '$jobseeker.lastName'] },
                        jobTitle: '$job.title',
                        company: '$employer.companyName',
                        appliedDate: 1,
                        status: 1,
                        experience: '$jobseeker.experience'
                    }
                }
            ]).toArray();

        res.json(applications);
    } catch (error) {
        console.error('Error fetching applications report:', error);
        res.status(500).json({ message: 'Error fetching applications report' });
    }
});

// Filter routes for reports
app.get('/api/admin/reports/jobseekers/filter', async (req, res) => {
    try {
        const { location, status } = req.query;
        const query = {};
        
        if (location) query.location = location;
        if (status) query.status = status;

        const jobseekers = await db.collection('jobseekers')
            .find(query)
            .toArray();

        res.json(jobseekers);
    } catch (error) {
        console.error('Error filtering jobseekers:', error);
        res.status(500).json({ message: 'Error filtering jobseekers' });
    }
});

app.get('/api/admin/reports/employers/filter', async (req, res) => {
    try {
        const { status } = req.query;
        const query = {};
        
        if (status) query.status = status;

        const employers = await db.collection('employers')
            .find(query)
            .toArray();

        res.json(employers);
    } catch (error) {
        console.error('Error filtering employers:', error);
        res.status(500).json({ message: 'Error filtering employers' });
    }
});

app.get('/api/admin/reports/jobs/filter', async (req, res) => {
    try {
        const { industry, location, type, status } = req.query;
        const query = {};
        
        if (industry) query.industry = industry;
        if (location) query.location = location;
        if (type) query.type = type;
        if (status) query.status = status;

        const jobs = await db.collection('jobs')
            .find(query)
            .toArray();

        res.json(jobs);
    } catch (error) {
        console.error('Error filtering jobs:', error);
        res.status(500).json({ message: 'Error filtering jobs' });
    }
});

app.get('/api/admin/reports/applications/filter', async (req, res) => {
    try {
        const { status, startDate, endDate } = req.query;
        const query = {};
        
        if (status) query.status = status;
        if (startDate || endDate) {
            query.appliedDate = {};
            if (startDate) query.appliedDate.$gte = new Date(startDate);
            if (endDate) query.appliedDate.$lte = new Date(endDate);
        }

        const applications = await db.collection('applications')
            .find(query)
            .toArray();

        res.json(applications);
    } catch (error) {
        console.error('Error filtering applications:', error);
        res.status(500).json({ message: 'Error filtering applications' });
    }
});

// Admin Applications Endpoint
app.get('/api/admin/applications', authenticateAdmin, async (req, res) => {
    try {
        const { status, date, search, job } = req.query;
        let query = {};

        if (status) query.status = status;
        if (date) {
            const startDate = new Date(date);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1);
            query.appliedAt = { $gte: startDate, $lt: endDate };
        }
        if (job) query.jobId = new ObjectId(job);

        const applications = await db.collection('applications')
            .aggregate([
                { $match: query },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                {
                    $lookup: {
                        from: 'jobs',
                        localField: 'jobId',
                        foreignField: '_id',
                        as: 'job'
                    }
                },
                { $unwind: '$user' },
                { $unwind: '$job' },
                {
                    $project: {
                        _id: 1,
                        applicantName: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
                        email: '$user.email',
                        jobTitle: '$job.title',
                        company: '$job.company',
                        status: 1,
                        appliedAt: 1
                    }
                }
            ])
            .toArray();

        res.json(applications);
    } catch (error) {
        console.error('Error fetching admin applications:', error);
        res.status(500).json({ message: 'Error fetching applications' });
    }
});

// Connect to MongoDB
let db;
async function initializeDB() {
    try {
        console.log('Attempting to connect to MongoDB...');
        db = await connectDB();
        console.log('Database initialized successfully');
        
        // Test database connection
        const collections = await db.listCollections().toArray();
        console.log('Available collections:', collections.map(c => c.name));
    } catch (error) {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    }
}

// Initialize database before starting server
initializeDB().then(() => {
    // Create collections if they don't exist
    db.createCollection('users').catch(() => {});
    db.createCollection('jobseekers').catch(() => {});
    db.createCollection('employers').catch(() => {});
    db.createCollection('jobs').catch(() => {});
    db.createCollection('applications').catch(() => {});
    db.createCollection('resumes').catch(() => {});

    // User Registration
    app.post('/api/register', async (req, res) => {
        try {
            console.log('Received registration request:', req.body);
            const { firstName, lastName, email, phone, password } = req.body;
            
            // Validate required fields
            if (!firstName || !lastName || !email || !phone || !password) {
                return res.status(400).json({ message: 'All fields are required' });
            }

            // Check if user already exists
            const existingUser = await db.collection('users').findOne({ email });
            if (existingUser) {
                console.log('Email already registered:', email);
                return res.status(400).json({ message: 'Email already registered' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert new user
            const result = await db.collection('users').insertOne({
                firstName,
                lastName,
                email,
                phone,
                password: hashedPassword,
                createdAt: new Date()
            });

            console.log('User registered successfully:', result.insertedId);
            res.status(201).json({ message: 'Registration successful' });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ message: 'Error during registration', error: error.message });
        }
    });

    // User Login
    app.post('/api/login', async (req, res) => {
        try {
            console.log('Received login request:', req.body);
            const { email, password } = req.body;

            // Validate required fields
            if (!email || !password) {
                return res.status(400).json({ message: 'Email and password are required' });
            }

            // Find user
            const user = await db.collection('users').findOne({ email });
            if (!user) {
                console.log('User not found:', email);
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            // Check password
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                console.log('Invalid password for user:', email);
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            // Check if user has completed profile
            const jobseeker = await db.collection('jobseekers').findOne({ userId: user._id });
            const hasCompletedProfile = !!jobseeker;

            console.log('User logged in successfully:', email);
            res.json({ 
                message: 'Login successful',
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    hasCompletedProfile
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ message: 'Error during login', error: error.message });
        }
    });

    // Get User Profile
    app.get('/api/user/profile/:userId', async (req, res) => {
        try {
            // Get basic user info
            const user = await db.collection('users').findOne(
                { _id: new ObjectId(req.params.userId) },
                { projection: { password: 0 } }
            );

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Get jobseeker profile if exists
            const jobseeker = await db.collection('jobseekers').findOne(
                { userId: new ObjectId(req.params.userId) }
            );

            // Combine user and jobseeker data
            const profile = {
                ...user,
                ...jobseeker
            };

            res.json(profile);
        } catch (error) {
            console.error('Error fetching user profile:', error);
            res.status(500).json({ message: 'Error fetching profile' });
        }
    });

    // Update User Profile
    app.put('/api/user/profile/:userId', upload.fields([
        { name: 'profilePhoto', maxCount: 1 },
        { name: 'resume', maxCount: 1 }
    ]), async (req, res) => {
        try {
            const {
                firstName,
                lastName,
                phone,
                location
            } = req.body;

            // Update user basic info
            await db.collection('users').updateOne(
                { _id: new ObjectId(req.params.userId) },
                {
                    $set: {
                        firstName,
                        lastName,
                        phone,
                        updatedAt: new Date()
                    }
                }
            );

            // Handle file uploads
            const profilePhotoUrl = req.files['profilePhoto'] ? 
                `/uploads/${req.files['profilePhoto'][0].filename}` : null;
            const resumeUrl = req.files['resume'] ? 
                `/uploads/${req.files['resume'][0].filename}` : null;

            // Update or create jobseeker profile
            const jobseekerData = {
                userId: new ObjectId(req.params.userId),
                location,
                resumeUrl,
                profilePhotoUrl,
                profileCompleted: true,
                updatedAt: new Date()
            };

            await db.collection('jobseekers').updateOne(
                { userId: new ObjectId(req.params.userId) },
                { $set: jobseekerData },
                { upsert: true }
            );

            res.json({ 
                message: 'Profile updated successfully',
                profilePhotoUrl,
                resumeUrl
            });
        } catch (error) {
            console.error('Error updating profile:', error);
            res.status(500).json({ message: 'Error updating profile', error: error.message });
        }
    });

    // Get User's Job Applications
    app.get('/api/user/applications/:userId', async (req, res) => {
        try {
            const applications = await db.collection('applications')
                .find({ userId: new ObjectId(req.params.userId) })
                .toArray();

            // Get job details for each application
            const applicationsWithDetails = await Promise.all(
                applications.map(async (app) => {
                    const job = await db.collection('jobs').findOne(
                        { _id: app.jobId },
                        { projection: { title: 1, company: 1 } }
                    );
                    return {
                        ...app,
                        jobTitle: job?.title || 'Unknown Job',
                        companyName: job?.company || 'Unknown Company'
                    };
                })
            );

            res.json(applicationsWithDetails);
        } catch (error) {
            console.error('Error fetching applications:', error);
            res.status(500).json({ message: 'Error fetching applications' });
        }
    });

    // Employer Registration
    app.post('/api/employer/register', async (req, res) => {
        try {
            const {
                companyName,
                registrationNumber,
                companyEmail,
                companyPhone,
                companyWebsite,
                companyAddress,
                contactName,
                contactPosition,
                contactEmail,
                contactPhone,
                password
            } = req.body;

            // Check if employer already exists
            const existingEmployer = await db.collection('employers').findOne({ companyEmail });
            if (existingEmployer) {
                return res.status(400).json({ message: 'Email already registered' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert new employer
            await db.collection('employers').insertOne({
                companyName,
                registrationNumber,
                companyEmail,
                companyPhone,
                companyWebsite,
                companyAddress,
                contactName,
                contactPosition,
                contactEmail,
                contactPhone,
                password: hashedPassword,
                createdAt: new Date()
            });

            res.status(201).json({ message: 'Registration successful' });
        } catch (error) {
            console.error('Employer registration error:', error);
            res.status(500).json({ message: 'Error during registration' });
        }
    });

    // Employer Login
    app.post('/api/employer/login', async (req, res) => {
        try {
            const { email, password } = req.body;

            // Find employer
            const employer = await db.collection('employers').findOne({ companyEmail: email });
            if (!employer) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            // Check password
            const validPassword = await bcrypt.compare(password, employer.password);
            if (!validPassword) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            res.json({ 
                message: 'Login successful',
                employer: {
                    id: employer._id,
                    companyName: employer.companyName,
                    companyEmail: employer.companyEmail,
                    contactName: employer.contactName
                }
            });
        } catch (error) {
            console.error('Employer login error:', error);
            res.status(500).json({ message: 'Error during login' });
        }
    });

    // Post New Job
    app.post('/api/employer/jobs', async (req, res) => {
        try {
            const {
                title,
                company,
                location,
                type,
                experienceLevel,
                status,
                salaryMin,
                salaryMax,
                description,
                responsibilities,
                requirements,
                benefits,
                employerId
            } = req.body;

            const result = await db.collection('jobs').insertOne({
                title,
                company,
                location,
                type,
                experienceLevel,
                status,
                salaryMin,
                salaryMax,
                description,
                responsibilities,
                requirements,
                benefits,
                employerId,
                createdAt: new Date(),
                applications: []
            });

            res.status(201).json({ 
                message: 'Job posted successfully',
                jobId: result.insertedId
            });
        } catch (error) {
            console.error('Job posting error:', error);
            res.status(500).json({ message: 'Error posting job' });
        }
    });

    // Get Employer's Jobs
    app.get('/api/employer/jobs/:employerId', async (req, res) => {
        try {
            const jobs = await db.collection('jobs')
                .find({ employerId: req.params.employerId })
                .toArray();

            res.json(jobs);
        } catch (error) {
            console.error('Error fetching jobs:', error);
            res.status(500).json({ message: 'Error fetching jobs' });
        }
    });

    // Update Job
    app.put('/api/employer/jobs/:jobId', async (req, res) => {
        try {
            console.log('Updating job:', req.params.jobId);
            console.log('Update data:', req.body);

            // Validate ObjectId
            if (!ObjectId.isValid(req.params.jobId)) {
                console.log('Invalid job ID format:', req.params.jobId);
                return res.status(400).json({ message: 'Invalid job ID format' });
            }

            const result = await db.collection('jobs').updateOne(
                { _id: new ObjectId(req.params.jobId) },
                { 
                    $set: {
                        ...req.body,
                        updatedAt: new Date()
                    }
                }
            );

            if (result.matchedCount === 0) {
                console.log('Job not found:', req.params.jobId);
                return res.status(404).json({ message: 'Job not found' });
            }

            console.log('Job updated successfully:', result.modifiedCount);
            res.json({ 
                message: 'Job updated successfully',
                modifiedCount: result.modifiedCount
            });
        } catch (error) {
            console.error('Error updating job:', error);
            res.status(500).json({ 
                message: 'Error updating job',
                error: error.message 
            });
        }
    });

    // Delete Job
    app.delete('/api/employer/jobs/:jobId', async (req, res) => {
        try {
            const result = await db.collection('jobs').deleteOne({
                _id: req.params.jobId
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({ message: 'Job not found' });
            }

            res.json({ message: 'Job deleted successfully' });
        } catch (error) {
            console.error('Error deleting job:', error);
            res.status(500).json({ message: 'Error deleting job' });
        }
    });

    // Get Job Applicants
    app.get('/api/employer/jobs/:jobId/applicants', async (req, res) => {
        try {
            const job = await db.collection('jobs').findOne({
                _id: req.params.jobId
            });

            if (!job) {
                return res.status(404).json({ message: 'Job not found' });
            }

            const applicants = await db.collection('jobseekers')
                .find({ _id: { $in: job.applications } })
                .toArray();

            res.json(applicants);
        } catch (error) {
            console.error('Error fetching applicants:', error);
            res.status(500).json({ message: 'Error fetching applicants' });
        }
    });

    // Update Applicant Status
    app.put('/api/employer/jobs/:jobId/applicants/:applicantId', async (req, res) => {
        try {
            const { status } = req.body;
            const result = await db.collection('jobs').updateOne(
                { 
                    _id: req.params.jobId,
                    'applications.applicantId': req.params.applicantId
                },
                { $set: { 'applications.$.status': status } }
            );

            if (result.modifiedCount === 0) {
                return res.status(404).json({ message: 'Application not found' });
            }

            res.json({ message: 'Application status updated successfully' });
        } catch (error) {
            console.error('Error updating application status:', error);
            res.status(500).json({ message: 'Error updating application status' });
        }
    });

    // Get All Jobs (Updated endpoint)
    app.get('/api/jobs', async (req, res) => {
        try {
            console.log('Fetching jobs...');
            const { type, limit = 10, exclude } = req.query;
            const query = { status: 'open' };

            if (type) {
                query.type = type;
            }

            if (exclude) {
                query._id = { $ne: new ObjectId(exclude) };
            }

            const jobs = await db.collection('jobs')
                .find(query)
                .sort({ createdAt: -1 })
                .limit(parseInt(limit))
                .toArray();

            console.log(`Found ${jobs.length} jobs`);
            res.json(jobs);
        } catch (error) {
            console.error('Error fetching jobs:', error);
            res.status(500).json({ message: 'Error fetching jobs', error: error.message });
        }
    });

    // Get Single Job
    app.get('/api/jobs/:jobId', async (req, res) => {
        try {
            console.log('Fetching job with ID:', req.params.jobId);
            
            // Validate jobId format
            if (!ObjectId.isValid(req.params.jobId)) {
                console.log('Invalid job ID format:', req.params.jobId);
                return res.status(400).json({ message: 'Invalid job ID format' });
            }

            const job = await db.collection('jobs').findOne({
                _id: new ObjectId(req.params.jobId)
            });

            if (!job) {
                console.log('Job not found with ID:', req.params.jobId);
                return res.status(404).json({ message: 'Job not found' });
            }

            console.log('Job found successfully:', job);
            res.json(job);
        } catch (error) {
            console.error('Error fetching job:', error);
            res.status(500).json({ 
                message: 'Error fetching job details', 
                error: error.message 
            });
        }
    });

    // Apply for a Job
    app.post('/api/jobs/:jobId/apply', async (req, res) => {
        try {
            const { userId } = req.body;
            const jobId = req.params.jobId;

            // Check if job exists
            const job = await db.collection('jobs').findOne({ _id: new ObjectId(jobId) });
            if (!job) {
                return res.status(404).json({ message: 'Job not found' });
            }

            // Check if user has already applied
            const existingApplication = await db.collection('applications').findOne({
                jobId: new ObjectId(jobId),
                userId: new ObjectId(userId)
            });

            if (existingApplication) {
                return res.status(400).json({ message: 'You have already applied for this job' });
            }

            // Create application
            await db.collection('applications').insertOne({
                jobId: new ObjectId(jobId),
                userId: new ObjectId(userId),
                status: 'pending',
                appliedAt: new Date()
            });

            // Add application to job's applications array
            await db.collection('jobs').updateOne(
                { _id: new ObjectId(jobId) },
                { $push: { applications: new ObjectId(userId) } }
            );

            res.status(201).json({ message: 'Application submitted successfully' });
        } catch (error) {
            console.error('Error applying for job:', error);
            res.status(500).json({ message: 'Error applying for job', error: error.message });
        }
    });

    // Get jobseeker profile
    app.get("/api/jobseeker/:userId", async (req, res) => {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        const jobSeeker = await db.collection("JobSeekers").findOne({ userId });

        if (!jobSeeker) {
            return res.status(404).json({ message: "Profile not found" });
        }

        res.json(jobSeeker);
    });

    // Create/Update jobseeker profile
    app.post("/api/jobseeker", async (req, res) => {
        const { userId, firstName, lastName, email, phone, location, profilePhotoUrl, resumeUrl } = req.body;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        // Get user data first
        const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        await db.collection("jobseekers").updateOne(
            { userId: new ObjectId(userId) },
            { 
                $set: { 
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    phone: user.phone,
                    location, 
                    profilePhotoUrl, 
                    resumeUrl,
                    profileCompleted: true 
                }
            },
            { upsert: true }
        );

        res.json({ message: "Profile updated successfully!" });
    });

    // Store resume
    app.post("/api/resume", upload.single('resume'), async (req, res) => {
        try {
            const userId = req.body.userId;

            if (!userId || !req.file) {
                return res.status(400).json({ message: "User ID and resume file are required" });
            }

            const resumeUrl = `/uploads/${req.file.filename}`;

            await db.collection("resumes").updateOne(
                { userId: new ObjectId(userId) },
                { 
                    $set: { 
                        resumeUrl, 
                        updatedAt: new Date(),
                        fileName: req.file.originalname,
                        fileSize: req.file.size
                    } 
                },
                { upsert: true }
            );

            res.json({ 
                message: "Resume stored successfully!",
                resumeUrl
            });
        } catch (error) {
            console.error('Error storing resume:', error);
            res.status(500).json({ message: "Error storing resume", error: error.message });
        }
    });

    // Get resume
    app.get("/api/resume/:userId", async (req, res) => {
        try {
            const { userId } = req.params;

            if (!userId) {
                return res.status(400).json({ message: "User ID is required" });
            }

            const resume = await db.collection("resumes").findOne({ 
                userId: new ObjectId(userId) 
            });

            if (!resume) {
                return res.status(404).json({ message: "Resume not found" });
            }

            res.json(resume);
        } catch (error) {
            console.error('Error fetching resume:', error);
            res.status(500).json({ message: "Error fetching resume", error: error.message });
        }
    });

    // Delete resume
    app.delete("/api/resume/:userId", async (req, res) => {
        try {
            const { userId } = req.params;

            if (!userId) {
                return res.status(400).json({ message: "User ID is required" });
            }

            const result = await db.collection("resumes").deleteOne({ 
                userId: new ObjectId(userId) 
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({ message: "Resume not found" });
            }

            res.json({ message: "Resume deleted successfully" });
        } catch (error) {
            console.error('Error deleting resume:', error);
            res.status(500).json({ message: "Error deleting resume", error: error.message });
        }
    });

    // Load resume
    async function loadResume() {
        const userId = localStorage.getItem('userId');
        if (!userId) return;

        try {
            const response = await fetch(`http://localhost:3000/api/resume/${userId}`);
            if (response.ok) {
                const resumeData = await response.json();
                if (resumeData.resumeUrl) {
                    const resumePreview = document.getElementById('resumePreview');
                    const profileResume = document.getElementById('profileResume');
                    if (resumePreview) {
                        resumePreview.innerHTML = `
                            <a href="${resumeData.resumeUrl}" target="_blank" class="btn btn-outline-primary">
                                <i class="fas fa-file-alt me-2"></i>View Resume
                            </a>
                        `;
                    }
                    if (profileResume) {
                        profileResume.innerHTML = `
                            <a href="${resumeData.resumeUrl}" target="_blank" class="btn btn-outline-primary">
                                <i class="fas fa-file-alt me-2"></i>View Resume
                            </a>
                        `;
                    }
                }
            }
        } catch (error) {
            console.error('Error loading resume:', error);
        }
    }

    // Submit Job Application
    app.post('/api/applications', upload.single('resume'), async (req, res) => {
        try {
            const { jobId, userId, coverLetter } = req.body;

            // Validate required fields
            if (!jobId || !userId) {
                return res.status(400).json({ message: 'Job ID and User ID are required' });
            }

            // Check if user has already applied
            const existingApplication = await db.collection('applications').findOne({
                jobId: new ObjectId(jobId),
                userId: new ObjectId(userId)
            });

            if (existingApplication) {
                return res.status(400).json({ message: 'You have already applied for this job' });
            }

            // Handle resume upload
            let resumeUrl = null;
            if (req.file) {
                resumeUrl = `/uploads/${req.file.filename}`;
            }

            // Create application
            const application = {
                jobId: new ObjectId(jobId),
                userId: new ObjectId(userId),
                coverLetter,
                resumeUrl,
                status: 'Pending',
                appliedAt: new Date()
            };

            const result = await db.collection('applications').insertOne(application);

            // Update job's applications array
            await db.collection('jobs').updateOne(
                { _id: new ObjectId(jobId) },
                { $push: { applications: result.insertedId } }
            );

            res.status(201).json({
                message: 'Application submitted successfully',
                applicationId: result.insertedId
            });
        } catch (error) {
            console.error('Error submitting application:', error);
            res.status(500).json({ message: 'Error submitting application' });
        }
    });

    // Get User's Applications
    app.get('/api/applications/user/:userId', async (req, res) => {
        try {
            const applications = await db.collection('applications')
                .aggregate([
                    { $match: { userId: new ObjectId(req.params.userId) } },
                    {
                        $lookup: {
                            from: 'jobs',
                            localField: 'jobId',
                            foreignField: '_id',
                            as: 'job'
                        }
                    },
                    { $unwind: '$job' },
                    {
                        $project: {
                            _id: 1,
                            jobTitle: '$job.title',
                            companyName: '$job.company',
                            status: 1,
                            appliedAt: 1,
                            coverLetter: 1,
                            resumeUrl: 1
                        }
                    }
                ])
                .toArray();

            res.json(applications);
        } catch (error) {
            console.error('Error fetching applications:', error);
            res.status(500).json({ message: 'Error fetching applications' });
        }
    });

    // Get Job Applications (for employers)
    app.get('/api/applications/job/:jobId', async (req, res) => {
        try {
            const applications = await db.collection('applications')
                .aggregate([
                    { $match: { jobId: new ObjectId(req.params.jobId) } },
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'userId',
                            foreignField: '_id',
                            as: 'user'
                        }
                    },
                    { $unwind: '$user' },
                    {
                        $project: {
                            _id: 1,
                            applicantName: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
                            email: '$user.email',
                            status: 1,
                            appliedAt: 1,
                            coverLetter: 1,
                            resumeUrl: 1
                        }
                    }
                ])
                .toArray();

            res.json(applications);
        } catch (error) {
            console.error('Error fetching job applications:', error);
            res.status(500).json({ message: 'Error fetching applications' });
        }
    });

    // Update Application Status
    app.put('/api/applications/:applicationId/status', async (req, res) => {
        try {
            const { status } = req.body;
            const result = await db.collection('applications').updateOne(
                { _id: new ObjectId(req.params.applicationId) },
                { $set: { status } }
            );

            if (result.modifiedCount === 0) {
                return res.status(404).json({ message: 'Application not found' });
            }

            res.json({ message: 'Application status updated successfully' });
        } catch (error) {
            console.error('Error updating application status:', error);
            res.status(500).json({ message: 'Error updating application status' });
        }
    });

    // Start server
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}); 