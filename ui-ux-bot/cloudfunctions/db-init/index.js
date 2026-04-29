/**
 * 数据库初始化云函数
 * 
 * 作用：创建所有集合 + 索引
 * 部署后手动调用一次即可：
 *   wx.cloud.callFunction({ name: 'db-init' })
 * 
 * 也可在 CloudBase 控制台手动触发
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const SCHEMA = require('./schema')

exports.main = async (event) => {
  const results = []

  for (const [colName, colDef] of Object.entries(SCHEMA.collections)) {
    // 1. 创建集合
    try {
      await db.createCollection(colName)
      results.push({ collection: colName, status: 'created' })
    } catch (e) {
      if (e.message.includes('already exists') || e.errCode === -1) {
        results.push({ collection: colName, status: 'already_exists' })
      } else {
        results.push({ collection: colName, status: 'error', error: e.message })
      }
    }
  }

  // 2. 创建索引
  const indexResults = []
  for (const [colName, indexes] of Object.entries(SCHEMA.indexes)) {
    for (const idx of indexes) {
      try {
        // CloudBase 通过 collection 的 index 接口创建
        // 注意：SDK 不直接支持索引创建，需要在控制台或使用 HTTP API
        // 这里记录需要创建的索引，实际创建在控制台完成
        indexResults.push({
          collection: colName,
          index: idx.name,
          fields: JSON.stringify(idx.fields),
          unique: idx.unique || false,
          status: 'needs_manual_create',
          hint: `在 CloudBase 控制台 → 数据库 → ${colName} → 索引管理 中手动创建`
        })
      } catch (e) {
        indexResults.push({
          collection: colName,
          index: idx.name,
          status: 'error',
          error: e.message
        })
      }
    }
  }

  return {
    code: 0,
    message: '数据库初始化完成',
    data: {
      collections: results,
      indexes: indexResults,
      next_steps: [
        '1. 在 CloudBase 控制台 → 数据库，确认集合已创建',
        '2. 在各集合的「索引管理」中，按 indexes 列表手动添加索引',
        '3. 在各集合的「数据权限」中，按 schema 设置权限规则'
      ]
    }
  }
}
