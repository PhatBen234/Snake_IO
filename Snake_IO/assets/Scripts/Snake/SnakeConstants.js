export const SNAKE_CONFIG = {
  GRID_SIZE: 30,
  HEAD_SIZE_RATIO: 1.3,
  BODY_SIZE_RATIO: 1.0,
  TAIL_SIZE_RATIO: 1.1,
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


export const NEON_COLORS = [
  new cc.Color(0, 255, 255, 255), 
  new cc.Color(255, 0, 255, 255), 
  new cc.Color(255, 255, 0, 255), 
  new cc.Color(255, 20, 147, 255),
  new cc.Color(255, 69, 0, 255),
  new cc.Color(255, 105, 180, 255), 
  new cc.Color(255, 215, 0, 255), 
  new cc.Color(138, 43, 226, 255), 
  new cc.Color(255, 140, 0, 255), 
  new cc.Color(255, 20, 20, 255), 
  new cc.Color(0, 191, 255, 255), 
  new cc.Color(255, 255, 255, 255), 
];
