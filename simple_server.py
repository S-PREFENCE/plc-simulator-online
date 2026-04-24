"""
手机端PLC编程框架 - 增强版HTTP服务器
v3.0: 支持项目持久化、代码片段API、导出功能
"""

import http.server
import socketserver
import json
import os
import time
import uuid
from urllib.parse import urlparse, parse_qs
import webbrowser

# 服务器配置
PORT = 8080
DIRECTORY = "frontend"

# 数据目录
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
PROJECTS_DIR = os.path.join(DATA_DIR, "projects")
os.makedirs(PROJECTS_DIR, exist_ok=True)

# 全局状态
plc_data = {
    "current_project": None,
    "variables": {
        "I0.0": False, "I0.1": False, "I0.2": False, "I0.3": False,
        "Q0.0": False, "Q0.1": False, "Q0.2": False, "Q0.3": False,
        "M0.0": False, "M0.1": False,
        "T0": {"type": "ton", "current": 0, "preset": 1000, "done": False},
        "C0": {"type": "ctu", "current": 0, "preset": 10, "done": False}
    }
}


class PLCRequestHandler(http.server.SimpleHTTPRequestHandler):
    """自定义请求处理器"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith('/api/'):
            self.handle_api_get(parsed)
        else:
            super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else ''
        if parsed.path.startswith('/api/'):
            self.handle_api_post(parsed, post_data)
        else:
            self.send_error(404, "Not Found")

    def do_OPTIONS(self):
        """CORS预检"""
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def read_json_body(self, post_data):
        try:
            return json.loads(post_data) if post_data else {}
        except:
            return {}

    # ===== GET API =====
    def handle_api_get(self, parsed):
        path = parsed.path

        if path == '/api/plc/instructions':
            instructions = [
                {'id': 'contact_n', 'name': '常开触点', 'symbol': '-| |-', 'category': 'basic'},
                {'id': 'contact_nc', 'name': '常闭触点', 'symbol': '-|/|-', 'category': 'basic'},
                {'id': 'coil', 'name': '线圈', 'symbol': '-( )-', 'category': 'basic'},
                {'id': 'coil_set', 'name': '置位线圈', 'symbol': '-(S)-', 'category': 'basic'},
                {'id': 'coil_reset', 'name': '复位线圈', 'symbol': '-(R)-', 'category': 'basic'},
                {'id': 'timer_on', 'name': '接通延时定时器', 'symbol': 'TON', 'category': 'timers'},
                {'id': 'timer_off', 'name': '断开延时定时器', 'symbol': 'TOF', 'category': 'timers'},
                {'id': 'counter_up', 'name': '加计数器', 'symbol': 'CTU', 'category': 'counters'},
                {'id': 'move', 'name': 'MOVE指令', 'symbol': 'MOV', 'category': 'data'},
                {'id': 'compare_eq', 'name': '等于比较', 'symbol': '==', 'category': 'logic'},
                {'id': 'compare_gt', 'name': '大于比较', 'symbol': '>', 'category': 'logic'},
                {'id': 'compare_lt', 'name': '小于比较', 'symbol': '<', 'category': 'logic'},
            ]
            self.send_json({'success': True, 'instructions': instructions})

        elif path == '/api/plc/variables':
            self.send_json({'success': True, 'variables': plc_data['variables']})

        elif path == '/api/snippets':
            snippets = [
                {
                    'id': 'motor_start_stop',
                    'name': '起保停电路',
                    'desc': '经典电机启保停，自锁逻辑',
                    'preview': 'I0.0 -+-- I0.1 -- Q0.0\nQ0.0 -+',
                    'rungs': [{'elements': [
                        {'type': 'contact_n', 'addr': 'I0.0', 'parallel': False},
                        {'type': 'contact_n', 'addr': 'Q0.0', 'parallel': True},
                        {'type': 'contact_nc', 'addr': 'I0.1', 'parallel': False},
                        {'type': 'coil', 'addr': 'Q0.0', 'parallel': False},
                    ]}]
                },
                {
                    'id': 'motor_fwd_rev',
                    'name': '电机正反转',
                    'desc': '互锁正反转控制',
                    'preview': 'I0.0--I0.2--Q0.1--Q0.0\nI0.1--I0.2--Q0.0--Q0.1',
                    'rungs': [
                        {'elements': [
                            {'type': 'contact_n', 'addr': 'I0.0', 'parallel': False},
                            {'type': 'contact_nc', 'addr': 'I0.2', 'parallel': False},
                            {'type': 'contact_nc', 'addr': 'Q0.1', 'parallel': False},
                            {'type': 'coil', 'addr': 'Q0.0', 'parallel': False},
                        ]},
                        {'elements': [
                            {'type': 'contact_n', 'addr': 'I0.1', 'parallel': False},
                            {'type': 'contact_nc', 'addr': 'I0.2', 'parallel': False},
                            {'type': 'contact_nc', 'addr': 'Q0.0', 'parallel': False},
                            {'type': 'coil', 'addr': 'Q0.1', 'parallel': False},
                        ]}
                    ]
                },
                {
                    'id': 'star_delta',
                    'name': '星三角启动',
                    'desc': 'Y-delta降压启动，定时器切换',
                    'preview': 'Q0.0(Y)->TON->Q0.1(delta)',
                    'rungs': [
                        {'elements': [
                            {'type': 'contact_n', 'addr': 'I0.0', 'parallel': False},
                            {'type': 'contact_nc', 'addr': 'I0.1', 'parallel': False},
                            {'type': 'contact_n', 'addr': 'Q0.0', 'parallel': True},
                            {'type': 'contact_nc', 'addr': 'Q0.1', 'parallel': False},
                            {'type': 'coil', 'addr': 'Q0.0', 'parallel': False},
                        ]},
                        {'elements': [
                            {'type': 'contact_n', 'addr': 'Q0.0', 'parallel': False},
                            {'type': 'timer_on', 'addr': 'T0', 'preset': 5000, 'parallel': False},
                        ]},
                        {'elements': [
                            {'type': 'contact_n', 'addr': 'T0', 'parallel': False},
                            {'type': 'contact_nc', 'addr': 'Q0.0', 'parallel': False},
                            {'type': 'coil', 'addr': 'Q0.1', 'parallel': False},
                        ]}
                    ]
                },
                {
                    'id': 'traffic_light',
                    'name': '交通灯控制',
                    'desc': '红绿灯循环，定时器级联',
                    'preview': 'T0(5s)->T1(5s)->T2(2s)',
                    'rungs': [
                        {'elements': [
                            {'type': 'contact_n', 'addr': 'I0.0', 'parallel': False},
                            {'type': 'timer_on', 'addr': 'T0', 'preset': 5000, 'parallel': False},
                        ]},
                        {'elements': [
                            {'type': 'contact_n', 'addr': 'T0', 'parallel': False},
                            {'type': 'timer_on', 'addr': 'T1', 'preset': 5000, 'parallel': False},
                        ]},
                        {'elements': [
                            {'type': 'contact_n', 'addr': 'T1', 'parallel': False},
                            {'type': 'timer_on', 'addr': 'T2', 'preset': 2000, 'parallel': False},
                        ]},
                    ]
                },
                {
                    'id': 'blink',
                    'name': '定时闪烁',
                    'desc': '1秒闪烁，TON自复位',
                    'preview': 'T0->M0.0->T0(R)',
                    'rungs': [
                        {'elements': [
                            {'type': 'contact_nc', 'addr': 'M0.0', 'parallel': False},
                            {'type': 'timer_on', 'addr': 'T0', 'preset': 1000, 'parallel': False},
                        ]},
                        {'elements': [
                            {'type': 'contact_n', 'addr': 'T0', 'parallel': False},
                            {'type': 'coil', 'addr': 'M0.0', 'parallel': False},
                        ]},
                        {'elements': [
                            {'type': 'contact_n', 'addr': 'M0.0', 'parallel': False},
                            {'type': 'coil', 'addr': 'Q0.0', 'parallel': False},
                        ]}
                    ]
                },
            ]
            self.send_json({'success': True, 'snippets': snippets})

        elif path.startswith('/api/project/list'):
            projects = []
            for fname in os.listdir(PROJECTS_DIR):
                if fname.endswith('.json'):
                    fpath = os.path.join(PROJECTS_DIR, fname)
                    try:
                        with open(fpath, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                            projects.append({
                                'id': fname.replace('.json', ''),
                                'name': data.get('name', '未命名'),
                                'modified': os.path.getmtime(fpath)
                            })
                    except:
                        pass
            projects.sort(key=lambda x: x.get('modified', 0), reverse=True)
            self.send_json({'success': True, 'projects': projects})

        elif path.startswith('/api/project/load/'):
            project_id = path.split('/')[-1]
            fpath = os.path.join(PROJECTS_DIR, project_id + '.json')
            if os.path.exists(fpath):
                with open(fpath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                self.send_json({'success': True, 'project': data})
            else:
                self.send_json({'success': False, 'error': '项目不存在'})

        else:
            self.send_json({'success': False, 'error': 'Unknown API: ' + path})

    # ===== POST API =====
    def handle_api_post(self, parsed, post_data):
        path = parsed.path
        data = self.read_json_body(post_data)

        if path == '/api/project/new':
            name = data.get('name', '未命名项目')
            project_id = str(uuid.uuid4())[:8]
            project_data = {
                'id': project_id,
                'name': name,
                'rungs': [],
                'created_at': time.strftime('%Y-%m-%d %H:%M:%S'),
                'modified_at': time.strftime('%Y-%m-%d %H:%M:%S')
            }
            fpath = os.path.join(PROJECTS_DIR, project_id + '.json')
            with open(fpath, 'w', encoding='utf-8') as f:
                json.dump(project_data, f, ensure_ascii=False, indent=2)
            plc_data['current_project'] = project_id
            self.send_json({'success': True, 'projectId': project_id, 'projectName': name})

        elif path == '/api/project/save':
            project_id = data.get('projectId')
            if not project_id:
                project_id = str(uuid.uuid4())[:8]
            project_data = {
                'id': project_id,
                'name': data.get('name', '未命名项目'),
                'rungs': data.get('rungs', []),
                'modified_at': time.strftime('%Y-%m-%d %H:%M:%S')
            }
            fpath = os.path.join(PROJECTS_DIR, project_id + '.json')
            with open(fpath, 'w', encoding='utf-8') as f:
                json.dump(project_data, f, ensure_ascii=False, indent=2)
            self.send_json({'success': True, 'message': '保存成功', 'projectId': project_id})

        elif path == '/api/simulation/run':
            self.send_json({
                'success': True,
                'message': '仿真已启动（前端本地执行）',
                'final_state': plc_data['variables']
            })

        elif path == '/api/simulation/stop':
            self.send_json({'success': True, 'message': '仿真已停止'})

        elif path == '/api/variable/toggle':
            var_name = data.get('name')
            if var_name in plc_data['variables']:
                if isinstance(plc_data['variables'][var_name], bool):
                    plc_data['variables'][var_name] = not plc_data['variables'][var_name]
                self.send_json({'success': True, 'variable': var_name, 'value': plc_data['variables'][var_name]})
            else:
                self.send_json({'success': False, 'error': '变量不存在'})

        elif path == '/api/variable/set':
            var_name = data.get('name')
            var_value = data.get('value')
            if var_name:
                plc_data['variables'][var_name] = var_value
                self.send_json({'success': True, 'variable': var_name, 'value': var_value})
            else:
                self.send_json({'success': False, 'error': '缺少变量名'})

        else:
            self.send_json({'success': False, 'error': 'Unknown API: ' + path})

    def log_message(self, format, *args):
        print(f"[{time.strftime('%H:%M:%S')}] {format % args}")


def get_local_ip():
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    with socketserver.TCPServer(("", PORT), PLCRequestHandler) as httpd:
        local_ip = get_local_ip()
        print("=" * 56)
        print("  PLC Mobile Editor Pro v3.0 - 服务器已启动")
        print("=" * 56)
        print(f"  本地:   http://localhost:{PORT}")
        print(f"  专业版: http://localhost:{PORT}/index_pro.html")
        print(f"  手机:   http://{local_ip}:{PORT}/index_pro.html")
        print("=" * 56)
        print("  横屏使用效果最佳！")
        print("  按 Ctrl+C 停止服务器")
        print("=" * 56)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n服务器已停止")


if __name__ == "__main__":
    main()
