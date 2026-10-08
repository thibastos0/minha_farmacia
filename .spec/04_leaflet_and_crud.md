# 🗺️ Especificação 04: Mapa da Frota (Leaflet.js) e CRUD do Catálogo Farmacêutico

## 1. Mapa Gerencial da Frota (Leaflet.js)

### 1.1 O Desafio Técnico do Leaflet em Abas / Tabs
Em aplicações SPA e painéis com múltiplas abas, o Leaflet.js calcula o tamanho do contêiner (`container.offsetWidth` e `container.offsetHeight`) no momento de inicialização. Se o elemento `#map-gerencial` estiver dentro de uma aba oculta (`display: none` ou classe Tailwind `hidden`), o tamanho computado é `0x0px`, provocando:
- Tiles cinzas não carregados.
- Centro do mapa deslocado para o canto superior esquerdo.
- Marcadores agrupados ou fora de posição.

### 1.2 Protocolo de Correção Definitiva (`invalidateSize`)
Para garantir renderização impecável:
1. **Inicialização Preguiçosa (Lazy Initialization):**
   - O mapa é instanciado apenas uma vez e associado a uma referência persistente.
2. **Hook de Ativação de Aba:**
   - No momento exato em que o usuário clica para visualizar a aba do mapa (ou quando a visualização `/farmacia` é ativada), o método `map.invalidateSize()` é disparado após o próximo ciclo de renderização do navegador:
   ```javascript
   function onMapTabVisible(leafletMapInstance) {
     if (!leafletMapInstance) return;
     requestAnimationFrame(() => {
       setTimeout(() => {
         leafletMapInstance.invalidateSize(true);
       }, 150);
     });
   }
   ```
3. **Coordenadas Oficiais de Indaiatuba - SP:**
   - Centro Padrão do Município: `[-23.0903, -47.2181]` (Centro / Parque Ecológico).
   - Farmácia Municipal Central: `[-23.0855, -47.2162]` (Rua Candelária / Polo Central de Saúde).
   - Nível de Zoom: `zoom: 13` (permite visualização ampla de bairros como Jd. Morada do Sol, Cecap, Itaici).

### 1.3 Marcadores e Custom Layers
- **Marcador da Farmácia Central:** Ícone verde com cruz hospitalar e popup informativo com estoque consolidado.
- **Marcadores de Motoboys:** Ícones azuis em formato de moto com popup exibindo o nome do entregador, placa do veículo, bateria/status e remessa atual sendo transportada.
- **Marcadores dos Munícipes:** Marcadores suaves de entrega mostrando endereço e status do `SubOrder`.

---

## 2. CRUD Completo do Catálogo Municipal de Medicamentos

O farmacêutico possui autonomia total para gerir a lista de medicamentos disponibilizados pela rede pública municipal (RENAME Indaiatuba).

### 2.1 Campos do Registro de Medicamento
| Campo | Tipo | Descrição | Validação |
|---|---|---|---|
| `id` | string | Identificador único (UUID ou slug) | Obrigatório |
| `name` | string | Nome do princípio ativo / comercial | Mínimo 3 caracteres |
| `dosage` | string | Concentração (ex: 50mg, 500mg, 10mg/ml) | Obrigatório |
| `presentation` | string | Forma farmacêutica (Comprimido, Frasco, Ampola) | Obrigatório |
| `category` | enum | `BASICO`, `CONTROLADO`, `CONTINUO`, `ANTIBIOTICO` | Obrigatório |
| `stockQuantity`| number | Saldo atual em unidades no almoxarifado | Inteiro >= 0 |
| `minStockAlert`| number | Limite mínimo para disparo de alerta de reposição | Inteiro > 0 (Padrão: 10) |
| `active` | boolean | Status ativo ou inativo no catálogo para dispensação | Padrão: true |

### 2.2 Operações do CRUD
1. **Create (Cadastrar Medicamento):**
   - Modal com formulário acessível (`aria-labelledby="modal-cadastro-titulo"`).
   - Validações de campos obrigatórios e prevenção de duplicidade de nome + dosagem.
2. **Read & Search (Listagem e Filtros):**
   - Busca em tempo real por nome ou princípio ativo.
   - Filtro por categoria e filtro por "Apenas itens com estoque baixo".
   - Indicação visual com badge vermelho pulsante quando `stockQuantity <= minStockAlert`.
3. **Update (Edição Completa e Ajuste Rápido de Estoque):**
   - Edição de dados cadastrais no modal.
   - Botões de ajuste rápido de estoque (`+10`, `-10`, `+1`, `-1`, além de suporte a deltas arbitrários como `+50` no serviço).
4. **Delete / Deactivate (Inativação Segura):**
   - Em conformidade com sistemas de saúde pública, a exclusão física é substituída por **Inativação Lógica (Soft Delete)**.
   - Medicamentos inativados deixam de aparecer para triagem de novos pedidos, mas preservam o histórico de dispensações e pedidos passados.
   - Possibilidade de reativação a qualquer momento.

### 2.3 Integração Reativa com Pedidos Aguardando Reposição
- Sempre que a operação de `Update` do estoque elevar o saldo de um medicamento para um valor positivo, o sistema executa automaticamente a rotina:
  1. Varredura de `SubOrder` com status `"AGUARDANDO_REPOSICAO"`.
  2. Alocação automática do novo saldo para o pedido mais antigo na fila.
  3. Transição da `SubOrder` para `"EM_SEPARACAO"`.
  4. Envio de notificação no portal do munícipe informando que a remessa pendente foi liberada.
