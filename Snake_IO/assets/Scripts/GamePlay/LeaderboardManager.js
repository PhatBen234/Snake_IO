import { GameConfig } from './GameConfig';

export default class LeaderboardManager {
  constructor() {
    this.scoreTablePopup = null;
    this.scoreTableContent = null;
    this.scoreLabelPrefab = null;
  }

  initialize(config) {
    this.scoreTablePopup = config.scoreTablePopup;
    this.scoreTableContent = config.scoreTableContent;
    this.scoreLabelPrefab = config.scoreLabelPrefab;
  }

  show(playersData) {
    if (!this.scoreTablePopup || !this.scoreTableContent || !this.scoreLabelPrefab) {
      return;
    }

    if (!playersData || playersData.length === 0) {
      return;
    }

    // Show the popup
    this.scoreTablePopup.active = true;

    // Clear existing content
    this.scoreTableContent.removeAllChildren();

    // Sort players by score (descending) and get top 3
    const top3Players = [...playersData]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    // Create score labels for top 3 players
    top3Players.forEach((player, index) => {
      this.createPlayerScoreLabel(player, index);
    });

    // Add entrance animation
    this.animateScoreTableEntrance();
  }

  createPlayerScoreLabel(player, index) {
    const rank = index + 1;
    const playerName = player.name || `Player_${player.id?.substring(0, 4) || rank}`;

    // Create score label from prefab
    const scoreLabelNode = cc.instantiate(this.scoreLabelPrefab);
    scoreLabelNode.parent = this.scoreTableContent;

    // Position the labels vertically
    scoreLabelNode.y = 100 - index * 80;

    // Find the label component
    let labelComponent = this.findLabelComponent(scoreLabelNode);

    if (labelComponent) {
      // Set the text content with rank indicator
      const displayText = `${playerName}\nScore: ${player.score}`;
      labelComponent.string = displayText;

      // Set rank colors
      labelComponent.node.color = this.getRankColor(rank);
    }

    // Add entrance animation
    this.animateScoreLabel(scoreLabelNode, index);
  }

  findLabelComponent(node) {
    // Check root node first
    let labelComponent = node.getComponent(cc.Label);

    if (!labelComponent) {
      // Search in children recursively
      const findInChildren = (parent) => {
        for (let child of parent.children) {
          const label = child.getComponent(cc.Label);
          if (label) return label;

          const childResult = findInChildren(child);
          if (childResult) return childResult;
        }
        return null;
      };

      labelComponent = findInChildren(node);
    }

    return labelComponent;
  }

  getRankColor(rank) {
    const colors = GameConfig.RANK_COLORS;
    const colorConfig = colors[rank] || colors.default;
    return new cc.Color(colorConfig.r, colorConfig.g, colorConfig.b);
  }

  animateScoreLabel(labelNode, index) {
    // Start from the right and fade in
    labelNode.x = 300;
    labelNode.opacity = 0;

    // Stagger animations
    const delay = index * GameConfig.SCORE_LABEL_ANIMATION_DELAY;

    const moveAction = cc.moveTo(
      GameConfig.SCORE_LABEL_ANIMATION_DURATION, 
      cc.v2(0, labelNode.y)
    );
    const fadeAction = cc.fadeTo(GameConfig.SCORE_LABEL_ANIMATION_DURATION, 255);
    const delayAction = cc.delayTime(delay);

    const sequence = cc.sequence(delayAction, cc.spawn(moveAction, fadeAction));

    labelNode.runAction(sequence);
  }

  animateScoreTableEntrance() {
    if (!this.scoreTablePopup) return;

    // Start from scale 0
    this.scoreTablePopup.scale = 0;
    this.scoreTablePopup.opacity = 0;

    // Animate to full size with bounce effect
    const scaleAction = cc.sequence(
      cc.scaleTo(GameConfig.LEADERBOARD_ENTRANCE_DURATION, 1.2),
      cc.scaleTo(GameConfig.LEADERBOARD_SCALE_DURATION, 1.0)
    );
    const fadeAction = cc.fadeTo(GameConfig.LEADERBOARD_ENTRANCE_DURATION, 255);

    this.scoreTablePopup.runAction(cc.spawn(scaleAction, fadeAction));
  }

  hide() {
    if (!this.scoreTablePopup) return;

    const scaleAction = cc.scaleTo(0.2, 0);
    const fadeAction = cc.fadeTo(0.2, 0);
    const hideAction = cc.callFunc(() => {
      this.scoreTablePopup.active = false;
    });

    const sequence = cc.sequence(cc.spawn(scaleAction, fadeAction), hideAction);
    this.scoreTablePopup.runAction(sequence);
  }
}