// Function to update navbar based on login status and user role
function updateNavbar() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userRole = localStorage.getItem('userRole'); // 'user' or 'employer'
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    // Get navbar container
    const navbarNav = document.querySelector('#navbarNav ul');
    if (!navbarNav) return;

    // Clear existing navbar items
    navbarNav.innerHTML = '';

    if (isLoggedIn) {
        // Common items for both users and employers
        navbarNav.innerHTML += `
            <li class="nav-item"><a class="nav-link ${window.location.pathname.includes('index.html') ? 'active' : ''}" href="index.html">Home</a></li>
            <li class="nav-item"><a class="nav-link ${window.location.pathname.includes('jobs.html') ? 'active' : ''}" href="jobs.html">Jobs</a></li>
        `;

        if (userRole === 'user') {
            // User (before completing profile) or Jobseeker (after completing profile)
            navbarNav.innerHTML += `
                <li class="nav-item"><a class="nav-link ${window.location.pathname.includes('resume-builder.html') ? 'active' : ''}" href="resume-builder.html">Resume Builder</a></li>
                <li class="nav-item"><a class="nav-link ${window.location.pathname.includes('myprofile.html') ? 'active' : ''}" href="myprofile.html">My Profile</a></li>
            `;
        } else if (userRole === 'employer') {
            // Employer-specific items
            navbarNav.innerHTML += `
                <li class="nav-item"><a class="nav-link ${window.location.pathname.includes('employer-dashboard.html') ? 'active' : ''}" href="employer-dashboard.html">Dashboard</a></li>
            `;
        }

        // Logout button
        navbarNav.innerHTML += `<li class="nav-item"><a class="nav-link" href="#" onclick="logout()">Logout</a></li>`;
    } else {
        // Guest (not logged in)
        navbarNav.innerHTML += `
            <li class="nav-item"><a class="nav-link ${window.location.pathname.includes('index.html') ? 'active' : ''}" href="index.html">Home</a></li>
            <li class="nav-item"><a class="nav-link ${window.location.pathname.includes('jobs.html') ? 'active' : ''}" href="jobs.html">Jobs</a></li>
            <li class="nav-item"><a class="nav-link ${window.location.pathname.includes('login.html') ? 'active' : ''}" href="login.html">Login</a></li>
            <li class="nav-item"><a class="nav-link ${window.location.pathname.includes('employer-login.html') ? 'active' : ''}" href="employer-login.html">Employer</a></li>
        `;
    }
}

// Function to restrict job applications to users who completed their profile
async function applyForJob(jobId) {
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');

    if (!userId) {
        window.location.href = 'login.html';
        return;
    }

    if (userRole === 'user') {
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
    localStorage.removeItem('userId');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');

    window.location.href = 'index.html';
}

// Show toast notifications
function showToast(message) {
    const toast = document.getElementById('successToast');
    if (toast) {
        document.getElementById('toastMessage').textContent = message;
        new bootstrap.Toast(toast).show();
    } else {
        alert(message);
    }
}

// Update navbar on page load
document.addEventListener('DOMContentLoaded', updateNavbar);
window.addEventListener('pageshow', updateNavbar);
window.addEventListener('load', updateNavbar);
