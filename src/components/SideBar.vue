<template>
  <div class="sidebar">
    <div v-for="(item, index) in menuItems" :key="index">
      <div 
        class="menu-item"
        :class="{ active: activeIndex === index || (item.children && item.expanded) }"
        @click="handleMenuClick(index)"
      >
        <span>{{ item.name }}</span>
        <i v-if="item.children" class="arrow" :class="{ expanded: item.expanded }">▶</i>
      </div>
      
      <!-- 子菜单直接放在父菜单下方 -->
      <div 
        v-if="item.expanded && item.children"
        class="submenu"
      >
        <div 
          v-for="(subItem, subIndex) in item.children" 
          :key="subIndex"
          class="submenu-item"
          :class="{ active: activeSubIndex === subIndex && activeIndex === index }"
          @click.stop="handleSubMenuClick(index, subIndex)"
        >
          <span>{{ subItem.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SideBar',
  props: {
    menuItems: {
      type: Array,
      default: () => []
    },
    activeIndex: {
      type: Number,
      default: 0
    },
    activeSubIndex: {
      type: Number,
      default: -1
    }
  },
  methods: {
    handleMenuClick(index) {
      const item = this.menuItems[index];
      if (item.children) {
        // 切换子菜单展开状态
        this.$emit('toggle-submenu', index);
      } else {
        // 普通菜单点击
        this.$emit('menu-click', index, -1);
      }
    },
    handleSubMenuClick(parentIndex, subIndex) {
      this.$emit('menu-click', parentIndex, subIndex);
    }
  }
}
</script>

<style scoped>
.sidebar {
  width: 200px;
  background-color: #2c3e50;
  color: white;
  height: calc(100vh - 70px); /* 减去顶栏高度 */
  position: fixed;
  left: 0;
  top: 70px; /* 顶栏高度 */
  overflow-y: auto;
}

.menu-item {
  padding: 12px 20px;
  cursor: pointer;
  transition: background-color 0.3s;
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.menu-item:hover {
  background-color: #34495e;
}

.menu-item.active {
  background-color: #409eff;
}

.arrow {
  font-size: 12px;
  transition: transform 0.3s;
}

.arrow.expanded {
  transform: rotate(90deg);
}

.submenu {
  background-color: #1e2b3c;
}

.submenu-item {
  padding: 10px 20px 10px 40px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.submenu-item:hover {
  background-color: #34495e;
}

.submenu-item.active {
  background-color: #1890ff;
}
</style>