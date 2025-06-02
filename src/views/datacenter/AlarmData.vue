<template>
  <div class="alarm-data-layout">
    <!-- 左侧数据展示区域 -->
    <div class="data-display-area">
      <div class="data-display-area-top">
        <!-- 日期范围选择器 -->
        <div class="date-range-container">
          <el-date-picker unlink-panels v-model="date" type="datetimerange" range-separator="-" start-placeholder="开始日期"
            end-placeholder="结束日期" :shortcuts="shortcuts" @change="handleDateChange" />
        </div>

        <!-- 按钮区域 -->
        <div class="button-area">
          <el-button type="primary" @click="() => fetchAlarmData(true)">查询</el-button>
        </div>
      </div>
      <h2>报警数据查询</h2>

      <div v-if="globalFetchError" class="global-error-message">
        <p>{{ globalFetchError }}</p>
      </div>
      <div v-if="selectedDevices && selectedDevices.length > 0" class="devices-container">

        <!-- 报警数据展示区域 -->
        <div class="alarm-data-container">
          <div v-if="loading" class="loading-data">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>加载数据中...</span>
          </div>
          <div v-else-if="alarmData.length === 0" class="no-data">
            <p>暂无报警数据，请调整查询条件后重试</p>
          </div>
          <div v-else class="data-table-wrapper">
            <el-table :data="groupedData" border style="width: 100%">
              <el-table-column 
                v-for="column in tableColumns" 
                :key="column.prop"
                :prop="column.prop"
                :label="column.label"
                :width="column.width"
                :min-width="column.minWidth"
                :fixed="column.fixed"
              />
            </el-table>
            
            <div class="pagination-container">
              <el-pagination
                v-model:current-page="currentPage"
                v-model:page-size="pageSize"
                :page-sizes="[10, 20, 50, 100]"
                layout="total, sizes, prev, pager, next, jumper"
                :total="totalRecords"
                @size-change="handleSizeChange"
                @current-change="handlePageChange"
              />
            </div>
          </div>
        </div>
      </div>
      <div v-else class="no-device-selected">
        <p>请从右侧设备列表中选择设备以查询报警数据。</p>
      </div>
    </div>

    <!-- 右侧设备列表区域 -->
    <div class="device-list-area">
      <DeviceList :multi-select="true" />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, watch, computed } from 'vue';
import { ElMessage } from 'element-plus';
import eventBus from '../../eventBus';
import DeviceList from '../../components/DeviceList.vue';

// 日期相关
const date = ref('');
const shortcuts = [
  {
    text: '最近1小时',
    value: () => {
      const end = new Date();
      const start = new Date();
      start.setHours(start.getHours() - 1);
      return [start, end];
    },
  },
  {
    text: '今日',
    value: () => {
      const end = new Date();
      const start = new Date(new Date().setHours(0, 0, 0, 0));
      return [start, end];
    },
  },
  {
    text: '昨日',
    value: () => {
      const end = new Date(new Date().setHours(0, 0, 0, 0) - 1);
      const start = new Date(end);
      start.setDate(start.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      return [start, end];
    },
  },
  {
    text: '最近7日',
    value: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);
      return [start, end];
    },
  },
  {
    text: '最近30日',
    value: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      return [start, end];
    },
  },
];

// 日期变化处理函数
const handleDateChange = (dates) => {
  if (!dates || dates.length !== 2) return;

  const [start, end] = dates;
  const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

  if (diffDays > 30) {
    const newStart = new Date(end);
    newStart.setDate(newStart.getDate() - 30);
    newStart.setHours(0, 0, 0, 0);
    date.value = [newStart, end];

    ElMessage.warning({
      message: `时间范围超过30天，已自动调整为 ${newStart.toLocaleDateString()} 至 ${end.toLocaleDateString()}`,
      duration: 3000
    });
  }
};

// 设备和因子相关
const selectedDevices = ref([]);
const globalFetchError = ref(null);
const deviceFactors = ref([]);
const selectedFactors = ref([]);
const loadingFactors = ref(false);
const checkAll = ref(false);
const isIndeterminate = ref(false);

