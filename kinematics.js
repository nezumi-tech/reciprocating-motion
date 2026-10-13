/**
 * Kinematics Math Engine for Reciprocating Motion
 * 往復運動の運動力学計算エンジン
 * 
 * 対象プロファイル:
 * 1. 速度一定 (Constant Velocity)
 * 2. 加速度一定 (Constant Acceleration)
 * 3. 加加速度一定 (Constant Jerk / S-Curve)
 * 4. 単振動 (Simple Harmonic Motion)
 */

class KinematicsEngine {
  constructor(stroke = 200, period = 4.0) {
    this.stroke = stroke; // L [mm]
    this.period = period; // T [s]
    this.halfPeriod = period / 2; // tau = T/2 [s]
    
    // ワーク振動シミュレータパラメータ (1自由度振動系)
    this.naturalFreq = 8.0 * Math.PI; // 固有角振動数 omega_n (約 4 Hz)
    this.dampingRatio = 0.08;         // 減衰比 zeta (8%)
    
    // 各プロファイルのワーク相対変位・速度状態
    this.vibrationStates = {
      constV: { z: 0, dz: 0 },
      constA: { z: 0, dz: 0 },
      constJ: { z: 0, dz: 0 },
      harmonic: { z: 0, dz: 0 }
    };

    this.updateCoefficients();
  }

  setParameters(stroke, period) {
    this.stroke = Math.max(10, stroke);
    this.period = Math.max(0.5, period);
    this.halfPeriod = this.period / 2;
    this.updateCoefficients();
    this.resetVibrations();
  }

  resetVibrations() {
    for (const key in this.vibrationStates) {
      this.vibrationStates[key] = { z: 0, dz: 0 };
    }
  }

  updateCoefficients() {
    const L = this.stroke;
    const tau = this.halfPeriod;

    // 1. 速度一定係数
    this.vConst = L / tau;

    // 2. 加速度一定係数 (Bang-Bang)
    this.aConst = (4 * L) / (tau * tau);
    this.vMaxA = (2 * L) / tau;

    // 3. 加加速度一定係数 (4区間S字プロファイル)
    // tj = tau / 4
    this.tj = tau / 4;
    this.jConst = (32 * L) / Math.pow(tau, 3);
    this.aMaxJ = this.jConst * this.tj; // = 8*L / tau^2 (aConstの2倍)
    this.vMaxJ = this.jConst * (this.tj * this.tj); // = 2*L / tau (vMaxAと同じ)

    // 4. 単振動係数
    this.omegaH = (2 * Math.PI) / this.period;
    this.vMaxH = (L / 2) * this.omegaH;
    this.aMaxH = (L / 2) * Math.pow(this.omegaH, 2);
    this.jMaxH = (L / 2) * Math.pow(this.omegaH, 3);
  }

  /**
   * 1. 速度一定 (Constant Velocity)
   * 往路: v = v0, x = v0 * t
   * 復路: v = -v0, x = L - v0 * (t - tau)
   */
  calcConstVelocity(t) {
    const T = this.period;
    const tau = this.halfPeriod;
    const normT = ((t % T) + T) % T;
    const L = this.stroke;
    const v0 = this.vConst;

    let x = 0;
    let v = 0;
    let a = 0;
    let j = 0;
    let isReversing = false;

    // 反転点付近の検出 (インパルス表現用、反転の瞬間)
    const eps = 0.03 * T;
    if (normT < eps || Math.abs(normT - tau) < eps || normT > T - eps) {
      isReversing = true;
    }

    if (normT < tau) {
      // 往路
      x = v0 * normT;
      v = v0;
      a = 0;
      j = 0;
    } else {
      // 復路
      const dt = normT - tau;
      x = L - v0 * dt;
      v = -v0;
      a = 0;
      j = 0;
    }

    // 端点保護
    x = Math.max(0, Math.min(L, x));

    return { x, v, a, j, isReversing };
  }

