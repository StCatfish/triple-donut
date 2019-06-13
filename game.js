"use strict";
const GAME_WIDTH = 960; // pixels
const GAME_HEIGHT = 1280; // pixels

const SELECTED_MULTIPLIER = 1.2;

const DURATION_MOVE = 260; // milliseconds
const DURATION_POP = 55; // milliseconds
const FRAMERATE_POP = 20; // frames per second
const DURATION_SELECT = 55; // milliseconds
const DURATION_HIGHLIGHT = 510; // milliseconds

const SPECIAL_THRESHOLD = 10; // gems
const GAME_DURATION = 60; // seconds
const HELP_DELAY = 5000; // milliseconds

const container = document.getElementById("canvasContainer");

let game;
let backgroundMusic;
let sfx = {};
var WebFontConfig;

function resizeContainer() {
  if (window.innerWidth / window.innerHeight > GAME_WIDTH / GAME_HEIGHT){
    container.style.height = window.innerHeight + "px";
    container.style.width = window.innerHeight * (GAME_WIDTH / GAME_HEIGHT) + "px";
    container.style.left = (window.innerWidth - window.innerHeight * (GAME_WIDTH / GAME_HEIGHT)) / 2 + "px";
    container.style.top = "0px";
  } else {
    container.style.width = window.innerWidth + "px";
    container.style.height = window.innerWidth / (GAME_WIDTH / GAME_HEIGHT) + "px";
    container.style.left = "0px";
    container.style.top = (window.innerHeight - window.innerWidth / (GAME_WIDTH / GAME_HEIGHT)) / 2 + "px";
  }
}

// HELPERS

function zeroFillToLength(text, length){
  let resultingText = text + "";
  while (resultingText.length < length) {
    resultingText = "0" + resultingText;
  }
  return resultingText;
}

class AttachedPromisePool {
  constructor () {
    this.attachedPromises = [];
  }

  createPromise = (func) => {
    const attachedPromise = {
      promise: null,
      resolve: null,
      reject: null,
    }
    attachedPromise.promise = new Promise((promiseResolve, promiseReject) => {
      attachedPromise.resolve = promiseResolve;
      attachedPromise.reject = promiseReject;
      const resolve = (...argv) => {
        this.attachedPromises = this.attachedPromises.filter(p => p !== attachedPromise);
        promiseResolve(...argv);
      };
      const reject = (...argv) => {
        this.attachedPromises = this.attachedPromises.filter(p => p !== attachedPromise);
        promiseReject(...argv);
      };

      func(resolve, reject);
    });
    this.attachedPromises.push(attachedPromise);
    return attachedPromise.promise;
  }

  resolveAll = (...argv) => {
    this.attachedPromises.forEach(attachedPromise => {
      attachedPromise.resolve(...argv);
    });
    this.attachedPromises = [];
  }

  rejectAll = (...argv) => {
    this.attachedPromises.forEach(attachedPromise => {
      attachedPromise.reject(...argv);
    });
    this.attachedPromises = [];
  }

  allPromise = () => {
    return Promise.all(this.attachedPromises.map(aP => aP.promise))
  }
}

class Waiter {
  constructor () {
    this.slaves = 0;
    this.allFreeListeners = [];
    this.allSlaveListeners = [];
  }

  enslave = () => {
    if (this.slaves === 0) {
      this.allSlaveListeners.forEach(res => res());
      this.allSlaveListeners = [];
    }
    this.slaves++;
  }

  free = () => {
    this.slaves--;
    if (this.slaves === 0) {
      this.allFreeListeners.forEach(res => res());
      this.allFreeListeners = [];
    }
  }

  waitForAllFree = () => {
    return new Promise(res => {
      if (this.slaves === 0) {
        res();
      } else {
        this.allFreeListeners.push(res);
      }
    });
  }

  waitForAnySlave = () => {
    return new Promise(res => {
      if (this.slaves > 0) {
        res();
      } else {
        this.allSlaveListeners.push(res);
      }
    });
  }
}

// ELEMENTS

class MuteButton {
  static WIDTH = 143; // pixels
  static HEIGHT = 140; // pixels
  constructor () {
    this.button = game.add.button(
      Field.OFFSET_X + Gem.SIZE * (Field.WIDTH - 0.5) - MuteButton.WIDTH / 2,
      (Field.OFFSET_Y - Gem.SIZE / 2) / 2,
      "muteButton",
    );
    this.button.onInputDown.add(this.onDown);
    this.button.onInputUp.add(this.onUp);
    this.button.anchor.set(0.5, 0.5);
    
    this.tweenPromises = new AttachedPromisePool();
  }

  onDown = () => {
    backgroundMusic.mute = !backgroundMusic.mute;
    this.shrink();
  }

  onUp = () => {
    this.expand();
  }

  shrink = async () => {
    const tween = game.add.tween(this.button).to(
      {
        width: MuteButton.WIDTH / SELECTED_MULTIPLIER,
        height: MuteButton.HEIGHT / SELECTED_MULTIPLIER,
        alpha: backgroundMusic.mute ? 0.5 : 1,
      },
      DURATION_SELECT,
      Phaser.Easing.Cubic.Out,
      true
    );
    return this.tweenPromises.createPromise(resolve => tween.onComplete.add(resolve));
  }

