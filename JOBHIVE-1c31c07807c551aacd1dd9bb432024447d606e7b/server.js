const express = require('express');
const bcrypt = require('bcrypt');
const connectDB = require('./config/db');
const cors = require('cors');
const { ObjectId } = require('mongodb');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

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
    // Job Seeker Registration
    app.post('/api/register', async (req, res) => {
        try {
            console.log('Received registration request:', req.body);
            const { firstName, lastName, email, phone, password } = req.body;
            
            // Validate required fields
            if (!firstName || !lastName || !email || !phone || !password) {
                return res.status(400).json({ message: 'All fields are required' });
            }

            // Check if user already exists
            const existingUser = await db.collection('jobseekers').findOne({ email });
            if (existingUser) {
                console.log('Email already registered:', email);
                return res.status(400).json({ message: 'Email already registered' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert new user
            const result = await db.collection('jobseekers').insertOne({
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

    // Job Seeker Login
    app.post('/api/login', async (req, res) => {
        try {
            console.log('Received login request:', req.body);
            const { email, password } = req.body;

            // Validate required fields
            if (!email || !password) {
                return res.status(400).json({ message: 'Email and password are required' });
            }

            // Find user
            const user = await db.collection('jobseekers').findOne({ email });
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

            console.log('User logged in successfully:', email);
            res.json({ 
                message: 'Login successful',
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ message: 'Error during login', error: error.message });
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
                salaryMin,
                salaryMax,
                description,
                requirements,
                employerId
            } = req.body;

            const result = await db.collection('jobs').insertOne({
                title,
                company,
                location,
                type,
                salaryMin,
                salaryMax,
                description,
                requirements,
                employerId,
                createdAt: new Date(),
                status: 'active',
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
            const query = { status: 'active' };

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

    // Start server
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}); 