  /**
   * 2. 加速度一定 (Constant Acceleration: 等加減速 Bang-Bang)
   * 往路前半: a = +a0, v = a0*t, x = 0.5*a0*t^2
   * 往路後半: a = -a0, v = vmax - a0*(t - tau/2), ...
   */
  calcConstAcceleration(t) {
    const T = this.period;
    const tau = this.halfPeriod;
    const normT = ((t % T) + T) % T;
    const L = this.stroke;
    const a0 = this.aConst;
    const vMax = this.vMaxA;
    const halfTau = tau / 2;

    let x = 0;
    let v = 0;
    let a = 0;
    let j = 0;
    let isJerkSpike = false;

    // 加速度切り替え点の検出 (Jerkスパイク)
    const eps = 0.02 * T;
    if (
      normT < eps ||
      Math.abs(normT - halfTau) < eps ||
      Math.abs(normT - tau) < eps ||
      Math.abs(normT - (tau + halfTau)) < eps ||
      normT > T - eps
    ) {
      isJerkSpike = true;
    }

    if (normT < tau) {
      // 往路 (0 -> L)
      if (normT < halfTau) {
        // 前半加速
        a = a0;
        v = a0 * normT;
        x = 0.5 * a0 * normT * normT;
      } else {
        // 後半減速
        const dt = normT - halfTau;
        a = -a0;
        v = vMax - a0 * dt;
        x = 0.5 * L + vMax * dt - 0.5 * a0 * dt * dt;
      }
    } else {
      // 復路 (L -> 0)
      const tRev = normT - tau;
      if (tRev < halfTau) {
        // 復路前半 (負方向へ加速)
        a = -a0;
        v = -a0 * tRev;
        x = L - 0.5 * a0 * tRev * tRev;
      } else {
        // 復路後半 (正方向へ減速)
        const dt = tRev - halfTau;
        a = a0;
        v = -vMax + a0 * dt;
        x = 0.5 * L - vMax * dt + 0.5 * a0 * dt * dt;
      }
    }

    x = Math.max(0, Math.min(L, x));
    return { x, v, a, j, isJerkSpike };
  }

  /**
   * 3. 加加速度一定 (Constant Jerk: 4区間S字プロファイル)
   * 往路: 4等分区間 (tj = tau/4)
   * 1: j = +J (加速の立上り)
   * 2: j = -J (加速の丸め、最高速到達)
   * 3: j = -J (減速の立上り)
   * 4: j = +J (減速の丸め、停止)
   */
  calcConstJerk(t) {
    const T = this.period;
    const tau = this.halfPeriod;
    const normT = ((t % T) + T) % T;
    const L = this.stroke;
    const J = this.jConst;
    const tj = this.tj;
    const aMax = this.aMaxJ;
    const vMax = this.vMaxJ;

    let x = 0;
    let v = 0;
    let a = 0;
    let j = 0;

    const calcForwardProfile = (time) => {
      let px, pv, pa, pj;
      if (time < tj) {
        // 区間 1
        pj = J;
        pa = J * time;
        pv = 0.5 * J * time * time;
        px = (1 / 6) * J * Math.pow(time, 3);
      } else if (time < 2 * tj) {
        // 区間 2
        const dt = time - tj;
        pj = -J;
        pa = aMax - J * dt;
        const v1 = 0.5 * J * tj * tj;
        pv = v1 + aMax * dt - 0.5 * J * dt * dt;
        const x1 = (1 / 6) * J * Math.pow(tj, 3);
        px = x1 + v1 * dt + 0.5 * aMax * dt * dt - (1 / 6) * J * Math.pow(dt, 3);
      } else if (time < 3 * tj) {
        // 区間 3
        const dt = time - 2 * tj;
        pj = -J;
        pa = -J * dt;
        pv = vMax - 0.5 * J * dt * dt;
        const x2 = 0.5 * L;
        px = x2 + vMax * dt - (1 / 6) * J * Math.pow(dt, 3);
      } else {
        // 区間 4
        const dt = Math.min(tj, time - 3 * tj);
        pj = J;
        pa = -aMax + J * dt;
        const v3 = vMax - 0.5 * J * tj * tj;
        pv = v3 - aMax * dt + 0.5 * J * dt * dt;
        const x3 = 0.5 * L + vMax * tj - (1 / 6) * J * Math.pow(tj, 3);
        px = x3 + v3 * dt - 0.5 * aMax * dt * dt + (1 / 6) * J * Math.pow(dt, 3);
      }
      return { px, pv, pa, pj };
    };

    if (normT < tau) {
      // 往路
      const res = calcForwardProfile(normT);
      x = res.px;
      v = res.pv;
      a = res.pa;
      j = res.pj;
    } else {
      // 復路 (完全対称)
      const res = calcForwardProfile(normT - tau);
      x = L - res.px;
      v = -res.pv;
      a = -res.pa;
      j = -res.pj;
    }

    x = Math.max(0, Math.min(L, x));
    return { x, v, a, j };
  }

