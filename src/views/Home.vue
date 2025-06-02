<template>
  <div class="home-container">
    <TopBar :username="user.username" @logout="logout" />

    <SideBar :menuItems="menuItems" :activeIndex="activeMenuIndex" :activeSubIndex="activeSubMenuIndex"
      @menu-click="handleMenuChange" @toggle-submenu="toggleSubmenu" />

    <div class="main-content-area">
      <div v-if="$route.path === '/'" class="home-page-layout">
        <div class="home-row top-row">
          <div class="status-card total-devices">
            <div class="icon-container">
              <i class="fas fa-cogs"></i>
            </div>
            <div class="card-content">
              <div class="card-title">设备总数</div>
              <div class="card-value">{{ deviceStats.total }}</div>
            </div>
          </div>
          <div class="status-card online-devices">
            <div class="icon-container">
              <i class="fas fa-leaf"></i>
            </div>
            <div class="card-content">
              <div class="card-title">在线设备</div>
              <div class="card-value">{{ deviceStats.online }}</div>
            </div>
          </div>
          <div class="status-card alarm-devices">
            <div class="icon-container">
              <i class="fas fa-bell"></i>
            </div>
            <div class="card-content">
              <div class="card-title">报警设备</div>
              <div class="card-value">{{ deviceStats.alarm }}</div>
            </div>
          </div>
          <div class="status-card offline-devices">
            <div class="icon-container">
              <i class="fas fa-plug"></i>
            </div>
            <div class="card-content">
              <div class="card-title">离线设备</div>
              <div class="card-value">{{ deviceStats.offline }}</div>
            </div>
          </div>
        </div>
        <div class="home-row middle-row">
          <DeviceList class="home-component-placeholder middle-component-1" />
          <div class="home-component-placeholder middle-component-2">
            <el-amap :center="center" :zoom="zoom" @init="init" />
          </div>
          <DeviceInfo class="home-component-placeholder middle-component-3" :deviceId="selectedDeviceId" />
        </div>
        <div class="home-row bottom-row">
          <DeviceBlock v-if="selectedDeviceId && deviceData" class="home-component-placeholder full-width-component"
            :device="{ id: selectedDeviceId, deviceName: selectedDevice ? selectedDevice.deviceName : `设备${selectedDeviceId}` }" :device-data="deviceData"
            :loading="loading" @card-click="handleCardClick" />
          <div v-else class="home-component-placeholder full-width-component no-device-message">
            请稍候
          </div>
        </div>
      </div>
      <router-view v-else :key="$route.fullPath"></router-view>
    </div>
  </div>
</template>

<script>
import TopBar from '../components/TopBar.vue';
import SideBar from '../components/SideBar.vue';
import DeviceList from '../components/DeviceList.vue';
import DeviceInfo from '../components/DeviceInfo.vue';
import eventBus from '../eventBus';
import DeviceBlock from '../components/DeviceBlock.vue';
import { defineComponent } from "vue";
import { ElAmap } from "@vuemap/vue-amap";

