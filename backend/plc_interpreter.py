"""
PLC解释器模块 - 解析和编译梯形图逻辑
"""

class PLCInstruction:
    """PLC指令基类"""
    def __init__(self, instruction_type, address=None, params=None):
        self.type = instruction_type
        self.address = address
        self.params = params or {}

    def __repr__(self):
        return f"PLCInstruction(type={self.type}, address={self.address}, params={self.params})"


class PLCInterpreter:
    """PLC程序解释器"""
    
    def __init__(self):
        self.instructions_map = {
            'contact_n': self._handle_contact_n,      # 常开触点
            'contact_nc': self._handle_contact_nc,   # 常闭触点
            'coil': self._handle_coil,               # 线圈
            'timer_on': self._handle_timer_on,       # 接通延时定时器
            'timer_off': self._handle_timer_off,     # 断开延时定时器
            'counter_up': self._handle_counter_up,   # 加计数器
            'move': self._handle_move,               # MOVE指令
            'compare_eq': self._handle_compare_eq,   # 等于比较
            'compare_gt': self._handle_compare_gt,   # 大于比较
            'compare_lt': self._handle_compare_lt,   # 小于比较
        }
        
        # 内存映像区
        self.input_memory = {}      # 输入映像区 I%
        self.output_memory = {}     # 输出映像区 Q%
        self.memory_bits = {}       # 内存位 M%
        self.timers = {}            # 定时器 T%
        self.counters = {}          # 计数器 C%
        self.data_registers = {}    # 数据寄存器 D%

    def compile(self, ladder_diagram):
        """
        编译梯形图程序
        :param ladder_diagram: 梯形图数据
        :return: 编译结果字典
        """
        errors = []
        warnings = []
        program = []

        try:
            # 验证梯形图结构
            if not isinstance(ladder_diagram, dict) or 'rungs' not in ladder_diagram:
                errors.append("Invalid ladder diagram structure")
                return {
                    'program': [],
                    'errors': errors,
                    'warnings': warnings
                }

            # 遍历每一级梯级
            for i, rung in enumerate(ladder_diagram['rungs']):
                try:
                    compiled_rung = self._compile_rung(rung, i)
                    program.extend(compiled_rung)
                except Exception as e:
                    errors.append(f"Error compiling rung {i}: {str(e)}")

            # 检查潜在问题
            self._check_program_warnings(program, warnings)

        except Exception as e:
            errors.append(f"Compilation error: {str(e)}")

        return {
            'program': program,
            'errors': errors,
            'warnings': warnings
        }

    def _compile_rung(self, rung, rung_index):
        """编译单个梯级"""
        compiled_rung = []
        
        # 检查梯级是否有元素
        if 'elements' not in rung or not rung['elements']:
            return compiled_rung

        # 遍历梯级中的每个元素
        for element in rung['elements']:
            instruction_type = element.get('type')
            
            if instruction_type in self.instructions_map:
                # 创建指令对象
                address = element.get('address', '')
                params = element.get('params', {})
                
                instruction = PLCInstruction(instruction_type, address, params)
                compiled_rung.append(instruction)
            else:
                raise ValueError(f"Unknown instruction type: {instruction_type}")

        return compiled_rung

    def _check_program_warnings(self, program, warnings):
        """检查程序中的潜在警告"""
        # 检查是否有重复输出
        output_addresses = set()
        for instruction in program:
            if instruction.type == 'coil':
                if instruction.address in output_addresses:
                    warnings.append(f"Multiple coils with same address {instruction.address}")
                else:
                    output_addresses.add(instruction.address)

        # 检查是否有未使用的输入
        # 这里可以添加更复杂的检查逻辑

    def _handle_contact_n(self, address, params):
        """处理常开触点"""
        # 检查地址格式
        if not self._is_valid_address(address):
            raise ValueError(f"Invalid address format: {address}")
        
        # 获取当前值
        value = self._get_bit_value(address)
        return value

    def _handle_contact_nc(self, address, params):
        """处理常闭触点"""
        if not self._is_valid_address(address):
            raise ValueError(f"Invalid address format: {address}")
        
        value = self._get_bit_value(address)
        return not value

    def _handle_coil(self, address, params):
        """处理线圈"""
        if not self._is_valid_address(address):
            raise ValueError(f"Invalid address format: {address}")
        
        # 设置位值（这里只是模拟，实际会在扫描周期结束时更新）
        new_value = params.get('value', False)
        self._set_bit_value(address, new_value)

    def _handle_timer_on(self, address, params):
        """处理接通延时定时器"""
        preset_time = params.get('preset', 0)
        # 定时器逻辑实现
        timer_key = f"T{address}"
        if timer_key not in self.timers:
            self.timers[timer_key] = {'elapsed': 0, 'preset': preset_time, 'done': False}
        
        return self.timers[timer_key]['done']

    def _handle_timer_off(self, address, params):
        """处理断开延时定时器"""
        preset_time = params.get('preset', 0)
        timer_key = f"TOF_{address}"
        if timer_key not in self.timers:
            self.timers[timer_key] = {'elapsed': 0, 'preset': preset_time, 'done': False}
        
        return self.timers[timer_key]['done']

    def _handle_counter_up(self, address, params):
        """处理加计数器"""
        preset_count = params.get('preset', 0)
        counter_key = f"C{address}"
        if counter_key not in self.counters:
            self.counters[counter_key] = {'current': 0, 'preset': preset_count, 'done': False}
        
        return self.counters[counter_key]['done']

    def _handle_move(self, address, params):
        """处理MOVE指令"""
        source = params.get('source', 0)
        destination = params.get('destination', '')
        
        if destination.startswith('Q'):
            # 输出寄存器
            self.output_memory[destination] = source
        elif destination.startswith('M'):
            # 内存寄存器
            self.memory_bits[destination] = source
        elif destination.startswith('D'):
            # 数据寄存器
            self.data_registers[destination] = source

    def _handle_compare_eq(self, address, params):
        """处理等于比较"""
        operand1 = params.get('operand1', 0)
        operand2 = params.get('operand2', 0)
        return operand1 == operand2

    def _handle_compare_gt(self, address, params):
        """处理大于比较"""
        operand1 = params.get('operand1', 0)
        operand2 = params.get('operand2', 0)
        return operand1 > operand2

    def _handle_compare_lt(self, address, params):
        """处理小于比较"""
        operand1 = params.get('operand1', 0)
        operand2 = params.get('operand2', 0)
        return operand1 < operand2

    def _is_valid_address(self, address):
        """检查地址格式是否有效"""
        if not address:
            return False
        
        # 检查地址格式 (例如: I0.0, Q0.0, M0.0, T0, C0)
        valid_prefixes = ['I', 'Q', 'M', 'T', 'C', 'D']
        prefix = address[0] if len(address) > 0 else ''
        
        if prefix not in valid_prefixes:
            return False
            
        # 对于位地址，检查格式是否为 X数字.数字
        if prefix in ['I', 'Q', 'M'] and '.' not in address:
            return False
            
        return True

    def _get_bit_value(self, address):
        """获取位地址的值"""
        if address.startswith('I'):
            return self.input_memory.get(address, False)
        elif address.startswith('Q'):
            return self.output_memory.get(address, False)
        elif address.startswith('M'):
            return self.memory_bits.get(address, False)
        else:
            # 其他类型地址默认返回False
            return False

    def _set_bit_value(self, address, value):
        """设置位地址的值"""
        if address.startswith('I'):
            self.input_memory[address] = bool(value)
        elif address.startswith('Q'):
            self.output_memory[address] = bool(value)
        elif address.startswith('M'):
            self.memory_bits[address] = bool(value)

    def execute_cycle(self, inputs=None):
        """
        执行一个PLC扫描周期
        :param inputs: 输入值字典，用于模拟外部输入
        """
        # 更新输入映像区
        if inputs:
            for addr, val in inputs.items():
                if addr.startswith('I'):
                    self.input_memory[addr] = bool(val)

        # 这里会执行程序逻辑
        # 实际执行逻辑会在后续步骤中实现

        # 更新输出
        # 在实际PLC中，这通常在扫描周期结束时发生