  /**
   * 4. 単振動 (Simple Harmonic Motion)
   * x(t) = (L/2) * (1 - cos(omega * t))
   */
  calcHarmonic(t) {
    const T = this.period;
    const normT = ((t % T) + T) % T;
    const L = this.stroke;
    const omega = this.omegaH;
    const halfL = L / 2;

    const angle = omega * normT;
    const x = halfL * (1 - Math.cos(angle));
    const v = halfL * omega * Math.sin(angle);
    const a = halfL * omega * omega * Math.cos(angle);
    const j = -halfL * Math.pow(omega, 3) * Math.sin(angle);

    return { x, v, a, j };
  }

  /**
   * すべてのプロファイルの現在状態をまとめて取得
   */
  getStateAt(t) {
    return {
      constV: this.calcConstVelocity(t),
      constA: this.calcConstAcceleration(t),
      constJ: this.calcConstJerk(t),
      harmonic: this.calcHarmonic(t)
    };
  }

  /**
   * ワークの残留振動シミュレーションステップ更新
   * d^2z/dt^2 + 2*zeta*wn * dz/dt + wn^2 * z = -a_cart
   */
  updateVibrations(dt, currentState) {
    const wn = this.naturalFreq;
    const zeta = this.dampingRatio;
    const profiles = ['constV', 'constA', 'constJ', 'harmonic'];

    profiles.forEach((key) => {
      const state = this.vibrationStates[key];
      const motion = currentState[key];

      // 速度一定の反転衝撃エミュレーション:
      // 反転時に仮想インパルス加速度を付与
      let effA = motion.a;
      if (key === 'constV' && motion.isReversing) {
        // 反転時の速度跳ね返りショックインパルス
        const dir = (motion.x < this.stroke * 0.5) ? 1 : -1;
        effA = dir * 2500; // 巨大なパルス
      } else if (key === 'constA' && motion.isJerkSpike) {
        // Jerkスパイク時の瞬間的インパルス揺れ
        effA += (Math.random() - 0.5) * 300;
      }

      // 運動方程式: ddz = -effA - 2*zeta*wn*dz - wn^2*z
      const ddz = -effA * 0.05 - 2 * zeta * wn * state.dz - Math.pow(wn, 2) * state.z;
      
      // セミ・インプリシットオイラー積分
      state.dz += ddz * dt;
      state.z += state.dz * dt;

      // 安定化リミッター
      state.z = Math.max(-25, Math.min(25, state.z));
    });

    return this.vibrationStates;
  }

  /**
   * グラフ描画用の波形データ配列生成 (全周期 0 -> T)
   * @param {number} samples サンプル数
   */
  generateWaveformData(samples = 300) {
    const times = [];
    const constV = { x: [], v: [], a: [], j: [] };
    const constA = { x: [], v: [], a: [], j: [] };
    const constJ = { x: [], v: [], a: [], j: [] };
    const harmonic = { x: [], v: [], a: [], j: [] };

    const T = this.period;
    const dt = T / (samples - 1);

    for (let i = 0; i < samples; i++) {
      const t = i * dt;
      times.push(t);

      const sv = this.calcConstVelocity(t);
      const sa = this.calcConstAcceleration(t);
      const sj = this.calcConstJerk(t);
      const sh = this.calcHarmonic(t);

      constV.x.push(sv.x);
      constV.v.push(sv.v);
      constV.a.push(sv.a);
      constV.j.push(sv.j);

      constA.x.push(sa.x);
      constA.v.push(sa.v);
      constA.a.push(sa.a);
      constA.j.push(sa.j);

      constJ.x.push(sj.x);
      constJ.v.push(sj.v);
      constJ.a.push(sj.a);
      constJ.j.push(sj.j);

      harmonic.x.push(sh.x);
      harmonic.v.push(sh.v);
      harmonic.a.push(sh.a);
      harmonic.j.push(sh.j);
    }

    return {
      times,
      constV,
      constA,
      constJ,
      harmonic
    };
  }
}

// グローバルに公開
window.KinematicsEngine = KinematicsEngine;
