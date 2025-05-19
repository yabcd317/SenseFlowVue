<template>
  <div class="home-container">
    <TopBar :username="user.username" @logout="logout" />

    <SideBar :menuItems="menuItems" :activeIndex="activeMenuIndex" :activeSubIndex="activeSubMenuIndex"
      @menu-click="handleMenuChange" @toggle-submenu="toggleSubmenu" />

    <!-- 主内容区域 -->
    <div class="main-content-area">
      <!-- 检查是否是首页路径，如果是，则显示特定布局 -->
      <div v-if="$route.path === '/'" class="home-page-layout">
        <!-- 最上面一行：4个组件 -->
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
        <!-- 中间一行：3个组件 -->
        <div class="home-row middle-row">
          <DeviceList class="home-component-placeholder middle-component-1" />
          <div class="home-component-placeholder middle-component-2">组件6</div>
          <DeviceInfo class="home-component-placeholder middle-component-3" :deviceId="selectedDeviceId" />
        </div>
        <!-- 下面一行：1个组件 -->
        <div class="home-row bottom-row">
          <DeviceBlock v-if="selectedDeviceId && deviceData" class="home-component-placeholder full-width-component"
            :device="{ id: selectedDeviceId, deviceName: deviceData.deviceName || '设备' }" :device-data="deviceData"
            :loading="loading" @card-click="handleCardClick" />
          <div v-else class="home-component-placeholder full-width-component no-device-message">
            请从设备列表中选择一个设备
          </div>
        </div>
      </div>
      <!-- 其他路由的视图 -->
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

export default {
  name: 'HomePage',
  components: {
    TopBar,
    SideBar,
    DeviceList,
    DeviceInfo,
    DeviceBlock,
  },
  data() {
    return {
      user: {
        username: ''
      },
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

      console.log('导航到:', path);
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
      // 这里可以添加从API获取设备统计数据的逻辑
      // 暂时使用静态数据
      this.deviceStats = {
        total: 6,
        online: 5,
        alarm: 0,
        offline: 1
      };
    },
    handleDevicesUpdated(devices) {
      if (devices && devices.length > 0) {
        this.selectedDeviceId = devices[0].id;
        this.fetchDeviceData(devices[0].id);
      } else {
        this.selectedDeviceId = null;
        this.deviceData = null;
      }
    },
    handleDeviceSelected(deviceId) {
      this.selectedDeviceId = deviceId;
      this.fetchDeviceData(deviceId);
    },
    async fetchDeviceData(deviceId) {
      if (!deviceId) return;

      this.loading = true;
      this.deviceData = null;

      try {
        const response = await fetch(`/sense/device/data?deviceId=${deviceId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error(`请求失败: ${response.status}`);
        }

        const result = await response.json();
        if (result.code === 1) {
          this.deviceData = {
            deviceName: result.data.deviceName || `设备${deviceId}`,
            status: result.data.online ? '在线' : '离线',
            values: result.data.values || {}
          };
        } else {
          throw new Error(result.msg || '获取设备数据失败');
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
      // 这里可以添加显示详细信息的逻辑，例如打开模态框等
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
        this.selectedDeviceId = 1;
        eventBus.emit('select-device', 1);
        this.fetchDeviceData(1);
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
  overflow: hidden;
  position: relative;
}

.home-row {
  width: calc(100% - 16px);
  position: absolute;
  left: 8px;
  display: flex;
  gap: 8px;
}

.top-row {
  top: 8px;
  height: 90px;
}

.middle-row {
  top: 106px;
  height: 380px;
}

.bottom-row {
  top: 494px;
  height: 130px;
}

.top-row .home-component-placeholder,
.middle-row .home-component-placeholder,
.bottom-row .home-component-placeholder.full-width-component {
  height: 100%;
  background-color: #e9ecef;
  border: 1px solid #ced4da;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  box-sizing: border-box;
}

.middle-row .home-component-placeholder {
  background-color: #dee2e6;
}

.middle-row .middle-component-1 {
  width: 20%;
  overflow: hidden;
}

.middle-row .middle-component-2 {
  width: 40%;
}

.middle-row .middle-component-3 {
  width: 40%;
}

.bottom-row .home-component-placeholder.full-width-component {
  width: 100%;
  background-color: #DEE2E6;
}

.status-card {
  width: 25%;
  height: 100%;
  border-radius: 4px;
  display: flex;
  align-items: center;
  color: white;
  padding: 0 15px;
  box-sizing: border-box;
  margin-right: 8px;
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
}

.card-title {
  font-size: 16px;
  margin-bottom: 5px;
}

.card-value {
  font-size: 24px;
  font-weight: bold;
}

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

.no-device-message {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6c757d;
  font-size: 16px;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
</style>