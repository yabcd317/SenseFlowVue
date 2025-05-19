<template>
  <div class="device-block">
    <!-- 设备标题 -->
    <div class="device-header">
      <h3>{{ device.deviceName }}</h3>
      <span :class="['status-indicator', deviceData?.status === '在线' ? 'online' : 'offline']">
        {{ deviceData?.status || '未知' }}
      </span>
    </div>

    <div v-if="loading" class="loading-indicator">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>
    <!-- 设备数据卡片横向排列 -->
    <div v-else-if="deviceData && deviceData.values" class="data-cards-row">
      <div v-for="(value, key) in deviceData.values" :key="`${device.id}-${key}`" class="data-card"
        @click="onCardClick(key, value)">
        <div :class="['card-icon', deviceData?.status === '离线' ? 'card-icon-offline' : '']">
          <i class="sensor-icon"></i>
        </div>
        <div class="card-content">
          <div class="card-title-line">
            <h4 class="card-title">{{ key }}</h4>
            <p class="card-unit">{{ value.unit }}</p>
          </div>
          <p :class="['card-value', deviceData?.status === '离线' ? 'card-value-offline' : '']">
            {{ formatValueDisplay(value.value) }}
          </p>
        </div>
      </div>
    </div>
    <div v-else class="no-data-message">
      <p>暂无数据</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DeviceBlock',
  props: {
    device: {
      type: Object,
      required: true
    },
    deviceData: {
      type: Object,
      default: null
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    formatValueDisplay(value) {
      if (value === undefined || value === null) return 'N/A';
      return value;
    },
    onCardClick(sensorName, valueObj) {
      this.$emit('card-click', this.device, sensorName, valueObj);
    }
  }
}
</script>

<style scoped>
/* 设备区块 */
.device-block {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding-bottom: 20px;
  border-bottom: 1px dashed #e0e0e0;
  width: 100%; /* 新增：使DeviceBlock本身撑满其容器宽度 */
}

.device-block:last-child {
  border-bottom: none;
}

/* 设备标题 */
.device-header {
  margin: 10px 20px; /* 外部间距 */
  width: 98%; /* 设置宽度为100% */
  box-sizing: border-box; /* 确保padding和border不影响总宽度 */
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 10px 15px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border-left: 4px solid #3498db;
  gap: 10px;
  max-height: 50px;

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
  gap: 8px;
  padding: 0 20px;

}

.data-card {
  flex: 0 0 325px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 0;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  height: 80px;
  display: flex;
  flex-direction: row;
  align-items: center;
}

.data-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
}

.card-icon {
  width: 60px;
  height: 100%;
  background-color: #4CAF50;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-icon-offline {
  background-color: #ff4d4f;
}

.sensor-icon {
  width: 24px;
  height: 24px;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2zm0 8h2v2h-2zm0 8h2v2h-2z"/></svg>');
  background-repeat: no-repeat;
  background-position: center;
}

.card-content {
  display: flex;
  flex-direction: column;
  padding: 15px;
  flex-grow: 1;
  justify-content: center;
}

.card-title-line {
  display: flex;
  align-items: baseline;
  gap: 5px;
}

.card-title {
  font-size: 16px;
  color: #666;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
}

.card-value {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  line-height: 1.2;
  color: #4CAF50;
}

.card-value-offline {
  color: #ff4d4f;
}

.card-unit {
  font-size: 14px;
  color: #999;
  margin: 0;
  white-space: nowrap;
  flex-shrink: 0;
}

/* 加载指示器样式 */
.loading-indicator {
  flex: 1;
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
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #6c757d;
  text-align: center;
}
</style>