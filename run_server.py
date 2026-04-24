"""
Mobile PLC Programming Framework - Server启动脚本
"""

import os
import sys
import subprocess
import threading
import time
import webbrowser
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def install_dependencies():
    """安装项目依赖"""
    print("正在安装项目依赖...")
    requirements_path = project_root / "requirements.txt"
    
    if requirements_path.exists():
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", str(requirements_path)])
            print("依赖安装完成！")
            return True
        except subprocess.CalledProcessError as e:
            print(f"依赖安装失败: {e}")
            return False
    else:
        print("未找到requirements.txt文件")
        return False

def run_backend():
    """运行后端服务器"""
    backend_dir = project_root / "backend"
    backend_app = backend_dir / "app.py"
    
    if not backend_app.exists():
        print(f"错误: 找不到后端应用文件 {backend_app}")
        return False
    
    try:
        # 启动Flask应用
        os.chdir(backend_dir)
        subprocess.run([sys.executable, str(backend_app)], check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"后端服务器启动失败: {e}")
        return False
    except KeyboardInterrupt:
        print("\n后端服务器已停止")
        return True

def open_browser():
    """打开浏览器访问应用"""
    time.sleep(3)  # 等待服务器启动
    url = "http://localhost:5000"
    print(f"尝试打开浏览器访问: {url}")
    webbrowser.open(url)

def main():
    """主函数"""
    print("=" * 60)
    print("Mobile PLC Programming Framework - 服务器启动器")
    print("=" * 60)
    
    # 检查并安装依赖
    if not install_dependencies():
        print("请手动安装依赖后再运行此程序")
        input("按回车键退出...")
        return
    
    # 启动浏览器
    browser_thread = threading.Thread(target=open_browser)
    browser_thread.daemon = True
    browser_thread.start()
    
    # 运行后端服务器
    print("\n正在启动后端服务器...")
    print("服务器将在 http://localhost:5000 上运行")
    print("按 Ctrl+C 停止服务器\n")
    
    success = run_backend()
    
    if success:
        print("\n感谢使用 Mobile PLC Programming Framework!")
    else:
        print("\n服务器启动失败，请检查错误信息")

if __name__ == "__main__":
    main()