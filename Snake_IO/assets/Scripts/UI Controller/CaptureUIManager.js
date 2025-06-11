cc.Class({
    extends: cc.Component,

    properties: {
        reviewCaptureBtn: cc.Button,    
        capturePanel: cc.Node,         
        pageView: cc.PageView,         
        previousBtn: cc.Button,       
        nextBtn: cc.Button,            
        pageLabel: cc.Label,            
        closeBtn: cc.Button,           
        loadingLabel: cc.Label,        
        
        captureItemPrefab: cc.Prefab,   
        
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
        this.captureItems = []; // Store references to capture items
        
        // Hide panel initially
        this.capturePanel.active = false;
        this.updateNavigationButtons();
        this.updatePageLabel();
        
        // Setup PageView properties
        this.setupPageView();
    },

    setupPageView() {
        // Ensure PageView has proper structure
        if (!this.pageView) {
            console.error("PageView is not assigned!");
            return;
        }

        // Check if PageView has view child (should be created by default)
        let viewNode = this.pageView.node.getChildByName("view");
        
        if (!viewNode) {
            // Create view node if it doesn't exist
            viewNode = new cc.Node("view");
            viewNode.parent = this.pageView.node;
            
            // Add Mask component to view
            const mask = viewNode.addComponent(cc.Mask);
            mask.type = cc.Mask.Type.RECT;
            
            // Set view size to match pageView
            viewNode.setContentSize(this.pageView.node.getContentSize());
        }

        // Check if view has content child
        let contentNode = viewNode.getChildByName("content");
        
        if (!contentNode) {
            // Create content node if it doesn't exist
            contentNode = new cc.Node("content");
            contentNode.parent = viewNode;
            
            // Add Layout component to content
            const layout = contentNode.addComponent(cc.Layout);
            layout.type = cc.Layout.Type.HORIZONTAL;
            layout.resizeMode = cc.Layout.ResizeMode.CONTAINER;
            layout.paddingLeft = 0;
            layout.paddingRight = 0;
            layout.paddingTop = 0;
            layout.paddingBottom = 0;
            layout.spacingX = 0;
            
            // Set content size
            contentNode.setContentSize(this.pageView.node.getContentSize());
        }

        // Configure PageView properties
        this.pageView.direction = cc.PageView.Direction.Horizontal;
        this.pageView.scrollThreshold = 0.5;
        this.pageView.autoPageTurningThreshold = 100;
        this.pageView.pageTurningSpeed = 0.3;
        this.pageView.inertia = true;
        
        // Set content reference
        this.pageView.content = contentNode;
        
        console.log("PageView setup completed:", {
            pageView: this.pageView.node.name,
            view: viewNode.name,
            content: contentNode.name,
            contentSize: contentNode.getContentSize()
        });
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
                
                // Set current page after creating all pages
                this.scheduleOnce(() => {
                    this.pageView.setCurrentPageIndex(0);
                    this.updateNavigationButtons();
                    this.updatePageLabel();
                }, 0.1);
                
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
        
        // Ensure content exists
        if (!this.pageView.content) {
            console.error("PageView content is null! Make sure setupPageView() was called properly.");
            return;
        }
        
        console.log(`Creating ${this.screenshots.length} pages...`);
        
        // Create pages for each screenshot
        for (let i = 0; i < this.screenshots.length; i++) {
            const screenshot = this.screenshots[i];
            await this.createCapturePage(screenshot, i);
        }
        
        // Force layout update
        this.scheduleOnce(() => {
            if (this.pageView.content) {
                const layout = this.pageView.content.getComponent(cc.Layout);
                if (layout) {
                    layout.updateLayout();
                    console.log("Layout updated, content children:", this.pageView.content.childrenCount);
                }
            }
        }, 0);
    },

    async createCapturePage(screenshot, index) {
        if (!this.captureItemPrefab) {
            console.error("CaptureItem prefab is not assigned!");
            return;
        }

        if (!this.pageView.content) {
            console.error("PageView content is null!");
            return;
        }

        // Create page node from prefab
        const pageNode = cc.instantiate(this.captureItemPrefab);
        
        // Set appropriate size for the page
        const pageViewSize = this.pageView.node.getContentSize();
        pageNode.setContentSize(pageViewSize);
        
        console.log(`Creating page ${index + 1}/${this.screenshots.length}`, {
            pageSize: pageNode.getContentSize(),
            pageViewSize: pageViewSize
        });
        
        // Get CaptureItemController component
        const captureItemController = pageNode.getComponent("CaptureItemController");
        
        if (captureItemController) {
            // Use controller methods
            captureItemController.reset();
            captureItemController.setScreenshotData(screenshot);
            captureItemController.showLoading();
            
            // Store reference
            this.captureItems.push(captureItemController);
            
            // Add page to content (NOT to pageView directly)
            pageNode.parent = this.pageView.content;
            
            console.log(`Page ${index + 1} added to content. Total children: ${this.pageView.content.childrenCount}`);
            
            // Load image asynchronously
            this.loadImageForCaptureItem(screenshot, captureItemController, index);
            
        } else {
            // Fallback: Manual setup if controller is not available
            console.warn("CaptureItemController not found, using manual setup");
            await this.setupPageManually(pageNode, screenshot);
            
            // Add page to content
            pageNode.parent = this.pageView.content;
        }
    },

    async setupPageManually(pageNode, screenshot) {
        // Manual setup if controller is not available
        const imageSprite = pageNode.getChildByName("ImageSprite");
        const infoLabel = pageNode.getChildByName("InfoLabel");
        const loadingSpinner = pageNode.getChildByName("LoadingSpinner");
        
        if (imageSprite) {
            const spriteComponent = imageSprite.getComponent(cc.Sprite);
            if (infoLabel) {
                const labelComponent = infoLabel.getComponent(cc.Label);
                const playerNames = screenshot.players.map(p => p.name).join(", ");
                const gameIdShort = screenshot.gameId.substring(0, 8);
                const timestamp = new Date(screenshot.timestamp).toLocaleString();
                labelComponent.string = `Game: ${gameIdShort}...\nPlayers: ${playerNames}\nTime: ${timestamp}`;
            }
            
            if (loadingSpinner) loadingSpinner.active = true;
            
            try {
                await this.loadImageForSprite(screenshot, spriteComponent);
                if (loadingSpinner) loadingSpinner.active = false;
                imageSprite.active = true;
            } catch (error) {
                console.error(`Error loading image for ${screenshot.gameId}:`, error);
                if (infoLabel) {
                    const labelComponent = infoLabel.getComponent(cc.Label);
                    labelComponent.string += "\n[Image load failed]";
                }
                if (loadingSpinner) loadingSpinner.active = false;
            }
        }
    },

    async loadImageForCaptureItem(screenshot, captureItemController, index) {
        try {
            const imageUrl = `${this.serverUrl}${screenshot.thumbnailPath}`;
            console.log(`Loading image ${index + 1}/${this.screenshots.length} from:`, imageUrl);
            
            const spriteFrame = await this.loadImageFromUrl(imageUrl);
            
            // Set image using controller
            captureItemController.setImage(spriteFrame);
            
            // Scale image to fit container
            const pageViewSize = this.pageView.node.getContentSize();
            const maxWidth = pageViewSize.width * 0.9;  // Leave some margin
            const maxHeight = pageViewSize.height * 0.7; // Leave space for info text
            captureItemController.scaleImageToContainer(maxWidth, maxHeight);
            
            console.log(`Image ${index + 1} loaded successfully`);
            
        } catch (error) {
            console.error(`Error loading image ${index + 1}:`, error);
            captureItemController.showError("Failed to load image");
        }
    },

    loadImageFromUrl(imageUrl) {
        return new Promise((resolve, reject) => {
            cc.loader.load({
                url: imageUrl,
                type: "png",
            }, (err, texture) => {
                if (err) {
                    console.error("Load image error:", err);
                    reject(err);
                    return;
                }
                
                // Create sprite frame
                const spriteFrame = new cc.SpriteFrame(texture);
                resolve(spriteFrame);
            });
        });
    },

    loadImageForSprite(screenshot, sprite) {
        return new Promise((resolve, reject) => {
            const imageUrl = `${this.serverUrl}${screenshot.thumbnailPath}`;
            
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
                
                resolve();
            });
        });
    },

    scaleImageToFit(imageNode) {
        const pageViewSize = this.pageView.node.getContentSize();
        const maxWidth = pageViewSize.width * 0.9;
        const maxHeight = pageViewSize.height * 0.7;
        
        const imageSize = imageNode.getContentSize();
        
        if (imageSize.width > 0 && imageSize.height > 0) {
            const scaleX = maxWidth / imageSize.width;
            const scaleY = maxHeight / imageSize.height;
            const scale = Math.min(scaleX, scaleY, 1);
            
            imageNode.setScale(scale);
        }
    },

    clearPageView() {
        // Clear content children instead of using removeAllPages()
        if (this.pageView.content) {
            this.pageView.content.removeAllChildren();
            console.log("PageView content cleared");
        }
        
        // Clear references
        this.captureItems = [];
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