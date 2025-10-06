<!-- src/components/ChatRoom.vue -->
<template>
  <div class="chat-container">
    <h2>多房间聊天室 (Vue + NestJS)</h2>

    <!-- 加入房间表单 -->
    <div v-if="!joined" class="join-form">
      <input v-model="username" placeholder="昵称" @keyup.enter="joinRoom" />
      <input
        v-model="room"
        placeholder="房间名（如：room1）"
        @keyup.enter="joinRoom"
      />
      <button @click="joinRoom" :disabled="!canJoin">加入房间</button>
    </div>

    <!-- 聊天界面 -->
    <div v-else class="chat-section">
      <div class="counter-section">
        <h3>实时计数器(全局)</h3>
        <div class="counter-display">
          <span>当前计数：{{ count }}</span>
          <button @click="increment" :disabled="!socket"></button>
        </div>
      </div>

      <div class="room-info">
        <span
          >当前房间: <strong>{{ currentRoom }}</strong></span
        >
        <button @click="leaveRoom" style="margin-left: 10px">退出房间</button>
      </div>

      <div class="messages" ref="messagesContainer">
        <div v-for="(msg, index) in messages" :key="index" class="message">
          <strong>[{{ msg.time }}] {{ msg.user }}:</strong> {{ msg.msg }}
        </div>
      </div>

      <div class="send-section">
        <input
          v-model="newMessage"
          placeholder="输入消息..."
          @keyup.enter="sendMessage"
          :disabled="!socket"
        />
        <button @click="sendMessage" :disabled="!newMessage.trim()">
          发送
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from "vue";
import { io } from "socket.io-client";

const username = ref("");
const room = ref("general"); // 默认房间
const newMessage = ref("");
const messages = ref([]);
const joined = ref(false);
const currentRoom = ref("");
const socket = ref(null);
const messagesContainer = ref(null);
const count = ref(0);

const canJoin = computed(() => {
  return username.value.trim() && room.value.trim();
});

const joinRoom = () => {
  if (!canJoin.value) return;

  // 如果已连接，先断开（或复用连接）
  if (socket.value) {
    socket.value.disconnect();
  }

  socket.value = io("http://localhost:3000");

  socket.value.on("connect", () => {
    console.log("连接成功，加入房间...");
    socket.value.emit("joinRoom", {
      username: username.value.trim(),
      room: room.value.trim(),
    });
  });

  socket.value.on("joinedRoom", (data) => {
    joined.value = true;
    currentRoom.value = data.room;
    messages.value = []; // 清空历史（或可保留）
    messages.value.push({
      user: "系统",
      msg: `你已加入房间 "${data.room}"`,
      time: new Date().toLocaleTimeString(),
    });
  });

  socket.value.on("countUpdate", (newCount) => {
    console.log('----newCount:', newCount)
    count.value = newCount;
  }); 

  socket.value.on("message", (data) => {
    messages.value.push(data);
    nextTick(() => {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    });
  });

  socket.value.on("error", (err) => {
    alert("错误: " + err.msg);
  });
};

const sendMessage = () => {
  if (!newMessage.value.trim() || !socket.value) return;
  socket.value.emit("sendMessage", { msg: newMessage.value });
  newMessage.value = "";
};

const leaveRoom = () => {
  if (socket.value) {
    socket.value.disconnect();
  }
  joined.value = false;
  messages.value = [];
  currentRoom.value = "";
};

const increment = () => {
  console.log(socket.value);
  if (socket.value) socket.value.emit("increment");
};

onUnmounted(() => {
  if (socket.value) {
    socket.value.disconnect();
  }
});
</script>

<style scoped>
/* 保留之前的样式，略作调整 */
.chat-container {
  max-width: 800px;
  margin: 20px auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}
.counter-section {
  margin-top: 20px;
  padding: 15px;
  border: 1px solid #007bff;
  border-radius: 8px;
  background: #f0f8ff;
}
.counter-display {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-top: 10px;
}
.counter-display button {
  background: #28a745;
}
.join-form,
.send-section {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}
input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
button {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
.messages {
  height: 400px;
  border: 1px solid #ddd;
  padding: 10px;
  overflow-y: auto;
  background: #f9f9f9;
}
.message {
  margin-bottom: 8px;
  word-wrap: break-word;
}
.room-info {
  margin-bottom: 10px;
  font-weight: bold;
}
</style>