  expand = async () => {
    const tween = game.add.tween(this.button).to(
      { width: MuteButton.WIDTH, height: MuteButton.HEIGHT },
      DURATION_SELECT,
      Phaser.Easing.Cubic.Out,
      true
    );
    return this.tweenPromises.createPromise(resolve => tween.onComplete.add(resolve));
  }

  destroy = () => {
    this.tweenPromises.resolveAll();
    this.button.destroy();
  }
}

class MegaDonut {
  static WIDTH = 450; // pixels
  static HEIGHT = 450; // pixels
  constructor () {
    this.button = game.add.button(GAME_WIDTH / 2, GAME_HEIGHT / 2, "megaDonut");
    this.button.onInputDown.add(this.shrink);
    this.button.onInputUp.add(this.expand);
    this.button.anchor.set(0.5, 0.5);
    this.button.width = MegaDonut.WIDTH;
    this.button.height = MegaDonut.HEIGHT;

    this.tweenPromises = new AttachedPromisePool();
  }

  shrink = async () => {
    const tween = game.add.tween(this.button).to(
      { width: MegaDonut.WIDTH / SELECTED_MULTIPLIER, height: MegaDonut.HEIGHT / SELECTED_MULTIPLIER },
      DURATION_SELECT,
      Phaser.Easing.Cubic.Out,
      true
    );
    return this.tweenPromises.createPromise(resolve => tween.onComplete.add(resolve));
  }

  expand = async () => {
    const tween = game.add.tween(this.button).to(
      { width: MegaDonut.WIDTH, height: MegaDonut.HEIGHT },
      DURATION_SELECT,
      Phaser.Easing.Cubic.Out,
      true
    );
    return this.tweenPromises.createPromise(resolve => tween.onComplete.add(resolve));
  }

  destroy = () => {
    this.tweenPromises.resolveAll();
    this.button.destroy();
  }
}

class StartGameButton {
  static WIDTH = 286; // pixels
  static HEIGHT = 180; // pixels
  constructor (startGame) {
    this.startGame = startGame;
    this.button = game.add.button(GAME_WIDTH / 2, GAME_HEIGHT * 0.8, "startGameButton");
    this.button.onInputDown.add(this.onDown);
    this.button.onInputUp.add(this.onUp);
    this.button.anchor.set(0.5, 0.5);

    this.tweenPromises = new AttachedPromisePool();
  }

  onDown = () => {
    this.shrink();
  }

  onUp = () => {
    this.expand();
    this.startGame();
  }

  shrink = async () => {
    const tween = game.add.tween(this.button).to(
      {
        width: StartGameButton.WIDTH / SELECTED_MULTIPLIER,
        height: StartGameButton.HEIGHT / SELECTED_MULTIPLIER 
      },
      DURATION_SELECT,
      Phaser.Easing.Cubic.Out,
      true
    );
    return this.tweenPromises.createPromise(resolve => tween.onComplete.add(resolve));
  }

  expand = async () => {
    const tween = game.add.tween(this.button).to(
      { width: StartGameButton.WIDTH, height: StartGameButton.HEIGHT },
      DURATION_SELECT,
      Phaser.Easing.Cubic.Out,
      true
    );
    return this.tweenPromises.createPromise(resolve => tween.onComplete.add(resolve));
  }

  destroy = () => {
    this.tweenPromises.resolveAll();
    this.button.destroy();
  }
}

class Gem {
  static SIZE = 100; // pixels
  static gemList = [
    {
      name: "empty",
      randomWeight: 0,
      isSpecial: true,
      popAnimation: [],
    },
    {
      name: "red",
      randomWeight: 10,
      isSpecial: false,
      popAnimation: [0,5,6,7],
    },
    {
      name: "blue",
      randomWeight: 10,
      isSpecial: false,
      popAnimation: [1,5,6,7],
    },
    {
      name: "green",
      randomWeight: 10,
      isSpecial: false,
      popAnimation: [2,5,6,7],
    },
    {
      name: "lightblue",
      randomWeight: 10,
      isSpecial: false,
      popAnimation: [3,5,6,7],
    },
    {
      name: "yellow",
      randomWeight: 10,
      isSpecial: false,
      popAnimation: [4,5,6,7],
    },
    {
      name: "pink",
      randomWeight: 10,
      isSpecial: false,
      popAnimation: [0,5,6,7],
    },
    {
      name: "anyColor",
      randomWeight: 3,
      isSpecial: true,
      popAnimation: [4,5,6,7],
    },
    {
      name: "cross",
      randomWeight: 1,
      isSpecial: true,
      popAnimation: [4,5,6,7],
    },
    {
      name: "vertical",
      randomWeight: 1,
      isSpecial: true,
      popAnimation: [4,5,6,7],
    },
    {
      name: "horizontal",
      randomWeight: 1,
      isSpecial: true,
      popAnimation: [4,5,6,7],
    },
    {
      name: "plusTime",
      randomWeight: 2,
      isSpecial: true,
      popAnimation: [4,5,6,7],
    },
    {
      name: "doublePoints",
      randomWeight: 2,
      isSpecial: true,
      popAnimation: [4,5,6,7],
    },
  ];

