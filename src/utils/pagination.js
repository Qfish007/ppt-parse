// 纯工具分页逻辑：零 Vue/UI 依赖，便于 TDD + 多处复用
// - slicePage(items, page, pageSize) → 当页切片
// - clampPage(total, page, pageSize) → 把 page 夹到 [1, totalPages] 有效区间

export function slicePage(items, page, pageSize) {
  const list = Array.isArray(items) ? items : []
  const size = Math.max(1, Math.floor(Number(pageSize) || 1))
  const p = Math.max(1, Math.floor(Number(page) || 1))
  const start = (p - 1) * size
  const end = start + size
  return list.slice(start, end)
}

export function clampPage(total, page, pageSize) {
  const n = Math.max(0, Math.floor(Number(total) || 0))
  const size = Math.max(1, Math.floor(Number(pageSize) || 1))
  const totalPages = n === 0 ? 1 : Math.max(1, Math.ceil(n / size))
  const p = Math.floor(Number(page) || 1)
  if (p < 1) return 1
  if (p > totalPages) return totalPages
  return p
}

export function totalPagesOf(total, pageSize) {
  const n = Math.max(0, Math.floor(Number(total) || 0))
  const size = Math.max(1, Math.floor(Number(pageSize) || 1))
  return n === 0 ? 1 : Math.max(1, Math.ceil(n / size))
}
