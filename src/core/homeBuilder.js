const Vec3 = require('vec3');
const BuildingSystem = require('../../civilization/core/building_system');
const MaterialGatherer = require('../../civilization/core/material_gatherer');

class HomeBuilder {
  constructor(bot, logger) {
    this.bot = bot;
    this.logger = logger;
    this.homeLocation = null;
    this.buildingProgress = {
      foundation: false,
      walls: false,
      roof: false,
      door: false,
      storage: false,
      farm: false
    };
    
    // Use unified building and gathering systems from civilization
    this.buildingSystem = new BuildingSystem(bot, logger);
    this.materialGatherer = new MaterialGatherer(bot, logger);
  }

  async findBuildLocation() {
    try {
      const currentPos = this.bot.entity.position;
      
      const searchRadius = 50;
      let bestLocation = null;
      let bestScore = -1;

      for (let x = -searchRadius; x <= searchRadius; x += 10) {
        for (let z = -searchRadius; z <= searchRadius; z += 10) {
          const checkPos = currentPos.offset(x, 0, z);
          const groundY = await this.findGroundLevel(checkPos);
          
          if (groundY === null) continue;
          
          const testPos = new Vec3(checkPos.x, groundY, checkPos.z);
          const score = await this.evaluateLocation(testPos);
          
          if (score > bestScore) {
            bestScore = score;
            bestLocation = testPos;
          }
        }
      }

      if (bestLocation) {
        this.homeLocation = bestLocation;
        this.logger.info(`[Home Builder] Found ideal location at ${bestLocation.x}, ${bestLocation.y}, ${bestLocation.z}`);
        return bestLocation;
      }
      
      const fallback = currentPos.offset(5, 0, 5);
      const groundY = await this.findGroundLevel(fallback);
      this.homeLocation = new Vec3(fallback.x, groundY || currentPos.y, fallback.z);
      return this.homeLocation;
      
    } catch (error) {
      this.logger.error('[Home Builder] Error finding location:', error.message);
      return this.bot.entity.position;
    }
  }

  async findGroundLevel(pos) {
    try {
      for (let y = pos.y; y > pos.y - 10; y--) {
        const block = this.bot.blockAt(new Vec3(pos.x, y, pos.z));
        const blockBelow = this.bot.blockAt(new Vec3(pos.x, y - 1, pos.z));
        
        if (blockBelow && blockBelow.name !== 'air' && (!block || block.name === 'air')) {
          return y;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async evaluateLocation(pos) {
    let score = 100;
    
    try {
      const flatArea = await this.checkFlatArea(pos, 7, 7);
      score += flatArea ? 50 : 0;
      
      const nearWater = await this.checkNearbyBlocks(pos, 'water', 20);
      score += nearWater ? 30 : 0;
      
      const nearTrees = await this.checkNearbyBlocks(pos, 'log', 30);
      score += nearTrees ? 20 : 0;
      
      const nearPlayers = Object.values(this.bot.players).some(p => {
        if (!p.entity) return false;
        return p.entity.position.distanceTo(pos) < 100;
      });
      score += nearPlayers ? 25 : 0;
      
      const nearSpawn = pos.distanceTo(this.bot.spawnPoint || pos) < 200;
      score += nearSpawn ? 15 : 0;
      
    } catch (error) {
      this.logger.error('[Home Builder] Error evaluating location:', error.message);
    }
    
    return score;
  }

  async checkFlatArea(centerPos, width, depth) {
    try {
      const baseY = centerPos.y;
      for (let x = -width/2; x <= width/2; x++) {
        for (let z = -depth/2; z <= depth/2; z++) {
          const checkPos = centerPos.offset(x, 0, z);
          const groundY = await this.findGroundLevel(checkPos);
          if (groundY === null || Math.abs(groundY - baseY) > 2) {
            return false;
          }
        }
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  async checkNearbyBlocks(pos, blockType, radius) {
    try {
      const blocks = this.bot.findBlocks({
        matching: (block) => block && block.name && block.name.includes(blockType),
        maxDistance: radius,
        count: 1
      });
      return blocks.length > 0;
    } catch (error) {
      return false;
    }
  }

  async buildBasicHome() {
    if (!this.homeLocation) {
      await this.findBuildLocation();
    }

    this.logger.info('[Home Builder] Starting home construction with automatic material gathering...');
    
    try {
      // Check materials needed
      const materials = this.buildingSystem.getMaterialsNeeded('small_house');
      if (materials) {
        const check = this.materialGatherer.checkMaterials(materials);
        
        if (!check.hasMaterials) {
          this.logger.info('[Home Builder] Gathering required materials...');
          this.logger.info('[Home Builder] Needed:', check.missing);
          
          const gatherResult = await this.materialGatherer.gatherMaterials(materials, {
            maxAttempts: 3,
            timeout: 60000
          });
          
          if (gatherResult.success) {
            this.logger.info('[Home Builder] Successfully gathered all materials!');
          } else {
            this.logger.warn('[Home Builder] Could not gather all materials, building with what we have...');
          }
        }
      }
      
      // Build the house using unified building system
      const result = await this.buildingSystem.buildStructure('small_house', this.homeLocation, { 
        skipMaterialCheck: true 
      });
      
      if (result.success) {
        this.buildingProgress.foundation = true;
        this.buildingProgress.walls = true;
        this.buildingProgress.door = true;
        this.buildingProgress.roof = true;
        this.buildingProgress.storage = true;
        
        this.logger.info('[Home Builder] Home construction complete!');
        return true;
      } else {
        this.logger.warn(`[Home Builder] Construction failed: ${result.reason}`);
        if (result.needed) {
          this.logger.info('[Home Builder] Required materials:', result.needed);
        }
        return false;
      }
    } catch (error) {
      this.logger.error('[Home Builder] Build error:', error.message);
      return false;
    }
  }

  async expandBase() {
    this.logger.info('[Home Builder] Expanding base with farm and storage...');
    
    try {
      if (!this.buildingProgress.farm && this.homeLocation) {
        const farmLocation = new Vec3(
          this.homeLocation.x + 15,
          this.homeLocation.y,
          this.homeLocation.z
        );
        
        const farmResult = await this.buildingSystem.buildStructure('farm', farmLocation, { 
          skipMaterialCheck: false 
        });
        
        if (farmResult.success) {
          this.buildingProgress.farm = true;
          this.logger.info('[Home Builder] Farm constructed successfully');
        } else {
          this.logger.warn(`[Home Builder] Farm construction failed: ${farmResult.reason}`);
        }
      }
      
      // Also add a storage building
      if (this.homeLocation) {
        const storageLocation = new Vec3(
          this.homeLocation.x - 10,
          this.homeLocation.y,
          this.homeLocation.z
        );
        
        const storageResult = await this.buildingSystem.buildStructure('storage_building', storageLocation, { 
          skipMaterialCheck: false 
        });
        
        if (storageResult.success) {
          this.logger.info('[Home Builder] Storage building constructed successfully');
        }
      }
      
      this.logger.info('[Home Builder] Base expansion complete!');
      return true;
    } catch (error) {
      this.logger.error('[Home Builder] Expansion error:', error.message);
      return false;
    }
  }

  getHomeLocation() {
    return this.homeLocation;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = HomeBuilder;
