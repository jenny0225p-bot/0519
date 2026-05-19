let capture;
let handPose;
let hands = [];

function preload() {
  // 載入 handPose 模型
  handPose = ml5.handPose();
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  capture = createCapture(VIDEO);
  capture.hide(); // 隱藏原本的 HTML 影片元件，只顯示在畫布上

  // 開始偵測攝影機中的手勢
  handPose.detectStart(capture, (results) => {
    hands = results;
  });
}

function draw() {
  background('#e7c6ff');

  let w = width * 0.5;
  let h = height * 0.5;
  let x = (width - w) / 2;
  let y = (height - h) / 2;

  // 計算縮放比例（因為 image 被縮放為 w, h）
  let scaleX = w / capture.width;
  let scaleY = h / capture.height;

  push();
  // 將座標移至影像區域的右側邊界，然後進行水平翻轉
  translate(x + w, y);
  scale(-1, 1);
  
  // 繪製攝影機影像
  image(capture, 0, 0, w, h);

  // 繪製手部線條
  stroke(255, 0, 0); // 設定線條顏色為紅色
  strokeWeight(3);   // 設定線條粗細
  
  for (let i = 0; i < hands.length; i++) {
    let hand = hands[i];
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
        let pt1 = hand.keypoints[joints[j]];
        let pt2 = hand.keypoints[joints[j + 1]];
        line(pt1.x * scaleX, pt1.y * scaleY, pt2.x * scaleX, pt2.y * scaleY);
      }
    }
  }
  pop();
}
