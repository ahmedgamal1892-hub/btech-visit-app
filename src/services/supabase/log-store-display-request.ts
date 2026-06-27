type StoreDisplayRequestLog = {
  caller: string
  method: 'GET' | 'HEAD'
  select: string
  filters: Record<string, string>
  order?: string
  prefer?: string
}

function getRestV1BaseUrl(): string {
  const raw = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
  const normalized = raw.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '')

  return `${normalized}/rest/v1`
}

function buildEquivalentSql(input: StoreDisplayRequestLog): string {
  const columns = input.select === '*' ? '*' : input.select
  const whereClauses = Object.entries(input.filters).map(([column, filter]) => {
    if (filter.startsWith('in.(') && filter.endsWith(')')) {
      const values = filter.slice(4, -1)
      return `${column} IN (${values})`
    }

    if (filter.startsWith('eq.')) {
      return `${column} = '${filter.slice(3)}'`
    }

    return `${column} ${filter}`
  })

  const where =
    whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : ''
  const order = input.order
    ? ` ORDER BY ${input.order.replace('.', ' ')}`
    : ''

  if (input.method === 'HEAD') {
    return `SELECT COUNT(*) FROM public.store_display${where};`
  }

  return `SELECT ${columns} FROM public.store_display${where}${order};`
}

export function logStoreDisplayPostgrestRequest(
  input: StoreDisplayRequestLog,
): void {
  const searchParams = new URLSearchParams()

  searchParams.set('select', input.select)

  for (const [column, filter] of Object.entries(input.filters)) {
    searchParams.set(column, filter)
  }

  if (input.order) {
    searchParams.set('order', input.order)
  }

  const requestPath = `/store_display?${searchParams.toString()}`
  const requestUrl = `${getRestV1BaseUrl()}${requestPath}`

  console.log('[store_display PostgREST request]', {
    caller: input.caller,
    method: input.method,
    table: 'store_display',
    requestUrl,
    postgrestQueryString: searchParams.toString(),
    postgrestFilters: input.filters,
    headers: input.prefer ? { Prefer: input.prefer } : undefined,
    equivalentSql: buildEquivalentSql(input),
  })
}
