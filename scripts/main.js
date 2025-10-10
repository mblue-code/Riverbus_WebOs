/**
 * webOS TV App - Main JavaScript
 * Compatible with webOS 4.0 (2018) and webOS 24 (2024)
 */

(function() {
    'use strict';

    // State management
    let currentIndex = 0;
    let menuItems = [];

    /**
     * Initialize the app
     */
    function init() {
        console.log('App initializing...');

        // Get menu items
        menuItems = Array.from(document.querySelectorAll('.menu-item'));

        // Set up keyboard event listeners
        // IMPORTANT: Use addEventListener() for cross-version compatibility
        document.addEventListener('keydown', handleKeyDown);

        // Set initial selection
        updateSelection();

        console.log('App initialized successfully');
    }

    /**
     * Handle keyboard/remote control input
     * @param {KeyboardEvent} event
     */
    function handleKeyDown(event) {
        event.preventDefault();

        const keyCode = event.keyCode;

        switch(keyCode) {
            case 38: // UP arrow
                navigateUp();
                break;
            case 40: // DOWN arrow
                navigateDown();
                break;
            case 13: // OK/Enter button
                selectCurrentItem();
                break;
            case 461: // BACK button
            case 27: // ESC (also BACK on some TVs)
                handleBack();
                break;
            default:
                console.log('Key pressed:', keyCode);
        }
    }

    /**
     * Navigate up in the menu
     */
    function navigateUp() {
        if (currentIndex > 0) {
            currentIndex--;
            updateSelection();
        }
    }

    /**
     * Navigate down in the menu
     */
    function navigateDown() {
        if (currentIndex < menuItems.length - 1) {
            currentIndex++;
            updateSelection();
        }
    }

    /**
     * Update visual selection state
     * REQUIRED: Selection effects for LG certification
     */
    function updateSelection() {
        // Remove selection from all items
        menuItems.forEach(function(item) {
            item.classList.remove('selected');
        });

        // Add selection to current item
        if (menuItems[currentIndex]) {
            menuItems[currentIndex].classList.add('selected');
        }
    }

    /**
     * Handle item selection (OK button pressed)
     */
    function selectCurrentItem() {
        const selectedItem = menuItems[currentIndex];
        const itemName = selectedItem.textContent;
        const contentDiv = document.getElementById('content');

        console.log('Selected:', itemName);

        // Update content based on selection
        switch(currentIndex) {
            case 0:
                contentDiv.innerHTML = '<h2>Home</h2><p>Welcome to the home screen.</p>';
                break;
            case 1:
                contentDiv.innerHTML = '<h2>Browse</h2><p>Browse available content here.</p>';
                break;
            case 2:
                contentDiv.innerHTML = '<h2>Settings</h2><p>Configure your app settings.</p>';
                break;
            case 3:
                contentDiv.innerHTML = '<h2>About</h2><p>App version 1.0.0<br>Compatible with webOS 4.0+ and webOS 24</p>';
                break;
        }
    }

    /**
     * Handle BACK button press
     * REQUIRED: BACK button on entry page must show TV Home screen
     */
    function handleBack() {
        console.log('BACK button pressed');

        // Check if webOS API is available
        if (window.webOS) {
            // Close the app and return to TV Home
            window.webOS.platformBack();
        } else {
            // Fallback for development/testing
            console.warn('webOS API not available - app would close here on actual TV');
            alert('BACK pressed - app would close on actual TV');
        }
    }

    /**
     * Feature detection helper
     * Use feature detection, not browser detection
     */
    function checkFeatureSupport() {
        const features = {
            flexbox: CSS.supports('display', 'flex'),
            animations: CSS.supports('animation', 'test'),
            transforms: CSS.supports('transform', 'scale(1)')
        };

        console.log('Feature support:', features);
        return features;
    }

    // Initialize when DOM is ready
    // Use addEventListener for cross-version compatibility
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Check feature support
    checkFeatureSupport();

})();
