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

    <!-- 聊天主界面 -->
    <div v-else class="chat-main">
      <!-- 左侧：在线用户列表 -->
      <div class="sidebar">
        <div class="counter-section">
          <h4>实时计数器(全局)</h4>
          <div class="counter-display">
            <span>当前计数：{{ count }}</span>
            <button @click="increment" :disabled="!socket">+1</button>
          </div>
        </div>

        <div class="online-users">
          <h4>在线用户 ({{ onlineUsers.length }})</h4>
          <ul>
            <li
              v-for="user in onlineUsers"
              :key="user.socketId"
              @click="startPrivateChat(user)"
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

      <!-- 中间：聊天区域 -->
      <div class="chat-area">
        <div class="room-header">
          <span
            >当前房间: <strong>{{ currentRoom }}</strong></span
          >
          <button @click="leaveRoom" class="leave-btn">退出房间</button>
        </div>

        <div class="messages" ref="messagesContainer">
          <div
            v-for="(msg, index) in messages"
            :key="index"
            :class="['message', { 'private-msg': msg.type === 'private' }]"
          >
            <template v-if="msg.type === 'private'">
              <strong class="private-label">[私聊]</strong>
              <strong
                >[{{ msg.time }}] {{ msg.user }} →
                {{ msg.to === "me" ? "你" : msg.to }}:</strong
              >
              {{ msg.msg }}
            </template>
            <template v-else>
              <strong>[{{ msg.time }}] {{ msg.user }}:</strong> {{ msg.msg }}
            </template>
          </div>
        </div>

        <!-- 私聊输入区域 -->
        <div v-if="privateChatTarget" class="private-chat-section">
          <div class="private-header">
            💬 正在与 <strong>{{ privateChatTarget.username }}</strong> 私聊
            <button @click="privateChatTarget = null" class="close-private-btn">
              ×
            </button>
          </div>
          <div class="private-input">
            <input
              v-model="privateMessage"
              placeholder="输入私聊消息..."
              @keyup.enter="sendPrivateMessage"
              :disabled="!socket"
            />
            <button
              @click="sendPrivateMessage"
              :disabled="!privateMessage.trim()"
              class="send-private-btn"
            >
              发送
            </button>
          </div>
        </div>

        <!-- 公聊输入区域 -->
        <div class="send-section">
          <input
            v-model="newMessage"
            placeholder="输入公聊消息..."
            @keyup.enter="sendMessage"
            :disabled="!socket"
          />
          <button
            @click="sendMessage"
            :disabled="!newMessage.trim()"
            class="send-btn"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted, nextTick, computed } from "vue";
import { io } from "socket.io-client";

const username = ref("");
const room = ref("general");
const newMessage = ref("");
const messages = ref([]);
const joined = ref(false);
const currentRoom = ref("");
const socket = ref(null);
const messagesContainer = ref(null);
const count = ref(0);
const onlineUsers = ref([]);
const privateChatTarget = ref(null);
const privateMessage = ref("");

const canJoin = computed(() => {
  return username.value.trim() && room.value.trim();
});

const joinRoom = () => {
  if (!canJoin.value) return;

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
    // 连接后请求用户列表
    socket.value.emit("requestUserList");
  });

  socket.value.on("joinedRoom", (data) => {
    joined.value = true;
    currentRoom.value = data.room;
    messages.value = [];
    messages.value.push({
      user: "系统",
      msg: `你已加入房间 "${data.room}"`,
      time: new Date().toLocaleTimeString(),
      type: "system",
    });
  });

  socket.value.on("userListUpdate", (users) => {
    onlineUsers.value = users.filter((u) => u.socketId !== socket.value.id);
  });

  socket.value.on("countUpdate", (newCount) => {
    count.value = newCount;
  });

  socket.value.on("message", (data) => {
    messages.value.push({ ...data, type: "room" });
    scrollToBottom();
  });

  socket.value.on("privateMessage", (data) => {
    messages.value.push({
      ...data,
      type: "private",
      to: data.to || "me", // 确保有 to 字段
    });
    scrollToBottom();
  });

  socket.value.on("error", (err) => {
    alert("错误: " + err.msg);
  });

};

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

const startPrivateChat = (user) => {
  privateChatTarget.value = user;
  privateMessage.value = "";
};

const sendPrivateMessage = () => {
  if (!privateMessage.value.trim() || !socket.value || !privateChatTarget.value)
    return;

  socket.value.emit("privateMessage", {
    to: privateChatTarget.value.socketId,
    msg: privateMessage.value,
  });

  // 本地回显
  messages.value.push({
    user: username.value,
    to: privateChatTarget.value.username,
    msg: privateMessage.value,
    time: new Date().toLocaleTimeString(),
    type: "private",
  });

  privateMessage.value = "";
  scrollToBottom();
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
  onlineUsers.value = [];
  privateChatTarget.value = null;
};

const increment = () => {
  if (socket.value) socket.value.emit("increment");
};

onUnmounted(() => {
  if (socket.value) {
    socket.value.disconnect();
  }
});
</script>

<style scoped>
.chat-container {
  max-width: 1200px;
  margin: 20px auto;
  padding: 20px;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}

.join-form {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

/* 主聊天布局 */
.chat-main {
  display: flex;
  gap: 20px;
  height: 600px;
}

/* 左侧边栏 */
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

/* 中间聊天区域 */
.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  overflow: hidden;
}

.room-header {
  padding: 15px;
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.leave-btn {
  padding: 6px 12px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

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

/* 私聊区域 */
.private-chat-section {
  padding: 15px;
  border-top: 1px solid #dee2e6;
  background: #f8fff8;
}

.private-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-weight: bold;
  color: #28a745;
}

.close-private-btn {
  background: none;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
  color: #6c757d;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.private-input {
  display: flex;
  gap: 10px;
}

/* 输入区域 */
.send-section,
.private-input {
  padding: 15px;
  border-top: 1px solid #dee2e6;
  background: #f8f9fa;
}

input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

button {
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.send-btn,
.send-private-btn {
  background: #007bff;
  color: white;
}

.send-btn:disabled,
.send-private-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.leave-btn:disabled {
  background: #6c757d;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chat-main {
    flex-direction: column;
    height: auto;
  }

  .sidebar {
    width: 100%;
    order: 2;
  }

  .chat-area {
    order: 1;
  }
}
</style>
