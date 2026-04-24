"""
PLC仿真引擎模块 - 提供实时仿真功能
"""

import time
import threading
import json
from datetime import datetime
from plc_interpreter import PLCInterpreter


class SimulationEngine:
    """PLC仿真引擎"""
    
    def __init__(self):
        self.interpreter = PLCInterpreter()
        self.is_running = False
        self.simulation_thread = None
        self.simulation_data = {
            'timestamp': 0,
            'inputs': {},
            'outputs': {},
            'memory_bits': {},
            'timers': {},
            'counters': {},
            'data_registers': {},
            'execution_log': []
        }
        self.execution_speed = 1  # 仿真速度倍率
        self.scan_time = 0.1  # 扫描周期时间（秒）

    def run(self, ladder_diagram, duration=10):
        """
        运行仿真
        :param ladder_diagram: 梯形图数据
        :param duration: 运行时长（秒）
        :return: 仿真结果
        """
        if self.is_running:
            self.stop()
        
        # 编译梯形图
        compilation_result = self.interpreter.compile(ladder_diagram)
        if not compilation_result['errors']:
            # 启动仿真线程
            self.is_running = True
            self.simulation_data['execution_log'] = []  # 清空日志
            
            # 在新线程中运行仿真
            self.simulation_thread = threading.Thread(
                target=self._simulation_loop,
                args=(ladder_diagram, duration)
            )
            self.simulation_thread.start()
            
            # 等待仿真完成
            self.simulation_thread.join()
        else:
            # 编译失败，返回错误
            return {
                'success': False,
                'errors': compilation_result['errors'],
                'warnings': compilation_result['warnings'],
                'final_state': self.simulation_data
            }
        
        return {
            'success': True,
            'duration': duration,
            'final_state': self.simulation_data,
            'execution_log': self.simulation_data['execution_log'][-100:]  # 最后100条日志
        }

    def _simulation_loop(self, ladder_diagram, duration):
        """仿真主循环"""
        start_time = time.time()
        current_time = 0
        
        while self.is_running and current_time < duration:
            # 执行一个PLC扫描周期
            self._execute_scan_cycle(ladder_diagram)
            
            # 更新时间
            current_time = time.time() - start_time
            
            # 控制仿真速度
            time.sleep(self.scan_time / self.execution_speed)
            
            # 更新定时器
            self._update_timers()
            
            # 更新计数器
            self._update_counters()

    def _execute_scan_cycle(self, ladder_diagram):
        """执行一个PLC扫描周期"""
        # 记录开始时间戳
        self.simulation_data['timestamp'] = time.time()
        
        # 这里应该实现实际的梯形图执行逻辑
        # 暂时只更新内存状态
        self.simulation_data['inputs'] = self.interpreter.input_memory.copy()
        self.simulation_data['outputs'] = self.interpreter.output_memory.copy()
        self.simulation_data['memory_bits'] = self.interpreter.memory_bits.copy()
        self.simulation_data['timers'] = self.interpreter.timers.copy()
        self.simulation_data['counters'] = self.interpreter.counters.copy()
        self.simulation_data['data_registers'] = self.interpreter.data_registers.copy()
        
        # 记录执行日志
        log_entry = {
            'timestamp': self.simulation_data['timestamp'],
            'inputs': self.simulation_data['inputs'],
            'outputs': self.simulation_data['outputs'],
            'scan_complete': True
        }
        self.simulation_data['execution_log'].append(log_entry)

    def _update_timers(self):
        """更新定时器状态"""
        current_time = time.time()
        
        for timer_id, timer in self.interpreter.timers.items():
            # 简化的定时器逻辑
            if 'start_time' not in timer:
                timer['start_time'] = current_time
            
            elapsed = (current_time - timer['start_time']) * 1000  # 转换为毫秒
            timer['elapsed'] = elapsed
            
            # 检查是否到达预设时间
            if elapsed >= timer['preset']:
                timer['done'] = True
            else:
                timer['done'] = False

    def _update_counters(self):
        """更新计数器状态"""
        # 这里可以实现计数器的递增/递减逻辑
        # 暂时保持简单实现
        pass

    def stop(self):
        """停止仿真"""
        self.is_running = False
        if self.simulation_thread and self.simulation_thread.is_alive():
            self.simulation_thread.join(timeout=1)  # 等待最多1秒

    @staticmethod
    def stop_current_simulation():
        """静态方法，用于停止当前仿真"""
        # 这里可以实现全局仿真控制
        pass

    def set_input(self, address, value):
        """设置输入值"""
        self.interpreter.input_memory[address] = bool(value)
        self.simulation_data['inputs'][address] = bool(value)

    def get_output(self, address):
        """获取输出值"""
        return self.interpreter.output_memory.get(address, False)

    def reset_simulation_data(self):
        """重置仿真数据"""
        self.simulation_data = {
            'timestamp': 0,
            'inputs': {},
            'outputs': {},
            'memory_bits': {},
            'timers': {},
            'counters': {},
            'data_registers': {},
            'execution_log': []
        }
        
        # 重置解释器状态
        self.interpreter = PLCInterpreter()

    def get_current_state(self):
        """获取当前仿真状态"""
        return {
            'isRunning': self.is_running,
            'currentTime': time.time(),
            'simulationData': self.simulation_data,
            'interpreterState': {
                'inputMemory': self.interpreter.input_memory,
                'outputMemory': self.interpreter.output_memory,
                'memoryBits': self.interpreter.memory_bits,
                'timers': self.interpreter.timers,
                'counters': self.interpreter.counters,
                'dataRegisters': self.interpreter.data_registers
            }
        }

    def set_execution_speed(self, speed):
        """设置执行速度（倍率）"""
        if speed > 0:
            self.execution_speed = speed

    def set_scan_time(self, scan_time):
        """设置扫描周期时间（秒）"""
        if scan_time > 0:
            self.scan_time = scan_time

    def simulate_input_change(self, address, value, duration=0.1):
        """
        模拟输入变化（用于测试）
        :param address: 地址
        :param value: 值
        :param duration: 持续时间（秒）
        """
        original_value = self.interpreter.input_memory.get(address, False)
        
        # 设置新值
        self.set_input(address, value)
        
        # 等待指定时间
        time.sleep(duration)
        
        # 恢复原始值
        self.set_input(address, original_value)


class RealTimeSimulationEngine(SimulationEngine):
    """实时仿真引擎扩展"""
    
    def __init__(self):
        super().__init__()
        self.real_time_callbacks = []

    def add_real_time_callback(self, callback):
        """添加实时回调函数"""
        self.real_time_callbacks.append(callback)

    def remove_real_time_callback(self, callback):
        """移除实时回调函数"""
        if callback in self.real_time_callbacks:
            self.real_time_callbacks.remove(callback)

    def _execute_scan_cycle(self, ladder_diagram):
        """重写扫描周期，添加回调支持"""
        super()._execute_scan_cycle(ladder_diagram)
        
        # 执行所有实时回调
        for callback in self.real_time_callbacks:
            try:
                callback(self.get_current_state())
            except Exception as e:
                print(f"Error in real-time callback: {e}")