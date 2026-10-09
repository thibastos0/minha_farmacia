# 🗺️ Especificação 04: Mapa da Frota (Leaflet.js), Métricas de SLA e CRUD do Catálogo

## 1. Mapa Gerencial da Frota (Leaflet.js)

### 1.1 O Desafio Técnico do Leaflet em Abas / Tabs
Em aplicações de página única (SPA) com abas dinâmicas, o Leaflet.js calcula o tamanho do contêiner (`container.offsetWidth` e `container.offsetHeight`) no momento de inicialização. Se o elemento `#map-gerencial` estiver dentro de uma aba oculta (`display: none` ou classe Tailwind `hidden`), o tamanho computado é `0x0px`, provocando:
- Tiles cinzas não carregados.
- Centro do mapa deslocado para o canto superior esquerdo.
- Marcadores agrupados ou fora de posição.

### 1.2 Protocolo de Correção Definitiva (`invalidateSize`)
Para garantir renderização impecável:
1. **Inicialização Preguiçosa e Instância Única:**
   - O mapa é instanciado apenas uma vez e gerenciado pelo serviço `fleetMapService.ts`.
2. **Hook de Ativação de Aba (`navManager.onFarmaciaActivated`):**
   - No momento em que o usuário clica para visualizar a aba da Farmácia, o método `map.invalidateSize()` é disparado após um curto atraso de ciclo de renderização:
   ```typescript
   navManager.onFarmaciaActivated(() => {
     setTimeout(() => {
       invalidateMapSize();
       renderMapMarkers();
     }, 100);
   });
   ```
3. **Coordenadas Oficiais de Indaiatuba - SP:**
   - Centro Padrão do Município: `[-23.0903, -47.2181]` (Centro / Polo Farmacêutico).
   - Nível de Zoom: `zoom: 14` (permite visualização detalhada de bairros como Jd. Morada do Sol, Cecap, Itaici e Parque Corolla).

### 1.3 Marcadores Personalizados e Camadas de Informação
- **Farmácia Central Municipal:** Marcador fixo em verde esmeralda com ícone de hospital (`fa-hospital`), identificando o ponto de origem e distribuição da RENAME.
- **Frota de Motoboys Municipais:** Marcadores em azul com ícone de moto (`fa-motorcycle`), exibindo em tempo real se o entregador está `Livre / Disponível` ou `Em Rota de Entrega` com o nome do munícipe de destino.
- **Popups Informativos e Reatividade:** Sempre que o estado do `StateStore` muda (ex: corrida aceita ou entregue), os marcadores e popups do mapa são re-renderizados automaticamente.

---

## 2. Métricas de Desempenho e Dashboard de Saúde Municipal

O painel gerencial consolida indicadores de nível de serviço (SLAs), demanda epidemiológica e vigilância de estoques:

### 2.1 Indicadores de Tempo e SLAs
- **Tempo Médio de Análise de Receita:** ~14 minutos (Meta: < 30 min).
- **Tempo Médio de Separação / Embalagem:** ~22 minutos (Meta: < 45 min).
- **Tempo Médio de Despacho e Entrega:** ~35 minutos (Meta: < 60 min).

### 2.2 Gráfico de Top 5 Medicamentos Mais Solicitados
- Consolida as prescrições registradas para gerar ranking dinâmico de medicamentos mais demandados (ex: Losartana 50mg, Dipirona 500mg, Amoxicilina 500mg, Metformina 850mg, Omeprazol 20mg) com barras de progresso percentual relativas à demanda total.

### 2.3 Painel de Ruptura de Estoque por UBS
- Monitoramento em tempo real do saldo de cada princípio ativo nas 5 unidades municipais de saúde (Farmácia Central, UBS Morada do Sol, UBS Itaici, UBS Cecap e UBS Parque Corolla).
- Alerta visual imediato destacando itens com saldo zerado e indicando quais unidades específicas estão desabastecidas.

---

## 3. CRUD Completo do Catálogo Municipal de Medicamentos

O farmacêutico possui autonomia total para gerir a lista de medicamentos disponibilizados pela rede pública municipal (RENAME Indaiatuba).

### 3.1 Campos do Registro de Medicamento
| Campo | Tipo | Descrição | Validação |
|---|---|---|---|
| `id` | string | Identificador único (ex: `med-01`) | Obrigatório |
| `name` | string | Nome do princípio ativo / comercial | Mínimo 3 caracteres |
| `dosage` | string | Concentração (ex: 50mg, 500mg, 10mg/ml) | Obrigatório |
| `presentation` | string | Forma farmacêutica (Comprimido, Frasco, Ampola) | Obrigatório |
| `category` | enum | `BASICO`, `CONTROLADO`, `CONTINUO`, `ANTIBIOTICO` | Obrigatório |
| `stockQuantity`| number | Saldo consolidado municipal | Inteiro >= 0 |
| `minStockAlert`| number | Limite mínimo para disparo de alerta de reposição | Inteiro > 0 (Padrão: 10) |
| `active` | boolean | Status ativo ou inativo no catálogo | Padrão: true |
| `estoquePorUnidade` | Record | Saldo distribuído pelas 5 UBSs de Indaiatuba | Opcional / Estruturado |

### 3.2 Operações do CRUD
1. **Create (Cadastrar Medicamento):**
   - Modal com formulário acessível e autocompletar integrado à lista padrão RENAME/SUS (`openModalNovoMedicamento()`).
2. **Read & Search (Listagem e Filtros):**
   - Busca em tempo real por nome e dosagem.
   - Badge visual de estoque crítico quando `stockQuantity <= minStockAlert`.
3. **Update (Ajuste Rápido de Saldo):**
   - Botões diretos de incremento e decremento rápido (`+10`, `-10`, `+1`, `-1`).
4. **Delete / Deactivate (Inativação Segura):**
   - Inativação lógica (soft delete) preservando a rastreabilidade e histórico de dispensações passadas.

### 3.3 Reabastecimento Reativo
- Ao adicionar saldo a um medicamento que estava em falta, a rotina `checkAndPromoteAwaitingOrders()` identifica automaticamente remessas com status `"AGUARDANDO_REPOSICAO"` e as promove para `"EM_SEPARACAO"`, atualizando instantaneamente os módulos da Farmácia, Entregador e Cidadão.
