// HTTP请求工具函数
export const httpRequest = async (url, options = {}) => {
  // 获取token
  const token = localStorage.getItem('token')
  
  // 默认配置
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'token': `${token}` })
    }
  }
  
  // 合并配置
  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  }
  
  try {
    const response = await fetch(url, finalOptions)
    
    // 检查响应状态
    if (!response.ok) {
      // 如果是401未授权，清除token并跳转到登录页
      if (response.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
        throw new Error('登录已过期，请重新登录')
      }
      throw new Error(`服务器响应错误: ${response.status} ${response.statusText}`)
    }
    
    // 自动解析JSON响应
    const data = await response.json()
    return data
  } catch (error) {
    console.error('HTTP请求失败:', error)
    throw error
  }
}

// 便捷方法
export const http = {
  get: (url, options = {}) => httpRequest(url, { ...options, method: 'GET' }),
  post: (url, data, options = {}) => httpRequest(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data)
  }),
  put: (url, data, options = {}) => httpRequest(url, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (url, options = {}) => httpRequest(url, { ...options, method: 'DELETE' })
}