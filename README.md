# 手机端PLC编程框架

## 项目概述
这是一个用于在移动设备上编写PLC程序的框架，支持梯形图编程，兼容西门子S1200系列指令集。

## 核心功能
- 可视化梯形图编程界面
- 支持常开触点、常闭触点、线圈、定时器、MOVE等基本PLC指令
- 实时仿真验证功能
- 适合手机触摸屏的操作界面

## 技术栈
- 后端：Python + Flask/FastAPI
- 前端：HTML5 + CSS3 + JavaScript
- 图形库：SVG 或 Canvas
- 数据存储：JSON格式存储程序

## 项目结构
```
mobile_plc_framework/
├── backend/                 # Python后端代码
│   ├── app.py              # 主应用文件
│   ├── plc_interpreter.py  # PLC解释器
│   ├── ladder_editor.py    # 梯形图编辑器逻辑
│   └── simulation.py       # 仿真引擎
├── frontend/               # 前端代码
│   ├── index.html          # 主界面
│   ├── css/
│   │   └── style.css       # 样式表
│   ├── js/
│   │   ├── main.js         # 主脚本
│   │   ├── ladder.js       # 梯形图交互逻辑
│   │   └── simulation.js   # 仿真逻辑
│   └── assets/
│       ├── icons/          # 图标资源
│       └── images/         # 图片资源
├── tests/                  # 测试文件
├── requirements.txt        # Python依赖
└── package.json           # Node.js依赖（如果需要）
```

## 功能模块
1. 梯形图编辑器
2. PLC指令解析器
3. 仿真运行环境
4. 程序验证器
5. 移动端适配界面