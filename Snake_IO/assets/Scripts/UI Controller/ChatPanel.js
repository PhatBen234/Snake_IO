cc.Class({
    extends: cc.Component,

    properties: {
        editBox: cc.EditBox,
        scrollView: cc.ScrollView,
        chatContent: cc.Node,
        chatItemPrefab: cc.Prefab
    },

    onLoad() {
        this.editBox.node.on('editing-return', this.onSendMessage, this);
        
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
    },

    onDestroy() {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
    },

    onKeyDown(event) {
        if (event.keyCode === cc.macro.KEY.enter) {
            if (!this.editBox.isFocused()) {
                this.editBox.focus();
            }
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
    }
});