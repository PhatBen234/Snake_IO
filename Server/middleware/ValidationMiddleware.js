const GAME_CONSTANTS = require("../config/constants");

class ValidationMiddleware {
  static validateRoomCreation(data) {
    const { playerId, playerName, playerLimit = 4 } = data;

    const errors = [];

    if (!playerId || typeof playerId !== "string") {
      errors.push("Invalid player ID");
    }

    if (
      !playerName ||
      typeof playerName !== "string" ||
      playerName.trim().length === 0
    ) {
      errors.push("Invalid player name");
    }

    if (
      playerLimit < GAME_CONSTANTS.MIN_PLAYERS ||
      playerLimit > GAME_CONSTANTS.MAX_PLAYERS
    ) {
      errors.push(
        `Player limit must be between ${GAME_CONSTANTS.MIN_PLAYERS} and ${GAME_CONSTANTS.MAX_PLAYERS}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static validateRoomJoin(data) {
    const { playerId, playerName, roomId } = data;

    const errors = [];

    if (!playerId || typeof playerId !== "string") {
      errors.push("Invalid player ID");
    }

    if (
      !playerName ||
      typeof playerName !== "string" ||
      playerName.trim().length === 0
    ) {
      errors.push("Invalid player name");
    }

    if (!roomId || typeof roomId !== "string") {
      errors.push("Invalid room ID");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static validatePlayerMove(data) {
    const { roomId, playerId, direction } = data;

    const errors = [];

    if (!roomId || !playerId) {
      errors.push("Missing room or player ID");
    }

    if (
      !direction ||
      typeof direction.x !== "number" ||
      typeof direction.y !== "number"
    ) {
      errors.push("Invalid direction");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

module.exports = ValidationMiddleware;
