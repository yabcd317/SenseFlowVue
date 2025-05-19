<template>
  <div class="device-list-container">
    <h4>设备列表</h4>
    <p v-if="fetchError" class="error-message">{{ fetchError }}</p>
    <ul v-if="devices.length > 0 && !fetchError">
      <li v-for="device in devices" :key="device.id" 
          class="device-item" 
          :class="{ 'selected': isDeviceSelected(device.id) }"
          @click="toggleDevice(device.id)">
        <span :class="['selection-indicator', multiSelect ? 'checkbox' : 'radio-button']">
          <span class="indicator-inner" v-if="isDeviceSelected(device.id)"></span>
        </span>
        <div class="device-info">
          <span :class="['status-dot', device.online ? 'online' : 'offline']"></span>
          <span class="device-name">{{ device.deviceName }}</span>
        </div>
      </li>
    </ul>
    <p v-if="devices.length === 0 && !fetchError">正在加载设备列表或暂无设备...</p>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import eventBus from '../eventBus';

export default {
  name: 'DeviceList',
  props: {
    multiSelect: {
      type: Boolean,
      default: false // 默认为单选模式
    }
  },
  setup(props) {
    const devices = ref([]);
    const selectedDeviceIds = ref([]);
    const fetchError = ref(null);

    // 判断设备是否被选中
    const isDeviceSelected = (deviceId) => {
      return selectedDeviceIds.value.includes(deviceId);
    };

    const fetchDevices = async () => {
      fetchError.value = null;
      try {
        const response = await fetch('/senser/deviceList');

        if (!response.ok) {
          throw new Error(`获取设备列表失败: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        if (result.code === 1) {
          devices.value = result.data.map(device => ({
            id: device.id,
            deviceName: device.deviceName,
            online: device.status === 0
          }));
        } else {
          console.error('获取设备列表API错误:', result.msg);
          fetchError.value = result.msg || '获取设备列表失败';
          devices.value = [];
        }
      } catch (error) {
        console.error('获取设备列表时发生网络错误或解析错误:', error);
        fetchError.value = error.message || '网络错误，无法加载设备列表';
        devices.value = [];
      }
    };

    const toggleDevice = (deviceId) => {
      if (props.multiSelect) {
        // 多选模式：切换选中状态
        const index = selectedDeviceIds.value.indexOf(deviceId);
        if (index > -1) {
          // 如果已选中，则取消选中
          selectedDeviceIds.value.splice(index, 1);
        } else {
          // 如果未选中，则添加到选中列表
          selectedDeviceIds.value.push(deviceId);
        }
      } else {
        // 单选模式：直接替换选中项
        // 如果点击已选中的设备，不做任何操作
        if (selectedDeviceIds.value.length === 1 && selectedDeviceIds.value[0] === deviceId) return;
        
        // 设置选中的设备ID
        selectedDeviceIds.value = [deviceId];
      }
      
      // 获取选中的设备对象列表
      const selectedDevices = devices.value.filter(device => 
        selectedDeviceIds.value.includes(device.id)
      );
      
      // 通过事件总线发送选中的设备
      console.log('DeviceList emitting devices-updated:', selectedDevices);
      eventBus.emit('devices-updated', selectedDevices);
    };

    onMounted(() => {
      fetchDevices();
      
      // 监听选择设备事件
      eventBus.on('select-device', (deviceId) => {
        toggleDevice(deviceId);
      });
    });

    return {
      devices,
      selectedDeviceIds,
      fetchError,
      toggleDevice,
      isDeviceSelected
    };
  }
}
</script>

<style scoped>
.device-list-container {
  background-color: #f8f9fa;
  border-left: 1px solid #e9ecef;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: auto;
}

h4 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #495057;
  font-size: 16px;
  border-bottom: 1px solid #dee2e6;
  padding-bottom: 8px;
  flex-shrink: 0;
}

.error-message {
  color: #dc3545;
  padding: 10px;
  background-color: #f8d7da;
  border-radius: 4px;
  margin-bottom: 10px;
}

ul {
  width: 100%;
  list-style: none;
  padding: 0;
  margin: 0;
  overflow-y: auto;
}

.device-item {
  display: flex;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid #e9ecef;
  cursor: pointer;
  transition: background-color 0.2s;
}

.device-item:hover {
  background-color: #e9ecef;
}

.device-item.selected {
  background-color: #e6f7ff;
}

/* 修改选择指示器样式，支持单选和多选 */
.selection-indicator {
  width: 16px;
  height: 16px;
  border: 1px solid #ced4da;
  margin-right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.radio-button {
  border-radius: 50%;
}

.checkbox {
  border-radius: 3px;
}

.indicator-inner {
  background-color: #1890ff;
}

.radio-button .indicator-inner {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.checkbox .indicator-inner {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.device-info {
  display: flex;
  align-items: center;
  flex: 1;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
}

.status-dot.online {
  background-color: #52c41a;
}

.status-dot.offline {
  background-color: #ff4d4f;
}

.device-name {
  font-size: 14px;
  color: #495057;
}
</style>