<template>
  <div class="historical-data-layout">
    <!-- 左侧数据展示区域 -->
    <div class="data-display-area">
      <div class="data-display-area-top">
        <!-- 设备因子选择区域 -->
        <div class="factor-tags-container">
          <el-select v-model="selectedFactors" multiple collapse-tags :max-collapse-tags="1" placeholder="请选择监测因子"
            style="width: 100%" class="single-line-select">
            <div
              style="display: flex; justify-content: space-between; padding: 5px 12px; border-bottom: 1px solid #EBEEF5;">
              <el-checkbox v-model="checkAll" :indeterminate="isIndeterminate" @change="handleCheckAll">
                全选
              </el-checkbox>
              <el-button size="small" @click="clearSelection" type="text">清空</el-button>
            </div>
            <el-option v-for="factor in deviceFactors" :key="factor.factorId"
              :label="`${selectedDevices[0]?.deviceName}-${factor.name}`" :value="factor.factorId" />
          </el-select>
        </div>

        <!-- 日期范围选择器 -->
        <div class="date-range-container">
          <el-date-picker v-model="date" type="datetimerange" unlink-panels range-separator="-" start-placeholder="开始日期"
            end-placeholder="结束日期" :shortcuts="shortcuts" @change="handleDateChange" />
        </div>

        <!-- 按钮区域 -->
        <div class="button-area">
          <el-button type="primary" @click="() => fetchHistoricalData(true)">查询</el-button>
        </div>
      </div>
      <div class="historical-data-title">
        <h2>历史数据查询</h2>
      </div>
      <div v-if="globalFetchError" class="global-error-message">
        <p>{{ globalFetchError }}</p>
      </div>

      <div v-if="selectedDevices && selectedDevices.length > 0" class="devices-container">
        <!-- 历史数据展示区域 -->
        <div class="history-data-container">
          <div v-if="loading" class="loading-data">
            <el-icon class="is-loading">
              <Loading />
            </el-icon>
            <span>加载数据中...</span>
          </div>
          <div v-else-if="historyData.length === 0" class="no-data">
            <p>暂无历史数据，请调整查询条件后重试</p>
          </div>
          <div v-else class="data-table-wrapper">
            <el-table :data="groupedData" border style="width: 100%">
              <el-table-column v-for="column in tableColumns" :key="column.prop" :prop="column.prop"
                :label="column.label" :width="column.width" :min-width="column.minWidth" :fixed="column.fixed" />
            </el-table>

            <div class="pagination-container">
              <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize"
                :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next, jumper" :total="totalRecords"
                @size-change="handleSizeChange" @current-change="handlePageChange" />
            </div>
          </div>
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

<script setup>
import { ref, reactive, onMounted, onUnmounted, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import eventBus from '../../eventBus'
import DeviceList from '../../components/DeviceList.vue'

// 响应式数据
const date = ref('')
const selectedDevices = ref([])
const globalFetchError = ref(null)
const deviceFactors = ref([])
const selectedFactors = ref([])
const loadingFactors = ref(false)
const checkAll = ref(false)
const isIndeterminate = ref(false)
const historyData = ref([])
const totalRecords = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const loading = ref(false)

// 日期快捷选项
const shortcuts = [
  {
    text: '最近1小时',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setHours(start.getHours() - 1)
      return [start, end]
    },
  },
  {
    text: '今日',
    value: () => {
      const end = new Date()
      const start = new Date(new Date().setHours(0, 0, 0, 0))
      return [start, end]
    },
  },
  {
    text: '昨日',
    value: () => {
      const end = new Date(new Date().setHours(0, 0, 0, 0) - 1)
      const start = new Date(end)
      start.setDate(start.getDate() - 1)
      end.setHours(23, 59, 59, 999)
      return [start, end]
    },
  },
  {
    text: '最近7日',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 7)
      return [start, end]
    },
  },
  {
    text: '最近30日',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 30)
      return [start, end]
    },
  },
]

// 日期变化处理
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

// 全选处理
const handleCheckAll = (val) => {
  selectedFactors.value = val ? deviceFactors.value.map(factor => factor.factorId) : []
  isIndeterminate.value = false
}

// 清空选择
const clearSelection = () => {
  selectedFactors.value = []
  checkAll.value = false
  isIndeterminate.value = false
}

// 监听选中因子变化
watch(selectedFactors, (newFactors) => {
  console.log('[HistoricalData] 选中的因子已更新:', newFactors)

  if (deviceFactors.value.length > 0) {
    const checkedCount = newFactors.length
    checkAll.value = checkedCount === deviceFactors.value.length
    isIndeterminate.value = checkedCount > 0 && checkedCount < deviceFactors.value.length
  }
})

