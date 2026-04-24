// 仿真功能专用JavaScript

/**
 * 仿真引擎类
 */
class SimulationEngine {
    constructor() {
        this.isRunning = false;
        this.simulationSpeed = 1.0; // 仿真速度倍率
        this.scanTime = 100; // 扫描周期时间（毫秒）
        this.intervalId = null;
        this.variableStates = {};
        this.timeline = [];
        this.startTime = null;
        this.elapsedTime = 0;
        
        this.initializeVariables();
    }
    
    initializeVariables() {
        // 初始化默认变量状态
        this.variableStates = {
            'I0.0': false,
            'I0.1': false,
            'I0.2': false,
            'I0.3': false,
            'Q0.0': false,
            'Q0.1': false,
            'Q0.2': false,
            'M0.0': false,
            'M0.1': false,
            'T0': { current: 0, preset: 1000, done: false },
            'T1': { current: 0, preset: 2000, done: false },
            'C0': { current: 0, preset: 5, done: false }
        };
    }
    
    start(ladderDiagram, options = {}) {
        if (this.isRunning) {
            console.warn('Simulation is already running');
            return;
        }
        
        this.isRunning = true;
        this.ladderDiagram = ladderDiagram;
        this.startTime = Date.now();
        
        // 更新选项
        if (options.speed !== undefined) this.simulationSpeed = options.speed;
        if (options.scanTime !== undefined) this.scanTime = options.scanTime;
        
        // 开始仿真循环
        this.intervalId = setInterval(() => {
            this.executeScanCycle();
        }, this.scanTime / this.simulationSpeed);
        
        console.log('Simulation started');
    }
    
    stop() {
        if (!this.isRunning) {
            console.warn('Simulation is not running');
            return;
        }
        
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        console.log('Simulation stopped');
    }
    
    executeScanCycle() {
        if (!this.isRunning) return;
        
        // 更新经过的时间
        this.elapsedTime = Date.now() - this.startTime;
        
        // 执行梯形图逻辑
        this.executeLadderLogic();
        
        // 更新定时器
        this.updateTimers();
        
        // 更新计数器
        this.updateCounters();
        
        // 记录当前状态到时间线
        this.recordState();
        
        // 更新UI显示
        this.updateVariableDisplay();
    }
    
    executeLadderLogic() {
        // 这里应该执行实际的梯形图逻辑
        // 为了演示目的，我们简化实现
        
        // 示例：实现一个简单的逻辑
        // 如果 I0.0 和 I0.1 都为真，则 Q0.0 为真
        if (this.variableStates['I0.0'] && this.variableStates['I0.1']) {
            this.variableStates['Q0.0'] = true;
        } else {
            this.variableStates['Q0.0'] = false;
        }
        
        // 更复杂的逻辑可以在这里实现
        // 根据实际的梯形图结构执行相应的逻辑
    }
    
    updateTimers() {
        // 更新所有定时器
        for (const [addr, timer] of Object.entries(this.variableStates)) {
            if (addr.startsWith('T') && typeof timer === 'object') {
                if (timer.running) {
                    // 计算定时器经过的时间
                    timer.current += this.scanTime / this.simulationSpeed;
                    
                    // 检查是否到达预设值
                    if (timer.current >= timer.preset) {
                        timer.done = true;
                        timer.current = timer.preset; // 防止溢出
                    }
                } else {
                    timer.done = false;
                }
            }
        }
    }
    
    updateCounters() {
        // 更新所有计数器
        for (const [addr, counter] of Object.entries(this.variableStates)) {
            if (addr.startsWith('C') && typeof counter === 'object') {
                // 简单的计数逻辑示例
                // 在实际实现中，这里需要根据梯形图逻辑来更新
                if (counter.incrementTrigger) {
                    counter.current++;
                    counter.incrementTrigger = false;
                    
                    if (counter.current >= counter.preset) {
                        counter.done = true;
                    }
                }
                
                if (counter.resetTrigger) {
                    counter.current = 0;
                    counter.done = false;
                    counter.resetTrigger = false;
                }
            }
        }
    }
    
