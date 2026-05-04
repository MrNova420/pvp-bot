class ServerDetector {
  constructor(bot, logger) {
    this.bot = bot;
    this.logger = logger;
    
    this.version = null;
    this.versionNumber = null;
    this.serverBrand = null;
    this.features = {};
  }

  detect() {
    try {
      this.version = this.bot.version;
      this._parseVersion();
      this._detectFeatures();
      this._detectServerBrand();
      
      this.logger.info(`Server: ${this.version} (${this.versionNumber})`);
      if (this.serverBrand) {
        this.logger.info(`Server type: ${this.serverBrand}`);
      }
    } catch (err) {
      this.logger.debug(`Detection error: ${err.message}`);
    }
  }

  _parseVersion() {
    if (!this.version) return;
    
    const versionStr = this.version.toString();
    const match = versionStr.match(/(\d+)\.(\d+)\.?(\d+)?/);
    
    if (match) {
      const [, major, minor, patch = '0'] = match;
      this.versionNumber = {
        major: parseInt(major),
        minor: parseInt(minor),
        patch: parseInt(patch)
      };
    }
  }

  _detectFeatures() {
    if (!this.versionNumber) return;
    
    const v = this.versionNumber;
    
    this.features = {
      combatUpdate: v.major >= 1 && v.minor >= 9,
      shields: v.major >= 1 && v.minor >= 9,
      axesSlowerThanSwords: true,
      criticalNerf: v.major >= 1 && v.minor >= 9,
      sweepingEdge: v.major >= 1 && v.minor >= 9,
      elytra: v.major >= 1 && v.minor >= 9,
      shulkerBoxes: v.major >= 1 && v.minor >= 11,
      concrete: v.major >= 1 && v.minor >= 12,
      bamboo: v.major >= 1 && v.minor >= 14,
      honeyBlock: v.major >= 1 && v.minor >= 15,
      soulCampfire: v.major >= 1 && v.minor >= 16,
      netherite: v.major >= 1 && v.minor >= 16,
      axolotl: v.major >= 1 && v.minor >= 17,
      glowLichen: v.major >= 1 && v.minor >= 18,
      sniffer: v.major >= 1 && v.minor >= 20,
      archeology: v.major >= 1 && v.minor >= 20,
      mace: v.major >= 1 && v.minor >= 20 && v.patch >= 5,
      hangingGibs: v.major >= 1 && v.minor >= 21,
      crafter: v.major >= 1 && v.minor >= 21
    };
  }

  _detectServerBrand() {
    const brand = this.bot?.client?.channelBuffers;
    if (brand) {
      if (brand.includes?.('FML|HS')) this.serverBrand = 'forge';
      else if (brand.includes?.('VANILLA')) this.serverBrand = 'vanilla';
    }
  }

  getVersion() {
    return this.version || 'unknown';
  }

  getVersionNumber() {
    return this.versionNumber || { major: 1, minor: 20, patch: 0 };
  }

  hasFeature(feature) {
    return this.features[feature] || false;
  }

  getAttackCooldown() {
    const v = this.versionNumber;
    if (v.major >= 1 && v.minor >= 9) {
      return true;
    }
    return false;
  }

  canCrit() {
    return this.hasFeature('criticalNerf');
  }

  getMaxAttackRange() {
    return this.hasFeature('combatUpdate') ? 4 : 6;
  }
}

class SmoothAim {
  constructor(bot, logger) {
    this.bot = bot;
    this.logger = logger;
    
    this.enabled = true;
    this.smoothing = 0.3;
    this.currentYaw = 0;
    this.currentPitch = 0;
    this.targetYaw = 0;
    this.targetPitch = 0;
    this.aimSpeed = 0.15;
  }

  lookAtWithSmoothing(targetPos) {
    if (!this.enabled || !this.bot.entity) return;
    
    const botPos = this.bot.entity.position;
    const targetEye = targetPos.offset(0, 1.6, 0);
    
    const dx = targetEye.x - botPos.x;
    const dy = targetEye.y - botPos.y;
    const dz = targetEye.z - botPos.z;
    
    const targetYaw = Math.atan2(dz, dx);
    const distance = Math.sqrt(dx * dx + dz * dz);
    const targetPitch = Math.atan2(-dy, distance);
    
    this._smoothLook(targetYaw, targetPitch);
  }

  _smoothLook(targetYaw, targetPitch) {
    let yawDiff = targetYaw - this.currentYaw;
    let pitchDiff = targetPitch - this.currentPitch;
    
    while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
    while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
    
    const maxStep = this.aimSpeed;
    yawDiff = Math.max(-maxStep, Math.min(maxStep, yawDiff));
    pitchDiff = Math.max(-maxStep, Math.min(maxStep, pitchDiff));
    
    this.currentYaw += yawDiff;
    this.currentPitch += pitchDiff;
    
    try {
      this.bot.look(this.currentYaw, this.currentPitch);
    } catch (err) {
      this.logger.debug(`Aim error: ${err.message}`);
    }
  }

  setSmoothing(amount) {
    this.smoothing = Math.max(0.1, Math.min(1, amount));
    this.aimSpeed = 0.1 + (1 - this.smoothing) * 0.3;
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  reset() {
    this.currentYaw = 0;
    this.currentPitch = 0;
  }
}

module.exports = { ServerDetector, SmoothAim };