<script setup>
import { computed, ref } from 'vue'
import { auditTimestamp, dataSources } from '@/services/dataSources'

const filter = ref('all')
const problematic = dataSources.filter((source) => ['critical', 'warning'].includes(source.state))
const total = dataSources.reduce((sum, source) => sum + source.total, 0)
const visibleSources = computed(() => filter.value === 'issues' ? problematic : dataSources)
const labels = { healthy: 'Замечаний не выявлено', warning: 'Требует внимания', critical: 'Критическая проблема', unknown: 'Нет результатов аудита' }
const severityLabels = { CRITICAL: 'Критично', WARNING: 'Предупреждение', INFO: 'Рекомендация' }
const auditDate = auditTimestamp ? new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Kyiv',
}).format(new Date(auditTimestamp)) : null
</script>

<template>
  <section class="sources-page">
    <div class="sources-intro">
      <div>
        <p class="eyebrow">ДАННЫЕ И КАЧЕСТВО</p>
        <h1>Источники данных</h1>
        <p class="sources-lead">Откуда берутся цифры в отчётах и что может повлиять на точность расчётов.</p>
      </div>
      <div class="audit-date"><span>Последний аудит</span><strong>{{ auditDate || 'Ещё не выполнен' }}</strong><small v-if="auditDate">Время Киева · сохранённый отчёт</small></div>
    </div>

    <div class="sources-stats" aria-label="Сводка аудита">
      <div><span>Ресурсов для расчётов</span><strong>{{ dataSources.length }} <small>2 источника + курсы</small></strong></div>
      <div><span>Требуют внимания</span><strong class="warning-text">{{ problematic.length }} <small>из {{ dataSources.length }} ресурсов</small></strong></div>
      <div><span>Замечаний в выборке</span><strong>{{ total }} <small>с учётом повторений</small></strong></div>
    </div>

    <p class="audit-notice">{{ auditDate ? 'Результаты относятся к моменту аудита. HTTP 200 подтверждает ответ сервиса, но не корректность его данных.' : 'Сохранённый отчёт отсутствует. Качество источников пока не оценено.' }}</p>

    <div class="sources-toolbar">
      <h2>Ресурсы и результаты проверки</h2>
      <div class="source-filters" aria-label="Фильтр источников">
        <button type="button" :aria-pressed="filter === 'all'" @click="filter = 'all'">Все · {{ dataSources.length }}</button>
        <button type="button" :aria-pressed="filter === 'issues'" @click="filter = 'issues'">С проблемами · {{ problematic.length }}</button>
      </div>
    </div>

    <div class="source-list">
      <article v-for="source in visibleSources" :key="source.id" class="source-card" :style="{ '--source-accent': source.accent }">
        <div class="source-heading">
          <div class="source-identity"><span class="source-icon" aria-hidden="true">{{ source.id === 'currency' ? '↔' : '≋' }}</span><div><p class="source-role">{{ source.role }} · {{ source.id }}</p><h3>{{ source.title }}</h3></div></div>
          <span class="audit-badge" :class="source.state">{{ labels[source.state] }}</span>
        </div>
        <p class="source-description">{{ source.description }}</p>
        <code class="source-endpoint">{{ source.endpoint }}</code>
        <dl class="source-metrics">
          <div><dt>Формат данных</dt><dd>{{ source.format }}</dd></div>
          <div><dt>Ответ при аудите</dt><dd>{{ source.status ? `HTTP ${source.status}` : 'Нет данных' }}</dd></div>
          <div><dt>Время ответа</dt><dd>{{ source.durationMs != null ? `${source.durationMs} мс` : '—' }}</dd></div>
          <div><dt>Размер выборки</dt><dd>{{ source.count ?? '—' }} записей</dd></div>
        </dl>
        <details v-if="source.issues.length" class="source-findings">
          <summary>Замечания: {{ source.total }} · Групп правил: {{ source.issues.length }} <span>Подробности</span></summary>
          <div v-for="issue in source.issues" :key="`${issue.severity}:${issue.code}`" class="source-issue">
            <div class="issue-meta"><span>{{ severityLabels[issue.severity] || issue.severity }} · {{ issue.count }} раз</span><code>{{ issue.code }}</code></div>
            <h4>{{ issue.message }}</h4>
            <p>{{ issue.impact }}</p>
            <p class="issue-fix"><strong>Рекомендация:</strong> {{ issue.recommendation }}</p>
          </div>
        </details>
        <p v-else class="source-clean">{{ source.state === 'healthy' ? 'В проверенной выборке замечаний не выявлено.' : 'Подробные замечания отсутствуют. Проверьте результат запроса в отчёте.' }}</p>
      </article>
      <p v-if="!visibleSources.length" class="audit-notice">Источников с выявленными проблемами нет.</p>
    </div>
    <p class="sources-footnote">Источник проверки: отчёт npm run audit:api. Повторяющиеся замечания объединены по правилам. В опубликованной версии результаты обновляются при следующей сборке приложения.</p>
  </section>
