"use strict";
const GAME_WIDTH = 1280;
const GAME_HEIGHT = 960;

const FIELD_WIDTH = 11;
const FIELD_HEIGHT = 8;
const FIELD_OFFSET_X = 140;
const FIELD_OFFSET_Y = 180;
const GEM_SIZE = 100;
const SELECTED_MULTIPLIER = 1.2;

const DURATION_MOVE = 273;
const DURATION_POP = 273;
const DURATION_SELECT = 68;
const DELAY_FALL = 10;

const SPECIAL_THRESHOLD = 10;

const container = document.getElementById("canvasContainer");

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

class Gem {
  static gemList = [
    {
      name: "empty",
      randomWeight: 0,
      isSpecial: true,
    },
    {
      name: "red",
      randomWeight: 10,
      isSpecial: false,
    },
    {
      name: "blue",
      randomWeight: 10,
      isSpecial: false,
    },
    {
      name: "green",
      randomWeight: 10,
      isSpecial: false,
    },
    {
      name: "lightblue",
      randomWeight: 10,
      isSpecial: false,
    },
    {
      name: "yellow",
      randomWeight: 10,
      isSpecial: false,
    },
    {
      name: "pink",
      randomWeight: 10,
      isSpecial: false,
    },
    {
      name: "anyColor",
      randomWeight: 3,
      isSpecial: true,
    },
    {
      name: "cross",
      randomWeight: 1,
      isSpecial: true,
    },
    {
      name: "vertical",
      randomWeight: 1,
      isSpecial: true,
    },
    {
      name: "horizontal",
      randomWeight: 1,
      isSpecial: true,
    },
    {
      name: "plusTime",
      randomWeight: 2,
      isSpecial: true,
    },
    {
      name: "doublePoints",
      randomWeight: 2,
      isSpecial: true,
    },
  ];

  constructor(row, col, gemName) {
    const gemId = Gem.gemList.findIndex(gem => gem.name === gemName);
    if (gemId === -1) {
      throw new Error("Invalid gemName passed to Gem constructor");
    }
    const coords = M3Game.getCoordsByGemPosition(row, col);
    if (!coords.valid) {
      throw new Error("Invalid position passed to Gem constructor");
    }

    const gem = Gem.gemList[gemId];
    this.name = gemName;
    this.isSpecial = gem.isSpecial;
    this.row = row;
    this.col = col;
    this.sprite = game.add.sprite(coords.x, coords.y, gemName);
    this.sprite.anchor.setTo(0.5, 0.5);

    this.animationResolves = [];
  }

  moveTo = async (row, col) => {
    const coords = M3Game.getCoordsByGemPosition(row, col);
    if (!coords.valid) {
      throw new Error("Invalid position passed to Gem.moveTo");
    }
    
    this.row = row;
    this.col = col;

    const tween = game.add.tween(this.sprite).to(
      { x: coords.x, y: coords.y },
      // DURATION_MOVE * game.math.distance(this.sprite.x, this.sprite.y, coords.x, coords.y) / GEM_SIZE,
      DURATION_MOVE,
      Phaser.Easing.Cubic.Out,
      true
    );
    return new Promise(resolve => {
      this.animationResolves.push(resolve);
      const customResolve = () => {
        this.animationResolves = this.animationResolves.filter(resolver => resolver !== resolve);
        resolve();
      }
      tween.onComplete.add(customResolve);
    });
  }

  appear = async () => {
    const initY = this.row * 100 - FIELD_HEIGHT * GEM_SIZE;
    const tween = game.add.tween(this.sprite).from(
      { y: this.row * 100 - FIELD_HEIGHT * GEM_SIZE },
      // DURATION_MOVE * Math.abs(this.sprite.x - initY) / GEM_SIZE,
      DURATION_MOVE,
      Phaser.Easing.Cubic.Out,
      true
    );
    return new Promise(resolve => {
      this.animationResolves.push(resolve);
      const customResolve = () => {
        this.animationResolves = this.animationResolves.filter(resolver => resolver !== resolve);
        resolve();
      }
      tween.onComplete.add(customResolve);
    });
  }

  disappear = async () => {
    const tween = game.add.tween(this.sprite).to(
      { width: 0, height: 0 },
      DURATION_POP,
      Phaser.Easing.Cubic.In,
      true
    );
    return new Promise(resolve => {
      this.animationResolves.push(resolve);
      const customResolve = () => {
        this.animationResolves = this.animationResolves.filter(resolver => resolver !== resolve);
        resolve();
      }
      tween.onComplete.add(customResolve);
    });
  }

  destroy = () => {
    this.animationResolves.forEach(resolver => resolver());
    this.sprite.destroy();
  }

  pop = async () => {
    await this.disappear();
    this.destroy();
  }

  select = async () => {
    const tween = game.add.tween(this.sprite).to(
      { width: GEM_SIZE * SELECTED_MULTIPLIER, height: GEM_SIZE * SELECTED_MULTIPLIER },
      DURATION_SELECT,
      Phaser.Easing.Cubic.Out,
      true
    );
    return new Promise(resolve => {
      this.animationResolves.push(resolve);
      const customResolve = () => {
        this.animationResolves = this.animationResolves.filter(resolver => resolver !== resolve);
        resolve();
      }
      tween.onComplete.add(customResolve);
    });
  }

