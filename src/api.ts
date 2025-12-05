// 简单的请求封装：优先尝试动态加载 alova 并使用它，若不可用则回退到 fetch
const DEFAULT_BASE = 'http://localhost:3000'

let baseURL = DEFAULT_BASE
let alovaClient: any = null

export function setApiBase(url: string) {
  baseURL = url
}

async function tryInitAlova() {
  if (alovaClient) return
  try {
    // 动态导入 alova，避免在未安装时构建报错
    // 使用间接 eval(import()) 跳过 Vite 的静态 import 分析

    const alovaMod = await (0, eval)('import("alova")')
    let adapter: any = undefined
    try {
      // 尝试导入 fetch 适配器

      const fetchAdapterMod = await (0, eval)('import("alova/adapter/fetch")')
      // some builds export default, some export createFetch
      adapter = (fetchAdapterMod && (fetchAdapterMod.default || fetchAdapterMod.createFetch))?.()
    } catch {
      // ignore adapter error, alova 也可能内置 fetch
    }

    const createAlova = alovaMod.createAlova || alovaMod.default?.createAlova || alovaMod
    if (typeof createAlova === 'function') {
      alovaClient = createAlova({ baseURL, requestAdapter: adapter })
    }
  } catch {
    // 动态导入失败时保持 alovaClient 为 null，使用 fetch 回退
    alovaClient = null
  }
}

async function fetchWithFallback(path: string, opts?: RequestInit) {
  const url = path.startsWith('http') ? path : `${baseURL}${path}`
  const res = await fetch(url, opts)
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(txt || `${res.status} ${res.statusText}`)
  }
  return res.json()
}

export async function get(path: string) {
  await tryInitAlova()
  if (alovaClient && typeof alovaClient.get === 'function') {
    // alova 的请求对象行为在不同版本可能不同，这里以通用方式尝试发送并解析返回值
    try {
      const req = alovaClient.get(path)
      // send 方法在大多数版本里存在
      if (typeof req.send === 'function') {
        const r = await req.send()
        return r.data ?? r
      }
      // fallback: 调用 request 并解析 result
      const r2 = await req.request?.()
      return r2?.data ?? r2
    } catch {
      // 如果 alova 请求失败或不可用，回退到 fetch
      return fetchWithFallback(path)
    }
  }

  return fetchWithFallback(path)
}

export async function getJson(url: string) {
  // 直接走 fetch（用于外部任意URL）
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

export default { setApiBase, get, getJson }
