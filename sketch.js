// Hand Pose Detection with ml5.js & Teachable Machine
let classifier;
let video;
let label = "等待辨識...";
let confidence = 0;

// Hand Pose 相關變數
let handPose;
let hands = []; // 儲存手部偵測結果

// 系統狀態檢查
let webglSupported = true;
let videoStatus = "等待啟動..."; // "等待啟動...", "成功", "失敗"
let modelStatus = "等待載入..."; // "等待載入...", "載入中", "成功", "失敗"

// 遊戲狀態：START (初始), PLAYING (遊戲中), RESULT (顯示結果)
let state = 'START';
let playerChoice = '';
let aiChoice = '';
let resultText = '';

// 新增控制變數
let lastStateChangeTime = 0; // 記錄狀態切換時間
const COOLDOWN_MS = 1500;    // 狀態切換後的冷卻時間（1.5秒），避免連續觸發

// ⚠️ 請記得將此處替換為您在 Teachable Machine 訓練好的模型連結
const modelURL = 'https://teachablemachine.withgoogle.com/models/YOUR_MODEL_ID/';

function preload() {
  // 在 preload 載入 handPose 模型
  handPose = ml5.handPose({ flipped: true }); // 啟用鏡像偵測
}

function setup() {
  createCanvas(windowWidth, windowHeight); // 改為全螢幕畫布
  
  // 檢查 WebGL 支援
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) {
    webglSupported = false;
    console.error("此裝置不支援 WebGL");
    return;
  }

  // 1. 初始化相機 (加入鏡像設定)
  try {
    video = createCapture(VIDEO, { flipped: true }, (stream) => {
      videoStatus = "成功";
      console.log("相機啟動成功");
      // 影片準備好後，開始 handPose 偵測
      handPose.detectStart(video, gotHands);
    });
    video.size(640, 480);
    video.hide();
  } catch (e) {
    videoStatus = "失敗"; 
    console.error("無法存取相機:", e);
  }

  // 3. 載入模型並處理回饋
  if (modelURL.includes("YOUR_MODEL_ID")) {
    modelStatus = "未設定URL";
    return;
  }

  modelStatus = "載入中...";
  classifier = ml5.imageClassifier(modelURL + 'model.json', (err) => {
    if (err) {
      console.error(err);
      modelStatus = "失敗";
    } else {
      modelStatus = "成功";
      classifyVideo();
    }
  });
}

// handPose 偵測結果的回呼函式
function gotHands(results) {
  hands = results; // 更新偵測到的手部資料
}

function classifyVideo() {
  if (videoStatus === "成功" && modelStatus === "成功") {
    classifier.classify(video, gotResult);
  }
}

function gotResult(results, error) {
  if (error) {
    console.error(error);
    return;
  }
  if (results && results.length > 0) {
    label = results[0].label;
    confidence = results[0].confidence;
    
    // 根據辨識結果更新遊戲邏輯
    updateGameState();
  }
  
  // 繼續下一幀的辨識
  classifyVideo();
}

