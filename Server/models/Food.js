class Food {
  constructor(id, position) {
    this.id = id;
    this.position = position;
    this.alive = true;
    this.value = 1;
  }

  destroy(targetId) {
    if (this.id === targetId) {
      this.alive = false;
      console.log("Food: ${this.id} is destroy!");
      return true;
    }
    return false;
  }
}

module.exports = Food;
