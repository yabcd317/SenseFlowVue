<template>
  <div class="realtime-data-layout">
    <!-- 左侧数据展示区域 -->
    <div class="data-display-area">
      <h2>实时数据监控</h2>
      <div v-if="globalFetchError" class="global-error-message">
        <p>{{ globalFetchError }}</p>
      </div>
      <div v-if="selectedDevices && selectedDevices.length > 0" class="devices-container">
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
            <p>
              <strong>设备ID:</strong> {{ modalData.deviceId }}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              <strong>节点ID:</strong> {{ modalData.nodeId }}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              <strong>寄存器ID:</strong> {{ modalData.registerId }}
            </p>
            <p><strong>设备:</strong> {{ modalData.deviceName }}</p>
            <p><strong>监测项:</strong> {{ modalData.sensorName }}</p>
            <p><strong>当前值:</strong>
              <span>
                {{ formatValueDisplay(modalData.value) }} {{ modalData.unit }}
              </span>
            </p>
            <p><strong>更新时间:</strong> {{ modalData.recordTimeStr }}</p>
          </div>
          <div class="detail-chart">
            <div class="chart-header">
              <p>历史数据趋势图</p>
              <button 
                class="trend-chart-btn" 
                @click="loadHistoryData"
                :disabled="loadingChart"
              >
                {{ loadingChart ? '加载中...' : '显示历史趋势' }}
              </button>
            </div>
            <div 
              v-if="showChart" 
              ref="chartContainer" 
              class="chart-container"
            ></div>
            <div v-else class="chart-placeholder">
              <p class="placeholder-text">点击上方按钮查看最近30条历史数据趋势</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted, watch, nextTick } from 'vue';
import * as echarts from 'echarts';
import eventBus from '../../eventBus';
import DeviceList from '../../components/DeviceList.vue';
import DeviceBlock from '../../components/DeviceBlock.vue';

