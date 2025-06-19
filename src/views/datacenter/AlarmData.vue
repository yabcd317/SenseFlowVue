<template>
  <div class="alarm-data-layout">
    <div class="data-display-area">
      <div class="data-display-area-top">
        <div class="date-range-container">
          <el-date-picker 
            v-model="date" 
            type="datetimerange" 
            range-separator="-" 
            start-placeholder="开始日期"
            end-placeholder="结束日期" 
            :shortcuts="shortcuts" 
            @change="handleDateChange" 
            unlink-panels 
          />
        </div>
        <div class="button-area">
          <el-button type="primary" @click="() => fetchAlarmData(true)">查询</el-button>
        </div>
      </div>
      
      <h2>报警数据查询</h2>

      <div v-if="globalFetchError" class="global-error-message">
        <p>{{ globalFetchError }}</p>
      </div>
      
      <div v-if="selectedDevices?.length > 0" class="devices-container">
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

    <div class="device-list-area">
      <DeviceList :multi-select="true" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import eventBus from '../../eventBus'
import DeviceList from '../../components/DeviceList.vue'

const date = ref('')
const selectedDevices = ref([])
const globalFetchError = ref(null)
const alarmData = ref([])
const totalRecords = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const loading = ref(false)

const shortcuts = [
  {
    text: '最近1小时',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setHours(start.getHours() - 1)
      return [start, end]
    }
  },
  {
    text: '今日',
    value: () => {
      const end = new Date()
      const start = new Date(new Date().setHours(0, 0, 0, 0))
      return [start, end]
    }
  },
  {
    text: '昨日',
    value: () => {
      const end = new Date(new Date().setHours(0, 0, 0, 0) - 1)
      const start = new Date(end)
      start.setDate(start.getDate() - 1)
      end.setHours(23, 59, 59, 999)
      return [start, end]
    }
  },
  {
    text: '最近7日',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 7)
      return [start, end]
    }
  },
  {
    text: '最近30日',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 30)
      return [start, end]
    }
  }
]

const handleDateChange = (dates) => {
  if (!dates || dates.length !== 2) return

  const [start, end] = dates
  const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24))

  if (diffDays > 30) {
    const newStart = new Date(end)
    newStart.setDate(newStart.getDate() - 30)
    newStart.setHours(0, 0, 0, 0)
    date.value = [newStart, end]

    ElMessage.warning({
      message: `时间范围超过30天，已自动调整为 ${newStart.toLocaleDateString()} 至 ${end.toLocaleDateString()}`,
      duration: 3000
    })
  }
}

const handleDevicesUpdate = (devices) => {
  selectedDevices.value = devices || []
}

const formatDateTime = (date) => {
  if (!date) return ''
  
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

const fetchAlarmData = async (resetPage = false) => {
  if (resetPage) currentPage.value = 1
  
  if (!selectedDevices.value?.length) {
    ElMessage.warning('请选择设备')
    return
  }
  
  if (!date.value?.[0] || !date.value?.[1]) {
    ElMessage.warning('请选择日期范围')
    return
  }
  
  const requestData = {
    deviceIds: selectedDevices.value.map(device => device.id),
    startTime: formatDateTime(date.value[0]),
    endTime: formatDateTime(date.value[1]),
    page: currentPage.value,
    pageSize: pageSize.value
  }
  
  try {
    loading.value = true
    globalFetchError.value = null
    
    const response = await fetch('/senser/deviceAlarmData', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    })
    
    if (!response.ok) {
      throw new Error(`服务器响应错误: ${response.status} ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (result.code === 1 && result.data) {
      alarmData.value = result.data.records || []
      totalRecords.value = result.data.total || 0
      ElMessage.success('报警数据获取成功')
    } else {
      throw new Error(result.msg || '获取报警数据失败')
    }
  } catch (error) {
    globalFetchError.value = `获取报警数据失败: ${error.message}`
    ElMessage.error(`获取报警数据失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

const handlePageChange = (page) => {
  currentPage.value = page
  fetchAlarmData(false)
}

const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  fetchAlarmData(false)
}

const groupedData = computed(() => {
  return alarmData.value.map(item => ({
    alarmTime: formatDateTime(item.startTime),
    deviceId: item.deviceId,
    nodeId: item.nodeId,
    alarmLevel: `${item.alarmLevel}级报警`,
    registerId: item.registerId,
    duration: `${formatDateTime(item.startTime)} 至 ${formatDateTime(item.endTime)}`
  }))
})

const tableColumns = computed(() => [
  { prop: 'alarmTime', label: '报警时间', width: '180' },
  { prop: 'deviceId', label: '设备ID', width: '100' },
  { prop: 'nodeId', label: '节点ID', width: '100' },
  { prop: 'alarmLevel', label: '报警等级', width: '100' },
  { prop: 'registerId', label: '寄存器ID', width: '100' },
  { prop: 'duration', label: '报警持续时间', minWidth: '300' }
])

onMounted(() => {
  eventBus.on('devices-updated', handleDevicesUpdate)
})

onUnmounted(() => {
  eventBus.off('devices-updated', handleDevicesUpdate)
})
</script>

<style scoped>
.alarm-data-layout {
  display: flex;
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
  position: relative;
}

.data-display-area::-webkit-scrollbar {
  display: none;
}

.data-display-area {
  -ms-overflow-style: none;
  scrollbar-width: none;
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
  color: #2c3e50;
  flex-shrink: 0;
  margin: 0 20px;
  border-bottom: 2px solid #3498db;
  padding-bottom: 10px;
  position: relative;
  z-index: 10;
  background-color: #ffffff;
}

.data-display-area-top {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;
  margin-bottom: 42px;
}

.devices-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex: 1;
  padding: 0 15px 15px;
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

.loading-data, 
.no-data {
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

.date-range-container {
  height: 32px;
  width: 550px;
  display: flex;
  position: absolute;
  top: 15px;
  left: calc(50% - 275px);
}

.button-area {
  height: 32px;
  display: flex;
  position: absolute;
  top: 15px;
  left: calc(50% + 280px);
}

:deep(.el-table__body-wrapper::-webkit-scrollbar),
:deep(.el-scrollbar__bar.is-vertical > div) {
  display: none;
  width: 0;
}

:deep(.el-table__body-wrapper) {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

:deep(.el-date-editor.el-input__wrapper) {
  width: 100%;
}

:deep(.el-date-editor--datetimerange.el-input__inner) {
  width: 100%;
  height: 32px;
  line-height: 32px;
}

:deep(.el-date-editor--datetimerange) {
  font-size: 12px;
}

:deep(.el-input__wrapper) {
  padding: 0 8px;
}

:deep(.el-range-separator) {
  padding: 0 4px;
}
</style>