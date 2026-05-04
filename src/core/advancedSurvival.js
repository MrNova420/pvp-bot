const Vec3 = require('vec3');

class AdvancedSurvival {
  constructor(bot, logger, stateManager) {
    this.bot = bot;
    this.logger = logger;
    this.stateManager = stateManager;
    
    this.farms = [];
    this.animalPens = [];
    this.defenseLocations = [];
    
    this.farmTypes = {
      wheat: { seeds: 'wheat_seeds', crop: 'wheat', light: 7 },
      carrots: { seeds: 'carrot', crop: 'carrot', light: 7 },
      potatoes: { seeds: 'potato', crop: 'potato', light: 7 },
      beetroot: { seeds: 'beetroot_seeds', crop: 'beetroot', light: 7 }
    };
    
    this.animalTypes = {
      cow: { breedItem: 'wheat', product: 'beef' },
      pig: { breedItem: 'carrot', product: 'porkchop' },
      chicken: { breedItem: 'wheat_seeds', product: 'chicken' },
      sheep: { breedItem: 'wheat', product: 'mutton' }
    };
    
    this._loadState();
  }
  
  _loadState() {
    const savedState = this.stateManager.getState();
    if (savedState.advancedSurvival) {
      this.farms = savedState.advancedSurvival.farms || [];
      this.animalPens = savedState.advancedSurvival.animalPens || [];
      this.defenseLocations = savedState.advancedSurvival.defenseLocations || [];
    }
  }
  
  _saveState() {
    this.stateManager.setWorkProgress('advancedSurvival', {
      farms: this.farms,
      animalPens: this.animalPens,
      defenseLocations: this.defenseLocations
    });
  }
  
  async createFarm(farmType, location, size = 9) {
    try {
      if (!this.farmTypes[farmType]) {
        this.logger.warn(`Unknown farm type: ${farmType}`);
        return false;
      }
      
      const farmConfig = this.farmTypes[farmType];
      const farm = {
        type: farmType,
        location: location,
        size: size,
        plots: [],
        waterSource: null,
        lightSources: [],
        created: Date.now(),
        lastHarvest: null
      };
      
      this.logger.info(`Creating ${farmType} farm at ${location.x}, ${location.y}, ${location.z}`);
      
      const sideLength = Math.floor(Math.sqrt(size));
      for (let x = 0; x < sideLength; x++) {
        for (let z = 0; z < sideLength; z++) {
          const plotPos = location.offset(x, 0, z);
          farm.plots.push(plotPos);
          
          if (x === Math.floor(sideLength / 2) && z === Math.floor(sideLength / 2)) {
            farm.waterSource = plotPos;
          }
        }
      }
      
      this.farms.push(farm);
      this._saveState();
      
      this.logger.info(`Farm created successfully with ${farm.plots.length} plots`);
      return farm;
    } catch (err) {
      this.logger.error(`Failed to create farm: ${err.message}`);
      return false;
    }
  }
  
  async harvestFarm(farmIndex) {
    if (!this.farms[farmIndex]) {
      this.logger.warn('Farm not found');
      return 0;
    }
    
    const farm = this.farms[farmIndex];
    let harvested = 0;
    
    try {
      const mcData = require('minecraft-data')(this.bot.version);
      const cropBlock = mcData.blocksByName[farm.type];
      
      if (!cropBlock) {
        this.logger.warn(`Crop block not found: ${farm.type}`);
        return 0;
      }
      
      for (const plotPos of farm.plots) {
        const block = this.bot.blockAt(plotPos);
        
        if (block && block.type === cropBlock.id) {
          const age = block.metadata || 0;
          const maxAge = 7;
          
          if (age >= maxAge) {
            await this.bot.dig(block);
            harvested++;
            
            await this._replant(plotPos, farm.type);
          }
        }
      }
      
      farm.lastHarvest = Date.now();
      this._saveState();
      
      this.logger.info(`Harvested ${harvested} crops from ${farm.type} farm`);
      return harvested;
    } catch (err) {
      this.logger.error(`Harvest error: ${err.message}`);
      return harvested;
    }
  }
  
  async _replant(position, cropType) {
    try {
      const farmConfig = this.farmTypes[cropType];
      if (!farmConfig) return;
      
      const seedItem = this.bot.inventory.items().find(item => 
        item.name === farmConfig.seeds
      );
      
      if (seedItem) {
        await this.bot.equip(seedItem, 'hand');
        
        const referenceBlock = this.bot.blockAt(position.offset(0, -1, 0));
        if (referenceBlock) {
          await this.bot.placeBlock(referenceBlock, new Vec3(0, 1, 0));
          this.logger.debug(`Replanted ${cropType} at ${position.x}, ${position.y}, ${position.z}`);
        }
      }
    } catch (err) {
      this.logger.debug(`Replant error: ${err.message}`);
    }
  }
  
