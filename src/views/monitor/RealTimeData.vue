<template>
  <div class="realtime-data-layout">
    <!-- 左侧数据展示区域 -->
    <div class="data-display-area">
      <h2>实时数据监控</h2>
      <div v-if="selectedDevices && selectedDevices.length > 0" class="devices-wrapper">
        <div v-for="device in selectedDevices" :key="device.id" class="device-data-section">
          <h3>设备: {{ device.name }} (ID: {{ device.id }})</h3>
          <div v-if="loadingData[device.id]" class="loading-indicator">
            <p>正在加载数据...</p>
          </div>
          <div v-else-if="deviceData[device.id]" class="data-display-item"> <!-- 重命名类以避免冲突 -->
            <p><strong>状态:</strong> {{ deviceData[device.id].status }}</p>
            <p><strong>更新时间:</strong> {{ formatTimestamp(deviceData[device.id].timestamp) }}</p>
            <h4>监测值:</h4>
            <ul>
              <li v-for="(value, key) in deviceData[device.id].values" :key="key">
                {{ key }}: {{ formatValue(value) }}
              </li>
            </ul>
          </div>
          <div v-else class="no-data">
            <p>未能加载该设备的实时数据。</p>
          </div>
        </div>
      </div>
      <div v-else class="no-device-selected">
        <p>请从右侧设备列表中选择设备以查看实时数据。</p>
      </div>
    </div>

    <!-- 右侧设备列表区域 -->
    <div class="device-list-area">
      <DeviceList /> <!-- 直接使用 DeviceList 组件 -->
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import eventBus from '../../eventBus';
import DeviceList from '../../components/DeviceList.vue'; // 导入 DeviceList

export default {
  name: 'RealTimeData',
  components: {
    DeviceList // 注册 DeviceList
  },
  setup() {
    // 本地状态存储选中的设备
    const selectedDevices = ref([]);
    const loadingData = reactive({});
    const deviceData = reactive({});

    // 处理从事件总线接收到的设备更新
    const handleDevicesUpdate = (devices) => {
      console.log('[RealTimeData] Received devices-updated event:', devices);
      const oldSelectedIds = selectedDevices.value.map(d => d.id);
      selectedDevices.value = devices || []; // 更新本地状态
      const newSelectedIds = selectedDevices.value.map(d => d.id);

      // 为新选中的设备获取数据
      selectedDevices.value.forEach(device => {
        if (!oldSelectedIds.includes(device.id)) {
          fetchSingleDeviceData(device);
        }
      });

      // 清理不再选中的设备数据
      Object.keys(deviceData).forEach(idStr => {
          const id = parseInt(idStr);
          if (!newSelectedIds.includes(id)) {
              delete deviceData[id];
              delete loadingData[id];
          }
      });
    };

    // 获取单个设备数据的方法 (保持不变)
    const fetchSingleDeviceData = async (device) => {
      if (!device) return;
      loadingData[device.id] = true;
      deviceData[device.id] = null;
      console.log(`[RealTimeData] 开始获取设备 ${device.id} 的实时数据...`);
      try {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 800 + 200));
        let values = {};
         if (device.id % 2 === 0) {
            values = { '温度': (Math.random()*15+10).toFixed(2), '湿度': (Math.random()*40+30).toFixed(2) };
        } else {
             values = { '压力': (Math.random()*10+95).toFixed(2), '流量': (Math.random()*5).toFixed(3) };
        }
        deviceData[device.id] = {
          timestamp: new Date().toISOString(),
          values: values,
          status: device.online ? '在线' : '离线'
        };
        console.log(`[RealTimeData] 成功获取设备 ${device.id} 数据`);
      } catch (error) {
        console.error(`[RealTimeData] 获取设备 ${device.id} 实时数据失败:`, error);
        deviceData[device.id] = null;
      } finally {
        loadingData[device.id] = false;
      }
    };

    // 组件挂载时开始监听事件
    onMounted(() => {
      console.log('[RealTimeData] Component mounted, listening for devices-updated event.');
      eventBus.on('devices-updated', handleDevicesUpdate);
      // 注意：如果希望组件加载时就获取 DeviceList 当前的选中状态，
      // DeviceList 需要在 onMounted 时也 emit 一次初始状态，
      // 或者 RealTimeData 需要一种方式主动查询初始状态。
      // 这里简化处理，只响应后续的选择变化。
    });

    // 组件卸载时停止监听，防止内存泄漏
    onUnmounted(() => {
      console.log('[RealTimeData] Component unmounted, removing devices-updated listener.');
      eventBus.off('devices-updated', handleDevicesUpdate);
    });

    // ... formatTimestamp, formatValue (保持不变) ...
    const formatTimestamp = (isoString) => {
        if (!isoString) return 'N/A';
        try { return new Date(isoString).toLocaleString(); } catch (e) { return isoString; }
    };
    const formatValue = (value) => {
        if (typeof value === 'number') { return value.toFixed(2); }
        return value;
    };

    return {
      selectedDevices, // 使用本地状态
      loadingData,
      deviceData,
      formatTimestamp,
      formatValue
      // 不需要返回 handleDevicesUpdate，因为它是由 eventBus 调用的
    };
  }
}
</script>

<style scoped>
.realtime-data-layout {
  display: flex;
  gap: 20px;
  width: 100%;
  min-height: calc(100vh - 70px);
  box-sizing: border-box;
}

.data-display-area {
  flex: 1;
  background-color: #ffffff;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
}

.device-list-area {
  width: 250px;
  flex-shrink: 0;
  background-color: #ffffff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  box-sizing: border-box;
}

.device-data-section {
  margin-bottom: 30px; /* 设备之间的间距 */
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}
.device-data-section:last-child {
  border-bottom: none; /* 最后一个设备下方不显示分隔线 */
  margin-bottom: 0; /* 移除最后一个元素的下边距 */
}

h2 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #2c3e50;
  border-bottom: 2px solid #3498db;
  padding-bottom: 10px;
  flex-shrink: 0; /* 防止标题在 flex 布局中收缩 */
}

h3 {
  color: #3498db;
  margin-bottom: 15px;
}

.loading-indicator p {
  color: #7f8c8d;
  font-style: italic;
}

.data-display-item { /* 之前重命名的类 */
  background-color: #f9f9f9;
  border: 1px solid #ecf0f1;
  border-radius: 4px;
  padding: 15px;
}

.data-display-item p {
  margin: 5px 0;
  color: #34495e;
}

.data-display-item h4 {
  margin-top: 15px;
  margin-bottom: 8px;
  color: #2c3e50;
}

.data-display-item ul {
  list-style: none;
  padding-left: 0;
}

.data-display-item li {
  padding: 4px 0;
  color: #555;
}

.no-data p,
.no-device-selected p {
  color: #e74c3c;
  font-weight: bold;
  margin-top: 20px;
  padding: 15px;
  background-color: #fdf2f2; /* 提示信息的背景 */
  border: 1px solid #f8d7da;
  border-radius: 4px;
  flex-shrink: 0; /* 防止提示信息在 flex 布局中收缩 */
}

/* 可以添加一个容器来包裹设备列表，使其可滚动 */
.devices-wrapper {
    flex-grow: 1;
    overflow-y: auto;
    margin-top: 20px; /* 与标题保持距离 */
}
</style>