    recordState() {
        // 记录当前状态到时间线
        const currentState = JSON.parse(JSON.stringify(this.variableStates));
        this.timeline.push({
            time: this.elapsedTime,
            states: currentState
        });
        
        // 限制时间线长度，避免内存过度使用
        if (this.timeline.length > 1000) {
            this.timeline.shift();
        }
    }
    
    updateVariableDisplay() {
        // 更新UI中的变量显示
        this.updateVariableMonitor();
        this.updateOutputIndicators();
    }
    
    updateVariableMonitor() {
        // 更新变量监视器UI
        const monitorElement = document.getElementById('variableMonitor');
        if (monitorElement) {
            // 获取所有变量项
            const monitorItems = monitorElement.querySelectorAll('.monitor-item');
            
            monitorItems.forEach(item => {
                const varName = item.querySelector('.var-name').textContent;
                const varValueElement = item.querySelector('.var-value');
                
                if (this.variableStates[varName] !== undefined) {
                    const value = this.variableStates[varName];
                    
                    if (typeof value === 'boolean') {
                        // 布尔值显示为 0/1
                        varValueElement.textContent = value ? '1' : '0';
                        // 根据值更新颜色
                        varValueElement.style.backgroundColor = value ? '#28a745' : '#dc3545';
                    } else if (typeof value === 'object' && value !== null) {
                        // 对象值（如定时器、计数器）
                        if ('current' in value && 'preset' in value) {
                            varValueElement.textContent = `${value.current}/${value.preset}`;
                        } else {
                            varValueElement.textContent = JSON.stringify(value);
                        }
                    } else {
                        // 其他类型的值
                        varValueElement.textContent = String(value);
                    }
                }
            });
        }
    }
    
    updateOutputIndicators() {
        // 更新输出指示器
        // 这里可以改变输出线圈的外观来反映状态
        document.querySelectorAll('[data-element-type="coil"]').forEach(coil => {
            const elementId = coil.getAttribute('data-element-id');
            // 找到对应的元件
            const element = this.findElementById(elementId);
            if (element && element.address) {
                const outputState = this.variableStates[element.address];
                if (outputState !== undefined) {
                    // 根据输出状态改变线圈颜色
                    coil.setAttribute('fill', outputState ? '#28a745' : 'none');
                    coil.setAttribute('stroke', outputState ? '#28a745' : '#333');
                }
            }
        });
    }
    
    findElementById(id) {
        // 在当前梯形图中查找元件
        if (!this.ladderDiagram || !this.ladderDiagram.rungs) return null;
        
        for (const rung of this.ladderDiagram.rungs) {
            for (const element of rung.elements) {
                if (element.id === id) {
                    return element;
                }
            }
        }
        return null;
    }
    
    setVariable(name, value) {
        if (this.variableStates[name] !== undefined) {
            if (typeof this.variableStates[name] === 'object') {
                // 对于复杂变量（定时器、计数器），只更新值而不改变结构
                if ('current' in this.variableStates[name]) {
                    this.variableStates[name].current = value;
                    if (this.variableStates[name].current >= this.variableStates[name].preset) {
                        this.variableStates[name].done = true;
                    } else {
                        this.variableStates[name].done = false;
                    }
                }
            } else {
                this.variableStates[name] = value;
            }
            
            // 立即更新显示
            this.updateVariableDisplay();
        }
    }
    
    getVariable(name) {
        return this.variableStates[name];
    }
    
    getTimeline() {
        return this.timeline;
    }
    
    reset() {
        this.stop();
        this.initializeVariables();
        this.timeline = [];
        this.elapsedTime = 0;
        this.updateVariableDisplay();
    }
    
    getSimulationStats() {
        return {
            isRunning: this.isRunning,
            elapsedTime: this.elapsedTime,
            scanTime: this.scanTime,
            speed: this.simulationSpeed,
            variableCount: Object.keys(this.variableStates).length,
            timelineLength: this.timeline.length
        };
    }
    
