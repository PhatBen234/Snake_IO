class Food {
  constructor(id, position) {
    this.id = id;
    this.position = position;
    this.alive = true;
    this.value = 1;
  }

  setAlive(alive) {
    this.alive = alive;
  }
}

module.exports = Food;
