<template>
  <div class="interview-bank-view min-h-screen bg-base-100">
    <!-- PC端布局 (lg及以上) -->
    <div class="hidden lg:flex h-screen">
      <!-- 左侧边栏 -->
      <CategorySidebar
        :categories="categories"
        :current-category-id="currentCategoryId"
        :current-view="currentView"
        :total-questions="questions.length"
        :bookmarked-count="bookmarkedQuestions.length"
        :edited-count="editedQuestions.length"
        :search-query="searchQuery"
        @category-change="handleCategoryChange"
        @view-change="handleViewChange"
        @search="handleSearch"
        @theme-change="handleThemeChange"
        @export="handleExport"
      />
      
      <!-- 右侧主内容区 -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- 题目列表 -->
        <div class="flex-1 overflow-y-auto p-6">
          <QuestionList
            :questions="displayQuestions"
            :loading="isLoading"
            :error="error"
            :current-view="currentView"
            @toggle="toggleQuestion"
            @bookmark="toggleBookmark"
            @edit="editQuestion"
            @restore="restoreQuestion"
          />
        </div>
      </div>
    </div>
    
    <!-- 移动端布局 (lg以下) -->
    <div class="lg:hidden flex flex-col min-h-screen">
      <!-- 顶部分类标签 -->
      <CategoryTabs
        :categories="categories"
        :current-category-id="currentCategoryId"
        :current-view="currentView"
        :total-questions="questions.length"
        :bookmarked-count="bookmarkedQuestions.length"
        :edited-count="editedQuestions.length"
        :search-query="searchQuery"
        :current-questions-count="displayQuestions.length"
        @category-change="handleCategoryChange"
        @view-change="handleViewChange"
        @search="handleSearch"
        @theme-change="handleThemeChange"
        @export="handleExport"
      />
      
      <!-- 题目列表 -->
      <div class="flex-1 overflow-y-auto p-4">
        <QuestionList
          :questions="displayQuestions"
          :loading="isLoading"
          :error="error"
          :current-view="currentView"
          @toggle="toggleQuestion"
          @bookmark="toggleBookmark"
          @edit="editQuestion"
          @restore="restoreQuestion"
        />
      </div>
    </div>
    
    <!-- 加载状态 -->
    <div v-if="isLoading" class="fixed inset-0 bg-base-100/80 flex items-center justify-center z-50">
      <div class="text-center">
        <div class="loading loading-spinner loading-lg text-primary"></div>
        <p class="mt-4 text-base-content">加载中...</p>
      </div>
    </div>
    
    <!-- 错误提示 -->
    <div v-if="error" class="toast toast-top toast-end">
      <div class="alert alert-error">
        <span>{{ error }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, provide, ref } from "vue";
import CategorySidebar from "@/components/InterviewBank/CategorySidebar.vue";
import CategoryTabs from "@/components/InterviewBank/CategoryTabs.vue";
import QuestionList from "@/components/InterviewBank/QuestionList.vue";
import SettingsMenu from "@/components/InterviewBank/SettingsMenu.vue";
import { useInterviewBank } from "@/composables/useInterviewBank";

// 使用题库状态管理
const interviewBank = useInterviewBank();

const {
  categories,
  questions,
  currentCategoryId,
  searchQuery,
  isLoading,
  error,
  preferences,
  currentQuestions,
  bookmarkedQuestions,
  editedQuestions,
  switchCategory,
  toggleQuestion,
  toggleBookmark,
  editQuestion,
  restoreQuestion,
  search,
  // toggleTheme,
} = interviewBank;

// 提供interviewBank实例给子组件
provide("interviewBank", interviewBank);

// 当前视图状态
const currentView = ref<"normal" | "bookmarks" | "edited">("normal");

// 计算当前显示的题目列表
const displayQuestions = computed(() => {
  switch (currentView.value) {
    case "bookmarks":
      return bookmarkedQuestions.value.filter((q) => {
        if (!searchQuery.value.trim()) return true;
        const query = searchQuery.value.toLowerCase();
        return (
          q.subject.toLowerCase().includes(query) ||
          q.answer.toLowerCase().includes(query)
        );
      });
    case "edited":
      return editedQuestions.value.filter((q) => {
        if (!searchQuery.value.trim()) return true;
        const query = searchQuery.value.toLowerCase();
        return (
          q.subject.toLowerCase().includes(query) ||
          q.answer.toLowerCase().includes(query)
        );
      });
    default:
      return currentQuestions.value;
  }
});

// 处理分类切换
const handleCategoryChange = (categoryId: string) => {
  switchCategory(categoryId);
};

// 处理视图切换
const handleViewChange = (view: "normal" | "bookmarks" | "edited") => {
  currentView.value = view;
};

// 处理搜索
const handleSearch = (query: string) => {
  search(query);
};

// 处理主题切换
const handleThemeChange = (theme: "light" | "dark" | "auto") => {
  preferences.value.theme = theme;
  // toggleTheme();
};

// 处理数据导出
const handleExport = () => {
  try {
    const exportData = {
      questions: displayQuestions.value,
      exportTime: new Date().toISOString(),
      totalCount: displayQuestions.value.length,
      currentView: currentView.value,
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(dataBlob);
    link.download = `interview-bank-${currentView.value}-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 可以添加成功提示
    console.log("数据导出成功");
  } catch (err) {
    console.error("导出失败:", err);
    error.value = "导出失败，请重试";
  }
};

// 处理缓存清除
const handleCacheCleared = () => {
  // 实现缓存清除的逻辑
};

// 处理过期缓存清除
const handleExpiredCacheCleared = () => {
  // 实现过期缓存清除的逻辑
};
</script>

<style scoped>
.interview-bank-view {
  /* 确保占满整个视窗 */
  min-height: 100vh;
}

/* PC端布局优化 */
@media (min-width: 1024px) {
  .interview-bank-view {
    height: 100vh;
    overflow: hidden;
  }
}

/* 移动端优化 */
@media (max-width: 1024px) {
  .interview-bank-view {
    padding-bottom: env(safe-area-inset-bottom);
  }
}

/* 加载动画 */
.loading-spinner {
  animation: spin 1s linear infinite;
}

/* Toast通知样式 */
.toast {
  z-index: 9999;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>