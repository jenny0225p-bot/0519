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

// TODO: 請將此處替換為您在 Teachable Machine 訓練好的模型連結
const modelURL = 'https://teachablemachine.withgoogle.com/models/YOUR_MODEL_ID/';

function preload() {
  // 在 preload 載入 handPose 模型
  // imageClassifier 模型改在 setup 載入，以便顯示自定義進度訊息
  handPose = ml5.handPose();
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // 1. 檢查 WebGL 支援
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) {
    webglSupported = false;
    console.error("此裝置不支援 WebGL");
    return;
  }

  // 2. 初始化相機
  try {
    video = createCapture(VIDEO, (stream) => {
      videoStatus = "成功";
      console.log("相機啟動成功");
      // 影片準備好後，開始 handPose 偵測
      handPose.detectStart(video, gotHandPose);
    });
    video.size(640, 480);
    video.hide();
  } catch (e) {
    videoStatus = "失敗";
    console.error("無法存取相機:", e);
  }

  // 3. 載入模型並處理回饋
  // 檢查是否已填寫正確的 URL
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
function gotHandPose(results) {
  hands = results;
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
  // 如果還在冷卻時間內，不處理新狀態
  if (millis() - lastStateChangeTime < COOLDOWN_MS) return;

  // 設定信心門檻，調整為 0.7 提高靈敏度
  if (confidence < 0.7) return;

  if (state === 'START') {
    if (label.includes('👌')) { // 使用 includes 增加相容性（處理不同膚色編碼）
      state = 'PLAYING';
      lastStateChangeTime = millis();
    }
  } else if (state === 'PLAYING') {
    const moves = ['石頭', '剪刀', '布'];
    // 檢查標籤是否包含在 moves 陣列中
    let matchedMove = moves.find(m => label.includes(m));
    if (matchedMove) {
      playerChoice = matchedMove;
      aiChoice = random(moves); // AI 隨機出拳
      calculateWinner();
      state = 'RESULT';
      lastStateChangeTime = millis();
    }
  } else if (state === 'RESULT') {
    if (label.includes('🤟')) { // 偵測到 🤟 手勢回到主畫面
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

  // --- 系統相容性與載入檢查介面 ---
  if (!webglSupported) {
    fill(255, 0, 0);
    textAlign(CENTER, CENTER);
    textSize(24);
    text("❌ 您的瀏覽器不支援 WebGL\nAI 功能無法在某些舊型手機上執行", width / 2, height / 2);
    return;
  }

  // --- 基礎畫面：相機畫面優先顯示 ---
  if (video && video.elt && video.elt.readyState >= 2) {
    push();
    // 繪製攝影機影像（水平翻轉，讓玩家像照鏡子一樣方便對位）
    translate(width, 0);
    scale(-1, 1);
    image(video, 0, 0, width, height);

    // --- 繪製手部骨架 ---
    if (hands && hands.length > 0) {
      // 假設 video 影像被縮放到 canvas 的寬高
      let scaleX = width / video.width;
      let scaleY = height / video.height;

      stroke(0, 255, 0); // 設定線條顏色為綠色
      strokeWeight(3);   // 設定線條粗細
      
      for (let i = 0; i < hands.length; i++) {
        let hand = hands[i];
        let keypoints = hand.keypoints;

        // 定義需要串接的關鍵點群組
        let fingerJoints = [
          [0, 1, 2, 3, 4],     // 大拇指
          [5, 6, 7, 8],        // 食指
          [9, 10, 11, 12],     // 中指
          [13, 14, 15, 16],    // 無名指
          [17, 18, 19, 20]     // 小拇指
        ];

        for (let joints of fingerJoints) {
          for (let j = 0; j < joints.length - 1; j++) {
            let pt1 = keypoints[joints[j]];
            let pt2 = keypoints[joints[j + 1]];
            // 繪製線條時應用縮放
            line(pt1.x * scaleX, pt1.y * scaleY, pt2.x * scaleX, pt2.y * scaleY);
          }
        }
      }
    }
    pop();
  } else {
    // 如果影片尚未準備好，顯示等待訊息
    fill(255, 255, 0);
    textAlign(CENTER, CENTER);
    textSize(24);
    text("🎥 正在等待攝影機畫面...", width / 2, height / 2 + 50);
  }

  // --- 系統狀態檢查與提示 ---
  if (videoStatus === "失敗") {
    fill(255, 0, 0);
    textAlign(CENTER, CENTER);
    textSize(24);
    text("❌ 找不到攝影機\n請確認硬體連接或開啟相機權限", width / 2, height / 2);
    return;
  }

  if (modelStatus === "未設定URL") {
    fill(255, 255, 0);
    textAlign(CENTER, CENTER);
    text("⚠️ 請先在程式碼中替換 modelURL\n為你在 Teachable Machine 訓練好的連結", width / 2, height / 2);
    return;
  } else if (modelStatus === "載入中...") {
    fill(255);
    textAlign(CENTER, CENTER);
    text("🧠 模型載入中，請稍候...", width / 2, height / 2);
    return; // 模型載入中暫停遊戲 UI
  } else if (modelStatus === "失敗") { // 如果模型載入失敗，也顯示錯誤訊息並停止遊戲邏輯
    fill(255, 0, 0);
    textAlign(CENTER, CENTER);
    text("❌ 模型載入失敗\n請檢查 modelURL 是否正確或網路連線", width / 2, height / 2);
    return; 
  }

  // --- 遊戲互動 UI (僅在相機與模型都成功時顯示) ---
  fill(0, 0, 0, 150);
  rect(0, 0, width, height);
  
  textAlign(CENTER, CENTER);
  fill(255);
  
  if (state === 'START') {
    textSize(42);
    text("請比出 👌 手勢開始遊戲", width / 2, height / 2);
  } else if (state === 'PLAYING') {
    textSize(42);
    text("請出拳！(剪刀、石頭、布)", width / 2, height / 2);
  } else if (state === 'RESULT') {
    textSize(72);
    fill(255, 255, 0);
    text(resultText, width / 2, height / 2 - 80);
    
    textSize(42);
    fill(255);
    text(`你：${playerChoice}  vs  AI：${aiChoice}`, width / 2, height / 2);
    
    textSize(28);
    fill(200);
    text("比出 🤟 手勢回到主畫面", width / 2, height / 2 + 120);
  }

  // 顯示冷卻進度條（視覺輔助）
  let progress = (millis() - lastStateChangeTime) / COOLDOWN_MS;
  if (progress < 1.0) {
    noStroke();
    fill(0, 255, 0, 100);
    rect(0, height - 10, width * progress, 10);
  }

  // 左上角強化顯示目前的辨識狀態（方便除錯）
  textAlign(LEFT, TOP);
  textSize(20);
  fill(0, 255, 0);
  text(`偵測中: [${label}] 信心度: ${(confidence * 100).toFixed(1)}%`, 20, 20);
}
