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
          <DeviceBlock 
            v-if="selectedDeviceId && selectedDevice" 
            class="home-component-placeholder full-width-component" 
            :device="selectedDevice"
            :device-data="{ status: selectedDevice.online ? '在线' : '离线', values: {} }"
            :loading="false"
          />
          <div v-else class="home-component-placeholder full-width-component">请选择一个设备</div>
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
import DeviceList from '../components/DeviceList.vue'; // 修改引用名称
import DeviceInfo from '../components/DeviceInfo.vue'; 
import DeviceBlock from '../components/DeviceBlock.vue'; // 添加 DeviceBlock 组件引用
import eventBus from '../eventBus';

export default {
  name: 'HomePage',
  components: {
    TopBar,
    SideBar,
    DeviceList, // 修改组件注册名称
    DeviceInfo,
    DeviceBlock, // 注册 DeviceBlock 组件
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
      // 添加设备统计数据
      deviceStats: {
        total: 6,
        online: 5,
        alarm: 0,
        offline: 1
      },
      // 添加选中的设备ID和设备信息
      selectedDeviceId: null,
      selectedDevice: null
    }
  },
  // 移除 provide 函数
  computed: {
    // 移除 showDeviceList 计算属性
    // showDeviceList() { ... }

    // 保留其他计算属性
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
    // isHomePage 依赖的 .content 已移除，可以考虑是否保留此计算属性
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
        this.$router.push(path); // 恢复路由跳转
        // console.warn(`路由跳转被阻止，因为 router-view 已移除。目标路径: ${path}`); // 移除警告
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
    // 更新事件处理器，现在 Home 不再存储选中状态
    // handleGlobalDeviceSelected(devices) { ... },
    updateMenuState(currentPath) {
      let found = false;
      for (let i = 0; i < this.menuItems.length; i++) {
        const item = this.menuItems[i];
        if (item.path === currentPath && item.path === '/') {
          this.activeMenuIndex = i;
          this.activeSubMenuIndex = -1;
          this.menuItems.forEach((menu, idx) => { menu.expanded = false; });
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
    // 添加获取设备统计数据的方法
    fetchDeviceStats() {
      // 这里可以添加从API获取设备统计数据的逻辑
      // 暂时使用静态数据
      this.deviceStats = {
        total: 6,
        online: 5,
        alarm: 0,
        offline: 1
      };
    }
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

    // 获取设备统计数据
    this.fetchDeviceStats();
    
    // 监听设备选择事件
    eventBus.on('devices-updated', this.handleDevicesUpdated);
  },
  
  beforeUnmount() {
    // 组件卸载前移除事件监听
    eventBus.off('devices-updated', this.handleDevicesUpdated);
  },

  // 添加处理设备选择的方法
  handleDeviceSelected(deviceId) {
    this.selectedDeviceId = deviceId;
  },
  
  // 处理设备更新事件
  handleDevicesUpdated(devices) {
    if (devices && devices.length > 0) {
      this.selectedDeviceId = devices[0].id;
      this.selectedDevice = devices[0];
      console.log('Home: 已选择设备', this.selectedDevice);
    } else {
      this.selectedDeviceId = null;
      this.selectedDevice = null;
    }
  }
}

</script>

<style scoped>
.home-container {
  width: 100%;
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-top: 70px;
  /* 为 TopBar 留出空间 */
  box-sizing: border-box;
}

.main-content-area {
  margin-left: 200px;
  /* 为 SideBar 留出空间 */
  height: calc(100vh - 70px);
  /* 固定高度，减去 TopBar 的高度 */
  width: calc(100% - 200px);
  /* 确保宽度固定 */
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
  /* 防止内容溢出 */
}

.home-page-layout {
  width: 100%;
  height: 100%;
  padding: 8px;
  box-sizing: border-box;
  overflow: hidden;
  /* 禁止滚动 */
  position: relative;
  /* 使用绝对定位的父容器 */
}

/* 使用固定高度和位置，不再使用flex */
.home-row {
  width: calc(100% - 16px);
  /* 减去左右padding */
  position: absolute;
  left: 8px;
  display: flex;
  /* 仅在水平方向使用flex */
  gap: 8px;
}

.top-row {
  top: 8px;
  height: 90px;
  /* 固定高度 */
}

.middle-row {
  top: 106px;
  /* 8px(上边距) + 90px(top-row高度) + 8px(间距) */
  height: 380px;
  /* 固定高度 */
}

.bottom-row {
  top: 494px;
  /* 106px(middle-row顶部位置) + 380px(middle-row高度) + 8px(间距) */
  height: 130px;
  /* 固定高度 */
}

.top-row .home-component-placeholder,
.middle-row .home-component-placeholder,
.bottom-row .home-component-placeholder.full-width-component {
  height: 100%;
  /* 填充父容器高度 */
  background-color: #e9ecef;
  border: 1px solid #ced4da;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  box-sizing: border-box;
}

/* 为不同行的占位符设置不同的背景色以便区分 */
.middle-row .home-component-placeholder {
  background-color: #dee2e6;
}

/* 使用固定宽度比例，不再使用flex-grow */
.middle-row .middle-component-1 {
  width: 20%;
  /* 固定宽度比例 */
  overflow: hidden;
  /* 防止内容溢出 */
}

.middle-row .middle-component-2 {
  width: 40%;
  /* 固定宽度比例 */
}

.middle-row .middle-component-3 {
  width: 40%;
  /* 固定宽度比例 */
}

.bottom-row .home-component-placeholder.full-width-component {
  width: 100%;
  /* 占据整行 */
  background-color: #ced4da;
}



/* 修改状态卡片样式，确保它们均匀分布 */
.status-card {
  width: 25%;
  /* 4个组件均分 */
  height: 100%;
  border-radius: 4px;
  display: flex;
  align-items: center;
  color: white;
  padding: 0 15px;
  box-sizing: border-box;
  margin-right: 8px;
  /* 添加右侧间距 */
}

/* 最后一个卡片不需要右侧间距 */
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

/* 不同卡片的颜色 */
.total-devices {
  background-color: #1890ff;
  /* 蓝色 */
}

.online-devices {
  background-color: #52c41a;
  /* 绿色 */
}

.alarm-devices {
  background-color: #fa8c16;
  /* 橙色 */
}

.offline-devices {
  background-color: #434343;
  /* 深灰色 */
}
</style>