  static getRandomGemNameFromList(gemList) {
    const weightedGemNamesList = gemList.reduce((list, gem) => {
      for (let i = 0; i < gem.randomWeight; i++){
        list.push(gem.name);
      }
      return list;
    }, []);
    const randomGemName = game.rnd.pick(weightedGemNamesList);
    return randomGemName;
  }

  static getRandomGemName = (allowSpecial) => {
    const gemList = allowSpecial ? this.gemList : this.gemList.filter(gem => !gem.isSpecial)
    return this.getRandomGemNameFromList(gemList);
  }

  constructor(row, col, gemName) {
    const gemId = Gem.gemList.findIndex(gem => gem.name === gemName);
    if (gemId === -1) {
      throw new Error("Invalid gemName passed to Gem constructor");
    }
    const coords = Field.getCoordsByGemPos(row, col);
    if (!coords.valid) {
      throw new Error("Invalid position passed to Gem constructor");
    }

    const gem = Gem.gemList[gemId];
    this.name = gemName;
    this.isSpecial = gem.isSpecial;
    this.popAnimation = gem.popAnimation;
    this.row = row;
    this.col = col;
    this.tweenPromises = new AttachedPromisePool();

    this.sprite = game.add.sprite(coords.x, coords.y, "gems", gemId);
    this.sprite.anchor.setTo(0.5, 0.5);
  }

  destroy = () => {
    this.tweenPromises.resolveAll();
    this.sprite.destroy();
    if (this.animationSprite) {
      this.animationSprite.destroy();
    }
  }

  pop = async () => {
    await this.disappear();
    this.destroy();
  }

  moveTo = async (row, col) => {
    const coords = Field.getCoordsByGemPos(row, col);
    if (!coords.valid) {
      throw new Error("Invalid position passed to Gem.moveTo");
    }
    
    this.row = row;
    this.col = col;

    const tween = game.add.tween(this.sprite).to(
      { x: coords.x, y: coords.y },
      DURATION_MOVE,
      Phaser.Easing.Cubic.Out,
      true,
    );
    return this.tweenPromises.createPromise(resolve => tween.onComplete.add(resolve));
  }

  appear = async () => {
    const tween = game.add.tween(this.sprite).from(
      { y: -50 },
      DURATION_MOVE,
      Phaser.Easing.Cubic.Out,
      true
    );
    return this.tweenPromises.createPromise(resolve => tween.onComplete.add(resolve));
  }

  disappear = async () => {
    const coords = Field.getCoordsByGemPos(this.row, this.col);
    const tween = game.add.tween(this.sprite).to(
      { width: 0, height: 0 },
      DURATION_POP,
      Phaser.Easing.Cubic.In,
      true
    );
    await this.tweenPromises.createPromise(resolve => tween.onComplete.add(resolve));

    this.animationSprite = game.add.sprite(coords.x, coords.y, "particles", this.popAnimation[0]);
    this.animationSprite.anchor.set(0.5, 0.5);
    const anim = this.animationSprite.animations.add("pop", this.popAnimation, FRAMERATE_POP);
    anim.play();
    return this.tweenPromises.createPromise(resolve => anim.onComplete.add(resolve));
  }

  select = async () => {
    const tween = game.add.tween(this.sprite).to(
      { width: Gem.SIZE * SELECTED_MULTIPLIER, height: Gem.SIZE * SELECTED_MULTIPLIER },
      DURATION_SELECT,
      Phaser.Easing.Cubic.Out,
      true
    );
    return this.tweenPromises.createPromise(resolve => tween.onComplete.add(resolve));
  }

  deselect = async () => {
    const tween = game.add.tween(this.sprite).to(
      { width: Gem.SIZE, height: Gem.SIZE },
      DURATION_SELECT,
      Phaser.Easing.Cubic.Out,
      true
    );
    return this.tweenPromises.createPromise(resolve => tween.onComplete.add(resolve));
  }

  highlight = () => {
    this.highlightLoop = game.add.tween(this.sprite).loop().to(
      { width: Gem.SIZE * SELECTED_MULTIPLIER, height: Gem.SIZE * SELECTED_MULTIPLIER },
      DURATION_HIGHLIGHT,
      Phaser.Easing.Sinusoidal.InOut,
    ).to(
      { width: Gem.SIZE, height: Gem.SIZE },
      DURATION_HIGHLIGHT,
      Phaser.Easing.Sinusoidal.InOut,
    ).start();
  }

  unhighlight = () => { 
    this.highlightLoop.stop();
    this.sprite.width = Gem.SIZE;
    this.sprite.height = Gem.SIZE;
  }
}

