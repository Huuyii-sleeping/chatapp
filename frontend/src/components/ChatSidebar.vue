<!-- src/components/ChatSidebar.vue -->
<template>
  <div class="sidebar">
    <div class="counter-section">
      <h4>实时计数器(全局)</h4>
      <div class="counter-display">
        <span>当前计数：{{ count }}</span>
        <button @click="onIncrement" :disabled="!socket">+1</button>
      </div>
    </div>

    <div class="online-users">
      <h4>在线用户 ({{ onlineUsers.length }})</h4>
      <ul>
        <li
          v-for="user in onlineUsers"
          :key="user.socketId"
          @click="onUserClick(user)"
          :class="{ active: privateChatTarget?.socketId === user.socketId }"
        >
          {{ user.username }}
          <span
            v-if="privateChatTarget?.socketId === user.socketId"
            class="private-indicator"
          >
            📩 私聊中
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
defineProps({
  count: Number,
  onlineUsers: Array,
  privateChatTarget: Object,
  socket: Object
})

const emit = defineEmits(['increment', 'startPrivateChat'])

const onIncrement = () => emit('increment')
const onUserClick = (user) => emit('startPrivateChat', user)
</script>

<style scoped>
.sidebar {
  width: 250px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.counter-section {
  padding: 15px;
  border: 1px solid #007bff;
  border-radius: 8px;
  background: #f8f9fa;
}

.counter-display {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.counter-display button {
  padding: 6px 12px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.online-users {
  padding: 15px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  background: #f8f9fa;
}

.online-users h4 {
  margin: 0 0 15px 0;
  color: #495057;
}

.online-users ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.online-users li {
  padding: 10px;
  border-bottom: 1px solid #e9ecef;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.online-users li:hover {
  background: #e9ecef;
}

.online-users li.active {
  background: #d1ecf1;
  border-left: 3px solid #007bff;
  font-weight: bold;
}

.private-indicator {
  margin-left: 8px;
  color: #28a745;
  font-size: 0.9em;
}
</style>