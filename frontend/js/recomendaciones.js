// ============================================================
//  RECOMENDACIONES Y CÁLCULO DE DOSIS
//  Fórmulas basadas en fuentes técnicas de acuicultura (FAO y
//  otras citadas). Son guías generales, no reemplazan la
//  asesoría de un biólogo o especialista acuícola.
// ============================================================
 
(function () {
  const STORAGE_KEY = 'aq_estanque_dimensiones';
 
  function guardarDimensiones(largo, ancho, profundidad) {
    const areaM2 = largo * ancho;
    const volumenM3 = areaM2 * profundidad;
    const areaHa = areaM2 / 10000;
    const datos = { largo, ancho, profundidad, areaM2, volumenM3, areaHa };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
    return datos;
  }
 
  function obtenerDimensiones() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch {
      return null;
    }
  }
 
  // ── pH fuera de rango (FAO) ──
  // Si pH < 6.5: 150-200 kg/ha de cal agrícola (CaCO3)
  function calcularDosisPH(valorPH, dims) {
    if (!dims) return null;
    if (valorPH >= 6.5) {
      return {
        titulo: 'pH alto',
        texto: 'Estas fórmulas cubren pH bajo (ácido). Para pH alto, consulta con tu biólogo la corrección adecuada (ej. revisar aireación o dilución).',
        calculable: false,
      };
    }
    const min = 150 * dims.areaHa;
    const max = 200 * dims.areaHa;
    return {
      titulo: 'Cal agrícola (CaCO₃)',
      texto: `Aplicar entre ${min.toFixed(1)} y ${max.toFixed(1)} kg de cal agrícola (según área de ${dims.areaHa.toFixed(3)} ha). Verificar el pH nuevamente una semana después; repetir si sigue bajo.`,
      calculable: true,
      fuente: 'FAO — Tratamiento de estanques por encalado',
    };
  }
 
  // ── Turbidez alta ──
  // 200-500 g/m³ de yeso agrícola
  function calcularDosisTurbidez(dims) {
    if (!dims) return null;
    const minKg = (200 * dims.volumenM3) / 1000;
    const maxKg = (500 * dims.volumenM3) / 1000;
    return {
      titulo: 'Yeso agrícola',
      texto: `Aplicar entre ${minKg.toFixed(2)} y ${maxKg.toFixed(2)} kg de yeso agrícola (según volumen de ${dims.volumenM3.toFixed(1)} m³). Disolver en un balde con agua antes de distribuir por la superficie.`,
      calculable: true,
      fuente: 'Manual técnico de piscicultura — Ministerio del Agro (Misiones)',
    };
  }
 
  // ── Oxígeno bajo — peróxido de hidrógeno, uso de EMERGENCIA ──
  // Tabla válida solo para OD entre 2.0 y 3.0 ppm (hipoxia severa)
  function calcularDosisOxigeno(valorOD, dims) {
    if (!dims) return null;
    if (valorOD > 3.0) {
      return {
        titulo: 'Oxígeno bajo — acción principal: aireación',
        texto: 'A este nivel, la fuente recomienda activar o aumentar la aireación como primera medida. La dosis de peróxido de hidrógeno documentada es solo para emergencias severas (OD entre 2.0 y 3.0 ppm).',
        calculable: false,
      };
    }
    const odClamp = Math.max(2.0, Math.min(3.0, valorOD));
    const mlPorM3 = 0.8 + (3.0 - odClamp) * 0.4;
    const totalMl = mlPorM3 * dims.volumenM3;
    return {
      titulo: '⚠️ Peróxido de hidrógeno (H₂O₂) — SOLO EMERGENCIA',
      texto: `Aplicar aproximadamente ${totalMl.toFixed(0)} mL de peróxido de hidrógeno (${mlPorM3.toFixed(2)} mL/m³ × ${dims.volumenM3.toFixed(1)} m³). Diluir en 20 L de agua del estanque por cada 100 mL antes de aplicar. Monitorear cada hora. Usar solo en caso de fallo del aireador o emergencia crítica.`,
      calculable: true,
      fuente: 'Piscicultura Eco Sostenible Chireno — Peróxido de hidrógeno como alternativa de emergencia',
    };
  }
 
  function detectarTipoSensor(mensaje) {
    const m = mensaje.toLowerCase();
    if (m.includes('ph')) return 'ph';
    if (m.includes('turbidez')) return 'turbidez';
    if (m.includes('oxígeno') || m.includes('oxigeno')) return 'oxigeno';
    if (m.includes('temperatura')) return 'temperatura';
    return null;
  }
 
  function obtenerRecomendacion(mensajeAlerta, valorActual) {
    const dims = obtenerDimensiones();
    const tipo = detectarTipoSensor(mensajeAlerta);
 
    if (tipo === 'temperatura') {
      return {
        titulo: 'Temperatura fuera de rango',
        texto: 'No existe una dosis química estándar para corregir temperatura. Revisa sombra/cobertura del estanque, profundidad, y considera aireación para homogenizar la columna de agua.',
        calculable: false,
      };
    }
 
    if (!dims) {
      return {
        titulo: 'Configura las dimensiones del estanque',
        texto: 'Para calcular la dosis exacta, ve a Umbrales → Configuración del Estanque y guarda el largo, ancho y profundidad.',
        calculable: false,
        faltaConfig: true,
      };
    }
 
    if (tipo === 'ph' && valorActual !== undefined) return calcularDosisPH(valorActual, dims);
    if (tipo === 'turbidez') return calcularDosisTurbidez(dims);
    if (tipo === 'oxigeno' && valorActual !== undefined) return calcularDosisOxigeno(valorActual, dims);
 
    return null;
  }
 
  // Expone las funciones globalmente para usarlas en otras páginas
  window.AquaSenseRecomendaciones = {
    guardarDimensiones,
    obtenerDimensiones,
    obtenerRecomendacion,
    detectarTipoSensor,
  };
})();
