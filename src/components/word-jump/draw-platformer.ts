/**
 * Paints one frame of the level (spec §7.6). Only paints: where things are
 * comes from `@/lib/word-jump/platformer`, and everything shown here is also
 * in the DOM. All the art is original, drawn with shapes (decision #24).
 */
import type { LevelState } from "@/lib/word-jump/platformer/game";
import {
  CLOUD_HEIGHT,
  CLOUD_WIDTH,
  DOOR_HEIGHT,
  DOOR_WIDTH,
  type LevelLayout,
  type Rect,
  VIEW_WIDTH,
} from "@/lib/word-jump/platformer/level";
import {
  BODY_HEIGHT,
  BODY_WIDTH,
  type Body,
  GROUND_Y,
} from "@/lib/word-jump/platformer/physics";

export const VIEW_HEIGHT = 360;
export const BURST_MS = 700;
export const DOOR_MS = 400;

export type Burst = { challenge: number; option: number; start: number };
export type DoorOpening = { challenge: number; start: number };

export type Scene = {
  cameraX: number;
  body: Body;
  layout: LevelLayout;
  level: LevelState;
  time: number;
  burst: Burst | null;
  door: DoorOpening | null;
  reducedMotion: boolean;
};

const COLORS = {
  skyTop: "#9D8DE0",
  skyBottom: "#F4B6C6",
  sun: "#F7E6C4",
  farHills: "#A99BE0",
  nearHills: "#78C49A",
  grass: "#5DB65A",
  dirt: "#B97A4A",
  dirtDots: "#9C6236",
  cloud: "#FFFFFF",
  cloudShade: "#E7E2F2",
  crossed: "#C9C3D6",
  cross: "#C7431C",
  text: "#241D14",
  wood: "#9B5E2E",
  woodDark: "#6E3F1C",
  lock: "#E8B931",
  pole: "#4A4130",
  banner: "#E4572E",
  fox: "#F08A3C",
  foxDark: "#C9631F",
  white: "#FFFFFF",
  eye: "#241D14",
  star: "#F2B705",
};

function hills(
  context: CanvasRenderingContext2D,
  offset: number,
  baseY: number,
  amplitude: number,
  wave: number,
  color: string,
) {
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(0, VIEW_HEIGHT);
  for (let x = 0; x <= VIEW_WIDTH; x += 8) {
    const y = baseY + Math.sin((x + offset) / wave) * amplitude;
    context.lineTo(x, y);
  }
  context.lineTo(VIEW_WIDTH, VIEW_HEIGHT);
  context.closePath();
  context.fill();
}

function background(context: CanvasRenderingContext2D, cameraX: number) {
  const sky = context.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, COLORS.skyTop);
  sky.addColorStop(1, COLORS.skyBottom);
  context.fillStyle = sky;
  context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  context.fillStyle = COLORS.sun;
  context.beginPath();
  context.arc(VIEW_WIDTH * 0.78, 80, 34, 0, Math.PI * 2);
  context.fill();

  hills(context, cameraX * 0.15, 220, 16, 90, COLORS.farHills);
  hills(context, cameraX * 0.35, 250, 20, 70, COLORS.nearHills);
}

function ground(context: CanvasRenderingContext2D, cameraX: number) {
  context.fillStyle = COLORS.dirt;
  context.fillRect(0, GROUND_Y, VIEW_WIDTH, VIEW_HEIGHT - GROUND_Y);
  context.fillStyle = COLORS.grass;
  context.fillRect(0, GROUND_Y, VIEW_WIDTH, 8);
  context.fillStyle = COLORS.dirtDots;
  const first = Math.floor(cameraX / 60) * 60;
  for (let x = first; x < cameraX + VIEW_WIDTH + 60; x += 60) {
    context.fillRect(x - cameraX + 18, GROUND_Y + 26, 4, 4);
    context.fillRect(x - cameraX + 44, GROUND_Y + 44, 4, 4);
  }
}

