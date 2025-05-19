<template>
  <div class="realtime-data-layout">
    <!-- 左侧数据展示区域 -->
    <div class="data-display-area">
      
      

     
    </div>

    <!-- 右侧设备列表区域 -->
    <div class="device-list-area">
      <DeviceList :multi-select="true" />
    </div>
  </div>
</template>

<script>
export default {
  name: 'HistoricalData',
  // components: { DeviceList }, // 如果用到DeviceList等组件，需要引入
  data() {
    return {
      // 页面所需数据
    };
  },
  methods: {
    // 页面所需方法
  },
  mounted() {
    // 初始化操作
  }
};
</script>

<style scoped>
</style>