// SnakeConstants.js - Chứa các hằng số và cấu hình
export const SNAKE_CONFIG = {
  GRID_SIZE: 20,
  HEAD_SIZE_RATIO: 1.0,
  BODY_SIZE_RATIO: 0.7,
  TAIL_SIZE_RATIO: 0.8,
  CANVAS_WIDTH: 960,
  CANVAS_HEIGHT: 640,

  Z_INDEX: {
    HEAD: 100,
    BODY: 10,
    TAIL: 5,
  },

  DIRECTIONS: {
    RIGHT: { angle: 90 },
    LEFT: { angle: -90 },
    UP: { angle: 0 },
    DOWN: { angle: 180 },
  },
};

// Màu neon cho các player
export const NEON_COLORS = [
  new cc.Color(0, 255, 255, 255), // Cyan neon
  new cc.Color(255, 0, 255, 255), // Magenta neon
  new cc.Color(255, 255, 0, 255), // Yellow neon
  new cc.Color(255, 20, 147, 255), // Deep pink neon
  new cc.Color(255, 69, 0, 255), // Orange red neon
  new cc.Color(255, 105, 180, 255), // Hot pink neon
  new cc.Color(255, 215, 0, 255), // Gold neon
  new cc.Color(138, 43, 226, 255), // Blue violet neon
  new cc.Color(255, 140, 0, 255), // Dark orange neon
  new cc.Color(255, 20, 20, 255), // Bright red neon
  new cc.Color(0, 191, 255, 255), // Deep sky blue neon
  new cc.Color(255, 255, 255, 255), // Pure white neon
];
