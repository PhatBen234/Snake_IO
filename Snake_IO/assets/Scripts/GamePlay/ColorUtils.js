import { GameConfig } from "./GameConfig";

export class ColorUtils {
  static getRankColor(rank) {
    const colors = GameConfig.RANK_COLORS;
    const colorConfig = colors[rank] || colors.default;
    return new cc.Color(colorConfig.r, colorConfig.g, colorConfig.b);
  }

  static hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash;
  }

  static createColor(r, g, b, a = 255) {
    return new cc.Color(r, g, b, a);
  }

  static hexToColor(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return new cc.Color(r, g, b);
  }

  static colorToHex(color) {
    const toHex = (value) => {
      const hex = Math.round(value).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };

    return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
  }

  static interpolateColor(color1, color2, factor) {
    const r = color1.r + (color2.r - color1.r) * factor;
    const g = color1.g + (color2.g - color1.g) * factor;
    const b = color1.b + (color2.b - color1.b) * factor;
    const a = color1.a + (color2.a - color1.a) * factor;

    return new cc.Color(r, g, b, a);
  }

  static darkenColor(color, factor = 0.7) {
    return new cc.Color(
      color.r * factor,
      color.g * factor,
      color.b * factor,
      color.a
    );
  }

  static lightenColor(color, factor = 1.3) {
    return new cc.Color(
      Math.min(255, color.r * factor),
      Math.min(255, color.g * factor),
      Math.min(255, color.b * factor),
      color.a
    );
  }
}
