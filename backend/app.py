from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
import json
import sys
import os

# 添加项目根目录到路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from plc_interpreter import PLCInterpreter
from ladder_editor import LadderEditor
from simulation import SimulationEngine

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# 主页路由 - 提供前端界面
@app.route('/')
def index():
    with open('../frontend/index.html', 'r', encoding='utf-8') as f:
        html_content = f.read()
    return render_template_string(html_content)

# 创建新项目
@app.route('/api/project/new', methods=['POST'])
def create_project():
    try:
        data = request.get_json()
        project_name = data.get('name', 'Untitled')
        
        # 创建新的梯形图编辑器实例
        ladder_editor = LadderEditor(project_name)
        
        # 返回项目ID和其他基本信息
        return jsonify({
            'success': True,
            'projectId': ladder_editor.project_id,
            'projectName': project_name,
            'ladderDiagram': ladder_editor.get_diagram()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# 保存项目
@app.route('/api/project/save', methods=['POST'])
def save_project():
    try:
        data = request.get_json()
        project_id = data.get('projectId')
        diagram_data = data.get('diagramData')
        
        # 这里应该实现实际的保存逻辑
        # 暂时返回成功
        return jsonify({
            'success': True,
            'message': 'Project saved successfully'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# 加载项目
@app.route('/api/project/load/<project_id>', methods=['GET'])
def load_project(project_id):
    try:
        # 这里应该实现实际的加载逻辑
        # 暂时返回示例数据
        return jsonify({
            'success': True,
            'projectId': project_id,
            'ladderDiagram': {'rungs': []}
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# 获取PLC指令列表
@app.route('/api/plc/instructions', methods=['GET'])
def get_instructions():
    try:
        instructions = [
            {'id': 'contact_n', 'name': '常开触点', 'symbol': 'X', 'category': 'basic'},
            {'id': 'contact_nc', 'name': '常闭触点', 'symbol': '/X', 'category': 'basic'},
            {'id': 'coil', 'name': '线圈', 'symbol': 'Y', 'category': 'basic'},
            {'id': 'timer_on', 'name': '接通延时定时器', 'symbol': 'TON', 'category': 'timers'},
            {'id': 'timer_off', 'name': '断开延时定时器', 'symbol': 'TOF', 'category': 'timers'},
            {'id': 'counter_up', 'name': '加计数器', 'symbol': 'CTU', 'category': 'counters'},
            {'id': 'move', 'name': 'MOVE指令', 'symbol': 'MOVE', 'category': 'data'},
            {'id': 'compare_eq', 'name': '等于比较', 'symbol': '=', 'category': 'logic'},
            {'id': 'compare_gt', 'name': '大于比较', 'symbol': '>', 'category': 'logic'},
            {'id': 'compare_lt', 'name': '小于比较', 'symbol': '<', 'category': 'logic'}
        ]
        
        return jsonify({
            'success': True,
            'instructions': instructions
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# 编译PLC程序
@app.route('/api/plc/compile', methods=['POST'])
def compile_program():
    try:
        data = request.get_json()
        ladder_diagram = data.get('ladderDiagram')
        
        # 创建PLC解释器实例并编译程序
        interpreter = PLCInterpreter()
        compilation_result = interpreter.compile(ladder_diagram)
        
        return jsonify({
            'success': True,
            'compiledProgram': compilation_result['program'],
            'errors': compilation_result['errors'],
            'warnings': compilation_result['warnings']
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# 运行仿真
@app.route('/api/simulation/run', methods=['POST'])
def run_simulation():
    try:
        data = request.get_json()
        ladder_diagram = data.get('ladderDiagram')
        duration = data.get('duration', 10)  # 默认运行10秒
        
        # 创建仿真引擎实例并运行
        sim_engine = SimulationEngine()
        result = sim_engine.run(ladder_diagram, duration)
        
        return jsonify({
            'success': True,
            'simulationResult': result
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# 停止仿真
@app.route('/api/simulation/stop', methods=['POST'])
def stop_simulation():
    try:
        # 停止当前运行的仿真
        SimulationEngine.stop_current_simulation()
        
        return jsonify({
            'success': True,
            'message': 'Simulation stopped'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# 获取变量状态
@app.route('/api/plc/variables', methods=['GET'])
def get_variables():
    try:
        # 获取当前所有变量的状态
        variables = [
            {'name': 'I0.0', 'type': 'Input', 'value': False},
            {'name': 'I0.1', 'type': 'Input', 'value': False},
            {'name': 'Q0.0', 'type': 'Output', 'value': False},
            {'name': 'Q0.1', 'type': 'Output', 'value': False},
            {'name': 'M0.0', 'type': 'Memory', 'value': False},
            {'name': 'T0', 'type': 'Timer', 'value': 0, 'preset': 100},
            {'name': 'C0', 'type': 'Counter', 'value': 0, 'preset': 10}
        ]
        
        return jsonify({
            'success': True,
            'variables': variables
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)