</template>

<style scoped>
.sources-page { padding-top: 36px; }
.sources-intro, .source-heading, .sources-toolbar, .source-identity { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.eyebrow { color: var(--accent-2); font-size: 11px; letter-spacing: .15em; margin: 0 0 10px; font-weight: 700; }
h1 { font-size: clamp(26px, 4vw, 34px); letter-spacing: -.03em; }
.sources-lead { max-width: 620px; margin: 12px 0 0; }
.audit-date { display: grid; gap: 5px; flex-shrink: 0; font-size: 12px; }
.audit-date strong { color: var(--text-h); font-weight: 500; }
.audit-date small { color: var(--muted); }
.sources-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 28px 0 18px; }
.sources-stats > div { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px 24px; }
.sources-stats span { font-size: 13px; }
.sources-stats strong { display: block; font-size: 32px; color: var(--text-h); margin-top: 8px; }
.sources-stats small { font-size: 12px; color: var(--muted); font-weight: 400; margin-left: 8px; }
.sources-stats .warning-text { color: var(--warning); }
.audit-notice { background: hsl(190 90% 55% / .05); border-left: 2px solid var(--accent-2); padding: 14px 18px; font-size: 13px; }
.sources-toolbar { margin: 32px 0 18px; }
h2 { font-size: 18px; }
.source-filters { display: flex; gap: 4px; padding: 4px; border: 1px solid var(--border); border-radius: 10px; }
.source-filters button { padding: 7px 12px; border-radius: 6px; font-size: 12px; }
.source-filters button[aria-pressed='true'] { background: var(--surface-hover); color: var(--text-h); }
.source-list { display: grid; gap: 18px; }
.source-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; min-width: 0; }
.source-identity { justify-content: flex-start; gap: 14px; }
.source-icon { width: 44px; height: 44px; border: 1px solid var(--source-accent); color: var(--source-accent); display: grid; place-items: center; border-radius: 12px; font-size: 26px; }
.source-role { margin: 0 0 3px; font-size: 11px; color: var(--muted); }
h3 { font-size: 20px; }
.audit-badge { border: 1px solid currentColor; border-radius: 30px; padding: 5px 10px; font-size: 11px; }
.warning { color: var(--warning); } .healthy { color: var(--success); } .critical { color: var(--danger); }
.source-description { margin: 18px 0 10px; font-size: 14px; }
.source-endpoint { display: block; font-family: var(--mono); font-size: 12px; color: var(--source-accent); overflow-wrap: anywhere; }
.source-metrics { display: grid; grid-template-columns: 2fr repeat(3, 1fr); gap: 16px; margin: 22px 0; }
dt { font-size: 11px; color: var(--muted); margin-bottom: 6px; } dd { margin: 0; font-size: 13px; color: var(--text-h); }
.source-findings { border-top: 1px solid var(--border); }
summary { cursor: pointer; padding-top: 16px; color: var(--warning); font-size: 13px; }
summary span { float: right; color: var(--text); font-size: 12px; }
.source-issue { border-top: 1px solid var(--border); margin-top: 18px; padding-top: 18px; }
.issue-meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 11px; color: var(--warning); }
.issue-meta code { color: var(--muted); overflow-wrap: anywhere; }
h4 { color: var(--text-h); font-size: 14px; margin: 10px 0; font-weight: 500; }
.source-issue p { font-size: 13px; margin: 8px 0; }
.issue-fix { background: var(--bg); padding: 12px; border-radius: var(--radius-sm); }
.source-clean { margin: 0; border-top: 1px solid var(--border); padding-top: 16px; font-size: 13px; color: var(--text); }
.sources-footnote { font-size: 12px; color: var(--muted); max-width: 800px; margin-top: 24px; }
button:focus-visible, summary:focus-visible { outline: 2px solid var(--accent-2); outline-offset: 4px; }
@media (max-width: 760px) {
  .sources-intro, .sources-toolbar { align-items: flex-start; flex-direction: column; }
  .sources-stats { gap: 8px; } .sources-stats > div { padding: 14px; } .sources-stats small { display: block; margin: 0; }
  .source-metrics { grid-template-columns: repeat(2, 1fr); } .source-heading { flex-wrap: wrap; gap: 12px; }
  .source-card { padding: 18px; } summary span { display: none; }
}
@media (max-width: 420px) { .sources-stats { grid-template-columns: 1fr; } .sources-stats strong { margin: 0; } }
</style>
