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
          <!-- 修改前 -->
          <!-- <div class="home-component-placeholder middle-component-2">组件6</div> -->
          <!-- 修改后 -->
          <div class="home-component-placeholder middle-component-2">
            <el-amap :center="center" :zoom="zoom" @init="init" />
          </div>
          <DeviceInfo class="home-component-placeholder middle-component-3" :deviceId="selectedDeviceId" />
        </div>
        <!-- 下面一行：1个组件 -->
        <div class="home-row bottom-row">
          <DeviceBlock v-if="selectedDeviceId && deviceData" class="home-component-placeholder full-width-component"
            :device="{ id: selectedDeviceId, deviceName: selectedDevice ? selectedDevice.deviceName : `设备${selectedDeviceId}` }" :device-data="deviceData"
            :loading="loading" @card-click="handleCardClick" />
          <div v-else class="home-component-placeholder full-width-component no-device-message">
            请稍候
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
      console.log('map init: ', map)
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
        this.selectedDevice = devices[0]; // 保存完整的设备对象
        this.selectedDeviceId = devices[0].id;
        this.fetchDeviceData(devices[0].id);
      } else {
        this.selectedDevice = null;
        this.selectedDeviceId = null;
        this.deviceData = null;
      }
    },
    handleDeviceSelected(deviceId) {
      // 从设备列表中查找完整的设备对象
      const device = this.findDeviceById(deviceId);
      this.selectedDevice = device;
      this.selectedDeviceId = deviceId;
      this.fetchDeviceData(deviceId);
    },
    
    // 添加一个辅助方法来查找设备
    findDeviceById(deviceId) {
    // 这里需要访问设备列表
    // 如果没有直接访问设备列表的方式，可以考虑在DeviceList组件中
    // 添加一个方法，通过eventBus提供设备信息
    return null; // 临时返回null，实际实现需要根据项目结构调整
    },
    async fetchDeviceData(deviceId) {
      if (!deviceId) return;

      this.loading = true;
      this.deviceData = null;

      try {
        // 向后端发送请求获取设备数据
        const response = await fetch(`/senser/deviceData`, { // 修改了URL
          method: 'POST', // 修改了请求方法
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json' // 添加了Content-Type
          },
          body: JSON.stringify([deviceId]) // 修改了请求体
        });

        if (!response.ok) {
          throw new Error(`请求失败: ${response.status}`);
        }

        const result = await response.json();
        if (result.code === 1 && result.data && result.data.length > 0) {
          const deviceRawData = result.data[0]; // 获取数组中的第一个设备数据

          // 将 dataItems 转换为 DeviceBlock期望的 values 对象
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
            // 注意：API响应中没有deviceName，这里我们先用deviceId构造一个
            // 您可能需要根据实际情况调整deviceName的来源
            deviceName: `设备${deviceRawData.deviceId || deviceId}`,
            status: deviceRawData.status === 0 ? '在线' : '离线', // 假设 status 0 是在线
            values: values // 转换后的传感器数据
          };
        } else if (result.code !== 1) {
          throw new Error(result.msg || '获取设备数据失败');
        } else {
          // code为1但data为空或不存在的情况
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
        // 通过eventBus选择设备，这样可以获取完整的设备对象
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
  /* overflow: hidden; // 移除或注释掉，以允许内容滚动（如果需要） */
  display: flex;
  /* 改为flex布局 */
  flex-direction: column;
  /* 垂直排列 */
  gap: 8px;
  /* 行之间的间距 */
}

.home-row {
  width: 100%;
  /* 宽度占满 */
  /* position: absolute; // 移除绝对定位 */
  /* left: 8px; // 移除 */
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  /* 防止行在空间不足时收缩 */
}

.top-row {
  /* top: 8px; // 移除绝对定位相关的top */
  height: 90px;
}

.middle-row {
  /* top: 106px; // 移除绝对定位相关的top */
  height: 380px;
}

.el-vue-amap-container {
  width: 100%;
}

.bottom-row {
  /* top: 494px; // 移除绝对定位相关的top */
  /* height: 400px;  */
  /* flex-grow: 1; */
  /* 占据剩余的垂直空间 */
  /* display: flex; */
  height: calc(100% - 490px);
  /* 使其子元素也能使用flex布局 */


}

.top-row .home-component-placeholder,
.middle-row .home-component-placeholder,
.bottom-row .home-component-placeholder.full-width-component {

  background-color: white;
  display: flex;
  align-items: center;
  /* 恢复/保持 垂直居中 */
  justify-content: center;
  /* 恢复/保持 水平居中 */
  border-radius: 4px;
  box-sizing: border-box;
}

/* 单独为 middle-row 的组件设置宽度，如果需要的话 */
.middle-row .middle-component-1 {
  flex: 2;
  /* 示例：可以根据需要调整flex属性 */
}

.middle-row .middle-component-2 {
  flex: 5;
}

.middle-row .middle-component-3 {
  flex: 3;
}


.bottom-row .home-component-placeholder.full-width-component {
  height: 100%;
  /* background-color: #e9ecef; */
  /* 可以移除，让DeviceBlock自己的背景生效 */
  /* border: 1px solid #ced4da; */
  /* 可以移除，让DeviceBlock自己的边框生效 */
  display: flex;
  align-items: flex-start;
  /* 左上对齐：交叉轴起点 */
  justify-content: flex-start;
  /* 左上对齐：主轴起点 */
  border-radius: 4px;
  /* 可以保留或移除，取决于是否希望这个容器有圆角 */
  box-sizing: border-box;
  width: 100%;
  flex-grow: 1;
  padding: 0;
  /* 确保DeviceBlock可以贴边 */
  flex-shrink: 0;
  /* 防止内容压缩 */
  min-height: 100%;
  /* 最小高度保持容器高度 */
  overflow: hidden;
  /* 隐藏溢出内容 */
}

.no-device-message {
  display: flex;
  align-items: flex-start;
  /* 左上对齐：交叉轴起点 */
  justify-content: flex-start;
  /* 左上对齐：主轴起点 */
  color: #6c757d;
  font-size: 16px;
  background-color: #ffffff;
  /* 保持或根据设计调整 */
  border-radius: 8px;
  /* 保持或根据设计调整 */
  /* box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); */
  /* 可以考虑移除或调整，避免与DeviceBlock样式冲突 */
  width: 100%;
  height: 100%;
  padding: 15px;
  /* 为文字提供一些内边距 */
  box-sizing: border-box;
}

/* 可选：确保DeviceBlock组件本身没有外边距，如果它有的话 */
.bottom-row .full-width-component>.device-block {
  margin: 0;
}

/* 其他样式，如 .status-card 等保持不变 */
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
  /* 确保status-card填满top-row的高度 */
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

.data-cards-header {
  /* 保持原有样式不做修改 */
  flex-shrink: 0;
  /* 防止header被压缩 */
}

.full-width-component>* {
  /* width: 100%; */
  /* height: 100%; */
  overflow-y: auto;
  /* 允许内容滚动 */
}

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
  cursor: pointer;
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
