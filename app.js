/**
 * Reciprocating Motion Kinematics - Main Application Controller
 * 往復運動の運動力学インフォグラフィックス コントローラー
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. エンジン初期化
  const engine = new KinematicsEngine(200, 4.0);

  // 2. アプリケーション状態
  const state = {
    isPlaying: true,
    currentTime: 0,
    speedFactor: 1.0,
    showHarmonic: false,
    showVibration: true,
    viewMode: 'overlay', // 'overlay' or 'split'
    lastTimestamp: 0,
    hoveredTime: null
  };

  // 3. DOM要素の取得
  const elements = {
    // 再生操作
    playPauseBtn: document.getElementById('playPauseBtn'),
    playIcon: document.getElementById('playIcon'),
    pauseIcon: document.getElementById('pauseIcon'),
    playPauseText: document.getElementById('playPauseText'),
    resetBtn: document.getElementById('resetBtn'),
    timeSeekBar: document.getElementById('timeSeekBar'),
    currentTimeDisplay: document.getElementById('currentTimeDisplay'),
    totalPeriodDisplay: document.getElementById('totalPeriodDisplay'),
    phaseDisplay: document.getElementById('phaseDisplay'),
    speedBtns: document.querySelectorAll('#speedBtnGroup .btn-chip'),

    // パラメータ
    strokeInput: document.getElementById('strokeInput'),
    strokeDisplay: document.getElementById('strokeDisplay'),
    periodInput: document.getElementById('periodInput'),
    periodInputDisplay: document.getElementById('periodInputDisplay'),
    showHarmonicToggle: document.getElementById('showHarmonicToggle'),
    showVibrationToggle: document.getElementById('showVibrationToggle'),
    harmonicBadge: document.getElementById('harmonicBadge'),
    legendHarmonic: document.getElementById('legendHarmonic'),

    // トラック・キャリッジ
    trackHarmonic: document.getElementById('trackHarmonic'),
    cartConstV: document.getElementById('cartConstV'),
    cartConstA: document.getElementById('cartConstA'),
    cartConstJ: document.getElementById('cartConstJ'),
    cartHarmonic: document.getElementById('cartHarmonic'),

    payloadV: document.querySelector('#payloadV .payload-mass'),
    payloadA: document.querySelector('#payloadA .payload-mass'),
    payloadJ: document.querySelector('#payloadJ .payload-mass'),
    payloadH: document.querySelector('#payloadH .payload-mass'),

    shockV: document.getElementById('shockV'),
    shockA: document.getElementById('shockA'),

    // 数値表示
    valPosV: document.getElementById('valPosV'),
    valVelV: document.getElementById('valVelV'),
    valAccV: document.getElementById('valAccV'),
    valJerkV: document.getElementById('valJerkV'),

    valPosA: document.getElementById('valPosA'),
    valVelA: document.getElementById('valVelA'),
    valAccA: document.getElementById('valAccA'),
    valJerkA: document.getElementById('valJerkA'),

    valPosJ: document.getElementById('valPosJ'),
    valVelJ: document.getElementById('valVelJ'),
    valAccJ: document.getElementById('valAccJ'),
    valJerkJ: document.getElementById('valJerkJ'),

    valPosH: document.getElementById('valPosH'),
    valVelH: document.getElementById('valVelH'),
    valAccH: document.getElementById('valAccH'),
    valJerkH: document.getElementById('valJerkH'),

    railMaxScales: [
      document.getElementById('railMaxScaleV'),
      document.getElementById('railMaxScaleA'),
      document.getElementById('railMaxScaleJ'),
      document.getElementById('railMaxScaleH')
    ],

    // グラフ Canvas
    canvasPos: document.getElementById('canvasPos'),
    canvasVel: document.getElementById('canvasVel'),
    canvasAcc: document.getElementById('canvasAcc'),
    canvasJerk: document.getElementById('canvasJerk'),

    // グラフ カーソル
    cursorPos: document.getElementById('cursorPos'),
    cursorVel: document.getElementById('cursorVel'),
    cursorAcc: document.getElementById('cursorAcc'),
    cursorJerk: document.getElementById('cursorJerk'),

    chartHoverValPos: document.getElementById('chartHoverValPos'),
    chartHoverValVel: document.getElementById('chartHoverValVel'),
    chartHoverValAcc: document.getElementById('chartHoverValAcc'),
    chartHoverValJerk: document.getElementById('chartHoverValJerk'),

    btnViewOverlay: document.getElementById('btnViewOverlay'),
    btnViewSplit: document.getElementById('btnViewSplit'),

    // テーマ・ガイド
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    guideModalBtn: document.getElementById('guideModalBtn'),
    guideModal: document.getElementById('guideModal'),
    closeModalBtn: document.getElementById('closeModalBtn')
  };

  // グラフキャンバスコンテキストのセットアップ
  const contexts = {
    pos: elements.canvasPos.getContext('2d'),
    vel: elements.canvasVel.getContext('2d'),
    acc: elements.canvasAcc.getContext('2d'),
    jerk: elements.canvasJerk.getContext('2d')
  };

  // 4. イベントハンドラー登録
  function setupEvents() {
    // 再生/一時停止
    elements.playPauseBtn.addEventListener('click', togglePlayPause);
    elements.resetBtn.addEventListener('click', resetPlayback);

    // スペースキーで再生/一時停止、Rキーでリセット
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        resetPlayback();
      }
    });

    // シークバー
    elements.timeSeekBar.addEventListener('input', (e) => {
      state.currentTime = parseFloat(e.target.value);
      updateUI();
      if (!state.isPlaying) {
        redrawCharts();
      }
    });

    // 再生速度
    elements.speedBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.speedBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.speedFactor = parseFloat(btn.dataset.speed);
      });
    });

    // ストローク振幅
    elements.strokeInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      elements.strokeDisplay.textContent = `${val} mm`;
      elements.railMaxScales.forEach(scale => {
        if (scale) scale.textContent = `L (${val} mm)`;
      });
      engine.setParameters(val, engine.period);
      redrawCharts();
      updateUI();
    });

    // 周期
    elements.periodInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      elements.periodInputDisplay.textContent = `${val.toFixed(1)} s`;
      elements.totalPeriodDisplay.textContent = val.toFixed(1);
      elements.timeSeekBar.max = val;
      engine.setParameters(engine.stroke, val);
      state.currentTime = state.currentTime % val;
      redrawCharts();
      updateUI();
    });

    // 単振動トグル
    elements.showHarmonicToggle.addEventListener('change', (e) => {
      state.showHarmonic = e.target.checked;
      elements.trackHarmonic.classList.toggle('hidden', !state.showHarmonic);
      elements.harmonicBadge.classList.toggle('hidden', !state.showHarmonic);
      elements.legendHarmonic.classList.toggle('hidden', !state.showHarmonic);
      redrawCharts();
    });

    // ワーク残留振動トグル
    elements.showVibrationToggle.addEventListener('change', (e) => {
      state.showVibration = e.target.checked;
      const payloads = document.querySelectorAll('.cart-payload');
      payloads.forEach(p => p.style.display = state.showVibration ? 'flex' : 'none');
    });

    // グラフ表示モード切り替え
    elements.btnViewOverlay.addEventListener('click', () => {
      state.viewMode = 'overlay';
      elements.btnViewOverlay.classList.add('active');
      elements.btnViewSplit.classList.remove('active');
      redrawCharts();
    });

    elements.btnViewSplit.addEventListener('click', () => {
      state.viewMode = 'split';
      elements.btnViewSplit.classList.add('active');
      elements.btnViewOverlay.classList.remove('active');
      redrawCharts();
    });

    // テーマ切り替え
    elements.themeToggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('theme-light');
      document.body.classList.toggle('theme-dark');
      redrawCharts();
    });

    // ガイドモーダル
    elements.guideModalBtn.addEventListener('click', () => {
      elements.guideModal.classList.remove('hidden');
    });

    elements.closeModalBtn.addEventListener('click', () => {
      elements.guideModal.classList.add('hidden');
    });

    elements.guideModal.addEventListener('click', (e) => {
      if (e.target === elements.guideModal) {
        elements.guideModal.classList.add('hidden');
      }
    });

    // ウィンドウリサイズ対応
    window.addEventListener('resize', debounce(() => {
      resizeCanvases();
      redrawCharts();
    }, 150));

    // 各グラフキャンバスのマウスホバー（値調査）
    setupCanvasHover();
  }

  function togglePlayPause() {
    state.isPlaying = !state.isPlaying;
    elements.playIcon.classList.toggle('hidden', state.isPlaying);
    elements.pauseIcon.classList.toggle('hidden', !state.isPlaying);
    elements.playPauseText.textContent = state.isPlaying ? '一時停止' : '再生';
  }

  function resetPlayback() {
    state.currentTime = 0;
    elements.timeSeekBar.value = 0;
    engine.resetVibrations();
    updateUI();
    redrawCharts();
  }

  // 5. Canvasの解像度調整 (HiDPI対応)
  function resizeCanvases() {
    const dpr = window.devicePixelRatio || 1;
    const canvases = [elements.canvasPos, elements.canvasVel, elements.canvasAcc, elements.canvasJerk];

    canvases.forEach(canvas => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.resetTransform();
      ctx.scale(dpr, dpr);
    });
  }

  // 6. グラフキャンバスマウスホバー
  function setupCanvasHover() {
    const canvases = [
      { el: elements.canvasPos, type: 'x', unit: 'mm' },
      { el: elements.canvasVel, type: 'v', unit: 'mm/s' },
      { el: elements.canvasAcc, type: 'a', unit: 'mm/s²' },
      { el: elements.canvasJerk, type: 'j', unit: 'mm/s³' }
    ];

    canvases.forEach(item => {
      item.el.addEventListener('mousemove', (e) => {
        const rect = item.el.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const ratio = Math.max(0, Math.min(1, mouseX / rect.width));
        const hoverT = ratio * engine.period;

        state.hoveredTime = hoverT;
        updateHoverValues(hoverT);
      });

      item.el.addEventListener('mouseleave', () => {
        state.hoveredTime = null;
        updateHoverValues(state.currentTime);
      });

      // クリックでその時間にジャンプ
      item.el.addEventListener('click', (e) => {
        const rect = item.el.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const ratio = Math.max(0, Math.min(1, mouseX / rect.width));
        state.currentTime = ratio * engine.period;
        elements.timeSeekBar.value = state.currentTime;
        updateUI();
        redrawCharts();
      });
    });
  }

  function updateHoverValues(t) {
    const cur = engine.getStateAt(t);
    elements.chartHoverValPos.textContent = `t=${t.toFixed(2)}s | V:${cur.constV.x.toFixed(1)} A:${cur.constA.x.toFixed(1)} J:${cur.constJ.x.toFixed(1)}`;
    elements.chartHoverValVel.textContent = `t=${t.toFixed(2)}s | V:${cur.constV.v.toFixed(1)} A:${cur.constA.v.toFixed(1)} J:${cur.constJ.v.toFixed(1)}`;
    elements.chartHoverValAcc.textContent = `t=${t.toFixed(2)}s | V:${cur.constV.a.toFixed(1)} A:${cur.constA.a.toFixed(1)} J:${cur.constJ.a.toFixed(1)}`;
    elements.chartHoverValJerk.textContent = `t=${t.toFixed(2)}s | V:∞ A:Spike J:${cur.constJ.j.toFixed(0)}`;
  }

  // 7. メインアニメーションループ
  function animationLoop(timestamp) {
    if (!state.lastTimestamp) state.lastTimestamp = timestamp;
    const deltaTime = (timestamp - state.lastTimestamp) / 1000;
    state.lastTimestamp = timestamp;

    if (state.isPlaying && deltaTime > 0 && deltaTime < 0.2) {
      state.currentTime += deltaTime * state.speedFactor;
      if (state.currentTime >= engine.period) {
        state.currentTime = state.currentTime % engine.period;
      }
      elements.timeSeekBar.value = state.currentTime;
      
      // 物理ワーク振動更新
      const cur = engine.getStateAt(state.currentTime);
      engine.updateVibrations(deltaTime * state.speedFactor, cur);

      updateUI();
    }

    requestAnimationFrame(animationLoop);
  }

  // 8. リアルタイムUIの更新
  let lastReversing = false;
  let lastJerkSpike = false;

  function updateUI() {
    const t = state.currentTime;
    const T = engine.period;
    const cur = engine.getStateAt(t);

    // タイムライン表示更新
    elements.currentTimeDisplay.textContent = `${t.toFixed(2)} s`;
    const progress = (t / T) * 100;
    const isOutward = t < engine.halfPeriod;
    const phasePercent = ((t % engine.halfPeriod) / engine.halfPeriod * 100).toFixed(0);
    elements.phaseDisplay.textContent = `${isOutward ? '往路 (Forward)' : '復路 (Return)'} ${phasePercent}%`;

    // 数値セル更新
    elements.valPosV.textContent = `${cur.constV.x.toFixed(1)} mm`;
    elements.valVelV.textContent = `${cur.constV.v.toFixed(1)} mm/s`;
    elements.valAccV.textContent = cur.constV.isReversing ? '∞ (Impulse)' : `${cur.constV.a.toFixed(1)} mm/s²`;
    elements.valJerkV.textContent = cur.constV.isReversing ? '破壊的衝撃' : '0 (通常)';

    elements.valPosA.textContent = `${cur.constA.x.toFixed(1)} mm`;
    elements.valVelA.textContent = `${cur.constA.v.toFixed(1)} mm/s`;
    elements.valAccA.textContent = `${cur.constA.a.toFixed(1)} mm/s²`;
    elements.valJerkA.textContent = cur.constA.isJerkSpike ? 'スパイク' : '0 (通常)';

    elements.valPosJ.textContent = `${cur.constJ.x.toFixed(1)} mm`;
    elements.valVelJ.textContent = `${cur.constJ.v.toFixed(1)} mm/s`;
    elements.valAccJ.textContent = `${cur.constJ.a.toFixed(1)} mm/s²`;
    elements.valJerkJ.textContent = `${cur.constJ.j.toFixed(0)} mm/s³`;

    if (state.showHarmonic) {
      elements.valPosH.textContent = `${cur.harmonic.x.toFixed(1)} mm`;
      elements.valVelH.textContent = `${cur.harmonic.v.toFixed(1)} mm/s`;
      elements.valAccH.textContent = `${cur.harmonic.a.toFixed(1)} mm/s²`;
      elements.valJerkH.textContent = `${cur.harmonic.j.toFixed(0)} mm/s³`;
    }

    // キャリッジ位置更新 (レール幅の30px ~ width-30px にスケールマッピング)
    updateCartPosition(elements.cartConstV, cur.constV.x);
    updateCartPosition(elements.cartConstA, cur.constA.x);
    updateCartPosition(elements.cartConstJ, cur.constJ.x);
    if (state.showHarmonic) {
      updateCartPosition(elements.cartHarmonic, cur.harmonic.x);
    }

    // ワーク振動（おもりの相対変位）更新
    if (state.showVibration) {
      const vibs = engine.vibrationStates;
      elements.payloadV.style.transform = `translateX(${vibs.constV.z.toFixed(2)}px)`;
      elements.payloadA.style.transform = `translateX(${vibs.constA.z.toFixed(2)}px)`;
      elements.payloadJ.style.transform = `translateX(${vibs.constJ.z.toFixed(2)}px)`;
      if (state.showHarmonic) {
        elements.payloadH.style.transform = `translateX(${vibs.harmonic.z.toFixed(2)}px)`;
      }
    }

    // ショックウェーブエフェクト発火
    if (cur.constV.isReversing && !lastReversing) {
      elements.shockV.classList.remove('active');
      void elements.shockV.offsetWidth; // リフロー
      elements.shockV.classList.add('active');
    }
    lastReversing = cur.constV.isReversing;

    if (cur.constA.isJerkSpike && !lastJerkSpike) {
      elements.shockA.classList.remove('active');
      void elements.shockA.offsetWidth;
      elements.shockA.classList.add('active');
    }
    lastJerkSpike = cur.constA.isJerkSpike;

    // 4つのグラフのカーソル線位置更新
    const cursorPercent = (t / T) * 100;
    elements.cursorPos.style.left = `${cursorPercent}%`;
    elements.cursorVel.style.left = `${cursorPercent}%`;
    elements.cursorAcc.style.left = `${cursorPercent}%`;
    elements.cursorJerk.style.left = `${cursorPercent}%`;

    if (!state.hoveredTime) {
      updateHoverValues(t);
    }
  }

  function updateCartPosition(cartEl, displacement) {
    if (!cartEl) return;
    const parent = cartEl.parentElement;
    if (!parent) return;
    const railWidth = parent.clientWidth;
    const startX = 30;
    const endX = railWidth - 30;
    const availableWidth = endX - startX;

    const fraction = displacement / engine.stroke;
    const targetLeft = startX + fraction * availableWidth;
    cartEl.style.left = `${targetLeft}px`;
  }

  // 9. グラフの描画ルーチン (Canvas)
  function redrawCharts() {
    const data = engine.generateWaveformData(300);
    const T = engine.period;
    const L = engine.stroke;

    const isLight = document.body.classList.contains('theme-light');
    const colors = {
      bg: isLight ? 'rgba(255, 255, 255, 0.6)' : 'rgba(10, 14, 23, 0.5)',
      grid: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.07)',
      zeroLine: isLight ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.25)',
      text: isLight ? '#64748b' : '#94a3b8',
      v: isLight ? '#0284c7' : '#00e5ff',
      a: isLight ? '#d97706' : '#fbbf24',
      j: isLight ? '#059669' : '#10b981',
      h: isLight ? '#c026d3' : '#d946ef'
    };

    // 1. 変位 x(t): 0 ~ L
    drawSingleChart(
      elements.canvasPos,
      contexts.pos,
      data.times,
      [
        { vals: data.constV.x, color: colors.v, label: '速度一定' },
        { vals: data.constA.x, color: colors.a, label: '加速度一定' },
        { vals: data.constJ.x, color: colors.j, label: '加加速度一定' },
        ...(state.showHarmonic ? [{ vals: data.harmonic.x, color: colors.h, label: '単振動' }] : [])
      ],
      { min: 0, max: L * 1.05, unit: 'mm', showZero: true },
      colors
    );

    // 2. 速度 v(t): -vMax ~ +vMax
    const maxV = Math.max(engine.vMaxA, engine.vConst, engine.vMaxJ, engine.vMaxH) * 1.15;
    drawSingleChart(
      elements.canvasVel,
      contexts.vel,
      data.times,
      [
        { vals: data.constV.v, color: colors.v, label: '速度一定' },
        { vals: data.constA.v, color: colors.a, label: '加速度一定' },
        { vals: data.constJ.v, color: colors.j, label: '加加速度一定' },
        ...(state.showHarmonic ? [{ vals: data.harmonic.v, color: colors.h, label: '単振動' }] : [])
      ],
      { min: -maxV, max: maxV, unit: 'mm/s', showZero: true },
      colors
    );

    // 3. 加速度 a(t): -aMax ~ +aMax
    const maxA = Math.max(engine.aMaxJ, engine.aConst, engine.aMaxH) * 1.25;
    drawSingleChart(
      elements.canvasAcc,
      contexts.acc,
      data.times,
      [
        { vals: data.constA.a, color: colors.a, label: '加速度一定' },
        { vals: data.constJ.a, color: colors.j, label: '加加速度一定' },
        ...(state.showHarmonic ? [{ vals: data.harmonic.a, color: colors.h, label: '単振動' }] : [])
      ],
      { min: -maxA, max: maxA, unit: 'mm/s²', showZero: true, hasImpulseV: true },
      colors
    );

    // 4. 加加速度 j(t): -jMax ~ +jMax
    const maxJ = Math.max(engine.jConst, engine.jMaxH) * 1.3;
    drawSingleChart(
      elements.canvasJerk,
      contexts.jerk,
      data.times,
      [
        { vals: data.constJ.j, color: colors.j, label: '加加速度一定' },
        ...(state.showHarmonic ? [{ vals: data.harmonic.j, color: colors.h, label: '単振動' }] : [])
      ],
      { min: -maxJ, max: maxJ, unit: 'mm/s³', showZero: true, hasSpikeA: true },
      colors
    );
  }

  /**
   * 単一グラフ描画共通関数
   */
  function drawSingleChart(canvas, ctx, times, seriesList, scale, colors) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    ctx.clearRect(0, 0, width, height);

    const padTop = 15;
    const padBottom = 20;
    const padLeft = 45;
    const padRight = 15;

    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const yRange = scale.max - scale.min;
    const T = engine.period;

    const mapX = (t) => padLeft + (t / T) * plotW;
    const mapY = (val) => padTop + (1 - (val - scale.min) / yRange) * plotH;

    // グリッド線描画 (横線 & 縦線)
    ctx.lineWidth = 1;
    ctx.strokeStyle = colors.grid;
    ctx.fillStyle = colors.text;
    ctx.font = '10px Fira Code, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    // 横グリッド (4分割)
    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
      const val = scale.min + (yRange / ySteps) * i;
      const y = mapY(val);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();
      ctx.fillText(val.toFixed(0), padLeft - 6, y);
    }

    // ゼロ軸
    if (scale.min < 0 && scale.max > 0) {
      const zeroY = mapY(0);
      ctx.strokeStyle = colors.zeroLine;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padLeft, zeroY);
      ctx.lineTo(width - padRight, zeroY);
      ctx.stroke();
    }

    // 縦グリッド (時間軸: 0, T/4, T/2, 3T/4, T)
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const tTicks = [0, T * 0.25, T * 0.5, T * 0.75, T];
    const tLabels = ['0', 'T/4', 'T/2', '3T/4', 'T'];
    tTicks.forEach((tick, idx) => {
      const x = mapX(tick);
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, height - padBottom);
      ctx.stroke();
      ctx.fillText(`${tLabels[idx]} (${tick.toFixed(1)}s)`, x, height - padBottom + 4);
    });

    // カーブ描画
    seriesList.forEach(series => {
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = series.color;
      ctx.beginPath();

      for (let i = 0; i < times.length; i++) {
        const x = mapX(times[i]);
        const y = mapY(series.vals[i]);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    });

    // 速度一定の加速度インパルス特異点注記 (反転点 0, T/2, T でのデルタ関数)
    if (scale.hasImpulseV) {
      ctx.save();
      ctx.strokeStyle = colors.v;
      ctx.fillStyle = colors.v;
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);

      [0, T * 0.5, T].forEach(impT => {
        const x = mapX(impT);
        ctx.beginPath();
        ctx.moveTo(x, padTop);
        ctx.lineTo(x, height - padBottom);
        ctx.stroke();

        // 矢印マーク (インパルス)
        ctx.beginPath();
        ctx.moveTo(x - 4, padTop + 8);
        ctx.lineTo(x, padTop);
        ctx.lineTo(x + 4, padTop + 8);
        ctx.fill();
      });

      ctx.fillStyle = colors.v;
      ctx.font = '10px sans-serif';
      ctx.fillText('±∞ インパルス (反転時)', mapX(T * 0.5), padTop + 14);
      ctx.restore();
    }

    // 加速度一定のJerkスパイク注記 (切替点 0, T/4, T/2, 3T/4, T)
    if (scale.hasSpikeA) {
      ctx.save();
      ctx.strokeStyle = colors.a;
      ctx.fillStyle = colors.a;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 3]);

      [0, T * 0.25, T * 0.5, T * 0.75, T].forEach(spT => {
        const x = mapX(spT);
        ctx.beginPath();
        ctx.moveTo(x, padTop + 10);
        ctx.lineTo(x, height - padBottom);
        ctx.stroke();

        // スパイクマーク
        ctx.beginPath();
        ctx.arc(x, mapY(0), 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Jerkスパイク (加速度段差切替点)', mapX(T * 0.25) + 6, padTop + 12);
      ctx.restore();
    }
  }

  // ユーティリティ: デバウンス
  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // 10. 初期実行
  setupEvents();
  resizeCanvases();
  redrawCharts();
  updateUI();
  requestAnimationFrame(animationLoop);
});
