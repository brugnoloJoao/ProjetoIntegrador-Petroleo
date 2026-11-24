import { useEffect, useRef } from "react";
import { createApp, reactive, h } from "vue";
import BuscaVue from "./BuscaEquipamentos.vue";

export default function BuscaEquipamentos({
  equipamentos,
  onFiltrar,
}) {
  const container = useRef(null);
  const estadoVue = useRef(null);
  const callback = useRef(onFiltrar);

  useEffect(() => {
    callback.current = onFiltrar;
  }, [onFiltrar]);

  useEffect(() => {
    const estado = reactive({
      equipamentos: [],
    });

    estadoVue.current = estado;

    const app = createApp({
      render() {
        return h(BuscaVue, {
          equipamentos: estado.equipamentos,
          onFiltrar: (resultado) => {
            callback.current(resultado);
          },
        });
      },
    });

    app.mount(container.current);

    return () => {
      app.unmount();
      estadoVue.current = null;
    };
  }, []);

  useEffect(() => {
    if (estadoVue.current) {
      estadoVue.current.equipamentos = equipamentos;
    }
  }, [equipamentos]);

  return <div ref={container} />;
}