// 當視窗大小改變（如手機轉向）時，自動調整畫布大小
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function updateGameState() {
  // 如果還在冷卻時間內，不處理新狀態
  if (millis() - lastStateChangeTime < COOLDOWN_MS) return;

  // 設定信心門檻，調整為 0.7 提高靈敏度
  if (confidence < 0.7) return;

  if (state === 'START') {
    if (label.includes('👌')) { 
      state = 'PLAYING';
      lastStateChangeTime = millis();
    }
  } else if (state === 'PLAYING') {
    const moves = ['石頭', '剪刀', '布'];
    let matchedMove = moves.find(m => label.includes(m));
    if (matchedMove) {
      playerChoice = matchedMove;
      aiChoice = random(moves); // AI 隨機出拳
      calculateWinner();
      state = 'RESULT';
      lastStateChangeTime = millis();
    }
  } else if (state === 'RESULT') {
    if (label.includes('🤟')) { 
      resetGame();
      lastStateChangeTime = millis();
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

  // --- 系統相容性檢查 ---
  if (!webglSupported) {
    fill(255, 0, 0);
    textAlign(CENTER, CENTER);
    textSize(24);
    text("❌ 您的瀏覽器不支援 WebGL\nAI 功能無法執行", width / 2, height / 2);
    return;
  }

  // --- 1. 繪製攝影機畫面與骨架 ---
  if (video && video.elt && video.elt.readyState >= 2) {
    push();
    // 因為 createCapture 已設定 flipped: true，這裡直接畫即可
    image(video, 0, 0, width, height);

    // --- 繪製手部骨架 (結合您提供的邏輯) ---
    if (hands.length > 0) {
      let scaleX = width / video.width;
      let scaleY = height / video.height;

      for (let hand of hands) {
        if (hand.confidence > 0.1) {
          let keypoints = hand.keypoints;
          
          // 根據左右手設定顏色 (Left: 粉紅, Right: 黃色)
          let handColor = hand.handedness === "Left" ? color(255, 0, 255) : color(255, 255, 0);

          // 1. 繪製線條連線 (依照要求: 0-4, 5-8, 9-12, 13-16, 17-20)
          stroke(handColor);
          strokeWeight(3);
          
          // 定義手指關鍵點區間
          let fingerParts = [
            [0, 1, 2, 3, 4],    // 大拇指
            [5, 6, 7, 8],       // 食指
            [9, 10, 11, 12],    // 中指
            [13, 14, 15, 16],   // 無名指
            [17, 18, 19, 20]    // 小拇指
          ];

          for (let part of fingerParts) {
            for (let j = 0; j < part.length - 1; j++) {
              let p1 = keypoints[part[j]];
              let p2 = keypoints[part[j + 1]];
              line(p1.x * scaleX, p1.y * scaleY, p2.x * scaleX, p2.y * scaleY);
            }
          }

          // 2. 繪製圓圈
          noStroke();
          fill(handColor);
          for (let i = 0; i < keypoints.length; i++) {
            let keypoint = keypoints[i];
            circle(keypoint.x * scaleX, keypoint.y * scaleY, 10);
          }
        }
      }
    }
    pop(); 
  } else {
    fill(255, 255, 0);
    // 即使沒有攝影機畫面，也要顯示背景，避免手機瀏覽器出現奇怪的殘影
    background(0);
    textAlign(CENTER, CENTER);
    textSize(24);
    text("🎥 正在等待攝影機畫面...", width / 2, height / 2);
    
    // 如果 WebGPU 警告導致延遲，這裡提供一個手動啟動的提示
    if (frameCount > 300) { // 如果 5 秒後還沒畫面
      textSize(16);
      text("若畫面長時間未出現，請檢查攝影機權限或重新整理", width / 2, height / 2 + 40);
    }
    return;
  }

  // --- 2. 模型狀態提示 ---
  if (videoStatus === "失敗") {
    fill(255, 0, 0);
    textAlign(CENTER, CENTER);
    textSize(24);
    text("❌ 找不到攝影機\n請確認權限設定並使用 HTTPS", width / 2, height / 2);
    return;
  }

  if (modelStatus === "未設定URL") {
    fill(255, 255, 0);
    rectMode(CENTER);
    fill(0, 0, 0, 180);
    rect(width/2, height/2, 500, 100, 10);
    fill(255, 255, 0);
    textAlign(CENTER, CENTER);
    textSize(18);
    text("⚠️ 請先在程式碼中替換 modelURL\n為你在 Teachable Machine 訓練好的連結", width / 2, height / 2);
    return;
  } else if (modelStatus === "載入中...") {
    fill(0, 0, 0, 150);
    rect(0, 0, width, height);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(24);
    text("🧠 模型載入中，請稍候...", width / 2, height / 2);
    return; 
  } else if (modelStatus === "失敗") {
    fill(255, 0, 0);
    textAlign(CENTER, CENTER);
    textSize(24);
    text("❌ 模型載入失敗\n請檢查 URL 或網路連線", width / 2, height / 2);
    return; 
  }

  // --- 3. 遊戲互動 UI (改為「局部黑色遮罩」或降低透明度，避免全畫面被蓋死) ---
  // 上方黑條：顯示辨識偵測狀態
  noStroke();
  fill(0, 0, 0, 120);
  rect(0, 0, width, 50);
  
  textAlign(LEFT, CENTER);
  textSize(16);
  fill(0, 255, 0);
  text(`[AI 偵測狀態] 當前特徵: ${label}  |  信心度: ${(confidence * 100).toFixed(1)}%`, 20, 25);

  // 中央/下方遊戲提示
  textAlign(CENTER, CENTER);
  
  if (state === 'START') {
    fill(0, 0, 0, 150);
    rect(0, height - 100, width, 100);
    fill(255);
    textSize(28);
    text("請比出 👌 手勢開始遊戲", width / 2, height - 50);
  } else if (state === 'PLAYING') {
    fill(0, 0, 0, 150);
    rect(0, height - 100, width, 100);
    fill(255, 255, 0);
    textSize(28);
    text("請出拳！(剪刀、石頭、布)", width / 2, height - 50);
  } else if (state === 'RESULT') {
    // 結果狀態下，使用半透明大畫面凸顯勝負，但依然看得到後方相機
    fill(0, 0, 0, 180);
    rect(0, 50, width, height - 50);
    
    textSize(64);
    fill(255, 215, 0);
    text(resultText, width / 2, height / 2 - 60);
    
    textSize(32);
    fill(255);
    text(`你：${playerChoice}  vs  AI：${aiChoice}`, width / 2, height / 2 + 20);
    
    textSize(20);
    fill(200);
    text("比出 🤟 手勢回到主畫面", width / 2, height / 2 + 90);
  }

  // 4. 顯示冷卻進度條
  let progress = (millis() - lastStateChangeTime) / COOLDOWN_MS;
  if (progress < 1.0) {
    noStroke();
    fill(0, 255, 0, 200);
    rect(0, height - 8, width * progress, 8);
  }
}