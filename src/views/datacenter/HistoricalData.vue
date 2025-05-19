<template>
  <div class="historical-data-layout">
    <!-- 左侧数据展示区域 -->
    <div class="data-display-area">
      <h2>历史数据查询</h2>
      <div v-if="globalFetchError" class="global-error-message">
        <p>{{ globalFetchError }}</p>
      </div>
      <div v-if="selectedDevices && selectedDevices.length > 0" class="devices-container">
        <!-- 这里可以放置历史数据的展示组件 -->
        <div class="history-data-container">
          <p>选中设备的历史数据将在此处显示</p>
          <!-- 可以添加日期选择器、图表等组件 -->
        </div>
      </div>
      <div v-else class="no-device-selected">
        <p>请从右侧设备列表中选择设备以查询历史数据。</p>
      </div>
    </div>

    <!-- 右侧设备列表区域 -->
    <div class="device-list-area">
      <DeviceList/>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue';
import eventBus from '../../eventBus';
import DeviceList from '../../components/DeviceList.vue';

export default {
  name: 'HistoricalData',
  components: {
    DeviceList
  },
  setup() {
    const selectedDevices = ref([]);
    const globalFetchError = ref(null);

    // 处理从事件总线接收到的设备更新
    const handleDevicesUpdate = (devices) => {
      console.log('[HistoricalData] Received devices-updated event:', devices);
      selectedDevices.value = devices || [];
      // 这里可以添加获取历史数据的逻辑
    };

    onMounted(() => {
      console.log('[HistoricalData] Component mounted, listening for devices-updated event.');
      eventBus.on('devices-updated', handleDevicesUpdate);
    });

    onUnmounted(() => {
      console.log('[HistoricalData] Component unmounted, removing devices-updated listener.');
      eventBus.off('devices-updated', handleDevicesUpdate);
    });

    return {
      selectedDevices,
      globalFetchError
    };
  }
};
</script>

<style scoped>
.historical-data-layout {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: calc(100vh - 70px);
  padding-left: 10px;
  box-sizing: border-box;
  background-color: #f0f2f5;
  gap: 20px;
}

.data-display-area {
  flex: 1;
  background-color: #ffffff;
  padding: 5px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  min-width: 0;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.data-display-area::-webkit-scrollbar {
  display: none;
}

.device-list-area {
  width: 250px;
  flex-shrink: 0;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  box-sizing: border-box;
  overflow-y: auto;
  padding: 15px;
}

h2 {
  margin: 20px;
  color: #2c3e50;
  border-bottom: 2px solid #3498db;
  padding-bottom: 10px;
  flex-shrink: 0;
}

.devices-container {
  display: flex;
  flex-direction: column;
  gap: 30px;
  flex: 1;
}

.history-data-container {
  padding: 20px;
  text-align: center;
  color: #555;
}

.global-error-message {
  background-color: #ffebee;
  color: #c62828;
  padding: 15px;
  margin: 15px;
  border-radius: 4px;
  border: 1px solid #ef9a9a;
  text-align: center;
}

.no-device-selected {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  text-align: center;
  color: #757575;
  font-size: 1.1em;
  padding: 20px;
}
</style>