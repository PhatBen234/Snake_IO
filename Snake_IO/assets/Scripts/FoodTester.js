const { ccclass, property } = cc._decorator;

@ccclass
export default class FoodTester extends cc.Component {
  gameAnalyzer = null;
  movementController = null;

  init(gameAnalyzer, movementController) {
    this.gameAnalyzer = gameAnalyzer;
    this.movementController = movementController;
  }

  runFoodTest() {
    if (!this.gameAnalyzer.gameState || !this.gameAnalyzer.gameState.foods) {
      console.log("🍎 No food data available for testing");
      return;
    }

    console.log("🍎 Running food consumption test...");

    const myPlayer = this.gameAnalyzer.gameState.players.find(
      (p) => p.id === this.gameAnalyzer.playerId
    );
    if (!myPlayer) return;

    const foods = this.gameAnalyzer.gameState.foods.filter((f) => f.alive);
    if (foods.length === 0) {
      console.log("🍎 No food available");
      return;
    }

    const nearestFood = this.gameAnalyzer.findNearestFood(myPlayer.position, foods);

    if (nearestFood) {
      console.log(`🎯 Targeting food at:`, nearestFood.position);
      this.movementController.moveTowardsFood(myPlayer.position, nearestFood.position);
    }
  }
}