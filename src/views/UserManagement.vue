<template>
  <div class="user-management-layout">
    <div class="user-display-area">
      <div class="user-display-area-top">
        <!-- 用户名搜索框 -->
        <div class="search-container">
          <el-input v-model="searchUsername" placeholder="请输入用户名搜索" style="width: 300px" clearable
            @keyup.enter="fetchUsers(true)">
            <template #prefix>
              <el-icon>
                <Search />
              </el-icon>
            </template>
          </el-input>
        </div>

        <!-- 按钮区域 -->
        <div class="button-area">
          <el-button type="primary" @click="() => fetchUsers(true)">查询</el-button>
          <el-button type="success" @click="showAddUserDialog">新增用户</el-button>
        </div>
      </div>

      <h2>用户管理</h2>

      <div v-if="globalFetchError" class="global-error-message">
        <p>{{ globalFetchError }}</p>
      </div>

      <div class="user-data-container">
        <div v-if="loading" class="loading-data">
          <el-icon class="is-loading">
            <Loading />
          </el-icon>
          <span>加载数据中...</span>
        </div>
        <div v-else-if="userData.length === 0" class="no-data">
          <p>暂无用户数据</p>
        </div>
        <div v-else class="data-table-wrapper">
          <el-table :data="userData" border style="width: 100%">
            <el-table-column prop="id" label="用户ID" width="80" />
            <el-table-column prop="username" label="用户名" min-width="120" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="scope">
                <el-tag :type="scope.row.status === 1 ? 'success' : 'danger'">
                  {{ scope.row.status === 1 ? '启用' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="manager" label="管理员" width="100">
              <template #default="scope">
                <el-tag :type="scope.row.manager === 1 ? 'warning' : 'info'">
                  {{ scope.row.manager === 1 ? '是' : '否' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createTime" label="创建时间" width="180">
              <template #default="scope">
                {{ formatDateTime(scope.row.createTime) }}
              </template>
            </el-table-column>
            <el-table-column prop="updateTime" label="更新时间" width="180">
              <template #default="scope">
                {{ formatDateTime(scope.row.updateTime) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="scope">
                <el-button size="small" type="primary" @click="showEditUserDialog(scope.row)">编辑</el-button>
                <el-button size="small" :type="scope.row.status === 1 ? 'warning' : 'success'"
                  @click="toggleUserStatus(scope.row)">
                  {{ scope.row.status === 1 ? '禁用' : '启用' }}
                </el-button>
                <el-button size="small" type="danger" @click="deleteUser(scope.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-container">
            <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize"
              :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next, jumper" :total="totalRecords"
              @size-change="handleSizeChange" @current-change="handlePageChange" />
          </div>
        </div>
      </div>
    </div>

    <!-- 用户编辑/新增对话框 -->
    <el-dialog v-model="userDialogVisible" :title="isEditMode ? '编辑用户' : '新增用户'" width="500px"
      :before-close="handleDialogClose">
      <el-form ref="userFormRef" :model="userForm" :rules="userFormRules" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" :disabled="isEditMode" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="userForm.password" type="password" :placeholder="isEditMode ? '留空则不修改密码' : '请输入密码'"
            show-password />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword" v-if="!isEditMode || userForm.password">
          <el-input v-model="userForm.confirmPassword" type="password" placeholder="请确认密码" show-password />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="userForm.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="管理员" prop="manager">
          <el-radio-group v-model="userForm.manager">
            <el-radio :label="1">是</el-radio>
            <el-radio :label="0">否</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="userDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitUserForm" :loading="submitting">
            {{ isEditMode ? '更新' : '创建' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Loading } from '@element-plus/icons-vue'
import { http } from '../utils/http.js' // 添加这行导入

// 响应式数据
const searchUsername = ref('')
const userData = ref([])
const totalRecords = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const globalFetchError = ref(null)
const submitting = ref(false)

// 对话框相关
const userDialogVisible = ref(false)
const isEditMode = ref(false)
const userFormRef = ref()

// 用户表单数据
const userForm = reactive({
  id: null,
  username: '',
  password: '',
  confirmPassword: '',
  status: 1,
  manager: 0
})

// 表单验证规则
const userFormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    {
      validator: (rule, value, callback) => {
        if (!isEditMode.value && !value) {
          callback(new Error('请输入密码'))
        } else if (value && value.length < 6) {
          callback(new Error('密码长度不能少于6位'))
        } else {
          if (userForm.confirmPassword) {
            userFormRef.value?.validateField('confirmPassword')
          }
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  confirmPassword: [
    {
      validator: (rule, value, callback) => {
        if (userForm.password && value !== userForm.password) {
          callback(new Error('两次输入密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 格式化日期时间
const formatDateTime = (dateTime) => {
  if (!dateTime) return '-'
  return new Date(dateTime).toLocaleString('zh-CN')
}

// 获取用户列表
const fetchUsers = async (resetPage = false) => {
  if (resetPage) {
    currentPage.value = 1
  }

  const params = new URLSearchParams({
    page: currentPage.value,
    pageSize: pageSize.value
  })

  if (searchUsername.value.trim()) {
    params.append('username', searchUsername.value.trim())
  }

  try {
    loading.value = true
    globalFetchError.value = null

    const response = await http.get(`/user/page?${params}`)
    const result = await response.json()

    if (result.code === 1 && result.data) {
      userData.value = result.data.records || []
      totalRecords.value = result.data.total || 0
      ElMessage.success('用户数据获取成功')
    } else {
      throw new Error(result.msg || '获取用户数据失败')
    }
  } catch (error) {
    console.error('获取用户数据失败:', error)
    globalFetchError.value = `获取用户数据失败: ${error.message}`
    ElMessage.error(`获取用户数据失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// 分页处理
const handlePageChange = (page) => {
  currentPage.value = page
  fetchUsers(false)
}

const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  fetchUsers(false)
}

// 显示新增用户对话框
const showAddUserDialog = () => {
  isEditMode.value = false
  resetUserForm()
  userDialogVisible.value = true
}

// 显示编辑用户对话框
const showEditUserDialog = (user) => {
  isEditMode.value = true
  userForm.id = user.id
  userForm.username = user.username
  userForm.password = ''
  userForm.confirmPassword = ''
  userForm.status = user.status
  userForm.manager = user.manager
  userDialogVisible.value = true
}

// 重置用户表单
const resetUserForm = () => {
  userForm.id = null
  userForm.username = ''
  userForm.password = ''
  userForm.confirmPassword = ''
  userForm.status = 1
  userForm.manager = 0
  nextTick(() => {
    userFormRef.value?.clearValidate()
  })
}

// 处理对话框关闭
const handleDialogClose = (done) => {
  ElMessageBox.confirm('确认关闭对话框？未保存的数据将丢失。')
    .then(() => {
      resetUserForm()
      done()
    })
    .catch(() => { })
}

// 提交用户表单
const submitUserForm = async () => {
  try {
    await userFormRef.value?.validate()
    submitting.value = true

    const submitData = {
      id: userForm.id,
      username: userForm.username,
      status: userForm.status,
      manager: userForm.manager
    }

    if (userForm.password) {
      submitData.password = userForm.password
    }

    let response
    if (isEditMode.value) {
      response = await http.put('/user', submitData)
    } else {
      response = await http.post('/user', submitData)
    }

    const result = await response.json()

    if (result.code === 1) {
      ElMessage.success(isEditMode.value ? '用户更新成功' : '用户创建成功')
      userDialogVisible.value = false
      resetUserForm()
      fetchUsers(false)
    } else {
      throw new Error(result.msg || '操作失败')
    }
  } catch (error) {
    console.error('提交用户表单失败:', error)
    ElMessage.error(`操作失败: ${error.message}`)
  } finally {
    submitting.value = false
  }
}

// 切换用户状态
const toggleUserStatus = async (user) => {
  const newStatus = user.status === 1 ? 0 : 1
  const statusText = newStatus === 1 ? '启用' : '禁用'

  try {
    await ElMessageBox.confirm(`确认${statusText}用户 "${user.username}"？`, '确认操作')
    const status = {
      id: user.id,
      status: newStatus,
    }

    const response = await http.post('/user/status', status)
    const result = await response.json()

    if (result.code === 1) {
      ElMessage.success(`用户${statusText}成功`)
      fetchUsers(false)
    } else {
      throw new Error(result.msg || '操作失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('切换用户状态失败:', error)
      ElMessage.error(`操作失败: ${error.message}`)
    }
  }
}

// 删除用户
const deleteUser = async (user) => {
  try {
    await ElMessageBox.confirm(`确认删除用户 "${user.username}"？此操作不可恢复。`, '确认删除', {
      type: 'warning'
    })

    const response = await http.delete(`/user/${user.id}`)
    const result = await response.json()

    if (result.code === 1) {
      ElMessage.success('用户删除成功')
      fetchUsers(false)
    } else {
      throw new Error(result.msg || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除用户失败:', error)
      ElMessage.error(`删除失败: ${error.message}`)
    }
  }
}
</script>

<style scoped>
.user-management-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: calc(100vh - 70px);
  padding: 10px;
  box-sizing: border-box;
  background-color: #f0f2f5;
}

.user-display-area {
  flex: 1;
  background-color: #ffffff;
  padding: 5px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.user-display-area-top {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;
  margin-bottom: 20px;
}

.search-container {
  display: flex;
  align-items: center;
}

.button-area {
  display: flex;
  gap: 10px;
}

h2 {
  color: #2c3e50;
  margin: 0 20px 20px;
  border-bottom: 2px solid #3498db;
  padding-bottom: 10px;
  flex-shrink: 0;
}

.user-data-container {
  flex: 1;
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.loading-data,
.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #909399;
}

.loading-data .el-icon {
  font-size: 24px;
  margin-bottom: 10px;
}

.data-table-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.pagination-container {
  margin-top: 15px;
  display: flex;
  justify-content: flex-end;
}

.global-error-message {
  background-color: #ffebee;
  color: #c62828;
  padding: 15px;
  margin: 0 15px 15px;
  border-radius: 4px;
  border: 1px solid #ef9a9a;
  text-align: center;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

:deep(.el-table) {
  height: 100%;
}

:deep(.el-table__body-wrapper) {
  overflow-y: auto;
}
</style>