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

    <!-- 主内容区域 -->
    <div class="main-content-area">
      <!-- 检查是否是首页路径，如果是，则显示特定布局 -->
      <div v-if="$route.path === '/'" class="home-page-layout">
        <!-- 最上面一行：4个组件 -->
        <div class="home-row top-row">
          <div class="home-component-placeholder">组件1</div>
          <div class="home-component-placeholder">组件2</div>
          <div class="home-component-placeholder">组件3</div>
          <div class="home-component-placeholder">组件4</div>
        </div>
        <!-- 中间一行：3个组件 -->
        <div class="home-row middle-row">
          <div class="home-component-placeholder middle-component-1">组件5</div>
          <div class="home-component-placeholder middle-component-2">组件6</div>
          <div class="home-component-placeholder middle-component-3">组件7</div>
        </div>
        <!-- 下面一行：1个组件 -->
        <div class="home-row bottom-row">
          <div class="home-component-placeholder full-width-component">组件8</div>
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
  padding-top: 70px; /* 为 TopBar 留出空间 */
  box-sizing: border-box;
}

.main-content-area {
  margin-left: 200px;  /* 为 SideBar 留出空间 */
  min-height: calc(100vh - 70px); /* 减去 TopBar 的高度 */
  box-sizing: border-box;
  /* padding: 15px; */ /* 移除这里的 padding */
  width: calc(100% - 200px); /* 确保 main-content-area 占据剩余宽度 */
  position: relative; /* 可选，如果内部元素需要绝对定位 */
}

.home-page-layout {
  display: flex;
  flex-direction: column;
  gap: 5px; /* 行之间的间距 */
  width: 100%;
  height: calc(100vh - 70px); /* 设置为固定高度，减去TopBar的高度 */
  padding: 5px;
  box-sizing: border-box;
  overflow-y: auto; /* 如果内容超出则显示滚动条 */
}

.home-row {
  display: flex;
  gap: 5px; /* 组件之间的间距 */
  /* flex: 1; */ /* 移除或修改，具体分配由各行决定 */
}

.top-row {
  /* flex: 1; */ /* 示例：如果所有行等高 */
  flex-grow: 3; /* 修改：允许此行在垂直方向上增长 */
  /* 可以选择性地添加 flex-basis 来建议初始大小，例如 flex-basis: 120px; */
}

.middle-row {
  /* flex: 2; */ /* 示例：如果此行想更高 */
  flex-grow: 14; /* 修改：使此行比其他行占据更多垂直空间 */
  /* flex-basis: 250px; */
}

.bottom-row {
  /* flex: 1; */
  flex-grow: 5; /* 修改：允许此行在垂直方向上增长 */
  /* flex-basis: 120px; */
}

.top-row .home-component-placeholder,
.middle-row .home-component-placeholder,
.bottom-row .home-component-placeholder.full-width-component {
  flex: 1; /* 保持水平方向填充，对于middle-row的子组件，此处的flex-grow会被下面的特定规则覆盖 */
  height: 100%; /* 修改：使其填充父行的高度 */
  background-color: #e9ecef; /* 保持示例背景色 */
  border: 1px solid #ced4da; /* 保持示例边框 */
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

/* 为不同行的占位符设置不同的背景色以便区分，如果需要的话 */
.middle-row .home-component-placeholder {
  background-color: #dee2e6; /* 通用背景色 */
}

/* 新增：为中间一行的组件设置特定的flex-grow比例 */
.middle-row .middle-component-1 {
  flex-grow: 10; /* 第一个组件占1份 */
}

.middle-row .middle-component-2 {
  flex-grow: 20; /* 第二个组件占2份 (是第一个和第三个的两倍宽) */
}

.middle-row .middle-component-3 {
  flex-grow: 20; /* 第三个组件占1份 */
}

.bottom-row .home-component-placeholder.full-width-component {
  background-color: #ced4da;
}

/* .content { ... } */ /* 保持移除 */
</style>