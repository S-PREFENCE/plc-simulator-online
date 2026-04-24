// 梯形图编辑功能专用JavaScript

/**
 * 梯形图编辑器类
 */
class LadderEditor {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.svgNS = "http://www.w3.org/2000/svg";
        this.diagram = {
            rungs: [],
            connections: []
        };
        this.selectedElement = null;
        this.dragging = false;
        this.dragOffset = { x: 0, y: 0 };
        
        this.initializeCanvas();
        this.bindEvents();
    }
    
    initializeCanvas() {
        // 设置画布基本属性
        this.canvas.setAttribute('viewBox', '0 0 1000 800');
        this.canvas.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    }
    
    bindEvents() {
        // 绑定鼠标事件
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
        
        // 绑定触摸事件（移动端支持）
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }
    
    handleMouseDown(e) {
        e.preventDefault();
        const point = this.getEventPoint(e);
        this.selectedElement = this.getElementAt(point.x, point.y);
        
        if (this.selectedElement) {
            this.dragging = true;
            this.dragOffset.x = point.x - this.selectedElement.x;
            this.dragOffset.y = point.y - this.selectedElement.y;
            
            // 高亮选中元件
            this.highlightElement(this.selectedElement);
        }
    }
    
    handleMouseMove(e) {
        if (this.dragging && this.selectedElement) {
            e.preventDefault();
            const point = this.getEventPoint(e);
            
            // 更新元件位置
            this.selectedElement.x = point.x - this.dragOffset.x;
            this.selectedElement.y = point.y - this.dragOffset.y;
            
            // 重新绘制元件
            this.redrawElement(this.selectedElement);
        }
    }
    
    handleMouseUp(e) {
        if (this.dragging) {
            this.dragging = false;
            this.dragOffset = { x: 0, y: 0 };
        }
    }
    
    handleTouchStart(e) {
        if (e.touches.length === 1) {
            this.handleMouseDown(e.touches[0]);
        }
    }
    
    handleTouchMove(e) {
        if (e.touches.length === 1) {
            this.handleMouseMove(e.touches[0]);
        }
    }
    
    handleTouchEnd(e) {
        this.handleMouseUp();
    }
    
    getEventPoint(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }
    
    getElementAt(x, y) {
        // 查找指定坐标处的元件
        for (const rung of this.diagram.rungs) {
            for (const element of rung.elements) {
                // 简单的边界检测
                if (this.isPointInElement(x, y, element)) {
                    return element;
                }
            }
        }
        return null;
    }
    
    isPointInElement(x, y, element) {
        // 简化的碰撞检测
        const tolerance = 15; // 像素容差
        return (
            x >= element.x - tolerance &&
            x <= element.x + tolerance &&
            y >= element.y - tolerance &&
            y <= element.y + tolerance
        );
    }
    
    highlightElement(element) {
        // 高亮选中的元件
        const elementNode = document.querySelector(`[data-element-id="${element.id}"]`);
        if (elementNode) {
            elementNode.setAttribute('stroke', '#ff6b6b');
            elementNode.setAttribute('stroke-width', '3');
        }
    }
    
    clearHighlight() {
        // 清除所有高亮
        document.querySelectorAll('[data-element-id]').forEach(node => {
            node.setAttribute('stroke', '#333');
            node.setAttribute('stroke-width', '2');
        });
    }
    
    redrawElement(element) {
        // 重新绘制指定元件
        const elementNode = document.querySelector(`[data-element-id="${element.id}"]`);
        if (elementNode) {
            // 根据元件类型更新位置
            this.updateElementPosition(elementNode, element);
        }
    }
    
    updateElementPosition(elementNode, element) {
        // 更新SVG元素的位置
        switch(element.type) {
            case 'contact_n':
            case 'contact_nc':
                this.updateContactPosition(elementNode, element);
                break;
            case 'coil':
                this.updateCoilPosition(elementNode, element);
                break;
            case 'timer_on':
            case 'timer_off':
                this.updateTimerPosition(elementNode, element);
                break;
            default:
                // 对于组合元素（如g标签），需要更新内部的所有子元素
                const children = elementNode.children;
                for (let i = 0; i < children.length; i++) {
                    const child = children[i];
                    if (child.tagName === 'LINE') {
                        const currentX1 = parseFloat(child.getAttribute('x1'));
                        const currentY1 = parseFloat(child.getAttribute('y1'));
                        const currentX2 = parseFloat(child.getAttribute('x2'));
                        const currentY2 = parseFloat(child.getAttribute('y2'));
                        
                        const dx = element.x - currentX1;
                        const dy = element.y - currentY1;
                        
                        child.setAttribute('x1', currentX1 + dx);
                        child.setAttribute('y1', currentY1 + dy);
                        child.setAttribute('x2', currentX2 + dx);
                        child.setAttribute('y2', currentY2 + dy);
                    } else if (child.tagName === 'RECT') {
                        const currentX = parseFloat(child.getAttribute('x'));
                        const currentY = parseFloat(child.getAttribute('y'));
                        
                        const dx = element.x - currentX;
                        const dy = element.y - currentY;
                        
                        child.setAttribute('x', currentX + dx);
                        child.setAttribute('y', currentY + dy);
                    }
                }
        }
        
        // 更新标签位置
        const label = document.querySelector(`[data-label-for="${element.id}"]`);
        if (label) {
            label.setAttribute('x', element.x - 15);
            label.setAttribute('y', element.y + 25);
        }
    }
    
    updateContactPosition(contactGroup, element) {
        // 更新触点位置
        const lines = contactGroup.children;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.tagName === 'LINE') {
                const currentX1 = parseFloat(line.getAttribute('x1'));
                const currentY1 = parseFloat(line.getAttribute('y1'));
                const currentX2 = parseFloat(line.getAttribute('x2'));
                const currentY2 = parseFloat(line.getAttribute('y2'));
                
                const centerX = (currentX1 + currentX2) / 2;
                const centerY = (currentY1 + currentY2) / 2;
                
                const dx = element.x - centerX;
                const dy = element.y - centerY;
                
                line.setAttribute('x1', currentX1 + dx);
                line.setAttribute('y1', currentY1 + dy);
                line.setAttribute('x2', currentX2 + dx);
                line.setAttribute('y2', currentY2 + dy);
            }
        }
    }
    
    updateCoilPosition(coilGroup, element) {
        // 更新线圈位置
        const rect = coilGroup.children[0];
        if (rect && rect.tagName === 'RECT') {
            const currentX = parseFloat(rect.getAttribute('x'));
            const currentY = parseFloat(rect.getAttribute('y'));
            
            const dx = element.x - (currentX + 15); // 15是矩形宽度的一半
            const dy = element.y - (currentY + 8);  // 8是矩形高度的一半
            
            rect.setAttribute('x', currentX + dx);
            rect.setAttribute('y', currentY + dy);
        }
    }
    
    updateTimerPosition(timerGroup, element) {
        // 更新定时器位置
        const children = timerGroup.children;
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child.tagName === 'RECT') {
                const currentX = parseFloat(child.getAttribute('x'));
                const currentY = parseFloat(child.getAttribute('y'));
                
                const dx = element.x - (currentX + 15);
                const dy = element.y - (currentY + 8);
                
                child.setAttribute('x', currentX + dx);
                child.setAttribute('y', currentY + dy);
            } else if (child.tagName === 'TEXT') {
                child.setAttribute('x', element.x);
                child.setAttribute('y', element.y + 5);
            }
        }
    }
    
    addRung(index) {
        const newRung = {
            id: this.generateId(),
            index: index !== undefined ? index : this.diagram.rungs.length,
            elements: [],
            powerRails: {
                left: true,
                right: true
            }
        };
        
        if (index !== undefined) {
            this.diagram.rungs.splice(index, 0, newRung);
        } else {
            this.diagram.rungs.push(newRung);
        }
        
        this.drawRung(newRung);
        return newRung.id;
    }
    
    removeRung(rungId) {
        const index = this.diagram.rungs.findIndex(r => r.id === rungId);
        if (index !== -1) {
            this.diagram.rungs.splice(index, 1);
            this.redrawAll();
        }
    }
    
    addElementToRung(rungId, elementType, x, y, address, params = {}) {
        const rung = this.diagram.rungs.find(r => r.id === rungId);
        if (!rung) {
            console.error(`Rung with id ${rungId} not found`);
            return null;
        }
        
        const newElement = {
            id: this.generateId(),
            type: elementType,
            x: x,
            y: y,
            address: address,
            params: params
        };
        
        rung.elements.push(newElement);
        
        // 绘制新元件
        this.drawElement(newElement, rung.index);
        
        return newElement.id;
    }
    
    removeElementFromRung(rungId, elementId) {
        const rung = this.diagram.rungs.find(r => r.id === rungId);
        if (rung) {
            const index = rung.elements.findIndex(e => e.id === elementId);
            if (index !== -1) {
                rung.elements.splice(index, 1);
                this.redrawAll();
            }
        }
    }
    
    drawRung(rung) {
        const canvasHeight = parseInt(this.canvas.getAttribute('height')) || 600;
        const canvasWidth = parseInt(this.canvas.getAttribute('width')) || 800;
        
        // 计算垂直位置
        const verticalSpacing = 80;
        const startY = 50 + rung.index * verticalSpacing;
        
        // 绘制电源线
        this.drawPowerRails(rung, startY, canvasWidth);
        
        // 绘制该梯级上的所有元件
        rung.elements.forEach(element => {
            this.drawElement(element, rung.index);
        });
    }
    
    drawPowerRails(rung, startY, canvasWidth) {
        // 左母线
        if (rung.powerRails.left) {
            const leftRail = document.createElementNS(this.svgNS, 'line');
            leftRail.setAttribute('x1', '50');
            leftRail.setAttribute('y1', startY.toString());
            leftRail.setAttribute('x2', '50');
            leftRail.setAttribute('y2', (startY + 40).toString());
            leftRail.setAttribute('class', 'ladder-rung');
            leftRail.setAttribute('data-rung-id', rung.id);
            this.canvas.appendChild(leftRail);
        }
        
        // 右母线
        if (rung.powerRails.right) {
            const rightRail = document.createElementNS(this.svgNS, 'line');
            rightRail.setAttribute('x1', (canvasWidth - 50).toString());
            rightRail.setAttribute('y1', startY.toString());
            rightRail.setAttribute('x2', (canvasWidth - 50).toString());
            rightRail.setAttribute('y2', (startY + 40).toString());
            rightRail.setAttribute('class', 'ladder-rung');
            rightRail.setAttribute('data-rung-id', rung.id);
            this.canvas.appendChild(rightRail);
        }
        
        // 水平连线
        const horizontalLine = document.createElementNS(this.svgNS, 'line');
        horizontalLine.setAttribute('x1', '50');
        horizontalLine.setAttribute('y1', startY.toString());
        horizontalLine.setAttribute('x2', (canvasWidth - 50).toString());
        horizontalLine.setAttribute('y2', startY.toString());
        horizontalLine.setAttribute('class', 'ladder-rung');
        horizontalLine.setAttribute('data-rung-id', rung.id);
        this.canvas.appendChild(horizontalLine);
        
        // 返回线
        const returnLine = document.createElementNS(this.svgNS, 'line');
        returnLine.setAttribute('x1', '50');
        returnLine.setAttribute('y1', (startY + 40).toString());
        returnLine.setAttribute('x2', (canvasWidth - 50).toString());
        returnLine.setAttribute('y2', (startY + 40).toString());
        returnLine.setAttribute('class', 'ladder-rung');
        returnLine.setAttribute('data-rung-id', rung.id);
        this.canvas.appendChild(returnLine);
    }
    
    drawElement(element, rungIndex) {
        const canvasHeight = parseInt(this.canvas.getAttribute('height')) || 600;
        const canvasWidth = parseInt(this.canvas.getAttribute('width')) || 800;
        
        // 计算垂直位置
        const verticalSpacing = 80;
        const startY = 50 + rungIndex * verticalSpacing + 20; // 在梯级中间
        
        // 修正y坐标
        element.y = startY;
        
        let svgElement;
        
        switch(element.type) {
            case 'contact_n': // 常开触点
                svgElement = this.createContactElement(element.x, startY, false);
                break;
            case 'contact_nc': // 常闭触点
                svgElement = this.createContactElement(element.x, startY, true);
                break;
            case 'coil': // 线圈
                svgElement = this.createCoilElement(element.x, startY);
                break;
            case 'timer_on': // 接通延时定时器
            case 'timer_off': // 断开延时定时器
                svgElement = this.createTimerElement(element.x, startY, element.type);
                break;
            case 'counter_up': // 加计数器
                svgElement = this.createCounterElement(element.x, startY);
                break;
            default: // 其他类型用通用符号
                svgElement = this.createGenericElement(element.x, startY, element.type);
        }
        
        if (svgElement) {
            svgElement.setAttribute('data-element-id', element.id);
            svgElement.setAttribute('data-element-type', element.type);
            svgElement.setAttribute('class', 'ladder-element');
            
            // 添加点击事件
            svgElement.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectElement(element, rungIndex);
                if (window.selectElement) {
                    window.selectElement(element, rungIndex);
                }
            });
            
            this.canvas.appendChild(svgElement);
        }
        
        // 添加地址标签
        const label = document.createElementNS(this.svgNS, 'text');
        label.setAttribute('x', (element.x - 15).toString());
        label.setAttribute('y', (startY + 25).toString());
        label.setAttribute('class', 'ladder-text');
        label.setAttribute('data-label-for', element.id);
        label.textContent = element.address;
        this.canvas.appendChild(label);
    }
    
    createContactElement(x, y, isNormallyClosed) {
        const g = document.createElementNS(this.svgNS, 'g');
        
        // 绘制两条平行线（触点）
        const line1 = document.createElementNS(this.svgNS, 'line');
        line1.setAttribute('x1', (x - 10).toString());
        line1.setAttribute('y1', y.toString());
        line1.setAttribute('x2', (x + 10).toString());
        line1.setAttribute('y2', y.toString());
        line1.setAttribute('class', 'ladder-contact');
        g.appendChild(line1);
        
        const line2 = document.createElementNS(this.svgNS, 'line');
        line2.setAttribute('x1', (x - 10).toString());
        line2.setAttribute('y1', (y + 10).toString());
        line2.setAttribute('x2', (x + 10).toString());
        line2.setAttribute('y2', (y + 10).toString());
        line2.setAttribute('class', 'ladder-contact');
        g.appendChild(line2);
        
        // 如果是常闭触点，添加斜线
        if (isNormallyClosed) {
            const crossLine = document.createElementNS(this.svgNS, 'line');
            crossLine.setAttribute('x1', (x - 8).toString());
            crossLine.setAttribute('y1', (y - 2).toString());
            crossLine.setAttribute('x2', (x + 8).toString());
            crossLine.setAttribute('y2', (y + 12).toString());
            crossLine.setAttribute('class', 'ladder-contact');
            g.appendChild(crossLine);
        }
        
        return g;
    }
    
    createCoilElement(x, y) {
        const g = document.createElementNS(this.svgNS, 'g');
        
        // 绘制矩形线圈
        const rect = document.createElementNS(this.svgNS, 'rect');
        rect.setAttribute('x', (x - 15).toString());
        rect.setAttribute('y', (y - 8).toString());
        rect.setAttribute('width', '30');
        rect.setAttribute('height', '16');
        rect.setAttribute('class', 'ladder-coil');
        g.appendChild(rect);
        
        return g;
    }
    
    createTimerElement(x, y, type) {
        const g = document.createElementNS(this.svgNS, 'g');
        
        // 绘制定时器符号
        const rect = document.createElementNS(this.svgNS, 'rect');
        rect.setAttribute('x', (x - 15).toString());
        rect.setAttribute('y', (y - 8).toString());
        rect.setAttribute('width', '30');
        rect.setAttribute('height', '16');
        rect.setAttribute('class', 'ladder-coil');
        g.appendChild(rect);
        
        // 添加定时器标识
        const text = document.createElementNS(this.svgNS, 'text');
        text.setAttribute('x', x.toString());
        text.setAttribute('y', (y + 5).toString());
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('class', 'ladder-text');
        text.textContent = type === 'timer_on' ? 'TON' : 'TOF';
        g.appendChild(text);
        
        return g;
    }
    
    createCounterElement(x, y) {
        const g = document.createElementNS(this.svgNS, 'g');
        
        // 绘制计数器符号
        const rect = document.createElementNS(this.svgNS, 'rect');
        rect.setAttribute('x', (x - 15).toString());
        rect.setAttribute('y', (y - 8).toString());
        rect.setAttribute('width', '30');
        rect.setAttribute('height', '16');
        rect.setAttribute('class', 'ladder-coil');
        g.appendChild(rect);
        
        // 添加计数器标识
        const text = document.createElementNS(this.svgNS, 'text');
        text.setAttribute('x', x.toString());
        text.setAttribute('y', (y + 5).toString());
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('class', 'ladder-text');
        text.textContent = 'CTU';
        g.appendChild(text);
        
        return g;
    }
    
    createGenericElement(x, y, type) {
        const g = document.createElementNS(this.svgNS, 'g');
        
        // 绘制通用符号（圆角矩形）
        const rect = document.createElementNS(this.svgNS, 'rect');
        rect.setAttribute('x', (x - 15).toString());
        rect.setAttribute('y', (y - 8).toString());
        rect.setAttribute('width', '30');
        rect.setAttribute('height', '16');
        rect.setAttribute('rx', '4');
        rect.setAttribute('ry', '4');
        rect.setAttribute('class', 'ladder-coil');
        g.appendChild(rect);
        
        // 添加类型标识
        const text = document.createElementNS(this.svgNS, 'text');
        text.setAttribute('x', x.toString());
        text.setAttribute('y', (y + 5).toString());
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('class', 'ladder-text');
        text.textContent = type.substring(0, 4).toUpperCase(); // 取前4个字符作为标识
        g.appendChild(text);
        
        return g;
    }
    
    selectElement(element, rungIndex) {
        // 清除之前的选择
        this.clearHighlight();
        
        // 存储当前选择
        this.selectedElement = { ...element, rungIndex };
        
        // 高亮当前元素
        this.highlightElement(element);
    }
    
    redrawAll() {
        // 清除画布
        this.canvas.innerHTML = '';
        
        // 重新绘制所有梯级和元件
        this.diagram.rungs.forEach(rung => {
            this.drawRung(rung);
        });
    }
    
    generateId() {
        return 'element_' + Math.random().toString(36).substr(2, 9);
    }
    
    getDiagramData() {
        return this.diagram;
    }
    
    loadDiagramData(diagramData) {
        this.diagram = diagramData;
        this.redrawAll();
    }
}

// 初始化梯形图编辑器
let ladderEditor = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('ladderCanvas')) {
        ladderEditor = new LadderEditor('ladderCanvas');
        
        // 将实例暴露到全局作用域以便其他脚本使用
        window.ladderEditor = ladderEditor;
    }
});

// 导出类和实例
window.LadderEditor = LadderEditor;