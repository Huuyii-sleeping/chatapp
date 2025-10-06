<!-- src/components/ChatMessages.vue -->
<template>
  <div class="messages" ref="messagesContainer">
    <div
      v-for="(msg, index) in messages"
      :key="index"
      :class="['message', { 'private-msg': msg.type === 'private' }]"
    >
      <template v-if="msg.type === 'private'">
        <strong class="private-label">[私聊]</strong>
        <strong>[{{ msg.time }}] {{ msg.user }} → {{ msg.to === 'me' ? '你' : msg.to }}:</strong>
        {{ msg.msg }}
      </template>
      <template v-else>
        <strong>[{{ msg.time }}] {{ msg.user }}:</strong> {{ msg.msg }}
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

defineProps({
  messages: Array
})

const messagesContainer = ref(null)

// 暴露 scrollToBottom 方法给父组件
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

defineExpose({ scrollToBottom })
</script>

<style scoped>
.messages {
  flex: 1;
  padding: 15px;
  overflow-y: auto;
  background: white;
}

.message {
  margin-bottom: 12px;
  padding: 8px;
  border-radius: 4px;
  line-height: 1.4;
}

.private-msg {
  background: #f8f9fa;
  border-left: 3px solid #28a745;
  margin-left: 10px;
}

.private-label {
  color: #28a745;
  margin-right: 5px;
}
</style>