// 获取设备因子数据
const fetchDeviceFactors = async (deviceId) => {
  if (!deviceId) return

  loadingFactors.value = true
  deviceFactors.value = []
  selectedFactors.value = []
  checkAll.value = false
  isIndeterminate.value = false

  try {
    console.log(`[HistoricalData] 获取设备 ${deviceId} 的监测因子...`)
    const response = await fetch(`/senser/deviceFactors/${deviceId}`)

    if (!response.ok) {
      throw new Error(`服务器响应错误: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()

    if (result.code === 1 && result.data) {
      console.log('[HistoricalData] 成功获取设备因子数据:', result.data)
      deviceFactors.value = result.data

      if (result.data.length > 0) {
        isIndeterminate.value = true
      }
    } else {
      throw new Error(result.msg || '获取设备因子数据失败')
    }
  } catch (error) {
    console.error('[HistoricalData] 获取设备因子失败:', error)
    globalFetchError.value = `获取监测因子失败: ${error.message}`
  } finally {
    loadingFactors.value = false
  }
}

// 处理设备更新事件
const handleDevicesUpdate = (devices) => {
  console.log('[HistoricalData] Received devices-updated event:', devices)
  selectedDevices.value = devices || []

  if (selectedDevices.value.length > 0) {
    const firstDeviceId = selectedDevices.value[0].id
    fetchDeviceFactors(firstDeviceId)
  } else {
    deviceFactors.value = []
    selectedFactors.value = []
    checkAll.value = false
    isIndeterminate.value = false
  }
}

// 格式化日期时间
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

// 获取历史数据
const fetchHistoricalData = async (resetPage = false) => {
  if (resetPage) {
    currentPage.value = 1
  }

  if (!selectedDevices.value || selectedDevices.value.length === 0) {
    ElMessage.warning('请选择设备')
    return
  }

  if (!selectedFactors.value || selectedFactors.value.length === 0) {
    ElMessage.warning('请选择监测因子')
    return
  }

  if (!date.value || !date.value[0] || !date.value[1]) {
    ElMessage.warning('请选择日期范围')
    return
  }

  const deviceId = selectedDevices.value[0].id
  const startTime = formatDateTime(date.value[0])
  const endTime = formatDateTime(date.value[1])

  const factorCount = selectedFactors.value.length
  const adjustedPage = Math.ceil(currentPage.value / factorCount) || 1
  const adjustedPageSize = pageSize.value * factorCount

  const requestData = {
    deviceId: deviceId,
    factorIds: selectedFactors.value,
    startTime: startTime,
    endTime: endTime,
    page: adjustedPage,
    pageSize: adjustedPageSize
  }

  console.log('发送历史数据请求:', requestData)

  try {
    loading.value = true
    globalFetchError.value = null
    const response = await fetch('/senser/deviceHistoryData', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })

    if (!response.ok) {
      throw new Error(`服务器响应错误: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()

    if (result.code === 1 && result.data) {
      console.log('[HistoricalData] 成功获取历史数据:', result.data)
      historyData.value = result.data.records || []
      totalRecords.value = Math.ceil((result.data.total || 0) / factorCount)
      ElMessage.success('历史数据获取成功')
    } else {
      throw new Error(result.msg || '获取历史数据失败')
    }
  } catch (error) {
    console.error('[HistoricalData] 获取历史数据失败:', error)
    globalFetchError.value = `获取历史数据失败: ${error.message}`
    ElMessage.error(`获取历史数据失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// 分页处理
const handlePageChange = (page) => {
  currentPage.value = page
  fetchHistoricalData(false)
}

const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  fetchHistoricalData(false)
}

// 生命周期钩子
onMounted(() => {
  console.log('[HistoricalData] Component mounted, listening for devices-updated event.')
  eventBus.on('devices-updated', handleDevicesUpdate)
})

onUnmounted(() => {
  console.log('[HistoricalData] Component unmounted, removing devices-updated listener.')
  eventBus.off('devices-updated', handleDevicesUpdate)
})

// 计算属性 - 重组数据按时间和因子
const groupedData = computed(() => {
  if (!historyData.value || historyData.value.length === 0) return []

  const timePoints = [...new Set(historyData.value.map(item => item.recordTimeStr))]
  timePoints.sort()

  const uniqueFactors = [...new Set(historyData.value.map(item => item.factorName))]

  const dataMap = {}
  historyData.value.forEach(item => {
    if (!dataMap[item.recordTimeStr]) {
      dataMap[item.recordTimeStr] = {}
    }
    dataMap[item.recordTimeStr][item.factorName] = {
      value: item.text,
      unit: item.unit
    }
  })

  return timePoints.map(time => {
    const row = { recordTimeStr: time }

    uniqueFactors.forEach(factor => {
      const data = dataMap[time] && dataMap[time][factor]
      row[factor] = data ? `${data.value} ${data.unit}` : '-'
    })

    return row
  })
})

// 计算属性 - 生成表格列配置
const tableColumns = computed(() => {
  if (!historyData.value || historyData.value.length === 0) return []

  const uniqueFactors = [...new Set(historyData.value.map(item => item.factorName))]

  const columns = [
    {
      prop: 'recordTimeStr',
      label: '记录时间',
      width: '180px',
      fixed: 'left'
    }
  ]

  uniqueFactors.forEach(factor => {
    columns.push({
      prop: factor,
      label: factor,
      minWidth: '120px'
    })
  })

  return columns
})
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

.historical-data-title {
  color: #2c3e50;
  margin: 0 20px;
  border-bottom: 2px solid #3498db;
  padding-bottom: 10px;
  position: relative;
  z-index: 10;
  background-color: #ffffff;
  flex-shrink: 0;
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

.history-data-container {
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

.factor-tags-container {
  position: absolute;
  top: 15px;
  left: 15px;
  z-index: 100;
  max-height: 48px;
  width: calc(50% - 275px - 30px);
  overflow: hidden;
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

:deep(.el-table__body-wrapper::-webkit-scrollbar) {
  display: none;
}

:deep(.el-table__body-wrapper) {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

:deep(.el-scrollbar__bar.is-vertical>div) {
  width: 0;
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