// Mobile PLC Programming Framework - Main JavaScript

// 全局变量
let currentProject = null;
let selectedElement = null;
let ladderDiagram = {
    projectId: null,
    projectName: 'Untitled',
    rungs: []
};

// DOM元素引用
const elements = {
    canvas: document.getElementById('ladderCanvas'),
    newBtn: document.getElementById('newBtn'),
    saveBtn: document.getElementById('saveBtn'),
    loadBtn: document.getElementById('loadBtn'),
    compileBtn: document.getElementById('compileBtn'),
    simulateBtn: document.getElementById('simulateBtn'),
    stopSimBtn: document.getElementById('stopSimBtn'),
    addRungBtn: document.getElementById('addRungBtn'),
    removeRungBtn: document.getElementById('removeRungBtn'),
    duplicateRungBtn: document.getElementById('duplicateRungBtn'),
    elementProperties: document.getElementById('elementProperties'),
    variableMonitor: document.getElementById('variableMonitor'),
    compileOutput: document.getElementById('compileOutput'),
    messageBox: document.getElementById('messageBox')
};

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // 绑定事件监听器
    bindEventListeners();
    
    // 加载PLC指令列表
    loadInstructions();
    
    // 初始化画布
    initializeCanvas();
    
    // 创建第一个梯级
    addNewRung();
    
    showMessage('应用初始化完成', 'success');
}

function bindEventListeners() {
    // 工具栏按钮事件
    elements.newBtn.addEventListener('click', handleNewProject);
    elements.saveBtn.addEventListener('click', handleSaveProject);
    elements.loadBtn.addEventListener('click', handleLoadProject);
    elements.compileBtn.addEventListener('click', handleCompile);
    elements.simulateBtn.addEventListener('click', handleSimulationStart);
    elements.stopSimBtn.addEventListener('click', handleSimulationStop);
    
    // 梯级控制按钮事件
    elements.addRungBtn.addEventListener('click', () => addNewRung());
    elements.removeRungBtn.addEventListener('click', () => removeSelectedRung());
    elements.duplicateRungBtn.addEventListener('click', () => duplicateSelectedRung());
    
    // 指令拖拽事件
    document.querySelectorAll('.instruction-item').forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
    });
    
    // 画布放置事件
    elements.canvas.addEventListener('dragover', handleDragOver);
    elements.canvas.addEventListener('drop', handleDrop);
    
    // 变量监视器事件
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            toggleVariable(this.dataset.var);
        });
    });
}

function loadInstructions() {
    // 从API加载指令列表
    fetch('/api/plc/instructions')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Loaded PLC instructions:', data.instructions);
                // 指令已经显示在侧边栏中
            } else {
                showMessage('加载指令失败: ' + data.error, 'error');
            }
        })
        .catch(error => {
            console.error('Error loading instructions:', error);
            showMessage('加载指令时出错: ' + error.message, 'error');
        });
}

function initializeCanvas() {
    // 设置画布大小
    const container = document.querySelector('.ladder-diagram-container');
    elements.canvas.setAttribute('width', container.clientWidth);
    elements.canvas.setAttribute('height', container.clientHeight);
    
    // 监听窗口大小变化
    window.addEventListener('resize', function() {
        elements.canvas.setAttribute('width', container.clientWidth);
        elements.canvas.setAttribute('height', container.clientHeight);
        redrawLadderDiagram();
    });
}

function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.type);
    e.dataTransfer.effectAllowed = 'copy';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
}

function handleDrop(e) {
    e.preventDefault();
    const elementType = e.dataTransfer.getData('text/plain');
    const rect = elements.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 添加新元件到最近的梯级
    addElementToNearestRung(elementType, x, y);
}

function addElementToNearestRung(elementType, x, y) {
    // 简化的实现 - 添加到第一个梯级
    if (ladderDiagram.rungs.length > 0) {
        const rung = ladderDiagram.rungs[0]; // 实际应用中应该找到最近的梯级
        
        const newElement = {
            id: generateId(),
            type: elementType,
            x: x,
            y: y,
            address: getDefaultAddress(elementType),
            params: getDefaultParams(elementType)
        };
        
        rung.elements.push(newElement);
        drawElementOnCanvas(newElement, rung.index);
        showMessage(`添加了 ${getElementTypeName(elementType)}`, 'success');
    } else {
        showMessage('请先添加一个梯级', 'error');
    }
}