export default {
  name: 'HomePage',
  components: {
    TopBar,
    SideBar,
    DeviceList,
    DeviceInfo,
    DeviceBlock,
    ElAmap
  },
  data() {
    return {
      user: {
        username: ''
      },
      zoom: 12,
      center: [109.461370137, 36.619032302],
      map: null,
      menuItems: [
        {
          name: '首页',
          path: '/',
          expanded: false
        },
        {
          name: '在线监控',
          expanded: false,
          children: [
            { name: '实时数据', path: '/monitor/realtime' }
          ]
        },
        {
          name: '数据中心',
          expanded: false,
          children: [
            { name: '历史数据', path: '/data/history' },
            { name: '报警数据', path: '/data/alarm' }
          ]
        },
        {
          name: '用户管理',
          path: '/management',
          expanded: false
        }
      ],
      activeMenuIndex: 0,
      activeSubMenuIndex: -1,
      deviceStats: {
        total: 6,
        online: 5,
        alarm: 0,
        offline: 1
      },
      selectedDeviceId: null,
      selectedDevice: null, 
      deviceData: null,
      loading: false,
    }
  },
  computed: {
    currentPageTitle() {
      const activeMenu = this.menuItems[this.activeMenuIndex];
      if (this.activeSubMenuIndex >= 0 && activeMenu?.children) {
        const subMenu = activeMenu.children[this.activeSubMenuIndex];
        return subMenu?.name || '';
      }
      return activeMenu?.name || '首页';
    },
    currentPagePath() {
      const activeMenu = this.menuItems[this.activeMenuIndex];
      if (this.activeSubMenuIndex >= 0 && activeMenu?.children) {
        const subMenu = activeMenu.children[this.activeSubMenuIndex];
        return `${activeMenu.name} > ${subMenu?.name || ''}`;
      }
      return activeMenu?.name || '首页';
    },
    isHomePage() {
      return this.$route.path === '/';
    }
  },
  methods: {
    init(map) {
      const marker = new AMap.Marker({
        position: [109.461370137, 36.619032302]
      });
      map.add(marker);
      this.map = map;
    },
    logout() {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.$router.push('/login');
    },
    handleMenuChange(parentIndex, subIndex) {
      this.activeMenuIndex = parentIndex;
      this.activeSubMenuIndex = subIndex;

      const menuItem = this.menuItems[parentIndex];
      let path = menuItem.path;

      if (subIndex >= 0 && menuItem.children) {
        path = menuItem.children[subIndex].path;
      }
      else if (menuItem.children && menuItem.children.length > 0 && subIndex === -1) {
        this.toggleSubmenu(parentIndex);
        return;
      }

      if (path && this.$route.path !== path) {
        this.$router.push(path);
      } else if (!path && subIndex === -1) {
        this.toggleSubmenu(parentIndex);
      }
    },
    toggleSubmenu(index) {
      if (!this.menuItems[index]) return;
      const wasExpanded = this.menuItems[index].expanded;
      this.menuItems.forEach((item, i) => {
        if (i !== index) {
          item.expanded = false;
        }
      });
      this.menuItems[index].expanded = !wasExpanded;
    },
    updateMenuState(currentPath) {
      let found = false;
      for (let i = 0; i < this.menuItems.length; i++) {
        const item = this.menuItems[i];
        if (item.path === currentPath && item.path === '/') {
          this.activeMenuIndex = i;
          this.activeSubMenuIndex = -1;
          this.menuItems.forEach((menu) => { menu.expanded = false; });
          found = true;
          break;
        }
        if (item.children) {
          for (let j = 0; j < item.children.length; j++) {
            if (item.children[j].path === currentPath) {
              this.activeMenuIndex = i;
              this.activeSubMenuIndex = j;
              this.menuItems.forEach((menu, idx) => { menu.expanded = (idx === i); });
              found = true;
              break;
            }
          }
        }
        if (found) break;
      }
      if (!found && currentPath === '/') {
        this.activeMenuIndex = this.menuItems.findIndex(item => item.path === '/');
        this.activeSubMenuIndex = -1;
        this.menuItems.forEach(item => item.expanded = false);
      }
    },
    fetchDeviceStats() {
      this.deviceStats = {
        total: 6,
        online: 5,
        alarm: 0,
        offline: 1
      };
    },
    handleDevicesUpdated(devices) {
      if (devices && devices.length > 0) {
        this.selectedDevice = devices[0];
        this.selectedDeviceId = devices[0].id;
        this.fetchDeviceData(devices[0].id);
        
        // 如果设备有位置信息，更新地图中心点
        if (devices[0].useMarkLocation === 1 && devices[0].lat && devices[0].lng) {
          this.center = [devices[0].lng, devices[0].lat];
          if (this.map) {
            // 更新地图标记点
            this.map.clearMap(); // 清除现有标记
            const marker = new AMap.Marker({
              position: [devices[0].lng, devices[0].lat]
            });
            this.map.add(marker);
            this.map.setCenter([devices[0].lng, devices[0].lat]);
          }
        }
      } else {
        this.selectedDevice = null;
        this.selectedDeviceId = null;
        this.deviceData = null;
      }
    },
    handleDeviceSelected(deviceId) {
      const device = this.findDeviceById(deviceId);
      this.selectedDevice = device;
      this.selectedDeviceId = deviceId;
      this.fetchDeviceData(deviceId);
    },
    async fetchDeviceData(deviceId) {
      if (!deviceId) return;

      this.loading = true;
      this.deviceData = null;

      try {
        const response = await fetch(`/senser/deviceData`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify([deviceId])
        });

        if (!response.ok) {
          throw new Error(`请求失败: ${response.status}`);
        }

        const result = await response.json();
        if (result.code === 1 && result.data && result.data.length > 0) {
          const deviceRawData = result.data[0];

          const values = {};
          if (deviceRawData.dataItems && Array.isArray(deviceRawData.dataItems)) {
            deviceRawData.dataItems.forEach(item => {
              values[item.functionName] = {
                value: item.value,
                unit: item.unit
              };
            });
          }

          this.deviceData = {
            deviceName: `设备${deviceRawData.deviceId || deviceId}`,
            status: deviceRawData.status === 1 ? '在线' : '离线',
            values: values
          };
        } else if (result.code !== 1) {
          throw new Error(result.msg || '获取设备数据失败');
        } else {
          console.warn('设备数据为空或格式不正确:', result);
          this.deviceData = {
            deviceName: `设备${deviceId}`,
            status: '未知',
            values: {}
          };
        }
      } catch (error) {
        console.error('获取设备数据错误:', error);
        this.deviceData = {
          deviceName: `设备${deviceId}`,
          status: '未知',
          values: {}
        };
      } finally {
        this.loading = false;
      }
    },
    handleCardClick(device, sensorName, valueObj) {
      console.log('卡片点击:', device, sensorName, valueObj);
    },
  },
  mounted() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      this.user = JSON.parse(userStr);
    } else {
      console.warn('未找到用户信息，可能处于测试模式');
      this.user.username = '测试用户';
    }
    this.updateMenuState(this.$route.path);
    this.fetchDeviceStats();

    eventBus.on('device-selected', this.handleDeviceSelected);
    eventBus.on('devices-updated', this.handleDevicesUpdated);

    if (this.$route.path === '/') {
      setTimeout(() => {
        eventBus.emit('select-device', 1);
      }, 500);
    }
  },
  beforeUnmount() {
    eventBus.off('device-selected', this.handleDeviceSelected);
    eventBus.off('devices-updated', this.handleDevicesUpdated);
  },
}
</script>

