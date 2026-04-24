"""
梯形图编辑器模块 - 处理梯形图的创建、编辑和管理
"""

import uuid
import json
from datetime import datetime


class LadderEditor:
    """梯形图编辑器类"""
    
    def __init__(self, project_name="Untitled"):
        self.project_id = str(uuid.uuid4())
        self.project_name = project_name
        self.created_at = datetime.now()
        self.modified_at = datetime.now()
        
        # 梯形图数据结构
        self.ladder_diagram = {
            'projectId': self.project_id,
            'projectName': self.project_name,
            'createdAt': self.created_at.isoformat(),
            'modifiedAt': self.modified_at.isoformat(),
            'rungs': []  # 梯级列表
        }
        
        # 添加初始空梯级
        self.add_rung()

    def get_diagram(self):
        """获取当前梯形图数据"""
        return self.ladder_diagram

    def add_rung(self, position=None):
        """添加一个新的梯级"""
        new_rung = {
            'id': str(uuid.uuid4()),
            'index': len(self.ladder_diagram['rungs']) if position is None else position,
            'elements': [],  # 梯级上的元件列表
            'powerRails': {
                'left': True,
                'right': True
            }
        }
        
        if position is not None and position < len(self.ladder_diagram['rungs']):
            self.ladder_diagram['rungs'].insert(position, new_rung)
        else:
            self.ladder_diagram['rungs'].append(new_rung)
            
        self._update_modified()
        return new_rung['id']

    def remove_rung(self, rung_id):
        """删除指定ID的梯级"""
        self.ladder_diagram['rungs'] = [
            rung for rung in self.ladder_diagram['rungs'] 
            if rung['id'] != rung_id
        ]
        
        # 更新索引
        for i, rung in enumerate(self.ladder_diagram['rungs']):
            rung['index'] = i
            
        self._update_modified()

    def add_element_to_rung(self, rung_id, element_data):
        """向指定梯级添加元件"""
        for rung in self.ladder_diagram['rungs']:
            if rung['id'] == rung_id:
                # 验证元件数据
                element = self._validate_and_format_element(element_data)
                rung['elements'].append(element)
                self._update_modified()
                return element['id']
        
        raise ValueError(f"Rung with ID {rung_id} not found")

    def remove_element_from_rung(self, rung_id, element_id):
        """从指定梯级移除元件"""
        for rung in self.ladder_diagram['rungs']:
            if rung['id'] == rung_id:
                rung['elements'] = [
                    elem for elem in rung['elements'] 
                    if elem['id'] != element_id
                ]
                self._update_modified()
                return True
                
        return False

    def update_element_in_rung(self, rung_id, element_id, new_data):
        """更新指定梯级中的元件"""
        for rung in self.ladder_diagram['rungs']:
            if rung['id'] == rung_id:
                for i, elem in enumerate(rung['elements']):
                    if elem['id'] == element_id:
                        # 合并新数据与现有数据
                        updated_elem = elem.copy()
                        updated_elem.update(new_data)
                        # 重新验证
                        validated_elem = self._validate_and_format_element(updated_elem)
                        rung['elements'][i] = validated_elem
                        self._update_modified()
                        return True
                        
        return False

    def move_element_in_rung(self, rung_id, element_id, new_position):
        """在梯级内移动元件位置"""
        for rung in self.ladder_diagram['rungs']:
            if rung['id'] == rung_id:
                elements = rung['elements']
                # 找到要移动的元素
                element_idx = None
                for i, elem in enumerate(elements):
                    if elem['id'] == element_id:
                        element_idx = i
                        break
                        
                if element_idx is not None:
                    # 移动元素
                    element = elements.pop(element_idx)
                    # 确保new_position在有效范围内
                    new_pos = max(0, min(new_position, len(elements)))
                    elements.insert(new_pos, element)
                    self._update_modified()
                    return True
                    
        return False

    def _validate_and_format_element(self, element_data):
        """验证并格式化元件数据"""
        required_fields = ['type', 'address']
        for field in required_fields:
            if field not in element_data:
                raise ValueError(f"Element missing required field: {field}")
        
        # 生成唯一ID
        element_id = element_data.get('id', str(uuid.uuid4()))
        
        # 根据不同类型设置默认参数
        default_params = {}
        element_type = element_data['type']
        
        if element_type in ['contact_n', 'contact_nc']:
            # 触点类型
            default_params = {
                'normally_open': element_type == 'contact_n',
                'address': element_data['address']
            }
        elif element_type == 'coil':
            # 线圈类型
            default_params = {
                'address': element_data['address'],
                'negated': False
            }
        elif element_type == 'timer_on':
            # 接通延时定时器
            default_params = {
                'address': element_data['address'],
                'preset_time': element_data.get('preset_time', 1000)  # 默认1秒（毫秒）
            }
        elif element_type == 'counter_up':
            # 加计数器
            default_params = {
                'address': element_data['address'],
                'preset_count': element_data.get('preset_count', 10)
            }
        elif element_type == 'move':
            # MOVE指令
            default_params = {
                'source': element_data.get('source', '0'),
                'destination': element_data['address']
            }
        else:
            # 其他类型使用通用参数
            default_params = {
                'address': element_data['address']
            }
        
        # 合并用户提供的参数
        params = default_params.copy()
        if 'params' in element_data:
            params.update(element_data['params'])
        
        # 创建标准化的元件对象
        element = {
            'id': element_id,
            'type': element_data['type'],
            'address': element_data['address'],
            'params': params,
            'position': element_data.get('position', {}),
            'properties': element_data.get('properties', {})
        }
        
        return element

    def validate_diagram(self):
        """验证梯形图的完整性"""
        errors = []
        
        # 检查是否有梯级
        if not self.ladder_diagram['rungs']:
            errors.append("梯形图中没有梯级")
        
        # 验证每个梯级
        for i, rung in enumerate(self.ladder_diagram['rungs']):
            if 'elements' not in rung:
                errors.append(f"梯级 {i} 缺少元件列表")
                continue
                
            # 检查梯级是否有有效的元件序列
            elements = rung['elements']
            if not elements:
                continue  # 空梯级是允许的
                
            # 验证元件连接性（简化版）
            has_output = any(elem['type'] in ['coil', 'timer_on', 'timer_off', 'counter_up'] for elem in elements)
            if has_output:
                # 如果有输出，确保前面有输入条件
                has_input = any(elem['type'] in ['contact_n', 'contact_nc'] for elem in elements)
                if not has_input:
                    errors.append(f"梯级 {i} 包含输出但缺少输入条件")
        
        return {
            'valid': len(errors) == 0,
            'errors': errors
        }

    def export_to_file(self, file_path):
        """导出梯形图到文件"""
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(self.ladder_diagram, f, ensure_ascii=False, indent=2)
        self._update_modified()

    def import_from_file(self, file_path):
        """从文件导入梯形图"""
        with open(file_path, 'r', encoding='utf-8') as f:
            self.ladder_diagram = json.load(f)
        self._update_modified()

    def _update_modified(self):
        """更新修改时间"""
        self.modified_at = datetime.now()
        self.ladder_diagram['modifiedAt'] = self.modified_at.isoformat()

    def get_statistics(self):
        """获取梯形图统计信息"""
        total_rungs = len(self.ladder_diagram['rungs'])
        total_elements = sum(len(rung['elements']) for rung in self.ladder_diagram['rungs'])
        
        # 统计各类型元件数量
        element_counts = {}
        for rung in self.ladder_diagram['rungs']:
            for element in rung['elements']:
                elem_type = element['type']
                element_counts[elem_type] = element_counts.get(elem_type, 0) + 1
        
        return {
            'totalRungs': total_rungs,
            'totalElements': total_elements,
            'elementCounts': element_counts,
            'projectName': self.project_name,
            'projectId': self.project_id
        }

    def duplicate_rung(self, rung_id):
        """复制指定梯级"""
        for i, rung in enumerate(self.ladder_diagram['rungs']):
            if rung['id'] == rung_id:
                # 创建新梯级，复制原梯级的所有属性但生成新ID
                duplicated_rung = rung.copy()
                duplicated_rung['id'] = str(uuid.uuid4())
                duplicated_rung['index'] = i + 1
                
                # 为每个元件生成新ID
                duplicated_elements = []
                for elem in duplicated_rung['elements']:
                    new_elem = elem.copy()
                    new_elem['id'] = str(uuid.uuid4())
                    duplicated_elements.append(new_elem)
                
                duplicated_rung['elements'] = duplicated_elements
                
                # 插入到原梯级之后
                self.ladder_diagram['rungs'].insert(i + 1, duplicated_rung)
                
                # 更新所有梯级的索引
                for j, r in enumerate(self.ladder_diagram['rungs']):
                    r['index'] = j
                    
                self._update_modified()
                return duplicated_rung['id']
        
        raise ValueError(f"Rung with ID {rung_id} not found")