<template>
  <div class="device-list-container">
    <h4>设备列表 (多选)</h4>
    <ul v-if="devices.length > 0">
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
          {{ device.name }}
        </label>
      </li>
    </ul>
    <p v-else>暂无设备</p>
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
    const devices = ref([
      // 示例数据
      { id: 1, name: '4G-土壤湿度-563', online: true },
      { id: 2, name: '4G-气象站-607', online: true },
      { id: 3, name: 'GNSS-旧址-测量站', online: false },
      { id: 4, name: 'GNSS-大礼堂-测量', online: true },
      { id: 5, name: 'GNSS-管理处-基准', online: false },
      { id: 6, name: '办公厅-采集器-160', online: true }
    ]);
    const selectedIds = ref([]);

    const fetchDevices = async () => {
      // ... 模拟 API 调用 ...
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