    // 与后端API通信的方法
    async runRemoteSimulation(ladderDiagram, duration = 10) {
        try {
            const response = await fetch('/api/simulation/run', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ladderDiagram: ladderDiagram,
                    duration: duration
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Remote simulation error:', error);
            throw error;
        }
    }
    
    async stopRemoteSimulation() {
        try {
            const response = await fetch('/api/simulation/stop', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Stop simulation error:', error);
            throw error;
        }
    }
    
    async getRemoteVariables() {
        try {
            const response = await fetch('/api/plc/variables', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Get variables error:', error);
            throw error;
        }
    }
}

/**
 * 仿真控制器类 - 管理仿真界面和用户交互
 */
class SimulationController {
    constructor(simulationEngine) {
        this.engine = simulationEngine || new SimulationEngine();
        this.bindControlEvents();
        this.updateControls();
    }
    
    bindControlEvents() {
        // 绑定控制按钮事件
        const simulateBtn = document.getElementById('simulateBtn');
        const stopSimBtn = document.getElementById('stopSimBtn');
        
        if (simulateBtn) {
            simulateBtn.addEventListener('click', () => this.startSimulation());
        }
        
        if (stopSimBtn) {
            stopSimBtn.addEventListener('click', () => this.stopSimulation());
        }
        
        // 绑定变量切换事件
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('toggle-btn')) {
                this.toggleVariable(e.target.dataset.var);
            }
        });
    }
    
    startSimulation() {
        if (!window.ladderDiagram) {
            alert('没有可仿真的梯形图程序');
            return;
        }
        
        try {
            this.engine.start(window.ladderDiagram);
            this.updateControls();
            this.showNotification('仿真已开始', 'success');
        } catch (error) {
            this.showNotification(`启动仿真失败: ${error.message}`, 'error');
        }
    }
    
    stopSimulation() {
        try {
            this.engine.stop();
            this.updateControls();
            this.showNotification('仿真已停止', 'info');
        } catch (error) {
            this.showNotification(`停止仿真失败: ${error.message}`, 'error');
        }
    }
    
    toggleVariable(varName) {
        if (!varName) return;
        
        const currentState = this.engine.getVariable(varName);
        if (currentState !== undefined) {
            let newValue;
            
            if (typeof currentState === 'boolean') {
                newValue = !currentState;
            } else if (typeof currentState === 'object' && currentState !== null) {
                // 对于定时器和计数器，可能需要特殊处理
                if ('current' in currentState) {
                    // 这里可以实现复位逻辑
                    this.engine.setVariable(varName, { ...currentState, current: 0, done: false });
                    this.showNotification(`${varName} 已复位`, 'info');
                    return;
                }
            } else {
                // 对于其他类型，暂时不处理
                return;
            }
            
            if (typeof currentState === 'boolean') {
                this.engine.setVariable(varName, newValue);
                this.showNotification(`${varName} 已切换为 ${newValue ? 'ON' : 'OFF'}`, 'info');
            }
        }
    }
    
    updateControls() {
        const simulateBtn = document.getElementById('simulateBtn');
        const stopSimBtn = document.getElementById('stopSimBtn');
        
        if (simulateBtn && stopSimBtn) {
            if (this.engine.isRunning) {
                simulateBtn.style.display = 'none';
                stopSimBtn.style.display = 'inline-block';
            } else {
                simulateBtn.style.display = 'inline-block';
                stopSimBtn.style.display = 'none';
            }
        }
    }
    
    showNotification(message, type = 'info') {
        // 使用现有的消息框功能
        if (window.showMessage) {
            window.showMessage(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
    
    getStats() {
        return this.engine.getSimulationStats();
    }
    
    resetSimulation() {
        this.engine.reset();
        this.updateControls();
        this.showNotification('仿真已重置', 'info');
    }
}

// 初始化仿真系统
let simulationEngine = null;
let simulationController = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化仿真引擎
    simulationEngine = new SimulationEngine();
    
    // 初始化仿真控制器
    simulationController = new SimulationController(simulationEngine);
    
    // 将实例暴露到全局作用域
    window.simulationEngine = simulationEngine;
    window.simulationController = simulationController;
    
    console.log('Simulation system initialized');
});

// 导出类和实例
window.SimulationEngine = SimulationEngine;
window.SimulationController = SimulationController;