<style scoped>
/* 容器样式 */
.home-container {
  width: 100%;
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-top: 70px;
  box-sizing: border-box;
}

.main-content-area {
  margin-left: 200px;
  height: calc(100vh - 70px);
  width: calc(100% - 200px);
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
}

.home-page-layout {
  width: 100%;
  height: 100%;
  padding: 8px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 行样式 */
.home-row {
  width: 100%;
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.top-row {
  height: 90px;
}

.middle-row {
  height: 380px;
}

.bottom-row {
  height: calc(100% - 490px);
}

/* 组件占位符样式 */
.top-row .home-component-placeholder,
.middle-row .home-component-placeholder,
.bottom-row .home-component-placeholder.full-width-component {
  background-color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  box-sizing: border-box;
}

/* 中间行组件样式 */
.middle-row .middle-component-1 {
  flex: 2;
}

.middle-row .middle-component-2 {
  flex: 5;
}

.middle-row .middle-component-3 {
  flex: 3;
}

.el-vue-amap-container {
  width: 100%;
}

/* 底部行组件样式 */
.bottom-row .home-component-placeholder.full-width-component {
  height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  border-radius: 4px;
  box-sizing: border-box;
  width: 100%;
  flex-grow: 1;
  padding: 0;
  flex-shrink: 0;
  min-height: 100%;
  overflow: hidden;
}

.no-device-message {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  color: #6c757d;
  font-size: 16px;
  background-color: #ffffff;
  border-radius: 8px;
  width: 100%;
  height: 100%;
  padding: 15px;
  box-sizing: border-box;
}

.bottom-row .full-width-component>.device-block {
  margin: 0;
}

.full-width-component>* {
  overflow-y: auto;
}

/* 状态卡片样式 */
.status-card {
  flex: 1;
  background-color: #ffffff;
  border-radius: 8px;
  padding: 15px;
  display: flex;
  align-items: center;
  gap: 15px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  height: 100%;
  box-sizing: border-box;
}

.status-card:last-child {
  margin-right: 0;
}

.icon-container {
  font-size: 28px;
  margin-right: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  color: white;
}

.card-title {
  font-size: 16px;
  margin-bottom: 5px;
}

.card-value {
  font-size: 24px;
  font-weight: bold;
}

/* 状态卡片颜色 */
.total-devices {
  background-color: #1890ff;
}

.online-devices {
  background-color: #52c41a;
}

.alarm-devices {
  background-color: #fa8c16;
}

.offline-devices {
  background-color: #434343;
}

/* 地图相关样式 */
.map-page-container {
  height: 85%;
  position: relative;
}

.toolbar {
  margin-top: 10px;
  display: flex;
  justify-content: center;
}

.toolbar button {
  padding: 8px 16px;
  background-color: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
}


.toolbar button:hover {
  background-color: #40a9ff;
}

/* 确保地图容器内的高德地图组件能够正常显示 */
.map-page-container .el-amap {
  width: 100%;
  height: 100%;
}
</style>