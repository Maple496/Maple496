// 职责：入口文件。创建画布并挂入 ctx.stage，装配 engine/entities/ui，
// 注册尺寸跟随与输入事件；唯一一处 Work.register 容器合同。
// 打包后与 engine.js / entities.js / ui.js 同作用域拼接。

var _rafId = 0;      // RAF 句柄（destroy 需 cancel）
var _canvas = null;  // 主画布
var _g = null;       // 2D 上下文（命名纪律：只能叫 g）
var _cleanups = [];  // 事件解绑函数列表

Work.register({
  mount: function (ctx) {
    // 1) 用 ctx.bounds.w/h 设初值（字段名是 w/h）
    _canvas = document.createElement('canvas');
    _canvas.width = ctx.bounds.w;
    _canvas.height = ctx.bounds.h;
    _canvas.style.position = 'absolute';
    _canvas.style.left = '0';
    _canvas.style.top = '0';
    _canvas.style.touchAction = 'none';
    ctx.stage.appendChild(_canvas);
    _g = _canvas.getContext('2d');

    // 2) 尺寸跟随（平台注册即补发一次当前值）
    ctx.onBounds(function (b) {
      if (!_canvas) return;
      _canvas.width = b.w;
      _canvas.height = b.h;
      if (typeof Engine.onResize === 'function') Engine.onResize(b.w, b.h);
    });

    // 3) 装配：实体模型 / UI 覆盖层 / 引擎启动
    var model = Entities_createGame(ctx.bounds.w, ctx.bounds.h);
    model.width = ctx.bounds.w;
    model.height = ctx.bounds.h;
    UI.createOverlay(ctx.stage, model, Engine);

    // 4) 输入：pointerdown/pointermove 拖挡板（触屏可玩）
    function onPointer(e) {
      if (e.clientX == null) return;
      var r = _canvas.getBoundingClientRect();
      Engine.onPointerMove(e.clientX - r.left);
    }
    _canvas.addEventListener('pointerdown', onPointer);
    _canvas.addEventListener('pointermove', onPointer);
    _cleanups.push(function () { _canvas.removeEventListener('pointerdown', onPointer); });
    _cleanups.push(function () { _canvas.removeEventListener('pointermove', onPointer); });

    // 5) 键盘：左右方向键（keydown/keyup 都更新按键状态）
    function onKeyDown(e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.preventDefault();
      Engine.onKey(e.key);
    }
    function onKeyUp(e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') Engine.onKey(e.key);
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    _cleanups.push(function () { window.removeEventListener('keydown', onKeyDown); });
    _cleanups.push(function () { window.removeEventListener('keyup', onKeyUp); });

    // 6) 主循环：RAF 续订只在一处进行（tick 回调），loop 本身不再自行续订，
    //    避免每帧产生双倍调度导致的指数级帧堆积（无头渲染超时根因）。
    function loop(t) {
      Engine._frame(t);
    }
    function schedule() {
      if (!Engine._running) return;
      _rafId = requestAnimationFrame(loop);
    }
    Engine.start(model, _g, schedule);
    schedule();

    // 首帧同步渲染一次，保证无头环境下（RAF 可能被节流）画面立即可见
    UI.render(_g, model);
  },

  destroy: function () {
    // 清理骨架：cancel RAF、解绑监听、移除画布
    if (_rafId) cancelAnimationFrame(_rafId);
    _rafId = 0;
    if (typeof Engine.stop === 'function') Engine.stop();
    for (var i = 0; i < _cleanups.length; i++) {
      try { _cleanups[i](); } catch (err) { /* 忽略解绑异常，保证逐项清理 */ }
    }
    _cleanups = [];
    if (_canvas && _canvas.parentNode) _canvas.parentNode.removeChild(_canvas);
    _canvas = null;
    _g = null;
  }
});
