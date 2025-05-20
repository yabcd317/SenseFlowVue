<template>
  <div class="historical-data-layout">
    <!-- 左侧数据展示区域 -->
    <div class="data-display-area">
      <div class="data-display-area-top">
        <!-- 选择框 - 使用 Element Plus 的 el-select -->
        <!-- 设备因子选择区域 -->
        <div class="factor-tags-container">
          <el-select v-model="selectedFactors" multiple collapse-tags collapse-tags-tooltip :max-collapse-tags="1"
            placeholder="请选择监测因子" style="width: 100%" class="single-line-select">
            <!-- 将全选和清空选项放在第一个位置 -->
            <div
              style="display: flex; justify-content: space-between; padding: 5px 12px; border-bottom: 1px solid #EBEEF5;">
              <el-checkbox v-model="checkAll" :indeterminate="isIndeterminate" @change="handleCheckAll">
                全选
              </el-checkbox>
              <el-button size="small" @click="clearSelection" type="text">清空</el-button>
            </div>
            <!-- 设备因子选项 -->
            <el-option v-for="factor in deviceFactors" :key="factor.factorId"
              :label="`${selectedDevices[0]?.deviceName}-${factor.name}`" :value="factor.factorId" />
          </el-select>
        </div>

        <!-- 日期范围选择器 -->
        <div class="date-range-container">
          <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期"
            end-placeholder="结束日期" :disabled-date="disabledDate" value-format="YYYY-MM-DD"
            @change="handleDateRangeChange"></el-date-picker>
        </div>

        <!-- 按钮区域 -->
        <div class="button-area">
          <el-button type="primary" @click="fetchHistoricalData">查询</el-button>
        </div>
      </div>
      <h2>历史数据查询</h2>



      <div v-if="globalFetchError" class="global-error-message">
        <p>{{ globalFetchError }}</p>
      </div>
      <div v-if="selectedDevices && selectedDevices.length > 0" class="devices-container">


        <!-- 历史数据展示区域 -->
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
      <DeviceList :multi-select="false" />
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted, watch, computed } from 'vue';
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
    const deviceFactors = ref([]);
    const selectedFactors = ref([]);
    const loadingFactors = ref(false);
    const checkAll = ref(false);
    const isIndeterminate = ref(false);

    // 全选处理函数
    const handleCheckAll = (val) => {
      selectedFactors.value = val ? deviceFactors.value.map(factor => factor.factorId) : [];
      isIndeterminate.value = false;
    };

    // 清空选择
    const clearSelection = () => {
      selectedFactors.value = [];
      checkAll.value = false;
      isIndeterminate.value = false;
    };

    // 监听选中因子变化，更新全选状态
    watch(selectedFactors, (newFactors) => {
      console.log('[HistoricalData] 选中的因子已更新:', newFactors);

      if (deviceFactors.value.length > 0) {
        const checkedCount = newFactors.length;
        checkAll.value = checkedCount === deviceFactors.value.length;
        isIndeterminate.value = checkedCount > 0 && checkedCount < deviceFactors.value.length;
      }

      // 这里可以添加获取历史数据的逻辑
    });

    // 获取设备因子数据
    const fetchDeviceFactors = async (deviceId) => {
      if (!deviceId) return;

      loadingFactors.value = true;
      deviceFactors.value = [];
      selectedFactors.value = [];
      checkAll.value = false;
      isIndeterminate.value = false;

      try {
        console.log(`[HistoricalData] 获取设备 ${deviceId} 的监测因子...`);
        const response = await fetch(`/senser/deviceFactors/${deviceId}`);

        if (!response.ok) {
          throw new Error(`服务器响应错误: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        if (result.code === 1 && result.data) {
          console.log('[HistoricalData] 成功获取设备因子数据:', result.data);
          deviceFactors.value = result.data;

          // 如果有因子数据，默认选中第一个
          if (result.data.length > 0) {
            isIndeterminate.value = true;
          }
        } else {
          throw new Error(result.msg || '获取设备因子数据失败');
        }
      } catch (error) {
        console.error('[HistoricalData] 获取设备因子失败:', error);
        globalFetchError.value = `获取监测因子失败: ${error.message}`;
      } finally {
        loadingFactors.value = false;
      }
    };

    // 处理从事件总线接收到的设备更新
    const handleDevicesUpdate = (devices) => {
      console.log('[HistoricalData] Received devices-updated event:', devices);
      selectedDevices.value = devices || [];

      // 如果选择了设备，获取第一个设备的因子数据
      if (selectedDevices.value.length > 0) {
        const firstDeviceId = selectedDevices.value[0].id;
        fetchDeviceFactors(firstDeviceId);
      } else {
        deviceFactors.value = [];
        selectedFactors.value = [];
        checkAll.value = false;
        isIndeterminate.value = false;
      }
    };

    onMounted(() => {
      console.log('[HistoricalData] Component mounted, listening for devices-updated event.');
      eventBus.on('devices-updated', handleDevicesUpdate);
    });

    onUnmounted(() => {
      console.log('[HistoricalData] Component unmounted, removing devices-updated listener.');
      eventBus.off('devices-updated', handleDevicesUpdate);
    });

    // 日期范围选择
    const dateRange = ref(null);

    // 禁用日期函数 - 限制最大选择范围为30天
    const disabledDate = (time) => {
      if (!dateRange.value) {
        return false;
      }
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      if (dateRange.value[0]) {
        // 如果已选择开始日期，则结束日期不能超过开始日期30天
        const startDate = new Date(dateRange.value[0]);
        const endDate = new Date(startDate.getTime() + thirtyDays);
        return time.getTime() > endDate || time.getTime() < startDate;
      }
      return false;
    };

    // 处理日期范围变化
    const handleDateRangeChange = (val) => {
      console.log('[HistoricalData] 日期范围已更新:', val);
      // 这里可以添加日期范围变化后的处理逻辑
    };

    // 获取历史数据
    const fetchHistoricalData = () => {
      if (!selectedFactors.value || selectedFactors.value.length === 0) {
        globalFetchError.value = '请至少选择一个监测因子';
        return;
      }

      if (!dateRange.value || !dateRange.value[0] || !dateRange.value[1]) {
        globalFetchError.value = '请选择日期范围';
        return;
      }

      console.log('[HistoricalData] 获取历史数据:', {
        设备: selectedDevices.value[0]?.deviceName,
        因子: selectedFactors.value,
        日期范围: dateRange.value
      });

      // 这里添加获取历史数据的API调用
    };

    return {
      selectedDevices,
      globalFetchError,
      deviceFactors,
      selectedFactors,
      loadingFactors,
      checkAll,
      isIndeterminate,
      handleCheckAll,
      clearSelection,
      dateRange,
      disabledDate,
      handleDateRangeChange,
      fetchHistoricalData
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
  position: relative;
  /* 添加相对定位 */
}

.data-display-area::-webkit-scrollbar {
  display: none;
}

/* 全选和清空按钮样式 */
.select-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
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

h2,
h3 {
  color: #2c3e50;
  flex-shrink: 0;
}

h2 {
  margin: 20px;
  border-bottom: 2px solid #3498db;
  padding-bottom: 10px;
}

h3 {
  margin: 15px 0;
  font-size: 1.2em;
}

.devices-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex: 1;
  padding: 0 15px 15px;
}

.factor-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.factor-item {
  display: flex;
  align-items: center;
  background-color: #fff;
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
  cursor: pointer;
}

.factor-item:hover {
  border-color: #3498db;
}

.factor-item input {
  margin-right: 8px;
}

.loading-factors,
.no-factors {
  padding: 15px;
  text-align: center;
  color: #666;
}

.history-data-container {
  flex: 1;
  padding: 20px;
  text-align: center;
  color: #555;
  background-color: #f9f9f9;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
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

.data-display-area-top {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;
}

/* 因子选择框样式 */
.factor-tags-container {
  position: absolute;
  top: 15px;
  left: 15px;
  z-index: 100;
  max-height: 48px;
  width: calc(50% - 275px - 30px);
  overflow: hidden;
}
/* 时间选择框样式 */
.date-range-container {
  height: 32px;
  width: 550px;
  display: flex;
  position: absolute;
  top: 15px;
  left: calc(50% - 275px);
}

.button-area {
  width: 32px;
  display: flex;
  position: absolute;
  left: calc(50% + 275px + 10px);
  top: 15px;
  gap: 10px;
}

/* 确保选择框只显示一行 */
.single-line-select :deep(.el-select__tags) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-height: 24px;
  line-height: 24px;
}

/* 防止标签换行 */
.single-line-select :deep(.el-select__tags-text) {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>