function cloudShape(context: CanvasRenderingContext2D, rect: Rect) {
  const { x, y, width, height } = rect;
  context.beginPath();
  context.arc(
    x + width * 0.28,
    y + height * 0.55,
    height * 0.42,
    0,
    Math.PI * 2,
  );
  context.arc(
    x + width * 0.52,
    y + height * 0.38,
    height * 0.5,
    0,
    Math.PI * 2,
  );
  context.arc(
    x + width * 0.76,
    y + height * 0.56,
    height * 0.4,
    0,
    Math.PI * 2,
  );
  context.rect(x + width * 0.18, y + height * 0.5, width * 0.66, height * 0.5);
  context.fill();
}

function star(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
) {
  context.beginPath();
  for (let point = 0; point < 10; point++) {
    const radius = point % 2 === 0 ? r : r * 0.45;
    const angle = (Math.PI / 5) * point - Math.PI / 2;
    context.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
  }
  context.closePath();
  context.fill();
}

function clouds(context: CanvasRenderingContext2D, scene: Scene) {
  const { layout, level, cameraX, burst, time, reducedMotion } = scene;

  layout.challenges.forEach((challengeLayout, index) => {
    const challenge = level.challenges[index];
    if (!challenge) return;
    // Later challenges show blank clouds: one question at a time.
    const current = index === level.index;
    const past = index < level.index;

    challengeLayout.clouds.forEach((cloud, option) => {
      const x = cloud.x - cameraX;
      if (x + CLOUD_WIDTH < -20 || x > VIEW_WIDTH + 20) return;
      const rect = { ...cloud, x };
      const isAnswer = option === challenge.question.answerIndex;
      const crossed = challenge.crossed.includes(option);

      if (challenge.solved && isAnswer) {
        const bursting =
          !reducedMotion &&
          burst?.challenge === index &&
          burst.option === option &&
          time - burst.start < BURST_MS;
        if (!bursting) return;
        const progress = (time - (burst?.start ?? time)) / BURST_MS;
        context.fillStyle = COLORS.star;
        for (let ray = 0; ray < 8; ray++) {
          const angle = (Math.PI / 4) * ray;
          const distance = 10 + progress * 60;
          star(
            context,
            x + CLOUD_WIDTH / 2 + Math.cos(angle) * distance,
            cloud.y + CLOUD_HEIGHT / 2 + Math.sin(angle) * distance,
            8 * (1 - progress) + 2,
          );
        }
        return;
      }

      context.fillStyle = COLORS.cloudShade;
      cloudShape(context, { ...rect, y: rect.y + 4 });
      context.fillStyle = crossed || past ? COLORS.crossed : COLORS.cloud;
      cloudShape(context, rect);

      if (!current) return;
      const text = challenge.question.options[option]?.text ?? "";
      context.fillStyle = COLORS.text;
      context.font = challenge.question.optionsInLanguage
        ? "bold 18px system-ui, sans-serif"
        : "28px system-ui, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(
        text,
        x + CLOUD_WIDTH / 2,
        cloud.y + CLOUD_HEIGHT * 0.6,
        CLOUD_WIDTH - 16,
      );

      if (crossed) {
        context.strokeStyle = COLORS.cross;
        context.lineWidth = 4;
        context.beginPath();
        context.moveTo(x + 22, cloud.y + 16);
        context.lineTo(x + CLOUD_WIDTH - 22, cloud.y + CLOUD_HEIGHT - 6);
        context.stroke();
      }
    });
  });
}

