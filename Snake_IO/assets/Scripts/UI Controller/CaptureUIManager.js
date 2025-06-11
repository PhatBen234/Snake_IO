// CaptureUIManager.js
cc.Class({
    extends: cc.Component,

    properties: {
        // UI References
        reviewCaptureBtn: cc.Button,    // Button để mở panel
        capturePanel: cc.Node,          // Panel chứa tất cả UI
        pageView: cc.PageView,          // PageView để hiển thị ảnh
        previousBtn: cc.Button,         // Button Previous
        nextBtn: cc.Button,             // Button Next
        pageLabel: cc.Label,            // Label hiển thị page info
        closeBtn: cc.Button,            // Button đóng panel
        loadingLabel: cc.Label,         // Label hiển thị trạng thái loading
        
        // Prefab và Settings
        captureItemPrefab: cc.Prefab,   // Prefab cho mỗi ảnh
        
        serverUrl: {
            default: "http://localhost:3000",
            displayName: "Server URL",
        },
    },

    onLoad() {
        // Setup button events
        this.reviewCaptureBtn.node.on("click", this.openCapturePanel, this);
        this.closeBtn.node.on("click", this.closeCapturePanel, this);
        this.previousBtn.node.on("click", this.previousPage, this);
        this.nextBtn.node.on("click", this.nextPage, this);
        
        // Setup PageView events
        this.pageView.node.on('page-turning', this.onPageChanged, this);
        
        // Initialize
        this.screenshots = [];
        this.currentPageIndex = 0;
        this.totalPages = 0;
        
        // Hide panel initially
        this.capturePanel.active = false;
        this.updateNavigationButtons();
        this.updatePageLabel();
    },

    async openCapturePanel() {
        this.capturePanel.active = true;
        this.loadingLabel.string = "Loading screenshots...";
        this.loadingLabel.node.active = true;
        
        // Clear existing content
        this.clearPageView();
        
        try {
            await this.loadScreenshots();
        } catch (error) {
            console.error("Error loading screenshots:", error);
            this.loadingLabel.string = "Error loading screenshots";
        }
    },

    closeCapturePanel() {
        this.capturePanel.active = false;
        this.clearPageView();
    },

    async loadScreenshots() {
        try {
            // Get screenshots list from server
            const response = await this.httpGet(`${this.serverUrl}/api/screenshot/list/recent`);
            const data = JSON.parse(response);

            console.log("API Response:", data);

            if (data.success && data.data.length > 0) {
                this.screenshots = data.data;
                this.totalPages = this.screenshots.length;
                
                await this.createCapturePages();
                
                this.loadingLabel.node.active = false;
                this.currentPageIndex = 0;
                this.pageView.setCurrentPageIndex(0);
                this.updateNavigationButtons();
                this.updatePageLabel();
                
            } else {
                this.loadingLabel.string = "No screenshots found";
                this.totalPages = 0;
                this.updateNavigationButtons();
                this.updatePageLabel();
            }
        } catch (error) {
            throw error;
        }
    },

    async createCapturePages() {
        // Clear existing pages
        this.clearPageView();
        
        // Create pages for each screenshot
        for (let i = 0; i < this.screenshots.length; i++) {
            const screenshot = this.screenshots[i];
            await this.createCapturePage(screenshot, i);
        }
    },

    async createCapturePage(screenshot, index) {
        // Create page node
        const pageNode = cc.instantiate(this.captureItemPrefab);
        
        // Add to PageView
        this.pageView.addPage(pageNode);
        
        // Get components from prefab
        const imageSprite = pageNode.getChildByName("ImageSprite").getComponent(cc.Sprite);
        const infoLabel = pageNode.getChildByName("InfoLabel").getComponent(cc.Label);
        const loadingSpinner = pageNode.getChildByName("LoadingSpinner"); // Optional loading indicator
        
        // Set info text
        const playerNames = screenshot.players.map(p => p.name).join(", ");
        const gameIdShort = screenshot.gameId.substring(0, 8);
        infoLabel.string = `Game: ${gameIdShort}...\nPlayers: ${playerNames}`;
        
        // Load image
        if (loadingSpinner) loadingSpinner.active = true;
        
        try {
            await this.loadImageForSprite(screenshot.gameId, imageSprite);
            if (loadingSpinner) loadingSpinner.active = false;
        } catch (error) {
            console.error(`Error loading image for ${screenshot.gameId}:`, error);
            infoLabel.string += "\n[Image load failed]";
            if (loadingSpinner) loadingSpinner.active = false;
        }
    },

    loadImageForSprite(gameId, sprite) {
        return new Promise((resolve, reject) => {
            const imageUrl = `${this.serverUrl}/api/screenshot/${gameId}`;
            
            console.log("Loading image from URL:", imageUrl);
            
            cc.loader.load({
                url: imageUrl,
                type: "png",
            }, (err, texture) => {
                if (err) {
                    console.error("Load image error:", err);
                    reject(err);
                    return;
                }
                
                // Create sprite frame and set to sprite
                const spriteFrame = new cc.SpriteFrame(texture);
                sprite.spriteFrame = spriteFrame;
                
                // Scale image to fit
                this.scaleImageToFit(sprite.node);
                
                console.log(`Image loaded successfully for ${gameId}`);
                resolve();
            });
        });
    },

    scaleImageToFit(imageNode) {
        const maxWidth = 400;  // Adjust based on your prefab size
        const maxHeight = 300;
        
        const imageSize = imageNode.getContentSize();
        
        if (imageSize.width > 0 && imageSize.height > 0) {
            const scaleX = maxWidth / imageSize.width;
            const scaleY = maxHeight / imageSize.height;
            const scale = Math.min(scaleX, scaleY, 1);
            
            imageNode.setScale(scale);
        }
    },

    clearPageView() {
        // Remove all pages
        this.pageView.removeAllPages();
        this.screenshots = [];
        this.currentPageIndex = 0;
        this.totalPages = 0;
    },

    // Navigation methods
    previousPage() {
        if (this.currentPageIndex > 0) {
            this.currentPageIndex--;
            this.pageView.setCurrentPageIndex(this.currentPageIndex);
            this.updateNavigationButtons();
            this.updatePageLabel();
        }
    },

    nextPage() {
        if (this.currentPageIndex < this.totalPages - 1) {
            this.currentPageIndex++;
            this.pageView.setCurrentPageIndex(this.currentPageIndex);
            this.updateNavigationButtons();
            this.updatePageLabel();
        }
    },

    onPageChanged(event) {
        this.currentPageIndex = event.getCurrentPageIndex();
        this.updateNavigationButtons();
        this.updatePageLabel();
    },

    updateNavigationButtons() {
        // Update button states
        if (this.previousBtn) {
            this.previousBtn.interactable = this.currentPageIndex > 0;
        }
        
        if (this.nextBtn) {
            this.nextBtn.interactable = this.currentPageIndex < this.totalPages - 1;
        }
    },

    updatePageLabel() {
        if (this.pageLabel) {
            if (this.totalPages > 0) {
                this.pageLabel.string = `${this.currentPageIndex + 1} / ${this.totalPages}`;
            } else {
                this.pageLabel.string = "0 / 0";
            }
        }
    },

    // HTTP Helper method
    httpGet(url) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.timeout = 10000;
            xhr.open("GET", url, true);
            xhr.setRequestHeader("Accept", "application/json");
            
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        resolve(xhr.responseText);
                    } else {
                        reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                    }
                }
            };
            
            xhr.ontimeout = () => reject(new Error("Request timeout"));
            xhr.onerror = () => reject(new Error("Network error"));
            
            xhr.send();
        });
    }
});