// Common API functions for JobHive

// Function to fetch all jobs
async function fetchAllJobs() {
    try {
        console.log('Fetching all jobs from API...');
        const response = await fetch('http://localhost:3000/api/jobs');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const jobs = await response.json();
        console.log('Jobs fetched successfully:', jobs);
        return jobs;
    } catch (error) {
        console.error('Error fetching jobs:', error);
        throw error;
    }
}

// Function to fetch a single job by ID
async function fetchJobById(jobId) {
    try {
        const response = await fetch(`http://localhost:3000/api/jobs/${jobId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const job = await response.json();
        return job;
    } catch (error) {
        console.error(`Error fetching job with ID ${jobId}:`, error);
        throw error;
    }
}

// Function to fetch jobs by employer ID
async function fetchJobsByEmployerId(employerId) {
    try {
        const response = await fetch(`http://localhost:3000/api/employer/jobs/${employerId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const jobs = await response.json();
        return jobs;
    } catch (error) {
        console.error(`Error fetching jobs for employer ${employerId}:`, error);
        throw error;
    }
}

// Function to post a new job
async function postJob(jobData) {
    try {
        const response = await fetch('http://localhost:3000/api/employer/jobs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(jobData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to post job');
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error posting job:', error);
        throw error;
    }
}

// Function to update an existing job
async function updateJob(jobId, jobData) {
    try {
        const response = await fetch(`http://localhost:3000/api/employer/jobs/${jobId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(jobData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update job');
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error(`Error updating job ${jobId}:`, error);
        throw error;
    }
}

// Function to delete a job
async function deleteJob(jobId) {
    try {
        const response = await fetch(`http://localhost:3000/api/employer/jobs/${jobId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete job');
        }
        
        return true;
    } catch (error) {
        console.error(`Error deleting job ${jobId}:`, error);
        throw error;
    }
}

// Function to apply for a job
async function applyForJob(jobId, userId, applicationData) {
    try {
        const response = await fetch('http://localhost:3000/api/applications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jobId,
                userId,
                ...applicationData
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to submit application');
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error applying for job:', error);
        throw error;
    }
}

// Export functions for use in other files
window.JobHiveAPI = {
    fetchAllJobs,
    fetchJobById,
    fetchJobsByEmployerId,
    postJob,
    updateJob,
    deleteJob,
    applyForJob
}; 