function getDefaultAddress(type) {
    // 根据类型返回默认地址
    switch(type) {
        case 'contact_n':
        case 'contact_nc':
            return 'I0.0'; // 输入地址
        case 'coil':
            return 'Q0.0'; // 输出地址
        case 'timer_on':
        case 'timer_off':
            return 'T0'; // 定时器地址
        case 'counter_up':
            return 'C0'; // 计数器地址
        default:
            return 'M0.0'; // 内存地址
    }
}

function getDefaultParams(type) {
    // 根据类型返回默认参数
    switch(type) {
        case 'timer_on':
        case 'timer_off':
            return { preset: 1000 }; // 1秒预设值
        case 'counter_up':
            return { preset: 10 };
        case 'move':
            return { source: '0', destination: 'M0.0' };
        default:
            return {};
    }
}

function getElementTypeName(type) {
    const names = {
        'contact_n': '常开触点',
        'contact_nc': '常闭触点',
        'coil': '线圈',
        'timer_on': '接通延时定时器',
        'timer_off': '断开延时定时器',
        'counter_up': '加计数器',
        'move': 'MOVE指令',
        'compare_eq': '等于比较',
        'compare_gt': '大于比较',
        'compare_lt': '小于比较'
    };
    return names[type] || type;
}

function generateId() {
    return 'element_' + Math.random().toString(36).substr(2, 9);
}

function addNewRung() {
    const newRung = {
        id: generateId(),
        index: ladderDiagram.rungs.length,
        elements: [],
        powerRails: {
            left: true,
            right: true
        }
    };
    
    ladderDiagram.rungs.push(newRung);
    drawRungOnCanvas(newRung);
    showMessage('添加了新梯级', 'success');
}

function removeSelectedRung() {
    if (selectedElement && selectedElement.type === 'rung') {
        const rungIndex = selectedElement.rungIndex;
        ladderDiagram.rungs.splice(rungIndex, 1);
        
        // 重新绘制所有梯级
        redrawLadderDiagram();
        showMessage('删除了选中的梯级', 'success');
    } else {
        showMessage('请先选择一个梯级', 'error');
    }
}

function duplicateSelectedRung() {
    if (selectedElement && selectedElement.type === 'rung') {
        const rungIndex = selectedElement.rungIndex;
        const originalRung = ladderDiagram.rungs[rungIndex];
        
        // 创建副本
        const duplicatedRung = JSON.parse(JSON.stringify(originalRung));
        duplicatedRung.id = generateId();
        duplicatedRung.index = ladderDiagram.rungs.length;
        
        // 为副本中的每个元件生成新ID
        duplicatedRung.elements.forEach(element => {
            element.id = generateId();
        });
        
        ladderDiagram.rungs.push(duplicatedRung);
        drawRungOnCanvas(duplicatedRung);
        showMessage('复制了选中的梯级', 'success');
    } else {
        showMessage('请先选择一个梯级', 'error');
    }
}

function drawRungOnCanvas(rung) {
    // 清除画布
    elements.canvas.innerHTML = '';
    
    // 绘制所有梯级
    ladderDiagram.rungs.forEach((r, index) => {
        drawPowerRails(r, index);
        r.elements.forEach(element => {
            drawElementOnCanvas(element, index);
        });
    });
}

