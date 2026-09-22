// 标签多选筛选关系：and=词条需同时包含全部所选标签；or=包含任一标签即可
// 未选择任何标签时不过滤（全部通过）
export function matchTagFilter(entryTagIds, selectedTagIds, relation = 'and') {
    const selected = Array.isArray(selectedTagIds) ? selectedTagIds : []
    if (!selected.length) return true
    const owned = new Set(Array.isArray(entryTagIds) ? entryTagIds : [])
    if (relation === 'or') return selected.some(tagId => owned.has(tagId))
    return selected.every(tagId => owned.has(tagId))
}
