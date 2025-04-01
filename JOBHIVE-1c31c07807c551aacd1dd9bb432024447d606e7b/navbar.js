// Function to update navbar based on login status and user role
function updateNavbar() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userRole = localStorage.getItem('userRole');
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    // Get navbar container
    const navbarNav = document.querySelector('#navbarNav ul');
    if (!navbarNav) return;

    // Clear existing navbar items
    navbarNav.innerHTML = '';

    if (isLoggedIn) {
        // Common items for both users and employers
        navbarNav.innerHTML += `
            <li class="nav-item">
                <a class="nav-link ${window.location.pathname.includes('index.html') ? 'active' : ''}" href="index.html">Home</a>
            </li>
            <li class="nav-item">
                <a class="nav-link ${window.location.pathname.includes('jobs.html') ? 'active' : ''}" href="jobs.html">Jobs</a>
            </li>
        `;

        if (userRole === 'jobseeker') {
            // Jobseeker-specific items
            navbarNav.innerHTML += `
                <li class="nav-item">
                    <a class="nav-link ${window.location.pathname.includes('resume-builder.html') ? 'active' : ''}" href="resume-builder.html">Resume Builder</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link ${window.location.pathname.includes('myprofile.html') ? 'active' : ''}" href="myprofile.html">My Profile</a>
                </li>
            `;
        } else if (userRole === 'employer') {
            // Employer-specific items
            navbarNav.innerHTML += `
                <li class="nav-item">
                    <a class="nav-link ${window.location.pathname.includes('employer-dashboard.html') ? 'active' : ''}" href="employer-dashboard.html">Dashboard</a>
                </li>
            `;
        }

        // Logout button
        navbarNav.innerHTML += `
            <li class="nav-item">
                <a class="nav-link" href="#" onclick="logout()">Logout</a>
            </li>
        `;
    } else {
        // Guest (not logged in)
        navbarNav.innerHTML += `
            <li class="nav-item">
                <a class="nav-link ${window.location.pathname.includes('index.html') ? 'active' : ''}" href="index.html">Home</a>
            </li>
            <li class="nav-item">
                <a class="nav-link ${window.location.pathname.includes('jobs.html') ? 'active' : ''}" href="jobs.html">Jobs</a>
            </li>
            <li class="nav-item">
                <a class="nav-link ${window.location.pathname.includes('login.html') ? 'active' : ''}" href="login.html">Login</a>
            </li>
            <li class="nav-item">
                <a class="nav-link ${window.location.pathname.includes('employer-login.html') ? 'active' : ''}" href="employer-login.html">Employer</a>
            </li>
        `;
    }
}

// Function to check login status
function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userRole = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');

    if (!isLoggedIn || !userRole || !userId) {
        return false;
    }

    return true;
}

// Function to restrict job applications to users who completed their profile
async function applyForJob(jobId) {
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');

    if (!userId) {
        window.location.href = 'login.html';
        return;
    }

    if (userRole === 'jobseeker') {
        try {
            const response = await fetch(`http://localhost:3000/api/jobseeker/${userId}`);
            if (!response.ok) {
                showToast('Please complete your profile first');
                window.location.href = 'myprofile.html';
                return;
            }
            window.location.href = `apply-job.html?jobId=${jobId}`;
        } catch (error) {
            console.error('Error checking profile:', error);
            showToast('Error checking profile status');
        }
    } else {
        window.location.href = `apply-job.html?jobId=${jobId}`;
    }
}

// Logout function
function logout() {
    // Clear all authentication data
    localStorage.removeItem('userId');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
    localStorage.removeItem('jobseekerId');
    localStorage.removeItem('employerId');
    
    // Redirect to home page
    window.location.href = 'index.html';
}

// Show toast notifications
function showToast(message) {
    const toast = document.getElementById('successToast');
    if (toast) {
        const toastMessage = document.getElementById('toastMessage');
        toastMessage.textContent = message;
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    } else {
        alert(message);
    }
}

// Initialize navbar when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check login status and update navbar
    if (checkLoginStatus()) {
        updateNavbar();
    } else {
        // If not logged in, redirect to login page if trying to access protected pages
        const protectedPages = ['myprofile.html', 'resume-builder.html', 'employer-dashboard.html'];
        const currentPage = window.location.pathname.split('/').pop();
        if (protectedPages.includes(currentPage)) {
            window.location.href = 'login.html';
        } else {
            updateNavbar();
        }
    }
});

// Update navbar when the page is loaded from cache
window.addEventListener('pageshow', function() {
    if (checkLoginStatus()) {
        updateNavbar();
    }
});

// Update navbar when the page is loaded from server
window.addEventListener('load', function() {
    if (checkLoginStatus()) {
        updateNavbar();
    }
});
