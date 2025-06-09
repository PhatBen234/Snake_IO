cc.Class({
    extends: cc.Component,
    
    properties: {
        editBox: cc.EditBox,
        scrollView: cc.ScrollView,
        chatContent: cc.Node,
        chatItemPrefab: cc.Prefab
    },
    
    onLoad() {
        // Ẩn chat UI ban đầu
        this.editBox.node.active = false;
        this.scrollView.node.active = false;
        
        // Timer để ẩn chat UI
        this.hideTimer = null;
        this.HIDE_DELAY = 10; // 10 giây
        
        this.editBox.node.on('editing-return', this.onSendMessage, this);
        this.editBox.node.on('editing-did-ended', this.onEditBoxBlur, this);
        
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
    },
    
    onDestroy() {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        this.clearHideTimer();
    },
    
    onKeyDown(event) {
        if (event.keyCode === cc.macro.KEY.enter) {
            // Kiểm tra xem chat UI có đang hiển thị không
            if (this.editBox.node.active) {
                // Nếu chat UI đang hiển thị và editBox chưa focus thì focus vào
                if (!this.editBox.isFocused()) {
                    this.editBox.focus();
                    this.clearHideTimer(); // Dừng timer ẩn khi focus lại
                }
            } else {
                // Nếu chat UI đang ẩn thì hiển thị và focus
                this.showChatUI();
                this.editBox.focus();
            }
        }
    },
    
    showChatUI() {
        this.editBox.node.active = true;
        this.scrollView.node.active = true;
        this.clearHideTimer();
    },
    
    hideChatUI() {
        this.editBox.node.active = false;
        this.scrollView.node.active = false;
        this.clearHideTimer();
    },
    
    startHideTimer() {
        this.clearHideTimer();
        this.hideTimer = setTimeout(() => {
            this.hideChatUI();
        }, this.HIDE_DELAY * 1000);
    },
    
    clearHideTimer() {
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
            this.hideTimer = null;
        }
    },
    
    onSendMessage() {
        const msg = this.editBox.string.trim();
        if (msg.length === 0) {
            this.editBox.blur();
            return;
        }
        
        const chatItem = cc.instantiate(this.chatItemPrefab);
        const label = chatItem.getComponentInChildren(cc.Label);
        label.string = msg;
        
        this.chatContent.addChild(chatItem);
        
        this.scheduleOnce(() => {
            this.scrollView.scrollToBottom(0.2);
        }, 0.05);
        
        this.editBox.string = "";
        
        this.scheduleOnce(() => {
            this.editBox.focus();
        }, 0.1);
    },
    
    onEditBoxBlur() {
        // Bắt đầu đếm ngược 10 giây để ẩn chat UI
        this.startHideTimer();
    }
});