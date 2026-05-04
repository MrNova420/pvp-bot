const fs = require('fs');
const path = require('path');

class TaskManager {
  constructor(config = {}, logger = null) {
    this.logger = logger || console;
    this.persistDir = config.persistDir || 'data/tasks';
    this.enablePersistence = config.enablePersistence !== false;
    this.maxQueueSize = config.maxQueueSize || 100;
    
    this.queue = [];
    this.currentTask = null;
    this.paused = false;
    this.taskHistory = [];
    
    if (this.enablePersistence) {
      this._ensurePersistDir();
      this._loadTasks();
    }
  }
  
  _ensurePersistDir() {
    if (!fs.existsSync(this.persistDir)) {
      fs.mkdirSync(this.persistDir, { recursive: true });
    }
  }
  
  _getPersistPath() {
    return path.join(this.persistDir, 'queue.json');
  }
  
  _loadTasks() {
    const persistPath = this._getPersistPath();
    
    if (fs.existsSync(persistPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(persistPath, 'utf8'));
        this.queue = data.queue || [];
        this.currentTask = data.currentTask || null;
        this.logger.info(`Loaded ${this.queue.length} tasks from persistence`);
      } catch (err) {
        this.logger.error('Failed to load tasks:', err.message);
      }
    }
  }
  
  _saveTasks() {
    if (!this.enablePersistence) return;
    
    const persistPath = this._getPersistPath();
    const data = {
      queue: this.queue,
      currentTask: this.currentTask,
      savedAt: new Date().toISOString()
    };
    
    try {
      fs.writeFileSync(persistPath, JSON.stringify(data, null, 2));
    } catch (err) {
      this.logger.error('Failed to save tasks:', err.message);
    }
  }
  
  addTask(task) {
    if (this.queue.length >= this.maxQueueSize) {
      this.logger.warn('Task queue full, rejecting task');
      return false;
    }
    
    const taskObj = {
      id: this._generateTaskId(),
      type: task.type || 'generic',
      priority: task.priority || 5,
      params: task.params || {},
      status: 'pending',
      createdAt: Date.now(),
      attempts: 0,
      maxAttempts: task.maxAttempts || 3
    };
    
    this.queue.push(taskObj);
    this.queue.sort((a, b) => a.priority - b.priority);
    
    this.logger.info(`Task added: ${taskObj.type} (${taskObj.id})`);
    this._saveTasks();
    
    return taskObj.id;
  }
  
  _generateTaskId() {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  getNextTask() {
    if (this.paused || this.queue.length === 0) {
      return null;
    }
    
    const task = this.queue.shift();
    this.currentTask = task;
    this.currentTask.status = 'running';
    this.currentTask.startedAt = Date.now();
    
    this.logger.info(`Starting task: ${task.type} (${task.id})`);
    this._saveTasks();
    
    return task;
  }
  
  completeTask(success = true, result = null) {
    if (!this.currentTask) return;
    
    this.currentTask.status = success ? 'completed' : 'failed';
    this.currentTask.completedAt = Date.now();
    this.currentTask.result = result;
    
    this.taskHistory.push(this.currentTask);
    if (this.taskHistory.length > 50) {
      this.taskHistory.shift();
    }
    
    this.logger.info(`Task ${success ? 'completed' : 'failed'}: ${this.currentTask.type} (${this.currentTask.id})`);
    
    if (!success && this.currentTask.attempts < this.currentTask.maxAttempts) {
      this.currentTask.attempts++;
      this.currentTask.status = 'pending';
      this.queue.unshift(this.currentTask);
      this.logger.info(`Task requeued (attempt ${this.currentTask.attempts}/${this.currentTask.maxAttempts})`);
    }
    
    this.currentTask = null;
    this._saveTasks();
  }
  
  cancelTask(taskId) {
    const index = this.queue.findIndex(t => t.id === taskId);
    
    if (index !== -1) {
      const task = this.queue.splice(index, 1)[0];
      this.logger.info(`Task cancelled: ${task.type} (${task.id})`);
      this._saveTasks();
      return true;
    }
    
    if (this.currentTask && this.currentTask.id === taskId) {
      this.logger.warn('Cannot cancel running task');
      return false;
    }
    
    return false;
  }
  
  pause() {
    this.paused = true;
    this.logger.info('Task manager paused');
  }
  
  resume() {
    this.paused = false;
    this.logger.info('Task manager resumed');
  }
  
  clearQueue() {
    const count = this.queue.length;
    this.queue = [];
    this._saveTasks();
    this.logger.info(`Cleared ${count} tasks from queue`);
  }
  
  getStatus() {
    return {
      queueLength: this.queue.length,
      currentTask: this.currentTask,
      paused: this.paused,
      recentHistory: this.taskHistory.slice(-10)
    };
  }
}

module.exports = TaskManager;
