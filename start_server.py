"""
手机端PLC编程框架 - 增强版服务器
包含完整的调试信息和IP地址显示
"""

import http.server
import socketserver
import json
import os
import sys
from urllib.parse import urlparse, parse_qs
import time
import socket

# 配置
PORT = 8081
DIRECTORY = os.path.join(os.path.dirname(__file__), "frontend")

print("=" * 70)
print("   手机端PLC编程框架 - 服务器启动中...")
print("=" * 70)

# 确保前端目录存在
if not os.path.exists(DIRECTORY):
    print(f"[错误] 前端目录不存在: {DIRECTORY}")
    sys.exit(1)

print(f"[OK] 前端目录: {DIRECTORY}")
print(f"[OK] 服务器端口: {PORT}")

# PLC数据存储
plc_data = {
    "projects": {},
    "current_project": None,
    "variables": {
        "I0.0": False, "I0.1": False, "I0.2": False, "I0.3": False,
        "Q0.0": False, "Q0.1": False, "Q0.2": False, "Q0.3": False,
        "M0.0": False, "M0.1": False,
        "T0": {"current": 0, "preset": 1000, "done": False},
        "C0": {"current": 0, "preset": 10, "done": False}
    }
}

class PLCRequestHandler(http.server.SimpleHTTPRequestHandler):
    """PLC请求处理器"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def do_GET(self):
        """处理GET请求"""
        parsed_path = urlparse(self.path)
        
        if parsed_path.path.startswith('/api/'):
            self.handle_api_get(parsed_path)
        else:
            super().do_GET()
    
    def do_POST(self):
        """处理POST请求"""
        parsed_path = urlparse(self.path)
        
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8')
        
        if parsed_path.path.startswith('/api/'):
            self.handle_api_post(parsed_path, post_data)
        else:
            self.send_error(404, "Not Found")
    
    def handle_api_get(self, parsed_path):
        """处理API GET请求"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        if parsed_path.path == '/api/plc/instructions':
            instructions = [
                {'id': 'contact_n', 'name': '常开触点', 'symbol': '—| |—', 'category': 'basic'},
                {'id': 'contact_nc', 'name': '常闭触点', 'symbol': '—|/|—', 'category': 'basic'},
                {'id': 'coil', 'name': '线圈', 'symbol': '—( )—', 'category': 'basic'},
                {'id': 'coil_set', 'name': '置位线圈', 'symbol': '—(S)—', 'category': 'basic'},
                {'id': 'coil_reset', 'name': '复位线圈', 'symbol': '—(R)—', 'category': 'basic'},
                {'id': 'timer_on', 'name': '接通延时定时器', 'symbol': 'TON', 'category': 'timers'},
                {'id': 'timer_off', 'name': '断开延时定时器', 'symbol': 'TOF', 'category': 'timers'},
                {'id': 'counter_up', 'name': '加计数器', 'symbol': 'CTU', 'category': 'counters'}
            ]
            response = {'success': True, 'instructions': instructions}
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            
        elif parsed_path.path == '/api/plc/variables':
            response = {'success': True, 'variables': plc_data['variables']}
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
        else:
            response = {'success': False, 'error': 'Unknown API endpoint'}
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
    
    def handle_api_post(self, parsed_path, post_data):
        """处理API POST请求"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        try:
            data = json.loads(post_data) if post_data else {}
        except:
            data = {}
        
        if parsed_path.path == '/api/project/new':
            project_id = f"project_{int(time.time())}"
            project_name = data.get('name', '未命名项目')
            plc_data['projects'][project_id] = {
                'id': project_id,
                'name': project_name,
                'rungs': [],
                'created_at': time.strftime('%Y-%m-%d %H:%M:%S')
            }
            plc_data['current_project'] = project_id
            response = {'success': True, 'projectId': project_id, 'projectName': project_name}
            
        elif parsed_path.path == '/api/project/save':
            project_id = data.get('projectId')
            diagram_data = data.get('diagramData')
            if project_id and project_id in plc_data['projects']:
                plc_data['projects'][project_id]['rungs'] = diagram_data.get('rungs', [])
                response = {'success': True, 'message': '项目保存成功'}
            else:
                response = {'success': False, 'error': '项目不存在'}
                
        elif parsed_path.path == '/api/simulation/run':
            response = {
                'success': True,
                'message': '仿真完成',
                'duration': data.get('duration', 10),
                'final_state': plc_data['variables']
            }
            
        elif parsed_path.path == '/api/variable/toggle':
            var_name = data.get('name')
            if var_name in plc_data['variables']:
                if isinstance(plc_data['variables'][var_name], bool):
                    plc_data['variables'][var_name] = not plc_data['variables'][var_name]
                response = {'success': True, 'variable': var_name, 'value': plc_data['variables'][var_name]}
            else:
                response = {'success': False, 'error': '变量不存在'}
        else:
            response = {'success': False, 'error': 'Unknown API endpoint'}
        
        self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
    
    def log_message(self, format, *args):
        """自定义日志"""
        print(f"[{time.strftime('%H:%M:%S')}] {format % args}")

def get_local_ips():
    """获取所有本地IP地址"""
    ips = []
    try:
        # 获取所有网络接口
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
        ips.append(('本地', local_ip))
        
        # 获取所有网络接口的IP
        for interface in socket.getaddrinfo(hostname, None):
            # interface是一个元组: (family, type, proto, canonname, sockaddr)
            family, socktype, proto, canonname, sockaddr = interface
            ip = sockaddr[0]
            # 只保留IPv4地址
            if family == socket.AF_INET and ip not in ['127.0.0.1']:
                if ip not in [x[1] for x in ips]:
                    # 尝试获取接口名称
                    ips.append(('网络', ip))
    except Exception as e:
        print(f"获取IP地址时出错: {e}")
    
    return ips

def main():
    """主函数"""
    print("\n正在启动HTTP服务器...\n")
    
    try:
        # 创建服务器
        with socketserver.TCPServer(("", PORT), PLCRequestHandler) as httpd:
            print("=" * 70)
            print("   [OK] 服务器启动成功!")
            print("=" * 70)
            print(f"\n访问地址:\n")
            print(f"   本地访问:    http://localhost:{PORT}")
            print(f"   本地访问:    http://127.0.0.1:{PORT}")
            
            # 显示所有可用的IP地址
            ips = get_local_ips()
            if ips:
                print(f"\n   手机访问地址 (请确保手机和电脑在同一Wi-Fi下):\n")
                for interface, ip in ips:
                    if ip != '127.0.0.1':
                        print(f"   {interface}: http://{ip}:{PORT}")
            
            print("\n" + "=" * 70)
            print("使用说明:")
            print("=" * 70)
            print("   1. 在手机浏览器中输入上面的地址")
            print("   2. 确保手机和电脑连接到同一个Wi-Fi")
            print("   3. 如果无法访问，请检查防火墙设置")
            print("   4. 按 Ctrl+C 停止服务器")
            print("=" * 70)
            print("\n等待连接中...\n")
            
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\n\n" + "=" * 70)
                print("   服务器已停止")
                print("=" * 70 + "\n")
                
    except OSError as e:
        if "Address already in use" in str(e):
            print("\n" + "=" * 70)
            print(f"[错误] 端口 {PORT} 已被占用!")
            print("=" * 70)
            print("\n解决方案:")
            print("   1. 关闭其他使用该端口的应用")
            print("   2. 或修改脚本中的PORT变量为其他端口")
            print("\n")
        else:
            print(f"\n[错误] 启动失败: {e}\n")
    except Exception as e:
        print(f"\n[错误] 发生错误: {e}\n")

if __name__ == "__main__":
    main()