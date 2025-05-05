// src/eventBus.js
import { reactive } from 'vue';

// 创建一个简单的响应式对象作为事件总线
// 注意：这是一个非常基础的实现，对于复杂应用推荐使用 mitt 或 Pinia/Vuex
const bus = reactive({
  listeners: {},
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  },
  off(event, callback) {
    if (!this.listeners[event]) return;
    if (!callback) {
      // 如果没有提供回调，移除所有监听器
      this.listeners[event] = [];
    } else {
      this.listeners[event] = this.listeners[event].filter(listener => listener !== callback);
    }
  },
  emit(event, ...args) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => {
      try {
        callback(...args);
      } catch (e) {
        console.error(`Error in event handler for ${event}:`, e);
      }
    });
  }
});

export default bus;