// 表单相关
const createForm = reactive({
  timeCycle: []
});

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
  console.log('[AlarmData] 选中的因子已更新:', newFactors);

  if (deviceFactors.value.length > 0) {
    const checkedCount = newFactors.length;
    checkAll.value = checkedCount === deviceFactors.value.length;
    isIndeterminate.value = checkedCount > 0 && checkedCount < deviceFactors.value.length;
  }
});

// 获取设备因子数据
const fetchDeviceFactors = async (deviceIds) => {
  if (!deviceIds || deviceIds.length === 0) return;

  loadingFactors.value = true;
  deviceFactors.value = [];
  selectedFactors.value = [];
  checkAll.value = false;
  isIndeterminate.value = false;

  try {
    // 获取所有选中设备的因子
    const promises = deviceIds.map(deviceId =>
      fetch(`/senser/deviceFactors/${deviceId}`)
        .then(response => {
          if (!response.ok) {
            throw new Error(`服务器响应错误: ${response.status} ${response.statusText}`);
          }
          return response.json();
        })
    );

    const results = await Promise.all(promises);
    
    // 合并所有设备的因子，去重
    const allFactors = results.reduce((acc, result) => {
      if (result.code === 1 && result.data) {
        return [...acc, ...result.data];
      }
      return acc;
    }, []);

    // 因子去重
    const uniqueFactors = Array.from(new Map(allFactors.map(factor => 
      [factor.factorId, factor]
    )).values());

    deviceFactors.value = uniqueFactors;
    console.log('[AlarmData] 成功获取设备因子数据:', uniqueFactors);

  } catch (error) {
    console.error('[AlarmData] 获取设备因子失败:', error);
    globalFetchError.value = `获取监测因子失败: ${error.message}`;
  } finally {
    loadingFactors.value = false;
  }
};

// 修改设备更新处理函数
const handleDevicesUpdate = (devices) => {
  console.log('[AlarmData] Received devices-updated event:', devices);
  selectedDevices.value = devices || [];

  // 如果选择了设备，获取所有设备的因子数据
  if (selectedDevices.value.length > 0) {
    const deviceIds = selectedDevices.value.map(device => device.id);
    fetchDeviceFactors(deviceIds);
  } else {
    deviceFactors.value = [];
    selectedFactors.value = [];
    checkAll.value = false;
    isIndeterminate.value = false;
  }
};

// 格式化日期时间函数
const formatDateTime = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// 添加报警数据相关的响应式变量
const alarmData = ref([]);
const totalRecords = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);
const loading = ref(false);

