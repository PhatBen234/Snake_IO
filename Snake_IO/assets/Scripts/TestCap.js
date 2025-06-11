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

    loadImageAlternative(imageUrl, sprite, resolve, reject) {
        console.log("Trying alternative loading method for:", imageUrl);
        
        // Try loading as texture directly
        cc.loader.loadRes(imageUrl, cc.Texture2D, (err, texture) => {
            if (err) {
                console.error("Alternative method also failed:", err);
                // Try third method - direct URL load
                this.loadImageDirect(imageUrl, sprite, resolve, reject);
                return;
            }
            
            const spriteFrame = new cc.SpriteFrame(texture);
            sprite.spriteFrame = spriteFrame;
            this.scaleImageToFit(sprite.node);
            console.log("Alternative method succeeded");
            resolve();
        });
    },

    loadImageDirect(imageUrl, sprite, resolve, reject) {
        console.log("Trying direct URL loading method for:", imageUrl);
        
        // Create image element to test if URL is accessible
        const img = new Image();
        img.crossOrigin = "anonymous";
        
        img.onload = () => {
            console.log("Direct URL is accessible, trying cc.loader again with different params");
            
            // Try with different parameters
            cc.loader.load(imageUrl, (err, texture) => {
                if (err) {
                    console.error("All loading methods failed:", err);
                    reject(err);
                    return;
                }
                
                const spriteFrame = new cc.SpriteFrame(texture);
                sprite.spriteFrame = spriteFrame;
                this.scaleImageToFit(sprite.node);
                console.log("Direct method succeeded");
                resolve();
            });
        };
        
        img.onerror = (error) => {
            console.error("URL not accessible:", error);
            reject(new Error("Image URL not accessible: " + imageUrl));
        };
        
        img.src = imageUrl;
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
        
        // TEST: Tạo test page đơn giản trước
        this.createTestPages();
        
        try {
            await this.loadScreenshots();
        } catch (error) {
            console.error("Error loading screenshots:", error);
            this.loadingLabel.string = "Error loading screenshots";
        }
    },

    createTestPages() {
        console.log("Creating test pages...");
        
        // Tạo 3 test pages đơn giản
        for (let i = 0; i < 3; i++) {
            const testPage = new cc.Node(`TestPage_${i}`);
            testPage.setContentSize(400, 300);
            
            // Thêm background color
            const bg = testPage.addComponent(cc.Sprite);
            // Set màu khác nhau cho mỗi page để dễ phân biệt
            const colors = [cc.Color.RED, cc.Color.GREEN, cc.Color.BLUE];
            testPage.color = colors[i];
            
            // Thêm label
            const labelNode = new cc.Node("TestLabel");
            const label = labelNode.addComponent(cc.Label);
            label.string = `Test Page ${i + 1}`;
            label.fontSize = 30;
            labelNode.setParent(testPage);
            
            // Add to PageView
            this.pageView.addPage(testPage);
            console.log(`Added test page ${i}`);
        }
        
        console.log("Test pages created, total:", this.pageView.getPages().length);
        
        // Update navigation for test
        this.totalPages = 3;
        this.currentPageIndex = 0;
        this.pageView.setCurrentPageIndex(0);
        this.updateNavigationButtons();
        this.updatePageLabel();
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
                
                console.log("Screenshots loaded:", this.screenshots); // Debug log
                
                await this.createCapturePages();
                
                this.loadingLabel.node.active = false;
                this.currentPageIndex = 0;
                this.pageView.setCurrentPageIndex(0);
                this.updateNavigationButtons();
                this.updatePageLabel();
                
                // Test PageView
                this.testPageView();
                
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
        
        console.log("Creating pages for", this.screenshots.length, "screenshots");
        
        // Create pages for each screenshot
        for (let i = 0; i < this.screenshots.length; i++) {
            const screenshot = this.screenshots[i];
            console.log(`Creating page ${i}:`, screenshot);
            await this.createCapturePage(screenshot, i);
        }
        
        console.log("Total pages in PageView:", this.pageView.getPages().length);
    },

    async createCapturePage(screenshot, index) {
        // Check if prefab exists
        if (!this.captureItemPrefab) {
            console.error("CaptureItemPrefab is not assigned!");
            return;
        }
        
        // Create page node
        const pageNode = cc.instantiate(this.captureItemPrefab);
        console.log("Created pageNode:", pageNode.name);
        
        // Add to PageView
        this.pageView.addPage(pageNode);
        console.log("Added page to PageView, total pages:", this.pageView.getPages().length);
        
        // Try to get components - với nhiều cách khác nhau
        let imageSprite = null;
        let infoLabel = null;
        let loadingSpinner = null;
        
        // Method 1: Tìm theo tên node con
        const imageSpriteNode = pageNode.getChildByName("ImageSprite");
        if (imageSpriteNode) {
            imageSprite = imageSpriteNode.getComponent(cc.Sprite);
            console.log("Found ImageSprite by name");
        } else {
            // Method 2: Tìm component trực tiếp trong pageNode
            imageSprite = pageNode.getComponent(cc.Sprite);
            if (imageSprite) {
                console.log("Found Sprite component in pageNode directly");
            } else {
                // Method 3: Tìm trong tất cả children
                imageSprite = pageNode.getComponentInChildren(cc.Sprite);
                if (imageSprite) {
                    console.log("Found Sprite component in children");
                }
            }
        }
        
        const infoLabelNode = pageNode.getChildByName("InfoLabel");
        if (infoLabelNode) {
            infoLabel = infoLabelNode.getComponent(cc.Label);
            console.log("Found InfoLabel by name");
        } else {
            infoLabel = pageNode.getComponentInChildren(cc.Label);
            if (infoLabel) {
                console.log("Found Label component in children");
            }
        }
        
        const loadingSpinnerNode = pageNode.getChildByName("LoadingSpinner");
        if (loadingSpinnerNode) {
            loadingSpinner = loadingSpinnerNode;
            console.log("Found LoadingSpinner");
        }
        
        // Log component status
        console.log("Components found:", {
            imageSprite: !!imageSprite,
            infoLabel: !!infoLabel,
            loadingSpinner: !!loadingSpinner
        });
        
        // Set info text
        if (infoLabel) {
            const gameIdShort = screenshot.gameId.substring(0, 8);
            const filename = screenshot.filename || 'No filename';
            infoLabel.string = `Game: ${gameIdShort}...\nFile: ${filename}`;
            console.log("Info label set:", infoLabel.string);
        } else {
            console.warn("No info label found for page", index);
        }
        
        console.log(`Creating page ${index} for gameId: ${screenshot.gameId}, filename: ${screenshot.filename}`);
        
        // Load image
        if (loadingSpinner) loadingSpinner.active = true;
        
        if (imageSprite) {
            try {
                await this.loadImageForSprite(screenshot, imageSprite);
                if (loadingSpinner) loadingSpinner.active = false;
                console.log("Image loaded successfully for page", index);
            } catch (error) {
                console.error(`Error loading image for ${screenshot.gameId}:`, error);
                if (infoLabel) {
                    infoLabel.string += "\n[Image load failed]";
                }
                if (loadingSpinner) loadingSpinner.active = false;
            }
        } else {
            console.error("No image sprite found for page", index);
            if (loadingSpinner) loadingSpinner.active = false;
        }
        
        // Fallback: create simple page if prefab doesn't work
        if (!imageSprite && !infoLabel) {
            console.log("Creating simple fallback page");
            this.createSimplePage(pageNode, screenshot, index);
        }
    },

    createSimplePage(pageNode, screenshot, index) {
        console.log("Creating simple page for index:", index);
        
        // Set page size
        pageNode.setContentSize(400, 300);
        
        // Add background color để dễ thấy
        const bg = pageNode.addComponent(cc.Sprite);
        pageNode.color = cc.Color.GRAY;
        
        // Create simple label node  
        const labelNode = new cc.Node("SimpleLabel");
        const label = labelNode.addComponent(cc.Label);
        labelNode.setParent(pageNode);
        labelNode.setPosition(0, 0);
        
        // Set label
        const gameIdShort = screenshot.gameId.substring(0, 8);
        const filename = screenshot.filename || 'No filename';
        label.string = `Game: ${gameIdShort}...\nFile: ${filename}\nPage: ${index + 1}`;
        label.fontSize = 20;
        label.node.color = cc.Color.WHITE;
        
        console.log("Simple page created with label:", label.string);
        
        // Create simple sprite node (for image)
        const spriteNode = new cc.Node("SimpleSprite");
        const sprite = spriteNode.addComponent(cc.Sprite);
        spriteNode.setParent(pageNode);
        spriteNode.setPosition(0, 50);
        
        // Load image
        this.loadImageForSprite(screenshot, sprite).then(() => {
            console.log("Image loaded for simple page", index);
        }).catch(error => {
            console.error("Simple page image load failed:", error);
            label.string += "\n[Image load failed]";
        });
    },

    loadImageForSprite(screenshot, sprite) {
        return new Promise((resolve, reject) => {
            // Sử dụng filename từ server response để tạo URL
            let imageUrl;
            if (screenshot.thumbnailPath) {
                imageUrl = `${this.serverUrl}${screenshot.thumbnailPath}`;
            } else if (screenshot.filename) {
                // Tạo URL từ filename nếu không có thumbnailPath
                imageUrl = `${this.serverUrl}/api/screenshot/${screenshot.gameId}`;
            } else {
                // Fallback sử dụng gameId
                imageUrl = `${this.serverUrl}/api/screenshot/${screenshot.gameId}`;
            }
            
            console.log("Loading image from URL:", imageUrl);
            console.log("Screenshot data:", screenshot);
            
            // Try different loading methods
            cc.loader.load({
                url: imageUrl,
                type: "png",
            }, (err, texture) => {
                if (err) {
                    console.error("Method 1 failed, trying method 2:", err);
                    // Try alternative method
                    this.loadImageAlternative(imageUrl, sprite, resolve, reject);
                    return;
                }
                
                // Create sprite frame and set to sprite
                const spriteFrame = new cc.SpriteFrame(texture);
                sprite.spriteFrame = spriteFrame;
                
                // Scale image to fit
                this.scaleImageToFit(sprite.node);
                
                console.log(`Image loaded successfully for ${screenshot.gameId}`);
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
    },

    // Test method để kiểm tra PageView
    testPageView() {
        console.log("=== PageView Test ===");
        console.log("PageView node active:", this.pageView.node.active);
        console.log("PageView component enabled:", this.pageView.enabled);
        console.log("Total pages:", this.pageView.getPages().length);
        console.log("Current page index:", this.pageView.getCurrentPageIndex());
        console.log("PageView size:", this.pageView.node.getContentSize());
        console.log("PageView position:", this.pageView.node.getPosition());
        
        // Check each page
        const pages = this.pageView.getPages();
        pages.forEach((page, index) => {
            console.log(`Page ${index}:`, {
                active: page.active,
                name: page.name,
                children: page.children.length,
                size: page.getContentSize(),
                position: page.getPosition()
            });
        });
        
        // Force update PageView
        if (pages.length > 0) {
            console.log("Forcing PageView update...");
            this.pageView.setCurrentPageIndex(0);
            
            // Schedule để check sau 1 giây
            this.scheduleOnce(() => {
                console.log("PageView status after 1 second:");
                console.log("Current page:", this.pageView.getCurrentPageIndex());
                console.log("First page active:", pages[0] ? pages[0].active : "no pages");
            }, 1);
        }
    }
}); 