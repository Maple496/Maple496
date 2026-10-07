// 职责：渲染层。每帧把模型画到 canvas（内联样式，无外部资源）；
// 创建 absolute 定位的覆盖层（开始引导 / 胜负弹窗），挂进 stage。

var UI = {
  _overlay: null,
  _overlayText: null,
  _overlayBtn: null,
  _btnHandler: null,

  // 创建覆盖层（position:absolute，挂入 stage），首帧显示「点击/触摸开始」引导
  // 签名: UI.createOverlay(stage, model, engine)
  createOverlay: function (stage, model, engine) {
    var overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.background = 'rgba(10, 14, 30, 0.75)';
    overlay.style.color = '#e8f0ff';
    overlay.style.fontFamily = 'sans-serif';
    overlay.style.zIndex = '10';
    overlay.style.userSelect = 'none';

    var text = document.createElement('div');
    text.style.fontSize = '26px';
    text.style.letterSpacing = '2px';
    text.style.marginBottom = '18px';
    text.textContent = '点击 / 触摸 开始';
    overlay.appendChild(text);

    var btn = document.createElement('button');
    btn.style.display = 'none';
    btn.style.padding = '10px 28px';
    btn.style.fontSize = '18px';
    btn.style.border = 'none';
    btn.style.borderRadius = '8px';
    btn.style.cursor = 'pointer';
    btn.style.background = '#3d7bff';
    btn.style.color = '#fff';
    btn.textContent = '再来一局';
    overlay.appendChild(btn);

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (UI._btnHandler) UI._btnHandler();
    });

    overlay.addEventListener('pointerdown', function () {
      if (model.state === 'ready') {
        overlay.style.display = 'none';
        if (engine && engine.onPointerMove) engine.onPointerMove();
      }
    });

    stage.appendChild(overlay);
    UI._overlay = overlay;
    UI._overlayText = text;
    UI._overlayBtn = btn;
  },

  // 根据模型状态显示/隐藏覆盖层（win/lose 弹窗 + 重开按钮）
  // 签名: UI.showOverlay(model, engine)
  showOverlay: function (model, engine) {
    if (!UI._overlay) return;
    if (model.state === 'ready') {
      UI._overlay.style.display = 'flex';
      UI._overlayText.textContent = '点击 / 触摸 开始';
      UI._overlayBtn.style.display = 'none';
      UI._btnHandler = null;
    } else if (model.state === 'win' || model.state === 'lose') {
      UI._overlay.style.display = 'flex';
      UI._overlayText.textContent = model.state === 'win' ? '你赢了！' : '游戏结束';
      UI._overlayBtn.style.display = 'block';
      UI._btnHandler = function () {
        if (engine && engine.reset) {
          engine.reset();
        } else if (typeof Entities_reset === 'function') {
          Entities_reset(model, model.width, model.height);
        }
        UI._overlay.style.display = 'none';
      };
    } else {
      UI._overlay.style.display = 'none';
      UI._btnHandler = null;
    }
  },

  // 每帧绘制：清屏、星空底色、砖块（按 alive 着色）、挡板、球、分数文字
  // 签名: UI.render(g, model)
  render: function (g, model) {
    var w = g.canvas.width, h = g.canvas.height;
    g.clearRect(0, 0, w, h);

    // 星空底色
    var bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0a0e1e');
    bg.addColorStop(1, '#141b33');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);

    // 砖块
    var bricks = model.bricks || [];
    for (var i = 0; i < bricks.length; i++) {
      var b = bricks[i];
      if (!b.alive) continue;
      g.fillStyle = b.color || '#3d7bff';
      g.fillRect(b.x, b.y, b.w, b.h);
      g.strokeStyle = 'rgba(255,255,255,0.25)';
      g.lineWidth = 1;
      g.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
    }

    // 挡板
    if (model.paddle) {
      var p = model.paddle;
      g.fillStyle = '#e8f0ff';
      g.fillRect(p.x - p.w / 2, p.y, p.w, p.h);
    }

    // 球
    if (model.ball) {
      var ball = model.ball;
      g.beginPath();
      g.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      g.fillStyle = '#ffd75e';
      g.fill();
    }

    // 分数
    g.fillStyle = 'rgba(232,240,255,0.9)';
    g.font = 'bold 20px sans-serif';
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.fillText('分数: ' + (model.score || 0), 10, 8);

    if (model.state === 'win' || model.state === 'lose') {
      UI.showOverlay(model, null);
    }
  }
};
