<template>
  <div class="realtime-data-layout">
    <!-- 左侧数据展示区域 -->
    <div class="data-display-area">
      <h2>实时数据监控</h2>
      <div v-if="globalFetchError" class="global-error-message">
        <p>{{ globalFetchError }}</p>
      </div>
      <div v-if="selectedDevices && selectedDevices.length > 0" class="devices-container">
        <!-- 使用封装的设备区块组件 -->
        <DeviceBlock 
          v-for="device in selectedDevices" 
          :key="device.id"
          :device="device"
          :device-data="deviceData[device.id]"
          :loading="loadingData[device.id]"
          @card-click="showDetailModal"
        />
      </div>

      <div v-else class="no-device-selected">
        <p>请从右侧设备列表中选择设备以查看实时数据。</p>
      </div>
    </div>

    <!-- 右侧设备列表区域 -->
    <div class="device-list-area">
      <DeviceList :multi-select="true" />
    </div>

    <!-- 数据详情模态框 -->
    <div v-if="showModal" class="data-detail-modal" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ modalData.title }}</h3>
          <button class="close-btn" @click="closeModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="detail-info">
            <p><strong>设备:</strong> {{ modalData.deviceName }}</p>
            <p><strong>监测项:</strong> {{ modalData.sensorName }}</p>
            <p><strong>当前值:</strong>
              <span> <!-- Removed :class="getValueColorClass(modalData.value)" -->
                {{ formatValueDisplay(modalData.value) }} {{ modalData.unit }}
              </span>
            </p>
            <p><strong>更新时间:</strong> {{ formatTimestamp(modalData.timestamp) }}</p>
          </div>
          <div class="detail-chart">
            <!-- 这里可以添加图表组件，如ECharts -->
            <div class="chart-placeholder">
              <p>历史数据趋势图</p>
              <p class="placeholder-text">此处将显示数据趋势图表</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted, computed, watch } from 'vue';
import eventBus from '../../eventBus';
import DeviceList from '../../components/DeviceList.vue';
import DeviceBlock from '../../components/DeviceBlock.vue'; // 导入新组件

