// 职责：定义游戏实体（挡板/球/砖块）的数据结构与游戏规则（碰撞、胜负）。
// 纯逻辑，不触碰 DOM。

function Entities_createGame(w, h) {
  var bricks = [];
  var rows = 4, cols = 8;
  var bw = (w - 40) / cols;
  var bh = 18;
  for (var r = 0; r < rows; r++) {
    for (var c = 0; c < cols; c++) {
      bricks.push({
        x: 20 + c * bw,
        y: 40 + r * (bh + 8),
        w: bw - 4,
        h: bh,
        alive: true
      });
    }
  }
  return {
    paddle: { x: w / 2, w: 90, h: 12, y: h - 40 },
    ball: { x: w / 2, y: h / 2, vx: 3, vy: -3, r: 7 },
    bricks: bricks,
    score: 0,
    state: 'ready'
  };
}

function Entities_movePaddle(model, x, w) {
  var half = model.paddle.w / 2;
  if (x < half) x = half;
  if (x > w - half) x = w - half;
  model.paddle.x = x;
}

function Entities_step(model, w, h) {
  if (model.state !== 'playing') return;
  var b = model.ball;
  b.x += b.vx;
  b.y += b.vy;

  if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); }
  if (b.x + b.r > w) { b.x = w - b.r; b.vx = -Math.abs(b.vx); }
  if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy); }

  // 挡板反弹
  var p = model.paddle;
  if (b.vy > 0 &&
      b.y + b.r >= p.y && b.y + b.r <= p.y + p.h + b.vy &&
      b.x >= p.x - p.w / 2 - b.r && b.x <= p.x + p.w / 2 + b.r) {
    b.y = p.y - b.r;
    var hit = (b.x - p.x) / (p.w / 2); // -1..1
    var speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    var angle = hit * (Math.PI / 3);
    b.vx = speed * Math.sin(angle);
    b.vy = -Math.abs(speed * Math.cos(angle));
  }

  // 落底
  if (b.y - b.r > h) {
    model.state = 'lose';
    return;
  }

  // 砖块碰撞（AABB）
  for (var i = 0; i < model.bricks.length; i++) {
    var k = model.bricks[i];
    if (!k.alive) continue;
    if (b.x + b.r > k.x && b.x - b.r < k.x + k.w &&
        b.y + b.r > k.y && b.y - b.r < k.y + k.h) {
      k.alive = false;
      model.score += 10;
      // 按重叠深度决定反向轴
      var overlapX = Math.min(b.x + b.r - k.x, k.x + k.w - (b.x - b.r));
      var overlapY = Math.min(b.y + b.r - k.y, k.y + k.h - (b.y - b.r));
      if (overlapX < overlapY) b.vx = -b.vx; else b.vy = -b.vy;
      break;
    }
  }

  // 胜利判定
  var remaining = 0;
  for (var j = 0; j < model.bricks.length; j++) {
    if (model.bricks[j].alive) remaining++;
  }
  if (remaining === 0) model.state = 'win';
}

function Entities_reset(model, w, h) {
  var fresh = Entities_createGame(w, h);
  model.paddle = fresh.paddle;
  model.ball = fresh.ball;
  model.bricks = fresh.bricks;
  model.score = fresh.score;
  model.state = fresh.state;
}