  unselect = async () => {
    const tween = game.add.tween(this.sprite).to(
      { width: GEM_SIZE, height: GEM_SIZE },
      DURATION_SELECT,
      Phaser.Easing.Cubic.Out,
      true
    );
    return new Promise(resolve => {
      this.animationResolves.push(resolve);
      const customResolve = () => {
        this.animationResolves = this.animationResolves.filter(resolver => resolver !== resolve);
        resolve();
      }
      tween.onComplete.add(customResolve);
    });
  }

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
}

class Field {
  constructor() {
    this.gems = [];
    for (let r = 0; r < FIELD_HEIGHT; r++) {
      const row = [];
      for (let c = 0; c < FIELD_WIDTH; c++){
        row.push(new Gem(r, c, "empty"));
      }
      this.gems.push(row);
    }
  }

  static createAndFill = () => {
    const field = new Field();
    field.fill(false, false);
    return field;
  }

  areAdjacent = (gem1, gem2) => {
    const pos1 = this.getGemPos(gem1);
    const pos2 = this.getGemPos(gem2);
    return Math.abs(pos1.row - pos2.row) + Math.abs(pos1.col - pos2.col) === 1;
  }

  getGemByPos = (row, col) => {
    return this.gems[row][col];
  }

  getGemPos = (gem) => {
    const pos = {
      valid: false,
      row: -1,
      col: -1,
    }
    this.gems.forEach((row, rowId) => {
      const colId = row.indexOf(gem);
      if (colId !== -1) {
        pos.valid = true;
        pos.row = rowId;
        pos.col = colId;
      }
    });
    return pos;
  }

