<template>
  <div class="device-list-container">
    <h4>设备列表</h4>
    <p v-if="fetchError" class="error-message">{{ fetchError }}</p>
    <ul v-if="devices.length > 0 && !fetchError">
      <li
        v-for="device in devices"
        :key="device.id"
        class="device-item"
        @click="toggleSelection(device.id)"
      >
        <input
          type="checkbox"
          :id="'device-' + device.id"
          :value="device.id"
          v-model="selectedIds"
          @click.stop
          class="device-checkbox"
        />
        <label :for="'device-' + device.id" @click.stop class="device-label">
          <span :class="['status-dot', device.online ? 'online' : 'offline']"></span>
          {{ device.deviceName }}
        </label>
      </li>
    </ul>
    <p v-if="devices.length === 0 && !fetchError">正在加载设备列表或暂无设备...</p>
    <!-- 可以添加一个按钮来确认选择 -->
    <!-- <button @click="confirmSelection">确认选择</button> -->
  </div>
</template>

<script>
// 导入事件总线 和 watch, ref, onMounted
import { ref, onMounted, watch } from 'vue';
import eventBus from '../eventBus'; // 导入事件总线

export default {
  name: 'DeviceList',
  // 移除 props，因为不再接收选中状态
  emits: [], // 也不再需要 emits 'devices-selected' 给 Home
  setup() {
    const devices = ref([]); // 初始化为空数组，将从API获取
    const selectedIds = ref([]);
    const fetchError = ref(null); // 用于存储获取设备列表时的错误信息

    const fetchDevices = async () => {
      fetchError.value = null; // 重置错误信息
      try {
        const response = await fetch('/senser/deviceList'); // GET请求

        if (!response.ok) {
          // 处理网络层面的错误 (如 404, 500等)
          throw new Error(`获取设备列表失败: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        if (result.code === 1) {
          devices.value = result.data.map(device => ({
            id: device.id, // 使用后端返回的数字ID
            deviceName: device.deviceName, // 保存原始设备名称，以便在需要时使用
            online: device.status === 0 // 假设 status 0 表示在线, 1 表示离线
          }));
        } else {
          // 处理API层面返回的错误信息
          console.error('获取设备列表API错误:', result.msg);
          fetchError.value = result.msg || '获取设备列表失败';
          devices.value = []; // 清空设备列表或保持上一次成功获取的数据
        }
      } catch (error) {
        // 处理fetch本身抛出的错误或上面throw的错误
        console.error('获取设备列表时发生网络错误或解析错误:', error);
        fetchError.value = error.message || '网络错误，无法加载设备列表';
        devices.value = []; // 清空设备列表
      }
    };

    onMounted(() => {
      fetchDevices();
      // 如果需要根据传入的 prop 初始化选中状态，可以在这里处理
    });

    // 点击列表项切换选中状态
    const toggleSelection = (deviceId) => {
        const index = selectedIds.value.indexOf(deviceId);
        if (index > -1) {
            selectedIds.value.splice(index, 1);
        } else {
            selectedIds.value.push(deviceId);
        }
        // v-model 会自动更新 selectedIds，watch 会触发事件发送
    };

    // 监听 selectedIds 的变化，并通过事件总线发送选中的设备对象数组
    watch(selectedIds, (newIds) => {
      const selectedDevices = devices.value.filter(device => newIds.includes(device.id));
      console.log('DeviceList emitting devices-updated:', selectedDevices);
      eventBus.emit('devices-updated', selectedDevices); // 使用事件总线发送
    }, { deep: true });

    return {
      devices,
      selectedIds,
      fetchError,
      toggleSelection
    };
  }
}
</script>

<style scoped>
.device-list-container {
  width: 250px;
  height: calc(100vh - 70px);
  position: fixed;
  right: 0;
  top: 70px;
  background-color: #f8f9fa;
  border-left: 1px solid #e9ecef;
  padding: 15px;
  box-sizing: border-box;
  overflow-y: auto;
  z-index: 999;
}

.error-message {
  color: #dc3545; /* 红色错误信息 */
  padding: 10px;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  margin-bottom: 15px;
  font-size: 14px;
}

h4 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #495057;
  font-size: 16px;
  border-bottom: 1px solid #dee2e6;
  padding-bottom: 8px;
}

ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.device-item {
  padding: 8px 5px; /* 调整内边距 */
  cursor: pointer;
  border-radius: 4px;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  transition: background-color 0.2s ease-in-out;
}

.device-item:hover {
  background-color: #e9ecef;
}

/* 移除之前的 .active 样式 */
/* .device-item.active { ... } */

.device-checkbox {
  margin-right: 10px; /* 复选框和标签之间的距离 */
  cursor: pointer;
}

.device-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  flex-grow: 1; /* 让标签占据剩余空间 */
  font-size: 14px;
  color: #343a40;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
}

.status-dot.online {
  background-color: #198754;
}

.status-dot.offline {
  background-color: #dc3545;
}

p {
  color: #6c757d;
  font-size: 14px;
}
</style>