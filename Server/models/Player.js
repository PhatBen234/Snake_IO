class Player {
  constructor(id, name, startPosition = { x: 0, y: 0 }) {
    this.id = id;
    this.name = name;
    this.score = 0;
    this.alive = true;

    this.position = startPosition;
    this.direction = { x: 1, y: 0 };
    this.speed = 5;
    this.body = [ { ...startPosition } ];
    this.length = 1;
  }

  setDirection(newDirection) {
    this.direction = newDirection;
  }

  reset(startPosition = { x: 0, y: 0 }) {
    this.position = startPosition;
    this.body = [ { ...startPosition } ];
    this.length = 1;
    this.alive = true;
    this.score = 0;
    this.direction = { x: 1, y: 0 };
  }
}

module.exports = Player;