function doors(context: CanvasRenderingContext2D, scene: Scene) {
  const { layout, level, cameraX, door, time, reducedMotion } = scene;

  layout.challenges.forEach((challengeLayout, index) => {
    const x = challengeLayout.doorX - cameraX;
    if (x + DOOR_WIDTH < -40 || x > VIEW_WIDTH + 40) return;
    const top = GROUND_Y - DOOR_HEIGHT;
    const solved = level.challenges[index]?.solved ?? false;

    // Frame posts stay; the door itself swings open once solved.
    context.fillStyle = COLORS.woodDark;
    context.fillRect(x - 6, top - 8, DOOR_WIDTH + 12, 8);

    let open = solved ? 1 : 0;
    if (solved && !reducedMotion && door?.challenge === index) {
      open = Math.min(1, (time - door.start) / DOOR_MS);
    }
    const width = DOOR_WIDTH * (1 - open * 0.8);

    context.fillStyle = COLORS.wood;
    context.fillRect(x, top, width, DOOR_HEIGHT);
    context.fillStyle = COLORS.woodDark;
    for (let plank = 1; plank < 3; plank++) {
      context.fillRect(x + (width / 3) * plank, top, 2, DOOR_HEIGHT);
    }
    if (open < 1) {
      context.fillStyle = COLORS.lock;
      context.fillRect(x + width / 2 - 6, top + DOOR_HEIGHT / 2 - 6, 12, 12);
    }
  });
}

function finish(context: CanvasRenderingContext2D, scene: Scene) {
  const x = scene.layout.finishX - scene.cameraX;
  if (x < -120 || x > VIEW_WIDTH + 40) return;
  context.fillStyle = COLORS.pole;
  context.fillRect(x, GROUND_Y - 150, 6, 150);
  context.fillStyle = COLORS.banner;
  context.fillRect(x + 6, GROUND_Y - 150, 76, 30);
  context.fillStyle = COLORS.white;
  context.font = "bold 18px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("META", x + 44, GROUND_Y - 135);
  context.font = "34px system-ui, sans-serif";
  context.fillText("🏆", x + 44, GROUND_Y - 90);
}

/** Pip, a fox drawn with shapes, facing the way it last moved. */
function pip(context: CanvasRenderingContext2D, scene: Scene) {
  const { body, cameraX, time, reducedMotion } = scene;
  const x = body.x - cameraX;
  const y = body.y;
  const running = body.onGround && body.vx !== 0 && !reducedMotion;
  const step = running ? Math.sin(time / 60) * 3 : 0;

  context.save();
  context.translate(x + BODY_WIDTH / 2, y);
  context.scale(body.facing, 1);
  context.translate(-BODY_WIDTH / 2, 0);

  // Tail with a white tip.
  context.fillStyle = COLORS.fox;
  context.beginPath();
  context.ellipse(4, BODY_HEIGHT - 16, 9, 6, -0.6, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = COLORS.white;
  context.beginPath();
  context.arc(-2, BODY_HEIGHT - 21, 3.5, 0, Math.PI * 2);
  context.fill();

  // Legs.
  context.fillStyle = COLORS.foxDark;
  context.fillRect(10, BODY_HEIGHT - 8 + step, 5, 8 - step);
  context.fillRect(20, BODY_HEIGHT - 8 - step, 5, 8 + step);

  // Body and chest.
  context.fillStyle = COLORS.fox;
  context.beginPath();
  context.ellipse(17, BODY_HEIGHT - 16, 11, 10, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = COLORS.white;
  context.beginPath();
  context.ellipse(21, BODY_HEIGHT - 14, 5, 7, 0, 0, Math.PI * 2);
  context.fill();

  // Head, ears, snout, eye, nose.
  context.fillStyle = COLORS.fox;
  context.beginPath();
  context.arc(22, 12, 10, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.moveTo(14, 6);
  context.lineTo(16, -4);
  context.lineTo(21, 4);
  context.moveTo(23, 4);
  context.lineTo(28, -4);
  context.lineTo(30, 7);
  context.fill();
  context.fillStyle = COLORS.white;
  context.beginPath();
  context.ellipse(29, 16, 6, 4, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = COLORS.eye;
  context.beginPath();
  context.arc(25, 10, 1.8, 0, Math.PI * 2);
  context.arc(34, 15, 1.6, 0, Math.PI * 2);
  context.fill();

  context.restore();
}

export function drawScene(context: CanvasRenderingContext2D, scene: Scene) {
  background(context, scene.cameraX);
  ground(context, scene.cameraX);
  finish(context, scene);
  doors(context, scene);
  clouds(context, scene);
  pip(context, scene);
}