function drawPowerRails(rung, index) {
    const svgNS = "http://www.w3.org/2000/svg";
    const canvasHeight = parseInt(elements.canvas.getAttribute('height'));
    const canvasWidth = parseInt(elements.canvas.getAttribute('width'));
    
    // 计算垂直位置
    const verticalSpacing = 80; // 每个梯级的高度
    const startY = 50 + index * verticalSpacing;
    
    // 左母线
    if (rung.powerRails.left) {
        const leftRail = document.createElementNS(svgNS, 'line');
        leftRail.setAttribute('x1', '50');
        leftRail.setAttribute('y1', startY.toString());
        leftRail.setAttribute('x2', '50');
        leftRail.setAttribute('y2', (startY + 40).toString());
        leftRail.setAttribute('class', 'ladder-rung');
        elements.canvas.appendChild(leftRail);
    }
    
    // 右母线
    if (rung.powerRails.right) {
        const rightRail = document.createElementNS(svgNS, 'line');
        rightRail.setAttribute('x1', (canvasWidth - 50).toString());
        rightRail.setAttribute('y1', startY.toString());
        rightRail.setAttribute('x2', (canvasWidth - 50).toString());
        rightRail.setAttribute('y2', (startY + 40).toString());
        rightRail.setAttribute('class', 'ladder-rung');
        elements.canvas.appendChild(rightRail);
    }
    
    // 水平连线
    const horizontalLine = document.createElementNS(svgNS, 'line');
    horizontalLine.setAttribute('x1', '50');
    horizontalLine.setAttribute('y1', startY.toString());
    horizontalLine.setAttribute('x2', (canvasWidth - 50).toString());
    horizontalLine.setAttribute('y2', startY.toString());
    horizontalLine.setAttribute('class', 'ladder-rung');
    elements.canvas.appendChild(horizontalLine);
    
    // 返回线
    const returnLine = document.createElementNS(svgNS, 'line');
    returnLine.setAttribute('x1', '50');
    returnLine.setAttribute('y1', (startY + 40).toString());
    returnLine.setAttribute('x2', (canvasWidth - 50).toString());
    returnLine.setAttribute('y2', (startY + 40).toString());
    returnLine.setAttribute('class', 'ladder-rung');
    elements.canvas.appendChild(returnLine);
}

function drawElementOnCanvas(element, rungIndex) {
    const svgNS = "http://www.w3.org/2000/svg";
    const canvasHeight = parseInt(elements.canvas.getAttribute('height'));
    const canvasWidth = parseInt(elements.canvas.getAttribute('width'));
    
    // 计算垂直位置
    const verticalSpacing = 80;
    const startY = 50 + rungIndex * verticalSpacing + 20; // 在梯级中间
    
    let svgElement;
    
    switch(element.type) {
        case 'contact_n': // 常开触点
            svgElement = createContactElement(element.x, startY, false);
            break;
        case 'contact_nc': // 常闭触点
            svgElement = createContactElement(element.x, startY, true);
            break;
        case 'coil': // 线圈
            svgElement = createCoilElement(element.x, startY);
            break;
        case 'timer_on': // 接通延时定时器
        case 'timer_off': // 断开延时定时器
            svgElement = createTimerElement(element.x, startY, element.type);
            break;
        case 'counter_up': // 加计数器
            svgElement = createCounterElement(element.x, startY);
            break;
        default: // 其他类型用矩形表示
            svgElement = createGenericElement(element.x, startY, element.type);
    }
    
    if (svgElement) {
        svgElement.setAttribute('data-element-id', element.id);
        svgElement.setAttribute('data-element-type', element.type);
        svgElement.setAttribute('class', 'ladder-element');
        
        // 添加点击事件
        svgElement.addEventListener('click', function(e) {
            e.stopPropagation();
            selectElement(element, rungIndex);
        });
        
        elements.canvas.appendChild(svgElement);
    }
    
    // 添加地址标签
    const label = document.createElementNS(svgNS, 'text');
    label.setAttribute('x', (element.x - 15).toString());
    label.setAttribute('y', (startY + 25).toString());
    label.setAttribute('class', 'ladder-text');
    label.textContent = element.address;
    elements.canvas.appendChild(label);
}