export default {
  name: 'RealTimeData',
  components: {
    DeviceList,
    DeviceBlock
  },
  setup() {
    const selectedDevices = ref([]);
    const loadingData = reactive({});
    const deviceData = reactive({});
    const globalFetchError = ref(null);

    const showModal = ref(false);
    const showChart = ref(false);
    const loadingChart = ref(false);
    const chartContainer = ref(null);
    let chartInstance = null;
    
    const modalData = reactive({
      deviceId: null,
      deviceName: '',
      sensorName: '',
      nodeId: null,
      recordTimeStr: '',
      registerId: null,
      value: null,
      unit: '',
      title: ''
    });

    watch(showModal, (isModalVisible) => {
      document.body.style.overflow = isModalVisible ? 'hidden' : '';
    });

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
        modalData.nodeId = valueObj.nodeId;
        modalData.recordTimeStr = valueObj.recordTimeStr;
        modalData.registerId = valueObj.registerId;
        modalData.unit = valueObj.unit || '';

        const currentDeviceData = deviceData[device.id];
        modalData.title = `${sensorName} 详情`;

        console.log('[RealTimeData] Modal data prepared:', JSON.parse(JSON.stringify(modalData)));
        showModal.value = true;
        console.log('[RealTimeData] showModal.value set to:', showModal.value);
      } catch (error) {
        console.error('[RealTimeData] Error in showDetailModal:', error);
        globalFetchError.value = `显示详情时发生错误: ${error.message}`;
      }
    };

    const loadHistoryData = async () => {
      if (!modalData.deviceId || !modalData.nodeId || !modalData.registerId) {
        globalFetchError.value = '缺少必要的参数，无法获取历史数据';
        return;
      }

      loadingChart.value = true;
      try {
        const response = await fetch('/senser/deviceLast30Data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deviceId: modalData.deviceId,
            nodeId: modalData.nodeId,
            registerId: modalData.registerId
          })
        });

        if (!response.ok) {
          throw new Error(`服务器响应错误: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.code === 1 && result.data && Array.isArray(result.data)) {
          showChart.value = true;
          await nextTick();
          console.log('chartContainer.value after nextTick:', chartContainer.value); // 添加日志
          renderChart(result.data);
        } else {
          throw new Error(result.msg || '获取历史数据失败');
        }
      } catch (error) {
        console.error('获取历史数据失败:', error);
        globalFetchError.value = `获取历史数据失败: ${error.message}`;
      } finally {
        loadingChart.value = false;
      }
    };

    const renderChart = (data) => {
      console.log('renderChart called, chartContainer.value:', chartContainer.value); // 添加日志
      if (!chartContainer.value) {
        console.error('chartContainer is null, cannot render chart.'); // 添加错误日志
        return;
      }

      // 销毁之前的图表实例
      if (chartInstance) {
        chartInstance.dispose();
      }

      // 处理数据
      const sortedData = data.sort((a, b) => new Date(a.recordTimeStr) - new Date(b.recordTimeStr));
      const times = sortedData.map(item => item.recordTimeStr);
      const values = sortedData.map(item => item.value);
      const unit = data[0]?.unit || modalData.unit || '';

      // 创建图表实例
      chartInstance = echarts.init(chartContainer.value);

      const option = {
        title: {
          text: `${modalData.sensorName} 历史趋势`,
          left: 'center',
          textStyle: {
            fontSize: 16,
            color: '#333'
          }
        },
        tooltip: {
          trigger: 'axis',
          formatter: function(params) {
            const param = params[0];
            return `${param.name}<br/>${param.seriesName}: ${param.value} ${unit}`;
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: times,
          axisLabel: {
            formatter: function(value) {
              // 只显示时间部分
              return value.split(' ')[1] || value;
            },
            rotate: 45
          }
        },
        yAxis: {
          type: 'value',
          name: unit,
          nameTextStyle: {
            color: '#666'
          }
        },
        series: [{
          name: modalData.sensorName,
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            color: '#3498db',
            width: 2
          },
          itemStyle: {
            color: '#3498db'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [{
                offset: 0,
                color: 'rgba(52, 152, 219, 0.3)'
              }, {
                offset: 1,
                color: 'rgba(52, 152, 219, 0.1)'
              }]
            }
          },
          data: values
        }]
      };

      chartInstance.setOption(option);

      // 监听窗口大小变化
      const resizeHandler = () => {
        if (chartInstance) {
          chartInstance.resize();
        }
      };
      window.addEventListener('resize', resizeHandler);
    };

    const closeModal = () => {
      showModal.value = false;
      showChart.value = false;
      if (chartInstance) {
        chartInstance.dispose();
        chartInstance = null;
      }
    };

    const formatValueDisplay = (value) => {
      if (value === undefined || value === null) return 'N/A';
      return value;
    };

    const fetchDataForSelectedDevices = async (idsToFetch) => {
      globalFetchError.value = null;

      if (!idsToFetch || idsToFetch.length === 0) {
        Object.keys(deviceData).forEach(key => delete deviceData[key]);
        Object.keys(loadingData).forEach(key => delete loadingData[key]);
        return;
      }

      idsToFetch.forEach(id => {
        loadingData[id] = true;
        deviceData[id] = null;
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
                  status: item.status === 1 ? '在线' : '离线',
                  values: {}
                };

                if (item.dataItems && Array.isArray(item.dataItems)) {
                  item.dataItems.forEach(dataItem => {
                    if (dataItem.functionName && dataItem.value !== undefined) {
                      deviceData[deviceId].values[dataItem.functionName] = {
                        value: dataItem.value,
                        unit: dataItem.unit || '',
                        deviceId: dataItem.deviceId,
                        nodeId: dataItem.nodeId,
                        registerId: dataItem.registerId,
                        recordTimeStr: dataItem.recordTimeStr
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

    let refreshInterval = null; 

    onMounted(() => {
      console.log('[RealTimeData] Component mounted, listening for devices-updated event.');
      eventBus.on('devices-updated', handleDevicesUpdate);

      refreshInterval = setInterval(() => {
        const selectedIds = selectedDevices.value.map(d => d.id);
        if (selectedIds.length > 0) {
          fetchDataForSelectedDevices(selectedIds);
        }
      }, 30000);
    });

    onUnmounted(() => {
      if (refreshInterval) { 
        clearInterval(refreshInterval);
      }
      console.log('[RealTimeData] Component unmounted, removing devices-updated listener.');
      eventBus.off('devices-updated', handleDevicesUpdate);
      document.body.style.overflow = '';
    });



    const formatValue = (valueObj) => {
      if (valueObj !== undefined && valueObj !== null) {
        if (typeof valueObj === 'object') {
          const value = valueObj.value;
          const unit = valueObj.unit || '';
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
      formatValue,
      showModal,
      modalData,
      showDetailModal,
      closeModal,
      formatValueDisplay,
      showChart,
      loadingChart,
      chartContainer,
      loadHistoryData
    };
  }
}
</script>

<style scoped>
.realtime-data-layout {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: calc(100vh - 70px); /* Assuming 70px is TopBar height */
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
  display: none; /* Chrome, Safari, Opera */
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
  flex-shrink: 0; /* Prevent h2 from shrinking */
}

.devices-container {
  display: flex;
  flex-direction: column;
  gap: 30px;
  flex: 1; /* Allow this container to grow and enable scrolling if DeviceBlocks overflow */
}


.global-error-message {
  background-color: #ffebee; /* Light red background */
  color: #c62828; /* Dark red text */
  padding: 15px;
  margin: 15px;
  border-radius: 4px;
  border: 1px solid #ef9a9a; /* Lighter red border */
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

/* Modal Styles */
.data-detail-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.modal-content {
  background-color: #fff;
  padding: 25px;
  border-radius: 10px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 15px;
  margin-bottom: 20px;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.4em;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.8em;
  cursor: pointer;
  color: #888;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-info p {
  margin: 8px 0;
  font-size: 1em;
  color: #555;
  line-height: 1.6;
}

.detail-info p strong {
  color: #333;
  margin-right: 8px;
}

.detail-info span {
  font-weight: bold;
  color: #2c3e50;
}

.detail-chart {
  margin-top: 15px;
  border-top: 1px solid #eee;
  padding-top: 20px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.chart-header p {
  margin: 0;
  font-size: 1.1em;
  font-weight: bold;
  color: #333;
}

.trend-chart-btn {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.3s;
}

.trend-chart-btn:hover:not(:disabled) {
  background-color: #2980b9;
}

.trend-chart-btn:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}

.chart-container {
  width: 100%;
  height: 400px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.chart-placeholder {
  text-align: center;
  padding: 30px;
  background-color: #f9f9f9;
  border-radius: 6px;
  border: 1px dashed #ddd;
}

.chart-placeholder .placeholder-text {
  font-style: italic;
  font-size: 0.9em;
  color: #777;
  margin: 0;
}

/* Scrollbar styling for modal body if needed */
.modal-body::-webkit-scrollbar {
  width: 8px;
}

.modal-body::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 10px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: #aaa;
}

</style>