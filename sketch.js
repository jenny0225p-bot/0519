let classifier;
let video;
let label = "等待辨識...";
let confidence = 0;

// 遊戲狀態：START (初始), PLAYING (遊戲中), RESULT (顯示結果)
let state = 'START';
let playerChoice = '';
let aiChoice = '';
let resultText = '';

// TODO: 請將此處替換為您在 Teachable Machine 訓練好的模型連結
const modelURL = 'https://teachablemachine.withgoogle.com/models/YOUR_MODEL_ID/';

function preload() {
  // 載入 Teachable Machine 影像分類模型
  classifier = ml5.imageClassifier(modelURL + 'model.json');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();
  
  // 開始持續辨識影像
  classifyVideo();
}

function classifyVideo() {
  classifier.classify(video, gotResult);
}

function gotResult(results, error) {
  if (error) {
    console.error(error);
    return;
  }
  label = results[0].label;
  confidence = results[0].confidence;
  
  // 根據辨識結果更新遊戲邏輯
  updateGameState();
  
  // 繼續下一幀的辨識
  classifyVideo();
}

function updateGameState() {
  // 設定信心門檻，避免誤判 (0.8 表示 80% 信心)
  if (confidence < 0.8) return;

  if (state === 'START') {
    if (label === '👌🏻') { // 偵測到 OK 手勢開始遊戲
      state = 'PLAYING';
    }
  } else if (state === 'PLAYING') {
    const moves = ['石頭', '剪刀', '布'];
    if (moves.includes(label)) {
      playerChoice = label;
      aiChoice = random(moves); // AI 隨機出拳
      calculateWinner();
      state = 'RESULT';
    }
  } else if (state === 'RESULT') {
    if (label === '🤟🏻') { // 偵測到 🤟🏻 手勢回到主畫面
      resetGame();
    }
  }
}

function calculateWinner() {
  if (playerChoice === aiChoice) {
    resultText = "平手！";
  } else if (
    (playerChoice === '石頭' && aiChoice === '剪刀') ||
    (playerChoice === '剪刀' && aiChoice === '布') ||
    (playerChoice === '布' && aiChoice === '石頭')
  ) {
    resultText = "你贏了！✨";
  } else {
    resultText = "你輸了... 😭";
  }
}

function resetGame() {
  state = 'START';
  playerChoice = '';
  aiChoice = '';
  resultText = '';
}

function draw() {
  background(0);

  // 繪製攝影機影像（水平翻轉，讓玩家像照鏡子一樣方便對位）
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  
  // 恢復正常坐標系以繪製 UI 文字
  scale(-1, 1);
  translate(-width, 0);

  // 繪製半透明 UI 覆蓋層
  fill(0, 0, 0, 150);
  rect(0, 0, width, height);
  
  textAlign(CENTER, CENTER);
  fill(255);
  
  if (state === 'START') {
    textSize(42);
    text("請比出 👌🏻 手勢開始遊戲", width / 2, height / 2);
  } else if (state === 'PLAYING') {
    textSize(42);
    text("請出拳！(剪刀、石頭、布)", width / 2, height / 2);
  } else if (state === 'RESULT') {
    textSize(64);
    fill(255, 255, 0);
    text(resultText, width / 2, height / 2 - 80);
    
    textSize(36);
    fill(255);
    text(`你：${playerChoice}  vs  AI：${aiChoice}`, width / 2, height / 2);
    
    textSize(24);
    fill(200);
    text("比出 🤟🏻 手勢回到主畫面", width / 2, height / 2 + 100);
  }

  // 左上角顯示目前的辨識狀態（方便除錯）
  textAlign(LEFT, TOP);
  textSize(16);
  fill(0, 255, 0);
  text(`辨識結果: ${label} (${(confidence * 100).toFixed(0)}%)`, 20, 20);
}
