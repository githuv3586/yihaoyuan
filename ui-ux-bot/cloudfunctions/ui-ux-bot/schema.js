/**
 * 数据库集合定义与索引配置
 * 
 * 集合清单：
 *   1. users          - 用户信息
 *   2. chat_sessions  - 对话会话
 *   3. chat_messages   - 对话消息
 *   4. design_systems  - 设计系统（收藏/缓存）
 *   5. api_usage       - API 调用统计
 */

module.exports = {

  // ==================== 集合定义 ====================

  collections: {
    users: {
      description: '用户信息',
      permissions: {
        read: true,
        write: 'doc.openid == auth.openid'
      },
      fields: {
        openid:       'string',   // 微信 openid（系统自动）
        nickname:     'string',   // 昵称
        avatar_url:   'string',   // 头像
        phone:        'string',   // 手机号（可选）
        role:         'string',   // 角色：user / admin
        status:       'number',   // 状态：1正常 / 0禁用
        design_count: 'number',   // 设计次数
        created_at:   'date',     // 注册时间
        updated_at:   'date',     // 更新时间
        last_login:   'date'      // 最后登录
      }
    },

    chat_sessions: {
      description: '对话会话',
      permissions: {
        read: 'doc.openid == auth.openid',
        write: 'doc.openid == auth.openid'
      },
      fields: {
        session_id:   'string',   // 会话唯一ID
        openid:       'string',   // 所属用户
        title:        'string',   // 会话标题（取首条消息摘要）
        status:       'string',   // active / archived / deleted
        msg_count:    'number',   // 消息总数
        last_msg_at:  'date',     // 最后消息时间
        created_at:   'date',     // 创建时间
        updated_at:   'date'      // 更新时间
      }
    },

    chat_messages: {
      description: '对话消息',
      permissions: {
        read: 'doc.openid == auth.openid',
        write: 'doc.openid == auth.openid'
      },
      fields: {
        session_id:   'string',   // 所属会话
        openid:       'string',   // 所属用户
        role:         'string',   // user / assistant
        content:      'string',   // 消息内容
        tokens_used:  'number',   // 本次消耗 token 数
        model:        'string',   // 使用的模型
        created_at:   'date'      // 创建时间
      }
    },

    design_systems: {
      description: '设计系统（收藏/缓存）',
      permissions: {
        read: 'doc.openid == auth.openid',
        write: 'doc.openid == auth.openid'
      },
      fields: {
        openid:       'string',   // 所属用户
        session_id:   'string',   // 来源会话
        title:        'string',   // 设计系统名称
        industry:     'string',   // 行业：SaaS / 电商 / 医疗 等
        style:        'string',   // 风格：极简 / 玻璃拟态 等
        colors:       'object',   // 配色方案 { primary, secondary, cta, bg, text }
        typography:   'object',   // 排版 { heading, body, font_sizes }
        components:   'array',    // 组件规范列表
        code_snippets:'array',    // 代码片段列表
        raw_reply:    'string',   // AI 原始回复（完整）
        is_favorite:  'boolean',  // 是否收藏
        created_at:   'date',     // 创建时间
        updated_at:   'date'      // 更新时间
      }
    },

    api_usage: {
      description: 'API 调用统计',
      permissions: {
        read: 'doc.openid == auth.openid',
        write: true
      },
      fields: {
        openid:       'string',   // 用户
        api_name:     'string',   // API 名称：glm-5-turbo
        prompt_tokens:'number',   // 输入 token
        completion_tokens: 'number', // 输出 token
        total_tokens: 'number',   // 总 token
        cost_cny:     'number',   // 费用（元）
        latency_ms:   'number',   // 响应耗时（ms）
        is_success:   'boolean',  // 是否成功
        error_msg:    'string',   // 错误信息（失败时）
        created_at:   'date'      // 调用时间
      }
    }
  },

  // ==================== 索引定义 ====================

  indexes: {
    users: [
      { name: 'openid_unique', fields: { openid: 1 }, unique: true }
    ],

    chat_sessions: [
      { name: 'openid_status',   fields: { openid: 1, status: 1 } },
      { name: 'openid_updated',  fields: { openid: 1, updated_at: -1 } },
      { name: 'session_id_unique', fields: { session_id: 1 }, unique: true }
    ],

    chat_messages: [
      { name: 'session_id_created', fields: { session_id: 1, created_at: 1 } },
      { name: 'openid_created',     fields: { openid: 1, created_at: -1 } }
    ],

    design_systems: [
      { name: 'openid_favorite',  fields: { openid: 1, is_favorite: -1 } },
      { name: 'openid_industry',  fields: { openid: 1, industry: 1 } },
      { name: 'openid_created',   fields: { openid: 1, created_at: -1 } },
      { name: 'session_id',       fields: { session_id: 1 } }
    ],

    api_usage: [
      { name: 'openid_created',   fields: { openid: 1, created_at: -1 } },
      { name: 'api_name_created', fields: { api_name: 1, created_at: -1 } },
      { name: 'created_at',       fields: { created_at: -1 } }
    ]
  }
};