class GameTimer {
  constructor(onFinish) {
    this.onFinish = onFinish;
    this.value = GAME_DURATION;
    this.text = game.add.text(Field.OFFSET_X - Gem.SIZE / 2, 60, this.getText(), {
      font: "55px Fredoka One",
      fill: "#FFFFFF",
      stroke: "#000000",
      strokeThickness: 5,
    });
    this.timer = game.time.events.loop(Phaser.Timer.SECOND, this.tick, this);
  }

  isRunning = () => {
    return this.value >= 0
  }

  tick = () => {
    this.value--;
    if (!this.isRunning()) {
      this.onFinish();
    } else {
      this.text.setText(this.getText());
      this.drawText();
    }
  }

  addTime = (time) => {
    this.value += time;
    this.drawText();
  }

  drawText = () => { 
    this.text.setText(this.getText());
    if (this.value <= 10) {
      this.text.fill = "#FF0000"
    } else {
      this.text.fill = "#FFFFFF"
    }
  }

  getText = () => {
    const value = this.value > 0 ? this.value : 0;
    return `${Math.trunc(value / 60)}:${zeroFillToLength(value % 60, 2)}`;
  }

  destroy = () => {
    this.text.destroy();
    game.time.events.remove(this.timer);
  }
}

class GameScore {
  constructor () {
    this.value = 0;
    this.textBg = game.add.sprite(GAME_WIDTH / 2, 0, "scoreBg");
    this.textBg.anchor.set(0.5, 0);
    this.text = game.add.text(GAME_WIDTH / 2 - 10, 60, this.getText(), {
      font: "55px Fredoka One",
      fill: "#FFFFFF",
      stroke: "#000000",
      strokeThickness: 5,
    });
    this.text.anchor.set(0.5, 0);
  }

  addScore = (score) => {
    this.value += 0 + score;
    this.text.setText(this.getText());
  }

  getScore = () => {
    return this.value;
  }
  
  getText = () => {
    return zeroFillToLength(this.value * 100, 9);
  }

  destroy = () => {
    this.textBg.destroy();
    this.text.destroy();
  }
}

class TimeUpBanner {
  static DURATION_TIME_UP = 1000; // milliseconds
  static DELAY_TIME_UP = 4000; // milliseconds
  constructor (timerCallback) {
    this.timerCallback = timerCallback;
    this.sprite = game.add.sprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, "timeUp");
    this.sprite.anchor.set(0.5, 0.5);
    const tween = game.add.tween(this.sprite).from(
      { y: GAME_HEIGHT * 1.5 },
      TimeUpBanner.DURATION_TIME_UP,
      Phaser.Easing.Back.Out,
      true
    );
    tween.onComplete.add(this.callBackAfterDelay);
  }

  destroy = () => {
    this.sprite.destroy();
  }

  callBackAfterDelay = () => {
    game.time.events.add(TimeUpBanner.DELAY_TIME_UP, this.timerCallback);
  }
}

// GAME LOGIC

class Field {
  static WIDTH = 8; // gems
  static HEIGHT = 10; // gems
  static OFFSET_X = ( GAME_WIDTH - ( Field.WIDTH - 1 ) * Gem.SIZE ) / 2; // pixels
  static OFFSET_Y = 240; // pixels

  static isValidPos = (row, col) => {
    return row >= 0 && row < Field.HEIGHT && col >= 0 && col < Field.WIDTH;
  }

  static getGemPosByCoords = (x, y) => {
    if (
      x < Field.OFFSET_X - Gem.SIZE / 2 || x >= Field.OFFSET_X - Gem.SIZE / 2 + Gem.SIZE * Field.WIDTH ||
      y < Field.OFFSET_Y - Gem.SIZE / 2 || y >= Field.OFFSET_Y - Gem.SIZE / 2 + Gem.SIZE * Field.HEIGHT  
    ) {
      return { valid: false, row: -1, col: -1 };
    }
    const position = {
      valid: true,
      row: Math.round((y - Field.OFFSET_Y) / Gem.SIZE),
      col: Math.round((x - Field.OFFSET_X) / Gem.SIZE),
    };
    return position;
  }

  static getCoordsByGemPos = (row, col) => {
    if (!Field.isValidPos(row, col)) {
      return { valid: false, x: -1, y: -1 }
    }
    const coords = {
      valid: true,
      x: col * Gem.SIZE + Field.OFFSET_X,
      y: row * Gem.SIZE + Field.OFFSET_Y,
    };
    return coords;
  }

  static createAndFill = () => {
    const field = new Field();
    field.fill(false, false);
    return field;
  }

  constructor() {
    this.gemMatrix = [];
    for (let r = 0; r < Field.HEIGHT; r++) {
      const row = [];
      for (let c = 0; c < Field.WIDTH; c++){
        row.push(new Gem(r, c, "empty"));
      }
      this.gemMatrix.push(row);
    }
  }

  destroy = () => {
    for (let r = 0; r < Field.HEIGHT; r++) {
      for (let c = 0; c < Field.WIDTH; c++){
        this.gemMatrix[r][c].destroy();
      }
    }
    this.gemMatrix = [];
  }

  areAdjacent = (gem1, gem2) => {
    const pos1 = this.getGemPos(gem1);
    const pos2 = this.getGemPos(gem2);
    return Math.abs(pos1.row - pos2.row) + Math.abs(pos1.col - pos2.col) === 1;
  }

