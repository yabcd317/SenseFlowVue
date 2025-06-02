<template>
  <div class="device-info-container">
    <h4 class="device-info-title">设备信息</h4>
    
    <div v-if="loading" class="loading-indicator">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>
    
    <div v-else-if="error" class="error-message">
      <p>{{ error }}</p>
    </div>
    
    <div v-else-if="deviceInfo" class="device-info-content">
      <div class="info-item">
        <span class="info-label">设备名称：</span>
        <span class="info-value">{{ deviceInfo.deviceName }}</span>
      </div>
      
      <div class="info-item">
        <span class="info-label">设备地址：</span>
        <span class="info-value">{{ deviceInfo.address }}</span>
      </div>
      
      <div class="info-item">
        <span class="info-label">所属区域：</span>
        <span class="info-value">{{ getAreaName() }}</span>
      </div>
      
      <div class="info-item">
        <span class="info-label">报警数据：</span>
        <span class="info-value">{{ deviceInfo.alarmRecord === 1 ? '开启' : '关闭' }}</span>
      </div>
      
      <div class="info-item">
        <span class="info-label">报警类型：</span>
        <span class="info-value">{{ getAlarmType() }}</span>
      </div>
      
      <div class="info-item">
        <span class="info-label">标记位置：</span>
        <span class="info-value">{{ deviceInfo.useMarkLocation === 1 ? '是' : '否' }}</span>
      </div>
      
      <div class="info-item">
        <span class="info-label">离线判断间隔：</span>
        <span class="info-value">{{ deviceInfo.offlineInterval }} 分钟</span>
      </div>
      
      <div class="info-item">
        <span class="info-label">保存数据间隔：</span>
        <span class="info-value">{{ deviceInfo.saveDataInterval }} 分钟</span>
      </div>
      
      <div class="info-item">
        <span class="info-label">设备状态：</span>
        <span :class="['status-value', deviceInfo.status === 1 ? 'status-online' : 'status-offline']">
          {{ deviceInfo.status === 1 ? '在线' : '离线' }}
        </span>
      </div>
    </div>
    
    <div v-else class="no-device-selected">
      <p>请选择一个设备查看详细信息</p>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue';
import eventBus from '../eventBus';

export default {
  name: 'DeviceInfo',
  props: {
    deviceId: {
      type: [Number, String],
      default: null
    }
  },
  setup(props) {
    const deviceInfo = ref(null);
    const loading = ref(false);
    const error = ref(null);
    
    // 获取设备详细信息
    const fetchDeviceInfo = async (id) => {
      if (!id) {
        deviceInfo.value = null;
        return;
      }
      
      loading.value = true;
      error.value = null;
      
      try {
        // 发送请求获取设备详情
        const response = await fetch(`/senser/deviceInfo/${id}`);
        
        if (!response.ok) {
          throw new Error(`获取设备信息失败: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.code === 1 && result.data) {
          deviceInfo.value = result.data;
        } else {
          throw new Error(result.msg || '获取设备信息失败');
        }
      } catch (err) {
        console.error('获取设备信息时发生错误:', err);
        error.value = err.message || '获取设备信息失败';
        deviceInfo.value = null;
      } finally {
        loading.value = false;
      }
    };
    
    // 获取报警类型文本
    const getAlarmType = () => {
      if (!deviceInfo.value) return '未知';
      
      const alarmSwitch = deviceInfo.value.alarmSwitch;
      
      switch (alarmSwitch) {
        case 0:
          return '无报警';
        case 1:
          return '上限报警';
        case 2:
          return '下限报警';
        case 3:
          return '上下限报警';
        default:
          return '未知类型';
      }
    };
    
    // 获取区域名称（示例函数，实际应从后端获取或映射）
    const getAreaName = () => {
      // 这里可以根据实际情况从后端获取区域信息
      // 或者使用本地映射表将设备ID映射到区域名称
      return '默认区域'; // 示例返回值
    };
    
    // 监听设备选择事件
    const handleDeviceSelected = (devices) => {
      if (devices && devices.length > 0) {
        fetchDeviceInfo(devices[0].id);
      } else {
        deviceInfo.value = null;
      }
    };
    
    // 监听 props 中的 deviceId 变化
    watch(() => props.deviceId, (newId) => {
      if (newId) {
        fetchDeviceInfo(newId);
      } else {
        deviceInfo.value = null;
      }
    });
    
    onMounted(() => {
      // 监听设备选择事件
      eventBus.on('devices-updated', handleDeviceSelected);
      
      // 如果初始化时已有 deviceId，则获取设备信息
      if (props.deviceId) {
        fetchDeviceInfo(props.deviceId);
      }
    });
    
    return {
      deviceInfo,
      loading,
      error,
      getAlarmType,
      getAreaName
    };
  }
}
</script>

<style scoped>
.device-info-container {
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: auto;
}

.device-info-title {
  margin-top: 0;
  margin-bottom: 16px;
  color: #333;
  font-size: 18px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.device-info-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: center;
}

.info-label {
  width: 120px;
  color: #666;
  font-size: 14px;
  flex-shrink: 0;
}

.info-value {
  color: #333;
  font-size: 14px;
  font-weight: 500;
}

.status-value {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.status-online {
  background-color: #e6f7ff;
  color: #1890ff;
  border: 1px solid #91d5ff;
}

.status-offline {
  background-color: #fff2f0;
  color: #ff4d4f;
  border: 1px solid #ffccc7;
}

.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.loading-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  color: #ff4d4f;
  padding: 10px;
  background-color: #fff2f0;
  border-radius: 4px;
  margin: 10px 0;
}

.no-device-selected {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
  font-style: italic;
}
</style>