// 获取报警数据
const fetchAlarmData = async (resetPage = false) => {
  // 只在主动查询时重置页码
  if (resetPage) {
    currentPage.value = 1;
  }
  
  if (!selectedDevices.value || selectedDevices.value.length === 0) {
    ElMessage.warning('请选择设备');
    return;
  }
  
  if (!date.value || !date.value[0] || !date.value[1]) {
    ElMessage.warning('请选择日期范围');
    return;
  }
  
  const startTime = formatDateTime(date.value[0]);
  const endTime = formatDateTime(date.value[1]);
  
  // 获取所有选中设备的ID
  const deviceIds = selectedDevices.value.map(device => device.id);
  
  const requestData = {
    deviceIds: deviceIds,
    startTime: startTime,
    endTime: endTime,
    page: currentPage.value,
    pageSize: pageSize.value
  };
  
  console.log('发送报警数据请求:', requestData);
  
  try {
    loading.value = true;
    globalFetchError.value = null;
    const response = await fetch('/senser/deviceAlarmData', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      throw new Error(`服务器响应错误: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.code === 1 && result.data) {
      console.log('[AlarmData] 成功获取报警数据:', result.data);
      alarmData.value = result.data.records || [];
      totalRecords.value = result.data.total || 0;
      ElMessage.success('报警数据获取成功');
    } else {
      throw new Error(result.msg || '获取报警数据失败');
    }
  } catch (error) {
    console.error('[AlarmData] 获取报警数据失败:', error);
    globalFetchError.value = `获取报警数据失败: ${error.message}`;
    ElMessage.error(`获取报警数据失败: ${error.message}`);
  } finally {
    loading.value = false;
  }
};

// 处理页码变化
const handlePageChange = (page) => {
  currentPage.value = page;
  fetchAlarmData(false); // 不重置页码
};

// 处理每页条数变化
const handleSizeChange = (size) => {
  pageSize.value = size;
  currentPage.value = 1; // 重置为第一页
  fetchAlarmData(false); // 不重置页码
};

// 组件挂载和卸载时的事件监听
onMounted(() => {
  console.log('[AlarmData] Component mounted, listening for devices-updated event.');
  eventBus.on('devices-updated', handleDevicesUpdate);
});

onUnmounted(() => {
  console.log('[AlarmData] Component unmounted, removing devices-updated listener.');
  eventBus.off('devices-updated', handleDevicesUpdate);
});

// 添加一个计算属性，用于将数据按时间和因子重组
const groupedData = computed(() => {
  return alarmData.value.map(item => ({
    alarmTime: formatDateTime(item.startTime),
    deviceId: item.deviceId,
    nodeId: item.nodeId,
    alarmLevel: `${item.alarmLevel}级报警`,
    registerId: item.registerId,
    duration: `${formatDateTime(item.startTime)} 至 ${formatDateTime(item.endTime)}`
  }));
});

// 修改表格列配置
const tableColumns = computed(() => [
  { prop: 'alarmTime', label: '报警时间', width: '180' },
  { prop: 'deviceId', label: '设备ID', width: '100' },
  { prop: 'nodeId', label: '节点ID', width: '100' },
  { prop: 'alarmLevel', label: '报警等级', width: '100' },
  { prop: 'registerId', label: '寄存器ID', width: '100' },
  { prop: 'duration', label: '报警持续时间', minWidth: '300' }
]);
</script>
<style scoped>
.alarm-data-layout {
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
  margin: 0 20px;
  border-bottom: 2px solid #3498db;
  padding-bottom: 10px;
  position: relative; /* 添加相对定位 */
  z-index: 10; /* 确保h2在上层 */
  background-color: #ffffff; /* 添加背景色，防止内容透过 */
}

.data-display-area-top {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;
  margin-bottom: 42px; /* 增加底部间距，为h2留出空间 */
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

.alarm-data-container {
  flex: 1;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.loading-data, .no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
}

.loading-data .el-icon {
  font-size: 24px;
  margin-bottom: 10px;
}

.data-table-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 添加以下样式来隐藏表格滚动条 */
:deep(.el-table__body-wrapper::-webkit-scrollbar) {
  display: none;
}

:deep(.el-table__body-wrapper) {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

/* 修改Element Plus滚动条样式 */
:deep(.el-scrollbar__bar.is-vertical>div) { 
   width: 0; 
}

.pagination-container {
  margin-top: 15px;
  display: flex;
  justify-content: flex-end;
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

.date-display {
  width: 100%;
  height: 32px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;
  cursor: pointer;
  background-color: #fff;
}

.date-display:hover {
  border-color: #409eff;
}

.date-shortcuts {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.shortcut-item {
  padding: 10px 15px;
  cursor: pointer;
  transition: all 0.3s;
}

.shortcut-item:hover {
  background-color: #f5f7fa;
}

.shortcut-item.active {
  background-color: #409eff;
  color: white;
}

.custom-date-range {
  border-top: 1px solid #EBEEF5;
  background-color: #f5f7fa;
}

:deep(.date-popover) {
  padding: 0;
  min-width: 300px !important;
}

:deep(.el-date-editor.el-input__wrapper) {
  width: 100%;
}

:deep(.el-date-editor--datetimerange.el-input__inner) {
  width: 100%;
  height: 32px;
  line-height: 32px;
}

/* 调整日期选择器内部元素的大小 */
:deep(.el-date-editor--datetimerange) {
  font-size: 12px;
}

:deep(.el-input__wrapper) {
  padding: 0 8px;
}

:deep(.el-range-separator) {
  padding: 0 4px;
}

.single-line-select :deep(.el-select__tags) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-height: 24px;
  line-height: 24px;
}

.single-line-select :deep(.el-select__tags-text) {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.button-area {
  height: 32px;
  display: flex;
  position: absolute;
  top: 15px;
  left: calc(50% + 280px);
}
</style>