  getGemByPos = (row, col) => {
    return this.gemMatrix[row][col];
  }

  getGemPos = (gem) => {
    const pos = {
      valid: false,
      row: -1,
      col: -1,
    }
    this.gemMatrix.forEach((row, rowId) => {
      const colId = row.indexOf(gem);
      if (colId !== -1) {
        pos.valid = true;
        pos.row = rowId;
        pos.col = colId;
      }
    });
    return pos;
  }

  isMatch = () => {
    const matchMatrix = this.getMatchMatrix();
    for (let r = 0; r < Field.HEIGHT; r++) {
      for (let c = 0; c < Field.WIDTH; c++) {
        if (matchMatrix[r][c]){
          return true;
        }
      }
    }
    return false;
  }

  getMatchMatrix = () => {
    const g = this.gemMatrix; // Shortcut
    const matchMatrix = [];
    for (let r = 0; r < Field.HEIGHT; r++) {
      const matchRow = [];
      for (let c = 0; c < Field.WIDTH; c++){
        matchRow.push(false);
      }
      matchMatrix.push(matchRow);
    }

    // Horizontal matches
    for (let r = 0; r < Field.HEIGHT; r++){
      for (let c = 0; c < Field.WIDTH - 2; c++){
        const curr3 = [g[r][c], g[r][c+1], g[r][c+2]];
        if (curr3.some(gem => gem.name === "empty")) {
          continue;
        }
        else {
          const nonSpecNames = curr3.filter(gem => !gem.isSpecial).map(gem => gem.name);
          if (nonSpecNames.length === 0 || nonSpecNames.every(name => name === nonSpecNames[0])) {
            for(let i = c; i <= c+2; i++) {
              matchMatrix[r][i] = true;
              // Special gems that pop other gems
              switch (g[r][i].name) {
                case "cross":
                  for (let j = 0; j < Field.HEIGHT; j++) {
                    matchMatrix[j][i] = true;
                  }
                  for (let j = 0; j < Field.WIDTH; j++) {
                    matchMatrix[r][j] = true;
                  }
                  break;
                case "vertical":
                  for (let j = 0; j < Field.HEIGHT; j++) {
                    matchMatrix[j][i] = true;
                  }
                  break;
                case "horizontal":
                  for (let j = 0; j < Field.WIDTH; j++) {
                    matchMatrix[r][j] = true;
                  }
                  break;
              }
            }
          }
        }
      }
    }

    // Vertical matches
    for (let c = 0; c < Field.WIDTH; c++){
      for (let r = 0; r < Field.HEIGHT - 2; r++){
        const curr3 = [g[r][c], g[r+1][c], g[r+2][c]];
        if (curr3.some(gem => gem.name === "empty")) {
          continue;
        }
        else {
          const nonSpecNames = curr3.filter(gem => !gem.isSpecial).map(gem => gem.name);
          if (nonSpecNames.length === 0 || nonSpecNames.every(name => name === nonSpecNames[0])) {
            for(let i = r; i <= r+2; i++) {
              matchMatrix[i][c] = true;
              // Special gems that pop other gems
              switch (g[i][c].name) {
                case "cross":
                  for (let j = 0; j < Field.HEIGHT; j++) {
                    matchMatrix[j][c] = true;
                  }
                  for (let j = 0; j < Field.WIDTH; j++) {
                    matchMatrix[i][j] = true;
                  }
                  break;
                case "vertical":
                  for (let j = 0; j < Field.HEIGHT; j++) {
                    matchMatrix[j][c] = true;
                  }
                  break;
                case "horizontal":
                  for (let j = 0; j < Field.WIDTH; j++) {
                    matchMatrix[i][j] = true;
                  }
                  break;
              }
            }
          }
        }
      }
    }
    return matchMatrix;
  }

