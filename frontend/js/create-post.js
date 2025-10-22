import { apiPostFormData, showToast, showLoading, hideLoading, checkAuth } from './utils.js';

class PostCreator {
    constructor() {
        this.form = document.getElementById('createPostForm');
        this.imageInput = document.getElementById('image');
        this.captionInput = document.getElementById('caption');
        this.imagePreview = document.getElementById('imagePreview');
        this.uploadArea = document.getElementById('uploadArea');
        this.previewImg = this.imagePreview.querySelector('img');
        this.submitBtn = document.getElementById('submitBtn');
        
        this.init();
    }

    init() {
        // Check authentication
        checkAuth();
        
        // Setup event listeners
        this.setupImagePreview();
        this.setupFormSubmit();
    }

    setupImagePreview() {
        // Click upload area to trigger file input
        this.uploadArea.addEventListener('click', () => this.imageInput.click());
        
        // Handle image selection and preview
        this.imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Validate file type
                if (!file.type.startsWith('image/')) {
                    showToast('Please select a valid image file', 'error');
                    return;
                }
                
                // Validate file size (10MB max)
                if (file.size > 10 * 1024 * 1024) {
                    showToast('Image size must be less than 10MB', 'error');
                    return;
                }
                
                // Show preview
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.previewImg.src = e.target.result;
                    this.imagePreview.classList.remove('hidden');
                    this.uploadArea.classList.add('hidden');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    setupFormSubmit() {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSubmit();
        });
    }

    async handleSubmit() {
        // Validate form
        if (!this.imageInput.files[0]) {
            showToast('Please select an image', 'error');
            return;
        }

        const caption = this.captionInput.value.trim();

        // Create FormData
        const formData = new FormData();
        formData.append('image', this.imageInput.files[0]);
        
        if (caption) {
            formData.append('caption', caption);
        }

        // Disable submit button and show loading
        this.submitBtn.disabled = true;
        this.submitBtn.textContent = 'Creating...';
        showLoading();

        try {
            // Submit post
            const response = await apiPostFormData('/posts/create/', formData);
            
            if (response) {
                showToast('Post created successfully!', 'success');
                
                // Redirect to home page after a short delay
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 1500);
            }
        } catch (error) {
            console.error('Error creating post:', error);
            showToast(error.message || 'Failed to create post', 'error');
            
            // Re-enable submit button
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = 'Create Post';
        } finally {
            hideLoading();
        }
    }

    resetForm() {
        this.form.reset();
        this.imagePreview.classList.add('hidden');
        this.uploadArea.classList.remove('hidden');
        this.previewImg.src = '';
    }
}

// Initialize post creator when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PostCreator();
});

export default PostCreator;
