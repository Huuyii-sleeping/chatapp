<template>
  <div class="poll-section">
    <h4>实时投票 🗳️</h4>

    <!-- 创建投票表单 -->
    <div v-if="!activePoll" class="create-poll">
      <input
        v-model="pollQuestion"
        placeholder="投票问题..."
        class="poll-input"
        @keyup.enter="createPoll"
      />
      <div class="options-container">
        <div
          v-for="(option, index) in pollOptions"
          :key="index"
          class="option-input-wrapper"
        >
          <input
            v-model="pollOptions[index]"
            :placeholder="`选项 ${index + 1}`"
            class="option-input"
            @keyup.enter="addOption"
          />
          <button
            v-if="pollOptions.length > 2"
            @click="removeOption(index)"
            class="remove-option"
          >
            ×
          </button>
        </div>
      </div>
      <div class="poll-actions">
        <button
          @click="addOption"
          :disabled="pollOptions.length >= 5"
          class="add-btn"
        >
          + 选项
        </button>
        <button
          @click="createPoll"
          :disabled="!canCreatePoll"
          class="create-btn"
        >
          创建投票
        </button>
      </div>
    </div>

    <!-- 活动投票展示 -->
    <div v-else class="active-poll">
      <div class="poll-question">{{ activePoll.question }}</div>

      <div class="poll-options">
        <div
          v-for="(option, index) in activePoll.options"
          :key="index"
          class="poll-option"
          :class="{ selected: userVote === index }"
        >
          <label>
            <input
              type="radio"
              :value="index"
              v-model="userVote"
              :disabled="hasVoted || !socket"
              @change="submitVote"
            />
            <span class="option-text">{{ option }}</span>
          </label>

          <div class="vote-bar">
            <div
              class="vote-fill"
              :style="{ width: getVotePercentage(index) + '%' }"
            ></div>
            <span class="vote-count">{{ getVoteCount(index) }}票</span>
          </div>
        </div>
      </div>

      <div class="poll-footer">
        <span
          >总票数: {{ totalVotes }} |
          {{ hasVoted ? "✅ 已投票" : "⏳ 未投票" }}</span
        >
        <button @click="endPoll" class="end-btn">
          结束投票
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";

const props = defineProps({
  socket: Object,
  currentRoom: String,
  username: String,
});

const emit = defineEmits(["pollCreated", "voteSubmitted", "pollEnded"]);

const activePoll = ref(null);
const userVote = ref(null);
const hasVoted = ref(false);
const isPollOwner = ref(false);

const pollQuestion = ref("");
const pollOptions = ref(["", ""]); // 默认两个选项

const canCreatePoll = computed(() => {
  return (
    pollQuestion.value.trim() &&
    pollOptions.value.every((opt) => opt.trim()) &&
    pollOptions.value.length >= 2
  );
});

const totalVotes = computed(() => {
  return activePoll.value
    ? activePoll.value.votes.reduce((a, b) => a + b, 0)
    : 0;
});

const addOption = () => {
  if (pollOptions.value.length < 5) {
    pollOptions.value.push("");
  }
};

const removeOption = (index) => {
  if (pollOptions.value.length > 2) {
    pollOptions.value.splice(index, 1);
  }
};

const createPoll = () => {
  if (!canCreatePoll.value || !props.socket) return; 

  const pollData = {
    room: props.currentRoom,
    question: pollQuestion.value.trim(),
    options: pollOptions.value.map((opt) => opt.trim()),
  };

  props.socket.emit("createPoll", pollData);
  emit("pollCreated", pollData);

  pollQuestion.value = "";
  pollOptions.value = ["", ""];
};

const submitVote = () => {
  if (userVote.value !== null && !hasVoted.value && props.socket) {
    const voteData = {
      room: props.currentRoom,
      optionIndex: userVote.value,
    };
    props.socket.emit("submitVote", voteData);
    emit("voteSubmitted", voteData);
    hasVoted.value = true;
  }
};

const endPoll = () => {
  if (props.socket) {
    props.socket.emit("endPoll", { room: props.currentRoom });
    emit("pollEnded");
    resetPoll();
  }
};

const resetPoll = () => {
  activePoll.value = null;
  userVote.value = null;
  hasVoted.value = false;
  isPollOwner = false;
};

const startPoll = (pollData) => {
  activePoll.value = {
    ...pollData,
    votes: new Array(pollData.options.length).fill(0),
  };
  userVote.value = null;
  hasVoted.value = false;
  isPollOwner.value = pollData.creator === props.username;
};

const updateVotes = (votes) => {
  if (activePoll.value) {
    activePoll.value.votes = votes;
  }
};

const getVoteCount = (index) => {
  return activePoll.value?.votes[index] || 0;
};

const getVotePercentage = (index) => {
  const count = getVoteCount(index);
  return totalVotes.value > 0
    ? Math.round((count / totalVotes.value) * 100)
    : 0;
};

defineExpose({
  startPoll,
  updateVotes,
  resetPoll,
});
</script>

<style scoped>
.poll-section {
  padding: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #f9f9f9;
  margin-top: 20px;
}

.poll-section h4 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 创建投票样式 */
.create-poll {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.poll-input {
  width: 90%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.options-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-input-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
}

.option-input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.remove-option {
  width: 28px;
  height: 28px;
  border: none;
  background: #ff6b6b;
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}

.poll-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.add-btn,
.create-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  flex: 1;
}

.add-btn {
  background: #4ecdc4;
  color: white;
}

.add-btn:disabled {
  background: #b2dfdb;
  cursor: not-allowed;
}

.create-btn {
  background: #007bff;
  color: white;
}

.create-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

/* 活动投票样式 */
.active-poll {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.poll-question {
  font-weight: bold;
  font-size: 16px;
  padding: 10px;
  background: #e3f2fd;
  border-radius: 4px;
  color: #1976d2;
}

.poll-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.poll-option {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  transition: all 0.2s;
}

.poll-option:hover {
  border-color: #007bff;
}

.poll-option.selected {
  border-color: #4caf50;
  background: #f1f8e9;
}

.poll-option label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  margin-bottom: 8px;
}

.option-text {
  font-weight: 500;
}

.vote-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}

.vote-fill {
  height: 6px;
  background: #4caf50;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.vote-count {
  font-size: 12px;
  color: #666;
  min-width: 40px;
}

.poll-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 1px solid #eee;
  font-size: 13px;
  color: #666;
}

.end-btn {
  padding: 6px 12px;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

/* 响应式 */
@media (max-width: 768px) {
  .poll-actions {
    flex-direction: column;
  }

  .poll-option label {
    flex-wrap: wrap;
  }
}
</style>