  async createAnimalPen(animalType, location, size = 16) {
    try {
      if (!this.animalTypes[animalType]) {
        this.logger.warn(`Unknown animal type: ${animalType}`);
        return false;
      }
      
      const pen = {
        type: animalType,
        location: location,
        size: size,
        fencePositions: [],
        gatePosition: null,
        animals: [],
        created: Date.now(),
        lastBreed: null
      };
      
      this.logger.info(`Creating ${animalType} pen at ${location.x}, ${location.y}, ${location.z}`);
      
      const sideLength = Math.floor(Math.sqrt(size));
      for (let x = 0; x <= sideLength; x++) {
        for (let z = 0; z <= sideLength; z++) {
          if (x === 0 || x === sideLength || z === 0 || z === sideLength) {
            const fencePos = location.offset(x, 0, z);
            
            if (x === Math.floor(sideLength / 2) && z === 0) {
              pen.gatePosition = fencePos;
            } else {
              pen.fencePositions.push(fencePos);
            }
          }
        }
      }
      
      this.animalPens.push(pen);
      this._saveState();
      
      this.logger.info(`Animal pen created successfully with ${pen.fencePositions.length} fence positions`);
      return pen;
    } catch (err) {
      this.logger.error(`Failed to create animal pen: ${err.message}`);
      return false;
    }
  }
  
  async breedAnimals(penIndex) {
    if (!this.animalPens[penIndex]) {
      this.logger.warn('Animal pen not found');
      return 0;
    }
    
    const pen = this.animalPens[penIndex];
    const animalConfig = this.animalTypes[pen.type];
    
    if (!animalConfig) return 0;
    
    try {
      const breedItem = this.bot.inventory.items().find(item => 
        item.name === animalConfig.breedItem
      );
      
      if (!breedItem) {
        this.logger.debug(`No ${animalConfig.breedItem} for breeding`);
        return 0;
      }
      
      const nearbyAnimals = Object.values(this.bot.entities).filter(entity => {
        if (!entity || !entity.position) return false;
        if (entity.name !== pen.type) return false;
        
        const distance = entity.position.distanceTo(pen.location);
        return distance < Math.sqrt(pen.size) * 2;
      });
      
      let bred = 0;
      for (let i = 0; i < nearbyAnimals.length - 1; i += 2) {
        const animal1 = nearbyAnimals[i];
        const animal2 = nearbyAnimals[i + 1];
        
        await this.bot.equip(breedItem, 'hand');
        await this.bot.useOn(animal1);
        await this.bot.useOn(animal2);
        
        bred++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      pen.lastBreed = Date.now();
      this._saveState();
      
      this.logger.info(`Bred ${bred} pairs of ${pen.type}`);
      return bred;
    } catch (err) {
      this.logger.error(`Breeding error: ${err.message}`);
      return 0;
    }
  }
  
  async buildDefensiveStructure(location, type = 'wall') {
    try {
      const defense = {
        type: type,
        location: location,
        blocks: [],
        created: Date.now()
      };
      
      this.logger.info(`Building ${type} at ${location.x}, ${location.y}, ${location.z}`);
      
      if (type === 'wall') {
        for (let y = 0; y < 3; y++) {
          for (let x = -2; x <= 2; x++) {
            const blockPos = location.offset(x, y, 0);
            defense.blocks.push(blockPos);
          }
        }
      } else if (type === 'tower') {
        for (let y = 0; y < 5; y++) {
          if (y < 4) {
            for (let x = -1; x <= 1; x++) {
              for (let z = -1; z <= 1; z++) {
                if (Math.abs(x) === 1 || Math.abs(z) === 1) {
                  const blockPos = location.offset(x, y, z);
                  defense.blocks.push(blockPos);
                }
              }
            }
          } else {
            for (let x = -1; x <= 1; x++) {
              for (let z = -1; z <= 1; z++) {
                const blockPos = location.offset(x, y, z);
                defense.blocks.push(blockPos);
              }
            }
          }
        }
      }
      
      this.defenseLocations.push(defense);
      this._saveState();
      
      this.logger.info(`Defense structure planned with ${defense.blocks.length} blocks`);
      return defense;
    } catch (err) {
      this.logger.error(`Failed to create defense structure: ${err.message}`);
      return false;
    }
  }
  
  async autoMaintainFarms() {
    for (let i = 0; i < this.farms.length; i++) {
      const farm = this.farms[i];
      const timeSinceHarvest = farm.lastHarvest ? Date.now() - farm.lastHarvest : Infinity;
      
      if (timeSinceHarvest > 1200000) {
        await this.harvestFarm(i);
      }
    }
  }
  
  async autoMaintainAnimals() {
    for (let i = 0; i < this.animalPens.length; i++) {
      const pen = this.animalPens[i];
      const timeSinceBreed = pen.lastBreed ? Date.now() - pen.lastBreed : Infinity;
      
      if (timeSinceBreed > 300000) {
        await this.breedAnimals(i);
      }
    }
  }
  
  getFarms() {
    return this.farms;
  }
  
  getAnimalPens() {
    return this.animalPens;
  }
  
  getDefenseStructures() {
    return this.defenseLocations;
  }
  
  getSurvivalStatus() {
    return {
      farms: this.farms.length,
      animalPens: this.animalPens.length,
      defenses: this.defenseLocations.length,
      autoMaintenance: true
    };
  }
}

module.exports = AdvancedSurvival;
