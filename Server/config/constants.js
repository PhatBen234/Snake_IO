const GAME_CONSTANTS = {
  // Game Settings
  GAME_FPS: 10,
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 4,

  // Collision & Movement
  COLLISION_THRESHOLD: 15,
  PLAYER_SPEED: 5,
  SPEED_BOOST_MULTIPLIER: 2, // Tăng tốc 1.5 lần
  SPEED_BOOST_DURATION: 5000, // 5 giây

  // Food Settings
  FOOD_COUNT: 10,
  FOOD_SPAWN_PADDING: 100,
  FOOD_VALUE: 1,
  SPEED_FOOD_SPAWN_CHANCE: 0.2, // 20% cơ hội spawn speed food

  // Food Types
  FOOD_TYPES: {
    NORMAL: "normal",
    SPEED: "speed",
  },

  // Room Settings
  DEFAULT_ROOM_WIDTH: 960,
  DEFAULT_ROOM_HEIGHT: 640,

  // Game States
  ROOM_STATUS: {
    WAITING: "waiting",
    PLAYING: "playing",
    FINISHED: "finished",
  },
};

module.exports = GAME_CONSTANTS;