  getHelp = () => {
    const g = this.gemMatrix; // Shortcut
    
    // Horizontal moves
    for (let r = Field.HEIGHT - 1; r >= 0; r--){
      for (let c = Field.WIDTH - 2; c >= 0; c--) {
        if (Field.isValidPos(r, c+1) && g[r][c].name === g[r][c+1].name) {
          if (Field.isValidPos(r, c-1)){
            if (Field.isValidPos(r-1, c-1) && g[r][c].name === g[r-1][c-1].name) {
              return [ g[r][c-1], g[r-1][c-1] ];
            }
            if (Field.isValidPos(r, c-2) && g[r][c].name === g[r][c-2].name) {
              return [ g[r][c-1], g[r][c-2] ];
            }
            if (Field.isValidPos(r+1, c-1) && g[r][c].name === g[r+1][c-1].name) {
              return [ g[r+1][c-1], g[r][c-1] ];
            }
          }
          if (Field.isValidPos(r, c+2)){
            if (Field.isValidPos(r-1, c+2) && g[r][c].name === g[r-1][c+2].name) {
              return [ g[r][c+2], g[r-1][c+2] ];
            }
            if (Field.isValidPos(r, c+3) && g[r][c].name === g[r][c+3].name) {
              return [ g[r][c+3], g[r][c+2] ];
            }
            if (Field.isValidPos(r+1, c+2) && g[r][c].name === g[r+1][c+2].name) {
              return [ g[r+1][c+2], g[r][c+2] ];
            }
          }
        }
        if (Field.isValidPos(r, c+2) && g[r][c].name === g[r][c+2].name) {
          if (Field.isValidPos(r-1, c+1) && g[r][c].name === g[r-1][c+1].name) {
            return [ g[r][c+1], g[r-1][c+1] ];
          }
          if (Field.isValidPos(r+1, c+1) && g[r][c].name === g[r+1][c+1].name) {
            return [ g[r+1][c+1], g[r][c+1] ];
          }
        }
      }
    }

    // Vertical moves
    for (let c = Field.WIDTH - 1; c >= 0; c--){
      for (let r = Field.HEIGHT - 2; r >= 0; r--) {
        if (Field.isValidPos(r+1, c) && g[r][c].name === g[r+1][c].name) {
          if (Field.isValidPos(r-1, c)){
            if (Field.isValidPos(r-1, c-1) && g[r][c].name === g[r-1][c-1].name) {
              return [ g[r-1][c], g[r-1][c-1] ];
            }
            if (Field.isValidPos(r-2, c) && g[r][c].name === g[r-2][c].name) {
              return [ g[r-1][c], g[r-2][c] ];
            }
            if (Field.isValidPos(r-1, c+1) && g[r][c].name === g[r-1][c+1].name) {
              return [ g[r-1][c+1], g[r-1][c] ];
            }
          }
          if (Field.isValidPos(r+2, c)){
            if (Field.isValidPos(r+2, c-1) && g[r][c].name === g[r+2][c-1].name) {
              return [ g[r+2][c], g[r+2][c-1] ];
            }
            if (Field.isValidPos(r+3, c) && g[r][c].name === g[r+3][c].name) {
              return [ g[r+3][c], g[r+2][c] ];
            }
            if (Field.isValidPos(r+2, c+1) && g[r][c].name === g[r+2][c+1].name) {
              return [ g[r+2][c+1], g[r+2][c] ];
            }
          }
        }
        if (Field.isValidPos(r+2, c) && g[r][c].name === g[r+2][c].name) {
          if (Field.isValidPos(r+1, c-1) && g[r][c].name === g[r+1][c-1].name) {
            return [ g[r+1][c], g[r+1][c-1] ];
          }
          if (Field.isValidPos(r+1, c+1) && g[r][c].name === g[r+1][c+1].name) {
            return [ g[r+1][c+1], g[r+1][c] ];
          }
        }
      }
    }

    return [];
  }

  fill = async (canMatch, allowSpecial) => {
    const anims = [];
    for (let c = 0; c < Field.WIDTH; c++){
      for (let r = Field.HEIGHT - 1; r >= 0; r--){
        if (this.gemMatrix[r][c].name !== "empty") {
          continue;
        }

        let gemAbove = null;
        for (let i = r - 1; i >= 0; i--) {
          if (this.gemMatrix[i][c].name !== "empty") {
            gemAbove = this.gemMatrix[i][c];
            break;
          }
        }

        if (gemAbove) {
          const swapAnim = this.swap(this.gemMatrix[r][c], gemAbove);
          anims.push(swapAnim);
        }
        else {
          do {
            this.gemMatrix[r][c].destroy();
            this.gemMatrix[r][c] = new Gem(r, c, Gem.getRandomGemName(allowSpecial));
          } while (!canMatch && this.isMatch());
          const appearAnim = this.gemMatrix[r][c].appear();
          anims.push(appearAnim);
        }
      }
    }
    return Promise.all(anims);
  }

  swap = async (gem1, gem2) => {
    const pos1 = this.getGemPos(gem1);
    const pos2 = this.getGemPos(gem2);
    const anim1 = gem1.moveTo(pos2.row, pos2.col);
    const anim2 = gem2.moveTo(pos1.row, pos1.col);
    this.gemMatrix[pos2.row][pos2.col] = gem1;
    this.gemMatrix[pos1.row][pos1.col] = gem2;
    await Promise.all([anim1, anim2]);
  }

  popMatches = async () => {
    const g = this.gemMatrix; // Shortcut
    const anims = [];
    const matchMatrix = this.getMatchMatrix();
    let doublers = 0;
    let timers = 0;
    let score = 0;
    for (let r = 0; r < Field.HEIGHT; r++) {
      for (let c = 0; c < Field.WIDTH; c++) {
        if (matchMatrix[r][c]){
          score++;
          // Special gems that were not accounted for in Field.getMatchMatrix()
          switch (g[r][c].name) {
            case "plusTime":
              timers++;
              break;
            case "doublePoints":
              doublers++;
              break;
          }
          anims.push(g[r][c].pop());
          g[r][c] = new Gem(r, c, "empty");
        }
      }
    }
    await Promise.all(anims);
    return {
      time: timers * 5,
      score: score * (2 ** doublers),
    };
  }
}

