import { createApp, computed, h, ref, watchEffect } from 'vue';

const alertStatuses = [
  { value: '', text: 'Todos' },
  { value: 'Ativo', text: 'Ativos' },
  { value: 'Reconhecido', text: 'Reconhecidos' },
  { value: 'Normalizado', text: 'Normalizados' },
];
const orderStatusLabels = { Aberta: 'Abertas', Aprovada: 'Aprovadas', Rejeitada: 'Rejeitadas', EmAndamento: 'Em andamento', Encerrada: 'Encerradas' };

function mountFilters({ root, rowSelector, statuses, placeholder, accessibleName }) {
  const currentStatus = root.dataset.status || '';
  createApp({
    setup() {
      const search = ref('');
      const selectedStatus = ref(currentStatus);
      const visibleRows = ref(0);
      const activeText = computed(() => statuses.find((item) => item.value === selectedStatus.value)?.text ?? 'Todos');
      watchEffect(() => {
        const normalized = search.value.trim().toLocaleLowerCase('pt-BR');
        let count = 0;
        document.querySelectorAll(rowSelector).forEach((row) => {
          const rowText = row.dataset.search?.toLocaleLowerCase('pt-BR') ?? '';
          const matchesSearch = !normalized || rowText.includes(normalized);
          const matchesStatus = !selectedStatus.value || row.dataset.status === selectedStatus.value;
          row.hidden = !(matchesSearch && matchesStatus);
          if (!row.hidden) count += 1;
        });
        visibleRows.value = count;
      });
      function chooseStatus(status) {
        const url = new URL(window.location.href);
        if (status) url.searchParams.set('status', status); else url.searchParams.delete('status');
        window.location.assign(url);
      }
      return () => h('div', { class: 'vue-alert-filters' }, [
        h('div', { class: 'vue-filter-tabs', role: 'group', 'aria-label': `Filtrar ${accessibleName} por status` }, statuses.map((item) => h('button', {
          key: item.value || 'all', type: 'button', class: ['vue-filter-tab', selectedStatus.value === item.value && 'is-selected'],
          'aria-pressed': selectedStatus.value === item.value, onClick: () => chooseStatus(item.value),
        }, item.text))),
        h('label', { class: 'vue-filter-search' }, [
          h('span', { 'aria-hidden': 'true' }, '⌕'),
          h('input', { value: search.value, type: 'search', placeholder, 'aria-label': placeholder, onInput: (event) => { search.value = event.target.value; } }),
          h('small', { 'aria-live': 'polite' }, `${visibleRows.value} ${visibleRows.value === 1 ? 'resultado' : 'resultados'}`),
        ]),
        h('span', { class: 'visually-hidden', 'aria-live': 'polite' }, `Filtro atual: ${activeText.value}`),
      ]);
    },
  }).mount(root);
}

const alertRoot = document.getElementById('alert-filters-app');
if (alertRoot) mountFilters({ root: alertRoot, rowSelector: '[data-alert-row]', statuses: alertStatuses, placeholder: 'Buscar equipamento ou parâmetro', accessibleName: 'alertas' });

const orderRoot = document.getElementById('os-filters-app');
if (orderRoot) {
  const availableStatuses = (orderRoot.dataset.statuses || '').split(',').filter(Boolean);
  const statuses = [{ value: '', text: 'Todas' }, ...availableStatuses.map((status) => ({ value: status, text: orderStatusLabels[status] ?? status }))];
  mountFilters({ root: orderRoot, rowSelector: '[data-order-row]', statuses, placeholder: 'Buscar título, equipamento ou prioridade', accessibleName: 'ordens de serviço' });
}
