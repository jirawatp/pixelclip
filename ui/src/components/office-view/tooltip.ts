// @ts-nocheck
/**
 * Tooltip system for the Pixi.js office canvas.
 * Renders pixel-styled tooltips above furniture when hovering.
 */
import { Container, Graphics, Text, TextStyle } from "pixi.js";

const TOOLTIP_FONT = new TextStyle({
  fontSize: 7,
  fill: 0xffffff,
  fontFamily: "system-ui, sans-serif",
  fontWeight: "bold",
});

const TOOLTIP_HINT_FONT = new TextStyle({
  fontSize: 6,
  fill: 0xaabbcc,
  fontFamily: "system-ui, sans-serif",
});

/**
 * Makes a Graphics/Container object show a pixel-style tooltip on hover.
 * The tooltip floats above the target with a label and optional hint text.
 */
export function addTooltip(
  target: Graphics | Container,
  label: string,
  hint?: string,
  options?: {
    /** Tooltip offset Y above the target (default: -20) */
    offsetY?: number;
    /** Custom accent border color (default: 0x29ADFF) */
    accentColor?: number;
  },
): void {
  const offsetY = options?.offsetY ?? -20;
  const accent = options?.accentColor ?? 0x29adff;

  // Make target interactive
  target.eventMode = "static";
  target.cursor = "pointer";

  let tooltip: Container | null = null;

  target.on("pointerover", () => {
    if (tooltip) return;

    tooltip = new Container();

    // Measure text
    const labelText = new Text({ text: label, style: TOOLTIP_FONT });
    labelText.anchor.set(0.5, 0);

    let hintText: Text | null = null;
    if (hint) {
      hintText = new Text({ text: hint, style: TOOLTIP_HINT_FONT });
      hintText.anchor.set(0.5, 0);
    }

    const textW = Math.max(labelText.width, hintText?.width ?? 0);
    const textH = labelText.height + (hintText ? hintText.height + 2 : 0);
    const padX = 6;
    const padY = 4;
    const boxW = textW + padX * 2;
    const boxH = textH + padY * 2;

    // Background
    const bg = new Graphics();
    // Shadow
    bg.roundRect(-boxW / 2 + 1, 1, boxW, boxH, 3).fill({ color: 0x000000, alpha: 0.3 });
    // Body
    bg.roundRect(-boxW / 2, 0, boxW, boxH, 3).fill({ color: 0x111122, alpha: 0.92 });
    // Border
    bg.roundRect(-boxW / 2, 0, boxW, boxH, 3).stroke({ width: 1, color: accent, alpha: 0.6 });
    // Arrow pointing down
    bg.moveTo(-3, boxH)
      .lineTo(0, boxH + 4)
      .lineTo(3, boxH)
      .fill({ color: 0x111122, alpha: 0.92 });

    tooltip.addChild(bg);

    // Position label
    labelText.position.set(0, padY);
    tooltip.addChild(labelText);

    if (hintText) {
      hintText.position.set(0, padY + labelText.height + 2);
      tooltip.addChild(hintText);
    }

    // Position tooltip above target center
    const bounds = target.getBounds();
    tooltip.position.set(
      bounds.x + bounds.width / 2,
      bounds.y + offsetY - boxH,
    );

    // Add to the stage (topmost layer)
    let stage: Container = target;
    while (stage.parent) stage = stage.parent;
    stage.addChild(tooltip);
  });

  target.on("pointerout", () => {
    if (tooltip) {
      if (!tooltip.destroyed) tooltip.destroy({ children: true });
      tooltip = null;
    }
  });
}

/**
 * Convenience: make an existing Graphics object interactive with tooltip and optional click handler.
 */
export function makeInteractive(
  target: Graphics | Container,
  label: string,
  hint: string,
  onClick?: () => void,
  accentColor?: number,
): void {
  addTooltip(target, label, hint, { accentColor });
  if (onClick) {
    target.on("pointerdown", () => {
      console.log("[PIXI] Interactive clicked:", label);
      onClick();
    });
  }
}
