export const GameConfig = {
  // Canvas Settings
  CANVAS_WIDTH: 960,
  CANVAS_HEIGHT: 640,
  GRID_SIZE: 20,

  // Game Settings
  QUIT_CONFIRM_TIMEOUT: 3000,
  AUTO_START_DELAY: 1000,
  GAME_END_DELAY: 1500,
  PLAYER_LEFT_MESSAGE_DURATION: 2000,

  // Screenshot Settings
  SCREENSHOT_WIDTH: 300,
  SCREENSHOT_HEIGHT: 200,
  SCREENSHOT_QUALITY: 0.7,
  SCREENSHOT_COMPRESSION_QUALITY: 0.6,
  SCREENSHOT_FURTHER_COMPRESSION_QUALITY: 0.4,
  SCREENSHOT_MAX_SIZE: 8 * 1024 * 1024, // 8MB

  // Animation Settings
  LEADERBOARD_ENTRANCE_DURATION: 0.3,
  LEADERBOARD_SCALE_DURATION: 0.2,
  SCORE_LABEL_ANIMATION_DURATION: 0.5,
  SCORE_LABEL_ANIMATION_DELAY: 0.3,

  // Rank Colors
  RANK_COLORS: {
    1: { r: 255, g: 255, b: 0 }, // Gold
    2: { r: 192, g: 192, b: 192 }, // Silver
    3: { r: 205, g: 127, b: 50 }, // Bronze
    default: { r: 255, g: 255, b: 255 }, // White
  },

  // API Settings
  API_BASE_URL: "http://localhost:3000",
  SCREENSHOT_UPLOAD_ENDPOINT: "/api/screenshot/upload",

  // Input Keys
  MOVEMENT_KEYS: {
    [cc.macro.KEY.up]: { x: 0, y: -1 },
    [cc.macro.KEY.w]: { x: 0, y: -1 },
    [cc.macro.KEY.down]: { x: 0, y: 1 },
    [cc.macro.KEY.s]: { x: 0, y: 1 },
    [cc.macro.KEY.left]: { x: -1, y: 0 },
    [cc.macro.KEY.a]: { x: -1, y: 0 },
    [cc.macro.KEY.right]: { x: 1, y: 0 },
    [cc.macro.KEY.d]: { x: 1, y: 0 },
  },

  QUIT_KEY: cc.macro.KEY.escape,
};
