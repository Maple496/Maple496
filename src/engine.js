// 职责：持有当前模型与渲染器引用，驱动 RAF 主循环，
// 对外提供 start/stop/onResize/onPointerMove/onKey，转发到 entities 与 ui。

var Engine = {
  _model: null,
  _g: null,
  _tick: null,
  _running: false,
  _keys: {},   // 键盘状态表：{ ArrowLeft: bool, ArrowRight: bool }
  _last: 0,    // 上一帧时间戳，用于按时间推进（dt 秒）

  // 启动主循环：每帧 step + render，然后调用 next 保持 RAF
  // 签名: Engine.start(model, g, next)
  start: function (model, g, next) {
    this._model = model;
    this._g = g;
    this._tick = next;
    this._running = true;
    this._keys = {};
    this._last = 0;
  },

  stop: function () {
    this._running = false;
  },

  // 内部：执行一帧（step + render），供 RAF 循环调用
  _frame: function (t) {
    if (!this._running) return;
    var model = this._model, g = this._g;
    if (!model || !g) return;

    var dt = this._last ? (t - this._last) / 1000 : 0;
    this._last = t;
    if (dt > 0.05) dt = 0.05; // 后台切回等大间隔钳制

    var w = g.canvas.width, h = g.canvas.height;

    // 键盘按住持续移动挡板
    var speed = model.paddle.speed || 420;
    if (this._keys.ArrowLeft && !this._keys.ArrowRight) {
      Entities_movePaddle(model, model.paddle.x - speed * dt, w);
    } else if (this._keys.ArrowRight && !this._keys.ArrowLeft) {
      Entities_movePaddle(model, model.paddle.x + speed * dt, w);
    }

    Entities_step(model, w, h);
    UI.render(g, model);

    if (this._tick) this._tick(t);
  },

  // 尺寸变化：按新宽高重排砖块/挡板位置
  // 签名: Engine.onResize(w, h)
  onResize: function (w, h) {
    var model = this._model;
    if (!model) return;
    model.width = w;
    model.height = h;

    // 重建砖块布局（保留存活状态；数量不符则重建全套）
    var rows = 4, cols = 8;
    if (!model.bricks || model.bricks.length !== rows * cols) {
      var fresh = Entities_createGame(w, h);
      model.bricks = fresh.bricks;
    } else {
      var bw = (w - 40) / cols, bh = 18;
      for (var i = 0; i < model.bricks.length; i++) {
        var k = model.bricks[i];
        k.x = 20 + (i % cols) * bw;
        k.y = 40 + Math.floor(i / cols) * (bh + 8);
        k.w = bw - 4;
        k.h = bh;
      }
    }

    // 钳制挡板与球到界内
    var p = model.paddle;
    p.w = Math.min(p.w, w * 0.3);
    if (p.x < p.w / 2) p.x = p.w / 2;
    if (p.x > w - p.w / 2) p.x = w - p.w / 2;
    p.y = h - p.h - 8;

    var b = model.ball;
    if (b.x < b.r) b.x = b.r;
    if (b.x > w - b.r) b.x = w - b.r;
    if (b.y < b.r) b.y = b.r;
    if (b.y > h - b.r) b.y = h - b.r;
  },

  // 触屏/鼠标：x 为画布内横坐标
  // 签名: Engine.onPointerMove(x)
  onPointerMove: function (x) {
    var model = this._model;
    if (!model) return;
    if (model.state === 'ready') model.state = 'playing';
    if (model.state !== 'playing') return;
    if (typeof x !== 'number') return;
    var w = this._g ? this._g.canvas.width : model.width;
    Entities_movePaddle(model, x, w);
  },

  // 键盘快捷方式：ArrowLeft / ArrowRight 按下与抬起都会调用；
  // 用按键状态表记录按住与否，每帧在循环里按状态移动挡板。
  // 签名: Engine.onKey(key)
  onKey: function (key) {
    var model = this._model;
    if (!model) return;

    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      // keydown 与 keyup 交替到来，翻转状态
      this._keys[key] = !this._keys[key];
      if (model.state === 'ready') model.state = 'playing';
    } else if (key === ' ' || key === 'Space' || key === 'Enter') {
      // 空格/回车：开始或发球
      if (model.state === 'ready') model.state = 'playing';
      else if (model.state === 'serving' || model.state === 'paused') model.state = 'playing';
    }
  }
};