class HelpGetter {
  constructor (noActionWaiter, field) {
    this.noActionWaiter = noActionWaiter;
    this.field = field;

    this.timer = null;
    this.highlightedGems = [];
    this.pointer = null;

    this.startInactivityTimer();
  }

  destroy = () => {
    if (this.timer) {
      game.time.events.remove(this.timer);
      this.timer = null;
    }
    if (this.pointer) {
      this.pointer.destroy();
    }
    this.highlightedGems.forEach(gem => gem.unhighlight());
    this.highlightedGems = [];
  }

  startInactivityTimer = () => {
    this.timer = game.time.events.add(HELP_DELAY, this.showHelper);
    this.noActionWaiter.waitForAnySlave().then(this.cancelInactivityTimer);
  }
  
  cancelInactivityTimer = () => {
    if (this.timer) {
      game.time.events.remove(this.timer);
      this.timer = null;
      this.noActionWaiter.waitForAllFree().then(this.startInactivityTimer);
    }
  }

  showHelper = () => {
    game.time.events.remove(this.timer);
    this.timer = null;

    this.highlightedGems = this.field.getHelp();
    this.highlightedGems.forEach(gem => gem.highlight());

    const coords = Field.getCoordsByGemPos(this.highlightedGems[0].row, this.highlightedGems[0].col);
    this.pointer = game.add.sprite(coords.x, coords.y + 50, "pointer");
    this.pointer.anchor.set(0.25, 0);
    game.add.tween(this.pointer).loop().to(
      { y: coords.y },
      DURATION_HIGHLIGHT,
      Phaser.Easing.Sinusoidal.InOut,
    ).to(
      { y: coords.y + 50 },
      DURATION_HIGHLIGHT,
      Phaser.Easing.Sinusoidal.InOut,
    ).start();

    this.noActionWaiter.waitForAnySlave().then(this.removeHelper);
  }

  removeHelper = () => {
    this.destroy();
    this.startInactivityTimer();
  }
}

class M3Game {
  constructor (goToMainMenu) {
    this.goToMainMenu = goToMainMenu;
    this.specialWaves = 0;
    this.selectedGem = null;
    this.gameOver = false;
    this.isSwiping = false;
    this.isClickable = true;
    this.runningHandlers = 0;
    this.noActionWaiter = new Waiter();
    
    this.field = Field.createAndFill();
    this.timer = new GameTimer(this.finishGame);
    this.score = new GameScore();
    this.muteButton = new MuteButton();

    this.helpGetter = new HelpGetter(this.noActionWaiter, this.field);
    
    game.input.onDown.add(this.onDown);
    game.input.onUp.add(this.onUp);
    game.input.addMoveCallback(this.onMove);
  }

  destroy = () => {
    this.field.destroy();
    this.timer.destroy();
    this.score.destroy();
    this.muteButton.destroy();
    this.helpGetter.destroy();
    this.timeUpBanner.destroy();
  }

  finishGame = async () => {
    if (this.gameOver) {
      return;
    }
    this.gameOver = true;
    await this.noActionWaiter.waitForAllFree();
    if (this.timer.isRunning()) {
      this.gameOver = false;
      return;
    } else {
      this.timeUpBanner = new TimeUpBanner(() => {
        this.destroy();
        this.goToMainMenu();
      });
    }
  }

  swapWithSelected = async (anotherGem) => {
    if (!this.field.areAdjacent(this.selectedGem, anotherGem)) {
      throw new Error("Non-adjacent gems passed to M3Game.swapAdjacentGems");
    }
    
    sfx.getRandomSelect().play();
    const deselectAnim = this.selectedGem.deselect();
    const swapAnim = this.field.swap(anotherGem, this.selectedGem);
    await Promise.all([deselectAnim, swapAnim]);

    if (!this.field.isMatch()) {
      sfx.getRandomSelect().play();
      await this.field.swap(anotherGem, this.selectedGem);
    }
    else {
      while (this.field.isMatch()) {
        sfx.kill.play();
        const pop = await this.field.popMatches();
        this.score.addScore(pop.score);
        this.timer.addTime(pop.time);
        let allowSpecial = false;
        if (this.score.getScore() >= this.specialWaves + 1 * SPECIAL_THRESHOLD) {
          this.specialWaves++;
          allowSpecial = true;
        }
        await this.field.fill(true, allowSpecial);
      }
    }
    this.selectedGem = null;
  }

  onDown = async (pointer) => {
    if (this.gameOver) {
      return;
    }
    if (!this.isClickable) {
      return;
    }
    const pos = Field.getGemPosByCoords(pointer.x, pointer.y);
    if (!pos.valid) {
      return;
    }

    this.noActionWaiter.enslave();
    this.isClickable = false;
    const clickedGem = this.field.getGemByPos(pos.row, pos.col);

    if (!this.selectedGem) {
      this.selectedGem = clickedGem;
      this.selectedGem.select();
      sfx.getRandomSelect().play();
      this.isSwiping = true;
    } 
    else if (this.field.areAdjacent(clickedGem, this.selectedGem)) {
      await this.swapWithSelected(clickedGem);
      this.isClickable = true;
    }
    else if (clickedGem === this.selectedGem) {
      this.selectedGem.deselect();
      this.selectedGem = null;
      this.isClickable = true;
    }
    else {
      this.selectedGem.deselect();
      this.selectedGem = clickedGem;
      this.selectedGem.select();
      sfx.getRandomSelect().play();
      this.isSwiping = true;
    }
    this.noActionWaiter.free();
  }