function createContactElement(x, y, isNormallyClosed) {
    const svgNS = "http://www.w3.org/2000/svg";
    const g = document.createElementNS(svgNS, 'g');
    
    // 绘制两条平行线（触点）
    const line1 = document.createElementNS(svgNS, 'line');
    line1.setAttribute('x1', (x - 10).toString());
    line1.setAttribute('y1', y.toString());
    line1.setAttribute('x2', (x + 10).toString());
    line1.setAttribute('y2', y.toString());
    line1.setAttribute('class', 'ladder-contact');
    g.appendChild(line1);
    
    const line2 = document.createElementNS(svgNS, 'line');
    line2.setAttribute('x1', (x - 10).toString());
    line2.setAttribute('y1', (y + 10).toString());
    line2.setAttribute('x2', (x + 10).toString());
    line2.setAttribute('y2', (y + 10).toString());
    line2.setAttribute('class', 'ladder-contact');
    g.appendChild(line2);
    
    // 如果是常闭触点，添加斜线
    if (isNormallyClosed) {
        const crossLine = document.createElementNS(svgNS, 'line');
        crossLine.setAttribute('x1', (x - 8).toString());
        crossLine.setAttribute('y1', (y - 2).toString());
        crossLine.setAttribute('x2', (x + 8).toString());
        crossLine.setAttribute('y2', (y + 12).toString());
        crossLine.setAttribute('class', 'ladder-contact');
        g.appendChild(crossLine);
    }
    
    return g;
}

function createCoilElement(x, y) {
    const svgNS = "http://www.w3.org/2000/svg";
    const g = document.createElementNS(svgNS, 'g');
    
    // 绘制矩形线圈
    const rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('x', (x - 15).toString());
    rect.setAttribute('y', (y - 8).toString());
    rect.setAttribute('width', '30');
    rect.setAttribute('height', '16');
    rect.setAttribute('class', 'ladder-coil');
    g.appendChild(rect);
    
    return g;
}

function createTimerElement(x, y, type) {
    const svgNS = "http://www.w3.org/2000/svg";
    const g = document.createElementNS(svgNS, 'g');
    
    // 绘制定时器符号（类似矩形）
    const rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('x', (x - 15).toString());
    rect.setAttribute('y', (y - 8).toString());
    rect.setAttribute('width', '30');
    rect.setAttribute('height', '16');
    rect.setAttribute('class', 'ladder-coil');
    g.appendChild(rect);
    
    // 添加定时器标识
    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('x', x.toString());
    text.setAttribute('y', (y + 5).toString());
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('class', 'ladder-text');
    text.textContent = type === 'timer_on' ? 'TON' : 'TOF';
    g.appendChild(text);
    
    return g;
}

function createCounterElement(x, y) {
    const svgNS = "http://www.w3.org/2000/svg";
    const g = document.createElementNS(svgNS, 'g');
    
    // 绘制计数器符号
    const rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('x', (x - 15).toString());
    rect.setAttribute('y', (y - 8).toString());
    rect.setAttribute('width', '30');
    rect.setAttribute('height', '16');
    rect.setAttribute('class', 'ladder-coil');
    g.appendChild(rect);
    
    // 添加计数器标识
    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('x', x.toString());
    text.setAttribute('y', (y + 5).toString());
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('class', 'ladder-text');
    text.textContent = 'CTU';
    g.appendChild(text);
    
    return g;
}

function createGenericElement(x, y, type) {
    const svgNS = "http://www.w3.org/2000/svg";
    const g = document.createElementNS(svgNS, 'g');
    
    // 绘制通用符号（圆角矩形）
    const rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('x', (x - 15).toString());
    rect.setAttribute('y', (y - 8).toString());
    rect.setAttribute('width', '30');
    rect.setAttribute('height', '16');
    rect.setAttribute('rx', '4');
    rect.setAttribute('ry', '4');
    rect.setAttribute('class', 'ladder-coil');
    g.appendChild(rect);
    
    return g;
}

function selectElement(element, rungIndex) {
    // 清除之前的选中状态
    document.querySelectorAll('.ladder-element').forEach(el => {
        el.classList.remove('selected');
    });
    
    // 选中当前元素
    const elementInCanvas = document.querySelector(`[data-element-id="${element.id}"]`);
    if (elementInCanvas) {
        elementInCanvas.classList.add('selected');
    }
    
    selectedElement = { ...element, rungIndex };
    
    // 显示元件属性
    showElementProperties(element);
}

