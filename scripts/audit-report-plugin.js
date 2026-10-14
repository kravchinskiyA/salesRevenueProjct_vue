import fs from 'node:fs'
import path from 'node:path'

// Only the display model enters the client bundle, never raw responses or credentials.
export function readAuditReport(directory) {
  const files = fs.existsSync(directory)
    ? fs.readdirSync(directory).filter((name) => /^api-audit-data-.*\.json$/.test(name)).sort().reverse()
    : []
  if (!files.length) return { timestamp: null, sources: {} }
  const report = JSON.parse(fs.readFileSync(path.join(directory, files[0]), 'utf8'))
  const sources = {}
  for (const id of ['finance1', 'finance2', 'currency']) {
    const response = report.responses?.[id]
    const issues = (report.issues || []).filter((issue) =>
      id === 'currency' ? /currency|курсы/i.test(issue.endpoint) : issue.endpoint.includes(`/api/${id}`),
    )
    const groups = new Map()
    for (const issue of issues) {
      const key = `${issue.severity}:${issue.code}`
      if (!groups.has(key)) groups.set(key, {
        code: issue.code, severity: issue.severity,
        message: issue.message.replace(/ \(finance\d+\[\d+\]\)/g, ''),
        impact: issue.impact, recommendation: issue.recommendation, count: 0,
      })
      groups.get(key).count++
    }
    sources[id] = {
      checked: Boolean(response), status: response?.status ?? null,
      durationMs: response?.durationMs ?? null, count: response?.count ?? response?.length ?? null,
      issues: [...groups.values()], total: issues.length,
    }
  }
  return { timestamp: report.timestamp, sources }
}

export default function auditReportPlugin() {
  const moduleId = 'virtual:api-audit'
  const resolvedId = `\0${moduleId}`
  let directory
  return {
    name: 'api-audit-display-model',
    configResolved(config) { directory = path.join(config.root, 'reports') },
    resolveId(id) { if (id === moduleId) return resolvedId },
    load(id) {
      if (id !== resolvedId) return
      return `export default ${JSON.stringify(readAuditReport(directory))}`
    },
    configureServer(server) {
      server.watcher.add(directory)
      server.watcher.on('all', (_event, file) => {
        if (path.dirname(file) !== directory || !/^api-audit-data-.*\.json$/.test(path.basename(file))) return
        const module = server.moduleGraph.getModuleById(resolvedId)
        if (module) server.moduleGraph.invalidateModule(module)
        server.ws.send({ type: 'full-reload' })
      })
    },
  }
}
