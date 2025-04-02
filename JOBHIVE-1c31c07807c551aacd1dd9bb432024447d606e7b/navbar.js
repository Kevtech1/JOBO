// Function to update navbar based on login status and current page
function updateNavbar() {
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Update login/logout visibility
    const loginNav = document.getElementById('loginNav');
    const logoutNav = document.getElementById('logoutNav');
    const employerNavItem = document.getElementById('employerNavItem');
    const profileNav = document.querySelector('a[href="profile.html"]').parentElement;

    if (userId) {
        loginNav.style.display = 'none';
        logoutNav.style.display = 'block';
        if (userRole === 'jobseeker') {
            profileNav.style.display = 'block';
            employerNavItem.style.display = 'none';
        } else if (userRole === 'employer') {
            profileNav.style.display = 'none';
            employerNavItem.style.display = 'block';
        }
    } else {
        loginNav.style.display = 'block';
        logoutNav.style.display = 'none';
        profileNav.style.display = 'none';
        employerNavItem.style.display = 'block';
    }

    // Update active state for navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
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
                window.location.href = 'resume-builder.html';
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
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
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
        const protectedPages = ['resume-builder.html', 'employer-dashboard.html'];
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

// Update navbar when navigating between pages
window.addEventListener('popstate', updateNavbar);