  onMove = async (pointer) => {
    if (this.gameOver) {
      return;
    }
    if (!this.isSwiping) {
      return;
    }
    const pos = Field.getGemPosByCoords(pointer.x, pointer.y);
    if (!pos.valid) {
      return;
    }
    
    const hoveredGem = this.field.getGemByPos(pos.row, pos.col);
    
    if (this.field.areAdjacent(hoveredGem, this.selectedGem)) {
      this.noActionWaiter.enslave();
      this.isClickable = false;
      this.isSwiping = false;
      await this.swapWithSelected(hoveredGem);
      this.isClickable = true;
      this.noActionWaiter.free();
    }
  }

  onUp = () => {
    if (this.isSwiping) {
      this.isClickable = true;
      this.isSwiping = false;
    }
  }
}

class MainMenu {
  constructor (startGame) {
    this.startGame = startGame;

    this.logo = game.add.image(GAME_WIDTH / 2, GAME_HEIGHT * 0.2, "logo");
    this.logo.anchor.set(0.5, 0.5);

    this.megaDonut = new MegaDonut();
    this.startGameButton = new StartGameButton(this.onStartGame);
    this.muteButton = new MuteButton();
  }

  destroy = () => {
    this.logo.destroy();
    this.megaDonut.destroy();
    this.startGameButton.destroy();
    this.muteButton.destroy();
  }

  onStartGame = () => {
    this.destroy();
    this.startGame();
  }
}

class RootState extends Phaser.State {
  init = () => {
    game.scale.scaleMode = Phaser.ScaleManager.EXACT_FIT;
  }

  preload = () => {
    this.fontLoadPromise = new Promise(resolve => {
      WebFontConfig = {
        inactive: resolve,
        active: resolve,
        google: {
          families: ["Fredoka One"]
        }
      };
    })

    game.load.image("background", "assets/images/background.jpg");
    game.load.image("logo", "assets/images/logo.png");
    game.load.image("megaDonut", "assets/images/megaDonut.png");
    game.load.image("startGameButton", "assets/images/startGameButton.png");
    game.load.image("muteButton", "assets/images/muteButton.png");
    game.load.image("scoreBg", "assets/images/scoreBg.png");
    game.load.image("timeUp", "assets/images/timeUp.png");
    game.load.image("pointer", "assets/images/pointer.png");

    game.load.spritesheet("particles", "assets/images/particle_spritesheet.png", Gem.SIZE, Gem.SIZE);
    game.load.spritesheet("gems", "assets/images/gem_spritesheet.png", Gem.SIZE, Gem.SIZE);
    
    game.load.audio("backgroundMusic", "assets/audios/backgroundMusic.mp3");
    game.load.audio("kill", "assets/audios/kill.mp3");
    game.load.audio("select1", "assets/audios/select1.mp3");
    game.load.audio("select2", "assets/audios/select2.mp3");
    game.load.audio("select3", "assets/audios/select3.mp3");
    game.load.audio("select4", "assets/audios/select4.mp3");
    game.load.audio("select5", "assets/audios/select5.mp3");
    game.load.audio("select6", "assets/audios/select6.mp3");
    game.load.audio("select7", "assets/audios/select7.mp3");
    game.load.audio("select8", "assets/audios/select8.mp3");
    game.load.audio("select9", "assets/audios/select9.mp3");

    game.load.script("webfont", "//ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js");
  }

  create = async () => {
    await this.fontLoadPromise;

    const background = game.add.sprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, "background");
    background.anchor.set(0.5, 0.5);
    background.rotation = Phaser.Math.HALF_PI;

    backgroundMusic = game.add.audio("backgroundMusic");
    backgroundMusic.loop = true;
    backgroundMusic.play();

    sfx = {
      kill: game.add.sound("kill"),
      select1: game.add.sound("select1"),
      select2: game.add.sound("select2"),
      select3: game.add.sound("select3"),
      select4: game.add.sound("select4"),
      select5: game.add.sound("select5"),
      select6: game.add.sound("select6"),
      select7: game.add.sound("select7"),
      select8: game.add.sound("select8"),
      select9: game.add.sound("select9"),
      getRandomSelect: () => {
        return sfx["select" + game.rnd.between(1, 9)];
      }
    };

    this.startMenu();
  }

  startGame = () => {
    new M3Game(this.startMenu);
  }
  
  startMenu = () => {
    new MainMenu(this.startGame);
  }
}

window.addEventListener("resize", resizeContainer);
resizeContainer();

window.addEventListener("load", startGame);

function startGame () {
  game = new Phaser.Game(GAME_WIDTH, GAME_HEIGHT, Phaser.AUTO, container, RootState);
}
