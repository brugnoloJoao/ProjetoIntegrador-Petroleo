
<script setup>
import { ref, computed, watch } from "vue";

const props = defineProps({
  equipamentos: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["filtrar"]);

const busca = ref("");

function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const filtrados = computed(() => {
  const termo = normalizar(busca.value);

  return props.equipamentos.filter((equipamento) =>
    normalizar(
      `${equipamento.id} ${equipamento.nome}`
    ).includes(termo)
  );
});

watch(
  filtrados,
  (resultado) => {
    emit("filtrar", resultado);
  },
  { immediate: true }
);

function limparBusca() {
  busca.value = "";
}
</script>

<template>
  <div class="vue-busca">
    <div class="vue-busca-campo">
      <input
        v-model="busca"
        class="eng-search"
        type="text"
        placeholder="Buscar equipamentos - Vue.js"
        aria-label="Buscar equipamentos"
        autocomplete="off"
      />

      <button
        v-if="busca"
        type="button"
        class="vue-limpar"
        aria-label="Limpar pesquisa"
        @click="limparBusca"
      >
        ×
      </button>
    </div>

    <div class="vue-informacoes">
      <p class="vue-resultados" aria-live="polite">
        {{ filtrados.length }} de
        {{ equipamentos.length }} equipamentos encontrados
      </p>

      <span class="vue-identificacao">
        ● Vue.js ativo
      </span>
    </div>
  </div>
</template>

<style scoped>
.vue-busca {
  width: 100%;
  margin-bottom: 18px;
}

.vue-busca-campo {
  position: relative;
  width: 100%;
}

.vue-busca-campo input {
  width: 100%;
  box-sizing: border-box;
  padding: 13px 45px 13px 14px;
  margin-bottom: 0;
  background: #11151c;
  border: 1px solid #364050;
  border-radius: 8px;
  color: #f2f3f5;
  font-size: 13px;
  outline: none;
}

.vue-busca-campo input:focus {
  border-color: #f5aa32;
}

.vue-busca-campo input::placeholder {
  color: #919bad;
}

.vue-limpar {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  color: #f5aa32;
  font-size: 22px;
  cursor: pointer;
}

.vue-limpar:hover {
  color: #ffffff;
}

.vue-informacoes {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.vue-resultados {
  margin: 0;
  color: #919bad;
  font-size: 11px;
}

.vue-identificacao {
  color: #42b883;
  font-size: 10px;
  font-weight: 600;
}

@media (max-width: 480px) {
  .vue-informacoes {
    gap: 8px;
  }

  .vue-resultados {
    font-size: 10px;
  }
}
</style>