  fill = async (canMatch, allowSpecial) => {
    const anims = [];
    for (let c = 0; c < FIELD_WIDTH; c++){
      for (let r = FIELD_HEIGHT - 1; r >= 0; r--){
        if (this.gems[r][c].name !== "empty") {
          continue;
        }

        let gemAbove = null;
        for (let i = r - 1; i >= 0; i--) {
          if (this.gems[i][c].name !== "empty") {
            gemAbove = this.gems[i][c];
            break;
          }
        }

        if (gemAbove) {
          const swapAnim = this.swap(this.gems[r][c], gemAbove);
          anims.push(swapAnim);
        }
        else {
          do {
            this.gems[r][c].destroy();
            this.gems[r][c] = new Gem(r, c, Gem.getRandomGemName(allowSpecial));
          } while (!canMatch && this.isMatch());
          const appearAnim = this.gems[r][c].appear();
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
    this.gems[pos2.row][pos2.col] = gem1;
    this.gems[pos1.row][pos1.col] = gem2;
    console.log("swap start await");
    await Promise.all([anim1, anim2]);
    console.log("swap await ok");
  }

  getMatchMatrix = () => {
    const g = this.gems; // Shortcut
    const matchMatrix = [];
    for (let r = 0; r < FIELD_HEIGHT; r++) {
      const matchRow = [];
      for (let c = 0; c < FIELD_WIDTH; c++){
        matchRow.push(false);
      }
      matchMatrix.push(matchRow);
    }

    // Horizontal matches
    for (let r = 0; r < FIELD_HEIGHT; r++){
      for (let c = 0; c < FIELD_WIDTH - 2; c++){
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
                  for (let j = 0; j < FIELD_HEIGHT; j++) {
                    matchMatrix[j][i] = true;
                  }
                  for (let j = 0; j < FIELD_WIDTH; j++) {
                    matchMatrix[r][j] = true;
                  }
                  break;
                case "vertical":
                  for (let j = 0; j < FIELD_HEIGHT; j++) {
                    matchMatrix[j][i] = true;
                  }
                  break;
                case "horizontal":
                  for (let j = 0; j < FIELD_WIDTH; j++) {
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
    for (let c = 0; c < FIELD_WIDTH; c++){
      for (let r = 0; r < FIELD_HEIGHT - 2; r++){
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
                  for (let j = 0; j < FIELD_HEIGHT; j++) {
                    matchMatrix[j][c] = true;
                  }
                  for (let j = 0; j < FIELD_WIDTH; j++) {
                    matchMatrix[i][j] = true;
                  }
                  break;
                case "vertical":
                  for (let j = 0; j < FIELD_HEIGHT; j++) {
                    matchMatrix[j][c] = true;
                  }
                  break;
                case "horizontal":
                  for (let j = 0; j < FIELD_WIDTH; j++) {
                    matchMatrix[i][j] = true;
                  }
                  break;
              }
            }
          }
        }
      }
    }
    let str = "";
    for (let r = 0; r < FIELD_HEIGHT; r++){
      for (let c = 0; c < FIELD_WIDTH; c++){
        str += matchMatrix[r][c] ? "1" : "0";
      }
      str += "\n";
    }
    console.log(str);
    return matchMatrix;
  }

  isMatch = () => {
    const matchMatrix = this.getMatchMatrix();
    for (let r = 0; r < FIELD_HEIGHT; r++) {
      for (let c = 0; c < FIELD_WIDTH; c++) {
        if (matchMatrix[r][c]){
          return true;
        }
      }
    }
    return false;
  }

  popMatches = async () => {
    const g = this.gems; // Shortcut
    const anims = [];
    const matchMatrix = this.getMatchMatrix();
    let doublers = 0;
    let timers = 0;
    let score = 0;
    for (let r = 0; r < FIELD_HEIGHT; r++) {
      for (let c = 0; c < FIELD_WIDTH; c++) {
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

class M3Game {
  constructor() {
    this.score = 0;
    this.specialWaves = 0;
    this.selectedGem = null;
    this.interactive = true;
    this.field = Field.createAndFill();
    game.input.onDown.add(this.onClick);
  }

  onClick = async (pointer) => {
    if (!this.interactive) {
      return;
    }
    console.log('click started');
    this.interactive = false;
    const pos = M3Game.getGemPositionByCoords(pointer.x, pointer.y);
    if (!pos.valid) {
      this.interactive = true;
      return;
    }
    const clickedGem = this.field.getGemByPos(pos.row, pos.col);
    if (!this.selectedGem) {
      this.selectedGem = clickedGem;
      await this.selectedGem.select();
    } 
    else if (this.field.areAdjacent(clickedGem, this.selectedGem)) {
      console.log('start swap');
      const unselectAnim = this.selectedGem.unselect();
      const swapAnim = this.field.swap(clickedGem, this.selectedGem);
      await Promise.all[unselectAnim, swapAnim];
      console.log("anims ok");
      if (!this.field.isMatch()) {
        console.log("no match");
        await this.field.swap(clickedGem, this.selectedGem);
        console.log("anim ok");
      }
      else {
        while (this.field.isMatch()) {
          console.log("match!");
          const pop = await this.field.popMatches();
          this.score += pop.score;
          console.log(this.score);
          // plus timer
          let allowSpecial = false;
          if (this.score >= this.specialWaves + 1 * SPECIAL_THRESHOLD) {
            this.specialWaves++;
            allowSpecial = true;
          }
          await this.field.fill(true, allowSpecial);
          console.log('fill anim ok');
        }
      }
      this.selectedGem = null;
    }
    else {
      await this.selectedGem.unselect();
      this.selectedGem = null;
    }
    this.interactive = true;
    console.log('click finished!');
  }

  static getGemPositionByCoords(x, y){
    if (
      x < FIELD_OFFSET_X - 50 || x >= FIELD_OFFSET_X - 50 + GEM_SIZE * FIELD_WIDTH ||
      y < FIELD_OFFSET_Y - 50 || y >= FIELD_OFFSET_Y - 50 + GEM_SIZE * FIELD_HEIGHT  
    ) {
      return { valid: false, row: -1, col: -1 };
    }
    const position = {
      valid: true,
      row: Math.round((y - FIELD_OFFSET_Y) / GEM_SIZE),
      col: Math.round((x - FIELD_OFFSET_X) / GEM_SIZE),
    };
    return position;
  }

  static getCoordsByGemPosition(row, col){
    if (
      row < 0 || row >= FIELD_HEIGHT ||
      col < 0 || col >= FIELD_WIDTH
    ) {
      return { valid: false, x: -1, y: -1 }
    }
    const coords = {
      valid: true,
      x: col * GEM_SIZE + FIELD_OFFSET_X,
      y: row * GEM_SIZE + FIELD_OFFSET_Y,
    };
    return coords;
  }
}

window.addEventListener("resize", resizeContainer);
resizeContainer();

const game = new Phaser.Game(GAME_WIDTH, GAME_HEIGHT, Phaser.AUTO, container, {
  init,
  preload,
  create,
  update,
});

function init() {
  game.scale.scaleMode = Phaser.ScaleManager.EXACT_FIT;
}

function preload() {
  game.load.image("background", "test/images/backgrounds/background.jpg");
  game.load.audio("backgroundMusic", "test/audio/background.mp3");
  
  game.load.image("empty", "test/images/game/empty.png");
  game.load.image("red", "test/images/game/gem-01.png");
  game.load.image("blue", "test/images/game/gem-02.png");
  game.load.image("green", "test/images/game/gem-03.png");
  game.load.image("lightblue", "test/images/game/gem-04.png");
  game.load.image("yellow", "test/images/game/gem-05.png");
  game.load.image("pink", "test/images/game/gem-06.png");
  game.load.image("anyColor", "test/images/game/gem-07.png");
  game.load.image("cross", "test/images/game/gem-08.png");
  game.load.image("vertical", "test/images/game/gem-09.png");
  game.load.image("horizontal", "test/images/game/gem-10.png");
  game.load.image("plusTime", "test/images/game/gem-11.png");
  game.load.image("doublePoints", "test/images/game/gem-12.png");  
}

function create() {
  game.add.sprite(0, 0, "background");
  const backgroundMusic = game.add.audio("backgroundMusic");
  backgroundMusic.loop = true;
  backgroundMusic.play();
  setTimeout(() => new M3Game(), 1000);
}

function update() {
}