/**
 * 将 MinIO 相对路径转为可访问的 URL
 * 数据库存 /neuron-avatar/avatar/xxx.png
 * 显示时变成 /minio/neuron-avatar/avatar/xxx.png（走 nginx 代理）
 *
 * 兼容旧数据：已经是完整 URL 的直接返回
 */
export function toFileUrl(path: string | null | undefined): string {
  if (!path) return ''
  // 兼容旧数据（完整 URL）
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  // 相对路径加 /minio 前缀
  const prefix = '/minio'
  if (path.startsWith('/')) {
    return prefix + path
  }
  return prefix + '/' + path
}