function showElementProperties(element) {
    let propertiesHtml = `
        <h4>${getElementTypeName(element.type)}</h4>
        <div class="property-group">
            <label>地址:</label>
            <input type="text" id="propAddress" value="${element.address}" />
        </div>
    `;
    
    // 根据元件类型显示特定属性
    switch(element.type) {
        case 'timer_on':
        case 'timer_off':
            propertiesHtml += `
                <div class="property-group">
                    <label>预设时间 (ms):</label>
                    <input type="number" id="propPreset" value="${element.params.preset || 1000}" />
                </div>
            `;
            break;
        case 'counter_up':
            propertiesHtml += `
                <div class="property-group">
                    <label>预设计数值:</label>
                    <input type="number" id="propPreset" value="${element.params.preset || 10}" />
                </div>
            `;
            break;
        case 'move':
            propertiesHtml += `
                <div class="property-group">
                    <label>源地址:</label>
                    <input type="text" id="propSource" value="${element.params.source || ''}" />
                </div>
                <div class="property-group">
                    <label>目标地址:</label>
                    <input type="text" id="propDestination" value="${element.params.destination || ''}" />
                </div>
            `;
            break;
    }
    
    propertiesHtml += `
        <button onclick="updateSelectedElement()" style="margin-top: 10px; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">更新</button>
    `;
    
    elements.elementProperties.innerHTML = propertiesHtml;
}

function updateSelectedElement() {
    if (!selectedElement) {
        showMessage('请先选择一个元件', 'error');
        return;
    }
    
    // 获取更新后的属性值
    const newAddress = document.getElementById('propAddress').value;
    
    // 更新元件属性
    selectedElement.address = newAddress;
    
    // 根据类型更新特定参数
    switch(selectedElement.type) {
        case 'timer_on':
        case 'timer_off':
            const preset = document.getElementById('propPreset').value;
            selectedElement.params = { ...selectedElement.params, preset: parseInt(preset) };
            break;
        case 'counter_up':
            const countPreset = document.getElementById('propPreset').value;
            selectedElement.params = { ...selectedElement.params, preset: parseInt(countPreset) };
            break;
        case 'move':
            const source = document.getElementById('propSource').value;
            const destination = document.getElementById('propDestination').value;
            selectedElement.params = { ...selectedElement.params, source, destination };
            break;
    }
    
    // 重新绘制梯形图
    redrawLadderDiagram();
    showMessage('元件属性已更新', 'success');
}

function redrawLadderDiagram() {
    // 清除画布
    elements.canvas.innerHTML = '';
    
    // 重新绘制所有梯级和元件
    ladderDiagram.rungs.forEach((rung, index) => {
        drawPowerRails(rung, index);
        rung.elements.forEach(element => {
            drawElementOnCanvas(element, index);
        });
    });
}

function handleNewProject() {
    if (confirm('确定要创建新项目吗？当前项目将丢失。')) {
        ladderDiagram = {
            projectId: null,
            projectName: 'Untitled',
            rungs: []
        };
        
        elements.canvas.innerHTML = '';
        addNewRung();
        showMessage('创建了新项目', 'success');
    }
}

function handleSaveProject() {
    const projectName = prompt('请输入项目名称:', ladderDiagram.projectName || 'Untitled');
    if (projectName) {
        ladderDiagram.projectName = projectName;
        
        fetch('/api/project/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                projectId: ladderDiagram.projectId || generateId(),
                projectName: projectName,
                diagramData: ladderDiagram
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                ladderDiagram.projectId = data.projectId || generateId();
                showMessage('项目已保存', 'success');
            } else {
                showMessage('保存失败: ' + data.error, 'error');
            }
        })
        .catch(error => {
            console.error('Save error:', error);
            showMessage('保存时出错: ' + error.message, 'error');
        });
    }
}

function handleLoadProject() {
    showMessage('加载功能待实现', 'error');
    // 这里应该打开文件选择对话框或从服务器加载项目
}