export default {
  name: 'RealTimeData',
  components: {
    DeviceList,
    DeviceBlock // 注册新组件
  },
  setup() {
    // 本地状态存储选中的设备
    const selectedDevices = ref([]);
    const loadingData = reactive({}); // 用于跟踪每个设备的加载状态
    const deviceData = reactive({});  // 用于存储每个设备的实时数据
    const globalFetchError = ref(null); // 用于显示全局的API请求错误

    // 模态框相关状态
    const showModal = ref(false);
    const modalData = reactive({
      deviceId: null,
      deviceName: '',
      sensorName: '',
      value: null,
      unit: '',
      timestamp: '',
      title: ''
    });

    // 监听 showModal 状态，用于控制 body 滚动条
    watch(showModal, (isModalVisible) => {
      if (isModalVisible) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });

    // 显示详情模态框
    const showDetailModal = (device, sensorName, valueObj) => {
      console.log('[RealTimeData] showDetailModal called with device:', device, 'sensorName:', sensorName, 'valueObj:', valueObj);
      try {
        if (!device || typeof device.id === 'undefined' || typeof device.deviceName === 'undefined') {
          console.error('[RealTimeData] Invalid device object passed to showDetailModal:', device);
          globalFetchError.value = '无法显示详情：设备数据无效。';
          return;
        }
        if (!valueObj || typeof valueObj.value === 'undefined') {
          console.error('[RealTimeData] Invalid valueObj passed to showDetailModal:', valueObj);
          globalFetchError.value = `无法显示详情：传感器 ${sensorName} 数据无效。`;
          return;
        }

        modalData.deviceId = device.id;
        modalData.deviceName = device.deviceName;
        modalData.sensorName = sensorName;
        modalData.value = valueObj.value;
        modalData.unit = valueObj.unit || '';

        const currentDeviceData = deviceData[device.id];
        modalData.timestamp = currentDeviceData?.timestamp || new Date().toISOString();
        modalData.title = `${sensorName} 详情`;

        console.log('[RealTimeData] Modal data prepared:', JSON.parse(JSON.stringify(modalData)));
        showModal.value = true;
        console.log('[RealTimeData] showModal.value set to:', showModal.value);
      } catch (error) {
        console.error('[RealTimeData] Error in showDetailModal:', error);
        globalFetchError.value = `显示详情时发生错误: ${error.message}`;
      }
    };

    // 关闭模态框
    const closeModal = () => {
      showModal.value = false;
    };

    // 格式化数值显示
    const formatValueDisplay = (value) => {
      if (value === undefined || value === null) return 'N/A';
      // 移除 .toFixed(1) 以显示原始数据
      return value;
    };

    // 新的方法：为当前选中的设备批量获取数据
    const fetchDataForSelectedDevices = async (idsToFetch) => {
      globalFetchError.value = null; // 重置全局错误

      // 如果没有设备被选中，则清空数据并返回
      if (!idsToFetch || idsToFetch.length === 0) {
        Object.keys(deviceData).forEach(key => delete deviceData[key]);
        Object.keys(loadingData).forEach(key => delete loadingData[key]);
        return;
      }

      // 为即将获取数据的设备设置加载状态
      idsToFetch.forEach(id => {
        loadingData[id] = true;
        deviceData[id] = null; // 清除旧数据
      });

      console.log(`[RealTimeData] 开始为设备 ${idsToFetch.join(', ')} 获取实时数据...`);
      try {
        console.log('发送到后端的设备ID数组:', idsToFetch);
        const response = await fetch('/senser/deviceData', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(idsToFetch)
        });

        if (!response.ok) {
          throw new Error(`服务器响应错误: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        if (result.code === 1) {
          console.log('[RealTimeData] 成功获取批量设备数据:', result.data);
          const receivedDataIds = new Set();
          if (result.data && Array.isArray(result.data)) {
            result.data.forEach(item => {
              if (item && item.deviceId !== undefined) {
                const deviceId = item.deviceId;
                deviceData[deviceId] = {
                  timestamp: new Date().toISOString(),
                  status: item.status === 0 ? '在线' : '离线',
                  values: {}
                };

                if (item.dataItems && Array.isArray(item.dataItems)) {
                  item.dataItems.forEach(dataItem => {
                    if (dataItem.functionName && dataItem.value !== undefined) {
                      deviceData[deviceId].values[dataItem.functionName] = {
                        value: dataItem.value,
                        unit: dataItem.unit || ''
                      };
                    }
                  });
                }

                loadingData[deviceId] = false;
                receivedDataIds.add(deviceId);
              } else {
                console.warn('[RealTimeData] 收到的设备数据项格式不正确:', item);
              }
            });
          }

          idsToFetch.forEach(id => {
            if (!receivedDataIds.has(id)) {
              loadingData[id] = false;
              deviceData[id] = null;
              console.warn(`[RealTimeData] 未收到设备 ${id} 的数据。`);
            }
          });
        } else {
          throw new Error(result.msg || '获取设备数据失败');
        }
      } catch (error) {
        console.error(`[RealTimeData] 获取批量设备实时数据失败:`, error);
        globalFetchError.value = error.message;
        idsToFetch.forEach(id => {
          loadingData[id] = false;
        });
      }
    };

    // 处理从事件总线接收到的设备更新
    const handleDevicesUpdate = (devices) => {
      console.log('[RealTimeData] Received devices-updated event:', devices);
      selectedDevices.value = devices || [];

      const newSelectedIds = selectedDevices.value.map(d => d.id);

      Object.keys(deviceData).forEach(existingId => {
        if (!newSelectedIds.includes(existingId)) {
          delete deviceData[existingId];
          delete loadingData[existingId];
        }
      });

      fetchDataForSelectedDevices(newSelectedIds);
    };

    // 组件挂载时开始监听事件
    onMounted(() => {
      console.log('[RealTimeData] Component mounted, listening for devices-updated event.');
      eventBus.on('devices-updated', handleDevicesUpdate);

      // 设置定时刷新数据
      const refreshInterval = setInterval(() => {
        const selectedIds = selectedDevices.value.map(d => d.id);
        if (selectedIds.length > 0) {
          fetchDataForSelectedDevices(selectedIds);
        }
      }, 30000); // 每30秒刷新一次

      // 组件卸载时清除定时器
      onUnmounted(() => {
        clearInterval(refreshInterval);
        console.log('[RealTimeData] Component unmounted, removing devices-updated listener.');
        eventBus.off('devices-updated', handleDevicesUpdate);
        // 组件卸载时，确保恢复 body 的滚动状态
        document.body.style.overflow = '';
      });
    });

    const formatTimestamp = (isoString) => {
      if (!isoString) return 'N/A';
      try { return new Date(isoString).toLocaleString(); } catch (e) { return isoString; }
    };

    const formatValue = (valueObj) => {
      if (valueObj !== undefined && valueObj !== null) {
        if (typeof valueObj === 'object') {
          const value = valueObj.value;
          const unit = valueObj.unit || '';

          // 移除 .toFixed(1)
          return value + ' ' + unit;
        } else if (typeof valueObj === 'number') {
          return valueObj;
        }
      }
      return valueObj;
    };

    return {
      selectedDevices,
      loadingData,
      deviceData,
      globalFetchError,
      formatTimestamp,
      formatValue,
      showModal, // Restored
      modalData, // Restored
      showDetailModal, // Restored
      closeModal, // Restored
      formatValueDisplay
    };
  }
}
</script>

<style scoped>
.realtime-data-layout {
  display: flex;
  flex-direction: row;
  /* 使子元素水平排列 */
  width: 100%;
  /* 占据父容器的全部宽度 */
  height: calc(100vh - 70px);
  /* 固定高度，减去顶部导航栏的高度 */
  padding-left: 10px;
  box-sizing: border-box;
  background-color: #f0f2f5;
  gap: 20px;
  /* 子元素之间的水平间距 */
  /* overflow-y: auto; */
  /* 子区域已有自己的滚动条，此处通常不需要 */
}

.data-display-area {
  flex: 1;
  /* 占据剩余的水平空间 */
  background-color: #ffffff;
  padding: 5px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  /* 保持内部垂直滚动 */
  min-width: 0;
  /* 防止内容过多时撑开布局 */

  /* 隐藏滚动条 */
  -ms-overflow-style: none;
  /* IE 和 Edge 浏览器隐藏滚动条 */
  scrollbar-width: none;
  /* Firefox 浏览器隐藏滚动条 */
}

.device-list-area {
  width: 250px;
  /* 固定宽度 */
  flex-shrink: 0;
  /* 防止被压缩 */
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  box-sizing: border-box;
  /* 可以考虑添加 overflow-y: auto; 如果设备列表内容可能超出其高度 */
  overflow-y: auto;
  padding: 15px;
  /* 为设备列表内部添加一些边距 */
}

h2 {
  margin: 20px;
  color: #2c3e50;
  border-bottom: 2px solid #3498db;
  padding-bottom: 10px;
  flex-shrink: 0;
}

/* 设备容器 */
.devices-container {
  display: flex;
  flex-direction: column;
  gap: 30px;
  flex: 1;
  /* 新增/修改：当没有设备被选择时的提示信息样式 */
}

/* 设备区块 */
.device-block {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding-bottom: 20px;
  border-bottom: 1px dashed #e0e0e0;
}

.device-block:last-child {
  border-bottom: none;
}

/* 设备标题 */
.device-header {
  margin: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border-left: 4px solid #3498db;
}

.device-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 16px;
}

.status-indicator {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-indicator.online {
  background-color: #e6f7ff;
  color: #1890ff;
  border: 1px solid #91d5ff;
}

.status-indicator.offline {
  background-color: #fff2f0;
  color: #ff4d4f;
  border: 1px solid #ffccc7;
}

/* 数据卡片横向排列 */
.data-cards-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 0 20px;
}

.data-card {
  flex: 0 0 325px;
  /* 增加卡片宽度，使其成为长方形 */
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 0;
  /* 移除内边距，以便自定义布局 */
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  height: 80px;
  /* 减小卡片高度 */
  display: flex;
  /* 使用flex布局 */
  flex-direction: row;
  /* 水平排列 */
  align-items: center;
  /* 垂直居中 */
}

.data-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
}

.card-icon {
  width: 60px;
  /* 设置图标区域宽度 */
  height: 100%;
  /* 图标区域高度与卡片一致 */
  background-color: #4CAF50;
  /* 绿色背景，与图片一致 */
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  /* 防止图标区域被压缩 */
}

.card-icon-offline {
  background-color: #ff4d4f;
  /* 离线时的红色背景 */
}

.sensor-icon {
  width: 24px;
  height: 24px;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2zm0 8h2v2h-2zm0 8h2v2h-2zm0 8h2v2h-2z"/></svg>');
  background-repeat: no-repeat;
  background-position: center;
}

.card-content {
  display: flex;
  flex-direction: column;
  padding: 15px;
  /* 为内容区域添加内边距 */
  flex-grow: 1;
  /* 内容区域占据剩余空间 */
  justify-content: center;
  /* 可选：如果内容较少，使其垂直居中 */
}

.card-title-line {
  display: flex;
  align-items: baseline;
  /* 文本基线对齐，视觉效果更好 */
  gap: 5px;
  /* 在标题和单位之间添加一些间距 */
}

.card-title {
  font-size: 16px;
  color: #666;
  margin: 0;
  /* 移除原有边距，由 .card-title-line 的 gap 控制间距 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
  /* 允许标题在空间不足时收缩 */
}

.card-value {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  line-height: 1.2;
  color: #4CAF50;
  /* 使用绿色，与图标背景一致 */
}

.card-value-offline {
  color: #ff4d4f;
  /* 离线时的红色文本 */
}

.card-unit {
  font-size: 14px;
  color: #999;
  margin: 0;
  /* 移除原有边距 */
  white-space: nowrap;
  /* 防止单位换行 */
  flex-shrink: 0;
  /* 不允许单位收缩 */
  /* display: inline-block;  移除此行，因为父元素已是 flex 布局 */
}

/* 模态框样式 */
.data-detail-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  /* 半透明背景 */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  /* 确保在顶层 */
  padding: 20px;
  /* 避免内容紧贴边缘 */
  box-sizing: border-box;
}

.modal-content {
  background-color: #fff;
  padding: 25px 30px;
  border-radius: 8px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 600px;
  /* 限制最大宽度 */
  max-height: 90vh;
  /* 限制最大高度 */
  overflow-y: auto;
  /* 内容过多时可滚动 */
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e9ecef;
  padding-bottom: 15px;
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  color: #343a40;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #6c757d;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #343a40;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-info p {
  margin: 8px 0;
  font-size: 15px;
  color: #495057;
  line-height: 1.6;
}

.detail-info p strong {
  color: #343a40;
  min-width: 80px;
  /* 确保标签对齐 */
  display: inline-block;
  margin-right: 8px;
}

.detail-chart {
  border-top: 1px solid #e9ecef;
  padding-top: 20px;
  margin-top: 10px;
}

.chart-placeholder {
  text-align: center;
  padding: 30px;
  background-color: #f8f9fa;
  border-radius: 6px;
  color: #6c757d;
}

.chart-placeholder p {
  margin: 5px 0;
}

.placeholder-text {
  font-size: 14px;
  font-style: italic;
}

/* 新增/修改：当没有设备被选择时的提示信息样式 */
.no-device-selected {
  flex: 1;
  /* 新增：使其在 data-display-area 内垂直方向上占据剩余空间 */
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 20px;
  color: #6c757d;
  font-size: 16px;
}

/* 加载指示器样式 */
.loading-indicator {
  flex: 1;
  /* 确保加载指示器也能撑开空间，如果需要的话 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #6c757d;
}

.loading-spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

/* 暂无数据消息样式 */
.no-data-message {
  flex: 1;
  /* 确保暂无数据消息也能撑开空间 */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #6c757d;
  text-align: center;
}

/* 全局错误消息样式 */
.global-error-message {
  background-color: #fff2f0;
  color: #ff4d4f;
  border: 1px solid #ffccc7;
  padding: 10px 15px;
  border-radius: 6px;
  margin: 0 20px 20px;
}

/* 保留模态框相关样式 */
.close-btn:hover {
  color: #343a40;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-info p {
  margin: 8px 0;
  font-size: 15px;
  color: #495057;
  line-height: 1.6;
}

.detail-info p strong {
  color: #343a40;
  min-width: 80px;
  /* 确保标签对齐 */
  display: inline-block;
  margin-right: 8px;
}

.detail-chart {
  border-top: 1px solid #e9ecef;
  padding-top: 20px;
  margin-top: 10px;
}

.chart-placeholder {
  text-align: center;
  padding: 30px;
  background-color: #f8f9fa;
  border-radius: 6px;
  color: #6c757d;
}

.chart-placeholder p {
  margin: 5px 0;
}

.placeholder-text {
  font-size: 14px;
  font-style: italic;
}
</style>