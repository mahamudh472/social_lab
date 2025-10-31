import { apiGet, apiPut, apiPostFormData, showToast, showLoading, hideLoading, checkAuth } from './utils.js';

class EditProfileManager {
    constructor() {
        this.currentUser = null;
        this.cropper = null;
        this.croppedBlob = null;
        this.init();
    }

    async init() {
        checkAuth();
        await this.loadCurrentProfile();
        this.initEventListeners();
    }

    async loadCurrentProfile() {
        showLoading();
        try {
            const user = await apiGet('/users/me/');
            this.currentUser = user;
            this.populateForm(user);
        } catch (error) {
            console.error('Error loading profile:', error);
            showToast('Failed to load profile', 'error');
        } finally {
            hideLoading();
        }
    }

    populateForm(user) {
        // Set username (read-only)
        const usernameInput = document.getElementById('username');
        if (usernameInput) {
            usernameInput.value = user.username || '';
            usernameInput.disabled = true;
            usernameInput.classList.add('bg-gray-100', 'cursor-not-allowed');
        }

        // Set email (if available, though not in current serializer)
        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.value = user.email || '';
        }

        // Set bio
        const bioInput = document.getElementById('bio');
        if (bioInput) {
            bioInput.value = user.bio || '';
        }

        // Set website (if available)
        const websiteInput = document.getElementById('website');
        if (websiteInput) {
            websiteInput.value = user.website || '';
        }

        // Set profile image preview
        const profileImagePreview = document.getElementById('profileImagePreview');
        if (profileImagePreview) {
            if (user.profile_image) {
                // Handle both full URLs and relative paths; keep relative paths so nginx serves them from same origin
                const imageUrl = user.profile_image;
                profileImagePreview.src = imageUrl;
                profileImagePreview.onerror = function() {
                    this.src = '/images/placeholder-avatar.jpg';
                };
            } else {
                profileImagePreview.src = '/images/placeholder-avatar.jpg';
            }
        }
    }

    initEventListeners() {
        // Form submission
        const editProfileForm = document.getElementById('editProfileForm');
        if (editProfileForm) {
            editProfileForm.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Profile image selection - open crop modal
        const profileImageInput = document.getElementById('profile_picture');
        
        if (profileImageInput) {
            profileImageInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    // Validate file size (max 10MB for original)
                    if (file.size > 10 * 1024 * 1024) {
                        showToast('Image size should be less than 10MB', 'error');
                        profileImageInput.value = '';
                        return;
                    }

                    // Validate file type
                    if (!file.type.startsWith('image/')) {
                        showToast('Please select an image file', 'error');
                        profileImageInput.value = '';
                        return;
                    }

                    // Open crop modal
                    this.openCropModal(file);
                }
            });
        }

        // Crop modal buttons
        const cancelCropBtn = document.getElementById('cancelCrop');
        const applyCropBtn = document.getElementById('applyCrop');

        if (cancelCropBtn) {
            cancelCropBtn.addEventListener('click', () => this.closeCropModal());
        }

        if (applyCropBtn) {
            applyCropBtn.addEventListener('click', () => this.applyCrop());
        }
    }

    openCropModal(file) {
        const modal = document.getElementById('cropModal');
        const cropImage = document.getElementById('cropImage');
        
        if (!modal || !cropImage) return;

        // Read the file and display in modal
        const reader = new FileReader();
        reader.onload = (e) => {
            cropImage.src = e.target.result;
            modal.classList.remove('hidden');

            // Initialize Cropper.js
            if (this.cropper) {
                this.cropper.destroy();
            }

            this.cropper = new Cropper(cropImage, {
                aspectRatio: 1, // Square crop for profile picture
                viewMode: 1,
                minCropBoxWidth: 200,
                minCropBoxHeight: 200,
                responsive: true,
                restore: false,
                guides: true,
                center: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
            });
        };
        reader.readAsDataURL(file);
    }

    closeCropModal(keepBlob = false) {
        const modal = document.getElementById('cropModal');
        
        if (modal) {
            modal.classList.add('hidden');
        }

        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }

        // Clear the file input and blob if user cancelled (keepBlob = false)
        if (!keepBlob) {
            const profileImageInput = document.getElementById('profile_picture');
            if (profileImageInput) {
                profileImageInput.value = '';
            }
            this.croppedBlob = null;
        }
    }

    applyCrop() {
        if (!this.cropper) return;

        console.log('Applying crop...');

        // Get cropped canvas
        const canvas = this.cropper.getCroppedCanvas({
            width: 400,
            height: 400,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
        });

        console.log('Canvas created:', canvas.width, 'x', canvas.height);

        // Convert canvas to blob
        canvas.toBlob((blob) => {
            console.log('Blob created, size:', blob.size, 'bytes');
            this.croppedBlob = blob;

            // Update preview
            const profileImagePreview = document.getElementById('profileImagePreview');
            if (profileImagePreview) {
                profileImagePreview.src = canvas.toDataURL();
            }

            // Close modal but keep the blob
            this.closeCropModal(true);
            
            showToast('Image cropped successfully', 'success');
        }, 'image/jpeg', 0.95);
    }

    async handleSubmit(e) {
        e.preventDefault();
        showLoading();

        try {
            const formData = new FormData();
            
            // Get bio
            const bioInput = document.getElementById('bio');
            if (bioInput) {
                formData.append('bio', bioInput.value.trim());
            }

            // Use cropped image if available
            if (this.croppedBlob) {
                console.log('Using cropped image, size:', this.croppedBlob.size, 'bytes');
                formData.append('profile_image', this.croppedBlob, 'profile.jpg');
            } else {
                console.log('No cropped image available');
            }

            // Debug: Log FormData contents
            console.log('FormData contents:');
            for (let pair of formData.entries()) {
                console.log(pair[0], pair[1]);
            }

            // Note: Username is read-only and email/website are not in the current serializer
            // If you want to update these, you'll need to modify the backend serializer

            // Send update request using PATCH
            const response = await fetch('/api/users/update/', {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: formData,
            });

            if (response.status === 401) {
                // Token expired, try to refresh
                const { refreshAccessToken } = await import('./utils.js');
                const refreshed = await refreshAccessToken();
                
                if (refreshed) {
                    // Retry with new token
                    const retryResponse = await fetch('/api/users/update/', {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                        },
                        body: formData,
                    });

                    if (!retryResponse.ok) {
                        throw new Error('Failed to update profile');
                    }

                    const data = await retryResponse.json();
                    showToast('Profile updated successfully!', 'success');
                    
                    // Reload user profile in navbar
                    try {
                        const { reloadUserProfile } = await import('./app.js');
                        await reloadUserProfile();
                    } catch (error) {
                        console.error('Failed to reload user profile in navbar:', error);
                    }
                    
                    // Redirect to profile page after short delay
                    setTimeout(() => {
                        window.location.href = '/profile';
                    }, 1500);
                } else {
                    window.location.href = '/login.html';
                }
            } else if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to update profile');
            } else {
                const data = await response.json();
                showToast('Profile updated successfully!', 'success');
                
                // Reload user profile in navbar
                try {
                    const { reloadUserProfile } = await import('./app.js');
                    await reloadUserProfile();
                } catch (error) {
                    console.error('Failed to reload user profile in navbar:', error);
                }
                
                // Redirect to profile page after short delay
                setTimeout(() => {
                    window.location.href = '/profile';
                }, 1500);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            showToast(error.message || 'Failed to update profile', 'error');
        } finally {
            hideLoading();
        }
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    new EditProfileManager();
});

export default EditProfileManager;