function handleCompile() {
    elements.compileOutput.innerHTML = '<div class="loading"></div> 正在编译...';
    
    fetch('/api/plc/compile', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            ladderDiagram: ladderDiagram
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            let output = '编译成功!\n\n';
            
            if (data.errors && data.errors.length > 0) {
                output += '错误:\n';
                data.errors.forEach(err => output += `- ${err}\n`);
            }
            
            if (data.warnings && data.warnings.length > 0) {
                output += '\n警告:\n';
                data.warnings.forEach(warn => output += `- ${warn}\n`);
            }
            
            if (data.errors.length === 0) {
                output += `\n生成了 ${data.compiledProgram.length} 条指令`;
            }
            
            elements.compileOutput.textContent = output;
            showMessage('编译完成', 'success');
        } else {
            elements.compileOutput.textContent = `编译失败: ${data.error}`;
            showMessage('编译失败: ' + data.error, 'error');
        }
    })
    .catch(error => {
        console.error('Compile error:', error);
        elements.compileOutput.textContent = `编译错误: ${error.message}`;
        showMessage('编译时出错: ' + error.message, 'error');
    });
}

function handleSimulationStart() {
    elements.compileOutput.innerHTML = '<div class="loading"></div> 正在启动仿真...';
    
    // 切换按钮状态
    elements.simulateBtn.style.display = 'none';
    elements.stopSimBtn.style.display = 'inline-block';
    
    fetch('/api/simulation/run', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            ladderDiagram: ladderDiagram,
            duration: 10  // 运行10秒
        })
    })
    .then(response => response.json())
    .then(data => {
        // 恢复按钮状态
        elements.simulateBtn.style.display = 'inline-block';
        elements.stopSimBtn.style.display = 'none';
        
        if (data.success) {
            let output = '仿真完成!\n\n';
            output += `运行时长: ${data.duration}秒\n`;
            output += `最终状态:\n`;
            output += `- 输入点: ${Object.keys(data.final_state.inputs).length}\n`;
            output += `- 输出点: ${Object.keys(data.final_state.outputs).length}\n`;
            output += `- 内存位: ${Object.keys(data.final_state.memory_bits).length}\n`;
            
            elements.compileOutput.textContent = output;
            showMessage('仿真完成', 'success');
        } else {
            elements.compileOutput.textContent = `仿真失败: ${data.error}`;
            showMessage('仿真失败: ' + data.error, 'error');
        }
    })
    .catch(error => {
        // 恢复按钮状态
        elements.simulateBtn.style.display = 'inline-block';
        elements.stopSimBtn.style.display = 'none';
        
        console.error('Simulation error:', error);
        elements.compileOutput.textContent = `仿真错误: ${error.message}`;
        showMessage('仿真时出错: ' + error.message, 'error');
    });
}

function handleSimulationStop() {
    fetch('/api/simulation/stop', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            elements.simulateBtn.style.display = 'inline-block';
            elements.stopSimBtn.style.display = 'none';
            showMessage('仿真已停止', 'success');
        } else {
            showMessage('停止仿真失败: ' + data.error, 'error');
        }
    })
    .catch(error => {
        console.error('Stop simulation error:', error);
        showMessage('停止仿真时出错: ' + error.message, 'error');
    });
}

function toggleVariable(varName) {
    // 这里应该发送请求给后端更新变量状态
    const varElement = document.querySelector(`[data-var="${varName}"]`);
    if (varElement) {
        // 简单的前端模拟
        const currentValue = varElement.parentElement.querySelector('.var-value');
        const newValue = currentValue.textContent === '0' ? '1' : '0';
        currentValue.textContent = newValue;
        
        showMessage(`${varName} 已切换为 ${newValue}`, 'success');
    }
}

function showMessage(message, type) {
    elements.messageBox.textContent = message;
    elements.messageBox.className = `message-box ${type}`;
    elements.messageBox.classList.remove('hidden');
    
    setTimeout(() => {
        elements.messageBox.classList.add('hidden');
    }, 3000);
}

// 导出函数供其他脚本使用
window.generateId = generateId;
window.showMessage = showMessage;
window.selectElement = selectElement;
window.redrawLadderDiagram = redrawLadderDiagram;
window.addElementToNearestRung = addElementToNearestRung;