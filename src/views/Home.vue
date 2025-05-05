<template>
  <div class="home-container">
    <TopBar
      :username="user.username"
      @logout="logout"
    />

    <SideBar
      :menuItems="menuItems"
      :activeIndex="activeMenuIndex"
      :activeSubIndex="activeSubMenuIndex"
      @menu-click="handleMenuChange"
      @toggle-submenu="toggleSubmenu"
    />

    <!-- 重新添加主内容区域 -->
    <div class="main-content-area">
      <router-view :key="$route.fullPath"></router-view>
      <!-- 首页的 <main class="content"> 仍然移除，除非需要 -->
    </div>

    <!-- DeviceList 仍然移除，因为它将被包含在 RealTimeData.vue 中 -->
  </div>
</template>

<script>
import TopBar from '../components/TopBar.vue';
import SideBar from '../components/SideBar.vue';
// import DeviceList from '../components/DeviceList.vue'; // 移除导入
// 不再需要 provide, readonly, ref, computed 用于传递设备
import { computed } from 'vue'; // computed 仍用于 isHomePage 等

export default {
  name: 'HomePage',
  components: {
    TopBar,
    SideBar,
    // DeviceList // 移除注册
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
      // 移除 selectedDevices 状态，Home 不再管理全局选中设备
      // selectedDevices: []
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
  },
  watch: {
    '$route'(to, from) {
      this.updateMenuState(to.path);
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
  box-sizing: border-box;
}

/* 调整主内容区域容器样式 */
.main-content-area {
  margin-left: 200px;  /* 只保留左边距以避开 SideBar */
  min-height: calc(100vh - 70px);
  box-sizing: border-box;
  /* padding: 20px; */ /* 移除内边距，让子组件控制 */
}

/* .content { ... } */ /* 保持移除 */
</style>