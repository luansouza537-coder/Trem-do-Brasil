import { GameEvent, GameResources, GameWorkers } from '../types';

export interface ScheduledEventDef {
  id: string;
  triggerYear: number;
  triggerMonth: number; // 1-based: 4=Abr, 8=Ago, 12=Dez
  title: string;
  description: string;
  lore?: string;
  category: 'POL' | 'CRI' | 'POS' | 'NEU';
  party?: 'PL' | 'PS' | 'PB';
  immediateCash?: number; // positivo=ganho, negativo=débito
  gameEvent?: {
    type: GameEvent['type'];
    statusEffect: string;
    durationMonths: number;
    costPerMonth?: number;
    costToResolve?: number;
    workerLoss?: { role: keyof GameWorkers; amount: number };
    revenueMultiplier?: number;
    monthlyBonus?: number;
    resourceMultipliers?: Partial<Record<keyof GameResources, number>>;
    constructionSlowFactor?: number;
    balsaFrozen?: boolean;
    blockConstruction?: boolean;
    payrollMultiplier?: number;
  };
}

export const SCHEDULED_EVENTS: ScheduledEventDef[] = [
  // ── 2027 ──
  { id:'ev001', triggerYear:2027, triggerMonth:4, category:'POS', title:'Subsídio Emergencial de Abertura', description:'O governo federal libera recursos extraordinários para impulsionar o início das obras ferroviárias nacionais da RENIF.', immediateCash:10_000_000_000 },
  { id:'ev002', triggerYear:2027, triggerMonth:8, category:'CRI', title:'Escassez Nacional de Cimento', description:'Crise no setor de construção civil drenou os estoques nacionais. Todas as obras avançam mais devagar por falta de cimento no mercado.', gameEvent:{ type:'crisis', statusEffect:'ESCASSEZ_CIMENTO', durationMonths:4, costToResolve:8_000_000_000, constructionSlowFactor:1.5 } },
  { id:'ev003', triggerYear:2027, triggerMonth:12, category:'POL', title:'Eleição — Partido Liberal assume', description:'O Partido Liberal vence as eleições e implementa corte de gastos públicos, reduzindo repasses à RENIF.', party:'PL' },

  // ── 2028 ──
  { id:'ev004', triggerYear:2028, triggerMonth:4, category:'POS', title:'Colheita Recorde no Agronegócio', description:'Safra histórica gera demanda por escoamento ferroviário e atrai investidores para o setor de logística.', immediateCash:5_000_000_000 },
  { id:'ev005', triggerYear:2028, triggerMonth:8, category:'CRI', title:'Greve Geral Ferroviária 🚧', description:'Sindicatos paralisaram parcialmente as obras. Os trabalhadores exigem aumento salarial e melhores condições de campo. A RENIF paga multas mensais até a resolução.', gameEvent:{ type:'strike', statusEffect:'GREVE_GERAL', durationMonths:12, costPerMonth:3_000_000_000, costToResolve:20_000_000_000 } },
  { id:'ev006', triggerYear:2028, triggerMonth:12, category:'NEU', title:'Festa do Peão de Barretos', description:'O maior rodeio do Brasil movimenta o interior paulista e impulsiona a demanda por transporte ferroviário regional.', gameEvent:{ type:'neutral', statusEffect:'FESTA_PEAO', durationMonths:1, revenueMultiplier:1.10 } },

  // ── 2029 ──
  { id:'ev007', triggerYear:2029, triggerMonth:4, category:'CRI', title:'Impasse de Licença na Amazônia 🌳', description:'O IBAMA suspendeu licenças de obras na Região Norte para revisão de estudos ambientais. Custos de aço e cimento sobem no Norte.', gameEvent:{ type:'env_delay', statusEffect:'ATRASO_AMBIENTAL_AMAZONIA', durationMonths:18, costPerMonth:2_000_000_000, costToResolve:20_000_000_000 } },
  { id:'ev008', triggerYear:2029, triggerMonth:8, category:'POS', title:'Boom do MATOPIBA 🌾', description:'Safra recorde no corredor agrícola Maranhão–Tocantins–Piauí–Bahia gera demanda histórica por frete ferroviário, elevando a receita mensal da RENIF.', gameEvent:{ type:'positive', statusEffect:'BOOM_MATOPIBA', durationMonths:8, monthlyBonus:2_500_000_000 } },
  { id:'ev009', triggerYear:2029, triggerMonth:12, category:'CRI', title:'Tensão Geopolítica com Argentina', description:'Disputa comercial no Mercosul encarece o cobre minerado no mercado internacional por seis meses.', gameEvent:{ type:'crisis', statusEffect:'TENSAO_GEOPOLITICA', durationMonths:6, costToResolve:6_000_000_000, resourceMultipliers:{ cobre:1.8 } } },

  // ── 2030 ──
  { id:'ev010', triggerYear:2030, triggerMonth:4, category:'POS', title:'Acordo com BNDES', description:'O banco nacional libera crédito emergencial para ampliar o capital de giro da RENIF e financiar novas linhas.', immediateCash:8_000_000_000 },
  { id:'ev011', triggerYear:2030, triggerMonth:8, category:'CRI', title:'Ataque Cibernético aos Sistemas 💻', description:'Hackers paralisaram os sistemas de bilhetagem e monitoramento de carga da RENIF. Toda receita mensal fica zerada enquanto os sistemas são restaurados.', gameEvent:{ type:'cyber', statusEffect:'CYBER_ATAQUE', durationMonths:3, costToResolve:8_000_000_000 } },
  { id:'ev012', triggerYear:2030, triggerMonth:12, category:'POS', title:'Parceria Público-Privada no Aço', description:'Acordo com consórcio siderúrgico garante fornecimento prioritário de aço com desconto por dois anos.', gameEvent:{ type:'positive', statusEffect:'PPP_ACO', durationMonths:24, resourceMultipliers:{ aco:0.80 } } },

  // ── 2031 ──
  { id:'ev013', triggerYear:2031, triggerMonth:4, category:'CRI', title:'Grande Cheia no Pantanal 🌧️', description:'Chuvas torrenciais inundaram MS e MT. Dormentes levados pelas corredeiras elevam o consumo de madeira em toda a malha.', gameEvent:{ type:'natural', statusEffect:'ESCASSES_MADEIRA', durationMonths:14, costPerMonth:1_500_000_000, costToResolve:12_000_000_000 } },
  { id:'ev014', triggerYear:2031, triggerMonth:8, category:'NEU', title:'Campanha de Vacinação Nacional', description:'Programa nacional reduz absenteísmo nas frentes de obra, acelerando levemente o ritmo de construção.', gameEvent:{ type:'neutral', statusEffect:'VACINACAO', durationMonths:6, constructionSlowFactor:0.95 } },
  { id:'ev015', triggerYear:2031, triggerMonth:12, category:'POL', title:'Eleição — Partido Social assume', description:'O Partido Social vence com plataforma pró-infraestrutura e estabelece subsídio mensal direto à RENIF.', party:'PS' },

  // ── 2032 ──
  { id:'ev016', triggerYear:2032, triggerMonth:4, category:'CRI', title:'Auditoria da CGU 🔍', description:'A Controladoria-Geral da União abriu auditoria emergencial nos contratos da RENIF. Recursos são bloqueados mensalmente durante o processo.', gameEvent:{ type:'politics', statusEffect:'AUDITORIA_CGU', durationMonths:6, costPerMonth:5_000_000_000, costToResolve:17_000_000_000 } },
  { id:'ev017', triggerYear:2032, triggerMonth:8, category:'POS', title:'Inovação Tecnológica em Detonação', description:'Nova técnica de detonação controlada com drones reduz significativamente o consumo de explosivos em obras de túneis e cortes.', gameEvent:{ type:'positive', statusEffect:'INOV_EXPLOSIVOS', durationMonths:120, resourceMultipliers:{ explosivos:0.70 } } },
  { id:'ev018', triggerYear:2032, triggerMonth:12, category:'CRI', title:'Super Inflação de Insumos 📈', description:'Escalada geopolítica travou cargueiros de minério: Aço e Cobre dobram de preço no mercado internacional.', gameEvent:{ type:'crisis', statusEffect:'INFLACAO_GLOBAL', durationMonths:10, costToResolve:12_000_000_000 } },

  // ── 2033 ──
  { id:'ev019', triggerYear:2033, triggerMonth:4, category:'POS', title:'Recorde de Exportação Brasileiro', description:'Volume de exportações bate recorde histórico, gerando excedente de receita que é repassado parcialmente à RENIF.', immediateCash:15_000_000_000 },
  { id:'ev020', triggerYear:2033, triggerMonth:8, category:'CRI', title:'Acidente Grave em Frente de Obra ⚠️', description:'Uma explosão descontrolada em canteiro de túnel causou baixas na equipe. Especialistas em Explosivos foram afastados e a RENIF paga indenizações imediatas.', gameEvent:{ type:'accident', statusEffect:'ACIDENTE_OBRA', durationMonths:1, workerLoss:{ role:'explosivos', amount:80 } } },
  { id:'ev021', triggerYear:2033, triggerMonth:12, category:'CRI', title:'Seca Severa no Tocantins 🏜️', description:'Nível histórico baixo do Rio Tocantins e afluentes paralisou totalmente o transporte hidroviário. Receita de balsas = R$0 por 8 meses.', gameEvent:{ type:'natural', statusEffect:'SECA_TOCANTINS', durationMonths:8, costToResolve:6_000_000_000 } },

  // ── 2034 ──
  { id:'ev022', triggerYear:2034, triggerMonth:4, category:'CRI', title:'Multas e Emendas Legislativas 🏛️', description:'Bancadas bloquearam autorizações de novas construções ferroviárias. Nenhuma obra pode ser iniciada enquanto a crise perdurar.', gameEvent:{ type:'politics', statusEffect:'LOBBY_REGIONAL', durationMonths:8, costPerMonth:2_000_000_000, costToResolve:9_000_000_000, blockConstruction:true } },
  { id:'ev023', triggerYear:2034, triggerMonth:8, category:'NEU', title:'Novo Recorde de Quilometragem RENIF', description:'A malha ferroviária nacional atinge um marco histórico de quilometragem, gerando reconhecimento e doações voluntárias.', immediateCash:3_000_000_000 },
  { id:'ev024', triggerYear:2034, triggerMonth:12, category:'CRI', title:'Queimadas no Cerrado', description:'Incêndios devastadores danificam estoques de dormentes e materiais de obra armazenados ao longo do cerrado central.', immediateCash:-5_000_000_000 },

  // ── 2035 ──
  { id:'ev025', triggerYear:2035, triggerMonth:4, category:'POS', title:'Copa do Mundo no Brasil ⚽', description:'O Brasil sedia a Copa do Mundo, gerando fluxo histórico de passageiros e turistas que lotam as ferrovias nacionais.', gameEvent:{ type:'positive', statusEffect:'COPA_MUNDO_2035', durationMonths:4, monthlyBonus:2_000_000_000 } },
  { id:'ev026', triggerYear:2035, triggerMonth:8, category:'CRI', title:'Conflito Fundiário no Cerrado 🌾', description:'Movimentos rurais e indígenas bloquearam obras em MT e GO judicialmente. Nenhuma ferrovia pode ser iniciada enquanto o conflito perdurar.', gameEvent:{ type:'politics', statusEffect:'CONFLITO_FUNDIARIO', durationMonths:10, costPerMonth:1_500_000_000, costToResolve:8_000_000_000, blockConstruction:true } },
  { id:'ev027', triggerYear:2035, triggerMonth:12, category:'POL', title:'Eleição — Partido Brasil assume', description:'O Partido Brasil vence com proposta de neutralidade fiscal, mantendo repasses existentes sem alterações.', party:'PB' },

  // ── 2036 ──
  { id:'ev028', triggerYear:2036, triggerMonth:4, category:'POS', title:'Reforma Tributária Federal', description:'Nova legislação tributária reduz impostos sobre insumos de construção, beneficiando toda a cadeia de obras ferroviárias.', gameEvent:{ type:'positive', statusEffect:'REFORMA_TRIB', durationMonths:12, resourceMultipliers:{ aco:0.90, brita:0.90, madeira:0.90, cimento:0.90, cobre:0.90, explosivos:0.90 } } },
  { id:'ev029', triggerYear:2036, triggerMonth:8, category:'POS', title:'Greve dos Caminhoneiros', description:'A paralisação do transporte rodoviário impulsiona a demanda pelo modal ferroviário, aumentando a receita da RENIF por 3 meses.', gameEvent:{ type:'positive', statusEffect:'GREVE_CAMINHONEIROS', durationMonths:3, revenueMultiplier:1.30 } },
  { id:'ev030', triggerYear:2036, triggerMonth:12, category:'CRI', title:'Pressão de Ambientalistas', description:'Organizações ambientais pressionam o governo com ações judiciais contra trechos da RENIF. A empresa paga compensações para encerrar os processos.', immediateCash:-12_000_000_000 },

  // ── 2037 ──
  { id:'ev031', triggerYear:2037, triggerMonth:4, category:'NEU', title:'Documentário da RENIF Vira Viral 📱', description:'Série documental sobre a construção da malha ferroviária nacional faz sucesso nas plataformas digitais, gerando doações e apoio popular.', immediateCash:3_000_000_000 },
  { id:'ev032', triggerYear:2037, triggerMonth:8, category:'CRI', title:'Tensão Diplomática com Venezuela', description:'Disputa territorial nas fronteiras encarece o fornecimento de cobre proveniente da região andina por 4 meses.', gameEvent:{ type:'crisis', statusEffect:'TENSAO_VENEZUELA', durationMonths:4, resourceMultipliers:{ cobre:1.60 } } },
  { id:'ev033', triggerYear:2037, triggerMonth:12, category:'POS', title:'Descoberta de Aquífero', description:'Novo aquífero descoberto em obras de escavação reduz custos com água industrial, impactando o preço de brita e cimento nas regiões afetadas.', gameEvent:{ type:'positive', statusEffect:'AQUIFERO', durationMonths:24, resourceMultipliers:{ brita:0.80, cimento:0.80 } } },

  // ── 2038 ──
  { id:'ev034', triggerYear:2038, triggerMonth:4, category:'CRI', title:'Crise de Energia Elétrica ⚡', description:'Colapso no sistema elétrico nacional eleva o custo de produção siderúrgica, encarecendo o aço no mercado interno.', gameEvent:{ type:'crisis', statusEffect:'CRISE_ENERGIA', durationMonths:6, resourceMultipliers:{ aco:1.40 } } },
  { id:'ev035', triggerYear:2038, triggerMonth:8, category:'CRI', title:'Pandemia de Gripe Aviária', description:'Surto limita a circulação de trabalhadores nas frentes de obra, reduzindo levemente a receita operacional por 6 meses.', gameEvent:{ type:'natural', statusEffect:'GRIPE_AVIARIA', durationMonths:6, revenueMultiplier:0.95 } },
  { id:'ev036', triggerYear:2038, triggerMonth:12, category:'POS', title:'Acordo Mercosul–UE', description:'Novo tratado comercial reduz tarifas de importação de brita e cimento europeu, beneficiando as obras da RENIF por dois anos.', gameEvent:{ type:'positive', statusEffect:'MERCOSUL_UE', durationMonths:24, resourceMultipliers:{ brita:0.85, cimento:0.85 } } },

  // ── 2039 ──
  { id:'ev037', triggerYear:2039, triggerMonth:4, category:'CRI', title:'Furacão Atípico no Sul', description:'Ventos históricos devastam infraestrutura no Sul do Brasil, exigindo pagamento emergencial de reparos em trechos da malha.', immediateCash:-8_000_000_000 },
  { id:'ev038', triggerYear:2039, triggerMonth:8, category:'POS', title:'Startup de Logística Ferroviária', description:'Empresa de tecnologia firma parceria com a RENIF para otimizar rotas e reduzir ociosidade, aumentando a receita permanentemente.', gameEvent:{ type:'positive', statusEffect:'STARTUP_LOGISTICA', durationMonths:120, revenueMultiplier:1.10 } },
  { id:'ev039', triggerYear:2039, triggerMonth:12, category:'POL', title:'Eleição — Partido Liberal assume', description:'O Partido Liberal retorna ao poder com agenda de austeridade fiscal, impondo corte de 15% na receita repassada à RENIF.', party:'PL' },

  // ── 2040 ──
  { id:'ev040', triggerYear:2040, triggerMonth:4, category:'CRI', title:'Escândalo de Corrupção na RENIF', description:'Investigação jornalística expõe superfaturamento em licitações. CPI instalada no Congresso drena recursos mensalmente.', gameEvent:{ type:'politics', statusEffect:'CORRUPCAO_RENIF', durationMonths:4, costPerMonth:4_000_000_000, costToResolve:9_000_000_000 } },
  { id:'ev041', triggerYear:2040, triggerMonth:8, category:'POS', title:'Olimpíadas no Brasil 🏅', description:'Os Jogos Olímpicos atraem milhões de visitantes ao país, gerando demanda extraordinária pelo transporte ferroviário.', gameEvent:{ type:'positive', statusEffect:'OLIMPIADAS', durationMonths:6, monthlyBonus:3_000_000_000 } },
  { id:'ev042', triggerYear:2040, triggerMonth:12, category:'CRI', title:'Seca no Nordeste', description:'Estiagem prolongada obriga o uso de abastecimento alternativo de água nas obras do semiárido, elevando os custos e o tempo de construção.', gameEvent:{ type:'natural', statusEffect:'SECA_NORDESTE', durationMonths:8, constructionSlowFactor:1.30 } },

  // ── 2041 ──
  { id:'ev043', triggerYear:2041, triggerMonth:4, category:'CRI', title:'Greve dos Fiscais Federais', description:'A paralisação dos órgãos de licenciamento atrasa alvarás e vistorias, tornando as obras 50% mais lentas por 3 meses.', gameEvent:{ type:'strike', statusEffect:'GREVE_FISCAIS', durationMonths:3, constructionSlowFactor:1.50 } },
  { id:'ev044', triggerYear:2041, triggerMonth:8, category:'POS', title:'Descoberta de Terras Raras', description:'Depósito de terras raras encontrado durante escavações no cerrado gera royalties mensais para a RENIF por 12 meses.', gameEvent:{ type:'positive', statusEffect:'TERRAS_RARAS', durationMonths:12, monthlyBonus:2_000_000_000 } },
  { id:'ev045', triggerYear:2041, triggerMonth:12, category:'CRI', title:'Onda de Calor Extremo no Centro-Oeste 🌡️', description:'Temperaturas acima de 48°C paralisam frentes de obra em MT, GO e MS. Trabalhadores entram em regime emergencial de horários reduzidos.', gameEvent:{ type:'natural', statusEffect:'CALOR_EXTREMO', durationMonths:3, constructionSlowFactor:1.40 } },

  // ── 2042 ──
  { id:'ev046', triggerYear:2042, triggerMonth:4, category:'NEU', title:'Ferrovia Bioceânica Concluída', description:'A conclusão da ferrovia bioceânica vizinha gera fluxo de cargas adicionais para a malha da RENIF, resultando em bônus de interoperabilidade.', immediateCash:5_000_000_000 },
  { id:'ev047', triggerYear:2042, triggerMonth:8, category:'CRI', title:'Ataque de Hackers aos Sistemas', description:'Novo ataque cibernético compromete parcialmente os sistemas de cobrança da RENIF, reduzindo a receita coletada por 2 meses.', gameEvent:{ type:'cyber', statusEffect:'HACK_PARCIAL', durationMonths:2, revenueMultiplier:0.60 } },
  { id:'ev048', triggerYear:2042, triggerMonth:12, category:'CRI', title:'Conflito Indígena no Norte', description:'Comunidades indígenas bloqueiam obras e obtêm liminar judicial, gerando custas processuais mensais até um acordo ser firmado.', gameEvent:{ type:'politics', statusEffect:'CONFLITO_INDIGENA', durationMonths:6, costPerMonth:3_000_000_000, costToResolve:10_000_000_000 } },

  // ── 2043 ──
  { id:'ev049', triggerYear:2043, triggerMonth:4, category:'POS', title:'Programa de Eficiência Energética', description:'Modernização dos sistemas de produção industrial reduz o custo de todos os insumos de construção ferroviária por longo período.', gameEvent:{ type:'positive', statusEffect:'EFICIENCIA_ENERGETICA', durationMonths:120, resourceMultipliers:{ aco:0.85, brita:0.85, madeira:0.85, cimento:0.85, cobre:0.85, explosivos:0.85 } } },
  { id:'ev050', triggerYear:2043, triggerMonth:8, category:'NEU', title:'Fusão de Siderúrgicas Nacionais', description:'Consolidação do mercado siderúrgico cria competição maior e reduz o preço do aço por 12 meses.', gameEvent:{ type:'neutral', statusEffect:'FUSAO_SIDER', durationMonths:12, resourceMultipliers:{ aco:0.90 } } },
  { id:'ev051', triggerYear:2043, triggerMonth:12, category:'POL', title:'Eleição — Partido Social assume', description:'O Partido Social é eleito novamente com proposta de expansão ferroviária nacional e subsídio mensal direto à RENIF.', party:'PS' },

  // ── 2044 ──
  { id:'ev052', triggerYear:2044, triggerMonth:4, category:'CRI', title:'Inverno Rigoroso no Sul', description:'Geadas e neve atípica causam danos em trechos ferroviários do Sul, exigindo reparos emergenciais custosos.', immediateCash:-6_000_000_000 },
  { id:'ev053', triggerYear:2044, triggerMonth:8, category:'CRI', title:'Terremoto em Minas Gerais', description:'Tremor incomum para a região danifica trechos ferroviários em MG, reduzindo a receita de passagem por 4 meses.', gameEvent:{ type:'natural', statusEffect:'TERREMOTO_MG', durationMonths:4, revenueMultiplier:0.85 } },
  { id:'ev054', triggerYear:2044, triggerMonth:12, category:'POS', title:'Bolha de Commodities', description:'Alta histórica nos preços das commodities gera superávit extraordinário que é parcialmente repassado à RENIF pelo governo.', immediateCash:20_000_000_000 },

  // ── 2045 ──
  { id:'ev055', triggerYear:2045, triggerMonth:4, category:'CRI', title:'Gripe Suína — Nova Cepa', description:'Novo surto de gripe suína eleva o absenteísmo nas obras, reduzindo levemente a eficiência das frentes de construção.', gameEvent:{ type:'natural', statusEffect:'GRIPE_SUINA', durationMonths:4, constructionSlowFactor:1.10 } },
  { id:'ev056', triggerYear:2045, triggerMonth:8, category:'CRI', title:'Fóssil Raro Encontrado em Escavação 🦕', description:'Paleontólogos e IPHAN interditam canteiro de obras em MG após descoberta de fóssil de dinossauro, gerando custos e atrasos imediatos.', immediateCash:-6_000_000_000, gameEvent:{ type:'crisis', statusEffect:'FOSSIL_RARO', durationMonths:2, constructionSlowFactor:1.50 } },
  { id:'ev057', triggerYear:2045, triggerMonth:12, category:'POS', title:'Nova Fronteira Agrícola — MATOPIBA 2', description:'Segunda expansão do corredor agrícola MATOPIBA gera nova onda de demanda por frete ferroviário na região central.', gameEvent:{ type:'positive', statusEffect:'MATOPIBA2', durationMonths:8, monthlyBonus:1_500_000_000 } },

  // ── 2046 ──
  { id:'ev058', triggerYear:2046, triggerMonth:4, category:'CRI', title:'Crise Diplomática com China', description:'Tensão comercial com a China eleva tarifas de importação de aço, encarecendo o material por 6 meses no mercado nacional.', gameEvent:{ type:'crisis', statusEffect:'CRISE_CHINA', durationMonths:6, resourceMultipliers:{ aco:1.50 } } },
  { id:'ev059', triggerYear:2046, triggerMonth:8, category:'POS', title:'Recorde Histórico de Passageiros', description:'A malha ferroviária registra recorde de passageiros transportados, gerando bônus de receita operacional por 6 meses.', gameEvent:{ type:'positive', statusEffect:'RECORDE_PASS', durationMonths:6, monthlyBonus:2_000_000_000 } },
  { id:'ev060', triggerYear:2046, triggerMonth:12, category:'NEU', title:'Visita do Papa ao Brasil ✝️', description:'Peregrinação nacional movimenta milhões de fiéis pelo país. Trens lotados nas rotas do interior elevam a receita temporariamente.', gameEvent:{ type:'neutral', statusEffect:'VISITA_PAPA', durationMonths:2, revenueMultiplier:1.20 } },

  // ── 2047 ──
  { id:'ev061', triggerYear:2047, triggerMonth:4, category:'CRI', title:'Greve dos Auditores Fiscais', description:'Paralisação dos auditores do fisco suspende incentivos fiscais e gera multas mensais por não conformidade contratual.', gameEvent:{ type:'politics', statusEffect:'GREVE_AUDITORES', durationMonths:5, costPerMonth:2_000_000_000 } },
  { id:'ev062', triggerYear:2047, triggerMonth:8, category:'POS', title:'Prêmio Internacional de Sustentabilidade', description:'A RENIF recebe premiação global pelo uso sustentável de materiais, atraindo financiamento com desconto em insumos ambientalmente certificados.', gameEvent:{ type:'positive', statusEffect:'PREMIO_SUST', durationMonths:96, resourceMultipliers:{ aco:0.85, brita:0.85, madeira:0.85, cimento:0.85 } } },
  { id:'ev063', triggerYear:2047, triggerMonth:12, category:'POL', title:'Eleição — Partido Brasil assume', description:'O Partido Brasil vence mantendo política de neutralidade e estabilidade, sem impactos diretos no orçamento da RENIF.', party:'PB' },

  // ── 2048 ──
  { id:'ev064', triggerYear:2048, triggerMonth:4, category:'CRI', title:'Furacão no Litoral Nordeste', description:'Furacão atípico atinge o litoral nordestino, danificando portos e infraestrutura logística, reduzindo a receita de operações portuárias.', gameEvent:{ type:'natural', statusEffect:'FURACAO_NORDESTE', durationMonths:3, revenueMultiplier:0.80 } },
  { id:'ev065', triggerYear:2048, triggerMonth:8, category:'POS', title:'Descoberta de Lítio no Brasil', description:'Vasto depósito de lítio descoberto no sertão nordestino gera royalties mensais para a RENIF pelo uso de suas linhas de escoamento.', gameEvent:{ type:'positive', statusEffect:'LITIO', durationMonths:12, monthlyBonus:3_000_000_000 } },
  { id:'ev066', triggerYear:2048, triggerMonth:12, category:'CRI', title:'Apagão Nacional ⚡', description:'Falha em cascata no sistema elétrico nacional paralisa sinalização ferroviária e sistemas de controle, reduzindo fortemente a receita por 2 meses.', gameEvent:{ type:'natural', statusEffect:'APAGAO', durationMonths:2, revenueMultiplier:0.70 } },

  // ── 2049 ──
  { id:'ev067', triggerYear:2049, triggerMonth:4, category:'POS', title:'Parque Tecnológico Ferroviário', description:'Centro de inovação lançado em Campinas desenvolve automação de processos que reduz permanentemente os custos com a folha de pagamento da RENIF.', gameEvent:{ type:'positive', statusEffect:'PARQUE_TEC', durationMonths:120, payrollMultiplier:0.80 } },
  { id:'ev068', triggerYear:2049, triggerMonth:8, category:'CRI', title:'Inundação Histórica na Amazônia', description:'Nível histórico dos rios amazônicos inunda terminais hidroviários e paralisa a operação de balsas por 4 meses.', gameEvent:{ type:'natural', statusEffect:'INUNDACAO_AMAZONIA', durationMonths:4, balsaFrozen:true, costPerMonth:1_000_000_000 } },
  { id:'ev069', triggerYear:2049, triggerMonth:12, category:'POS', title:'Acordo de Livre Comércio Global', description:'Novo tratado multilateral reduz tarifas de importação de insumos industriais, beneficiando a cadeia de compras da RENIF por dois anos.', gameEvent:{ type:'positive', statusEffect:'LIVRE_COMERCIO', durationMonths:24, resourceMultipliers:{ aco:0.90, cobre:0.90, explosivos:0.90 } } },

  // ── 2050 ──
  { id:'ev070', triggerYear:2050, triggerMonth:4, category:'CRI', title:'Crise Hídrica Nacional', description:'Estiagem severa afeta reservatórios e eleva o custo de processos industriais que utilizam brita, encarecendo o insumo por 6 meses.', gameEvent:{ type:'natural', statusEffect:'CRISE_HIDRICA', durationMonths:6, resourceMultipliers:{ brita:1.40 } } },
  { id:'ev071', triggerYear:2050, triggerMonth:8, category:'NEU', title:'Copa América no Brasil', description:'Torneio continental de futebol aumenta o fluxo de turistas nas cidades-sede, elevando temporariamente a demanda ferroviária.', gameEvent:{ type:'neutral', statusEffect:'COPA_AMERICA', durationMonths:2, revenueMultiplier:1.05 } },
  { id:'ev072', triggerYear:2050, triggerMonth:12, category:'CRI', title:'Deslizamento na Serra do Mar', description:'Fortes chuvas causam deslizamentos que interditam trechos críticos da malha serrana, reduzindo a receita de passagem por 3 meses.', gameEvent:{ type:'natural', statusEffect:'DESLIZAMENTO', durationMonths:3, revenueMultiplier:0.85 } },

  // ── 2051 ──
  { id:'ev073', triggerYear:2051, triggerMonth:4, category:'POS', title:'Inovação em Concreto Avançado', description:'Nova fórmula de concreto de ultra alto desempenho desenvolvida no Brasil reduz permanentemente o consumo de cimento nas obras ferroviárias.', gameEvent:{ type:'positive', statusEffect:'INOV_CONCRETO', durationMonths:120, resourceMultipliers:{ cimento:0.75 } } },
  { id:'ev074', triggerYear:2051, triggerMonth:8, category:'CRI', title:'Greve dos Engenheiros Civis', description:'Paralisação da categoria impõe reajuste forçado nos contratos de engenharia, encarecendo as obras em andamento por 4 meses.', gameEvent:{ type:'strike', statusEffect:'GREVE_ENG', durationMonths:4, constructionSlowFactor:1.25 } },
  { id:'ev075', triggerYear:2051, triggerMonth:12, category:'POL', title:'Eleição — Partido Liberal assume', description:'Terceiro mandato do Partido Liberal mantém política de austeridade com corte de 15% na receita repassada à RENIF.', party:'PL' },

  // ── 2052 ──
  { id:'ev076', triggerYear:2052, triggerMonth:4, category:'POS', title:'Bônus Demográfico Nacional', description:'Geração mais jovem entra no mercado de trabalho, tornando a mão de obra mais acessível e gerando bônus mensal de produtividade.', gameEvent:{ type:'positive', statusEffect:'BONUS_DEMOGRAFICO', durationMonths:12, monthlyBonus:1_000_000_000 } },
  { id:'ev077', triggerYear:2052, triggerMonth:8, category:'CRI', title:'Seca Histórica nos Rios', description:'Seca extrema paralisa todas as balsas e eleva o custo do aço pela redução da produção hidroelétrica nas siderúrgicas.', gameEvent:{ type:'natural', statusEffect:'SECA_HISTORICA', durationMonths:6, balsaFrozen:true, resourceMultipliers:{ aco:1.30 } } },
  { id:'ev078', triggerYear:2052, triggerMonth:12, category:'POS', title:'Ferrovia Transcontinental Concluída', description:'A conclusão da ferrovia bioceânica sul-americana posiciona o Brasil como hub logístico continental, gerando bônus histórico à RENIF.', immediateCash:30_000_000_000 },

  // ── 2053 ──
  { id:'ev079', triggerYear:2053, triggerMonth:4, category:'CRI', title:'Escândalo: Superfaturamento em Contratos 📰', description:'Nova investigação expõe superfaturamento sistemático em contratos de fornecimento. Multas mensais são impostas pelo TCU até auditoria concluída.', gameEvent:{ type:'politics', statusEffect:'SUPERFATURAMENTO', durationMonths:5, costPerMonth:4_000_000_000, costToResolve:11_000_000_000 } },
  { id:'ev080', triggerYear:2053, triggerMonth:8, category:'POS', title:'Leilão de Tecnologia 5G Ferroviário', description:'Modernização da comunicação ferroviária via 5G otimiza o controle de tráfego e aumenta permanentemente a eficiência operacional.', gameEvent:{ type:'positive', statusEffect:'TECH_5G', durationMonths:120, revenueMultiplier:1.08 } },
  { id:'ev081', triggerYear:2053, triggerMonth:12, category:'CRI', title:'Greve dos Motoristas de Trem', description:'Paralisação dos operadores de trens reduz fortemente a receita de passagens e carga por 3 meses.', gameEvent:{ type:'strike', statusEffect:'GREVE_MOTORISTAS', durationMonths:3, revenueMultiplier:0.70 } },

  // ── 2054 ──
  { id:'ev082', triggerYear:2054, triggerMonth:4, category:'CRI', title:'Tsunami no Litoral Sul', description:'Evento sísmico submarino gera onda que atinge o litoral gaúcho e catarinense, destruindo infraestrutura e exigindo gastos emergenciais.', immediateCash:-15_000_000_000 },
  { id:'ev083', triggerYear:2054, triggerMonth:8, category:'POS', title:'Recorde de Produção de Soja', description:'Safra recorde no interior do país aumenta a demanda por escoamento ferroviário, gerando bônus mensal de receita por 6 meses.', gameEvent:{ type:'positive', statusEffect:'SOJA_RECORD', durationMonths:6, monthlyBonus:2_000_000_000 } },
  { id:'ev084', triggerYear:2054, triggerMonth:12, category:'CRI', title:'Novo Código Florestal Restritivo', description:'Legislação ambiental mais rígida impõe novas exigências de compensação florestal para obras da RENIF, gerando multas mensais.', gameEvent:{ type:'env_delay', statusEffect:'CODIGO_FLORESTAL', durationMonths:8, costPerMonth:2_000_000_000, costToResolve:9_000_000_000 } },

  // ── 2055 ──
  { id:'ev085', triggerYear:2055, triggerMonth:4, category:'POS', title:'Investimento Estrangeiro Direto', description:'Fundo soberano asiático aporta capital na RENIF como parte de estratégia de diversificação de infraestrutura global.', immediateCash:12_000_000_000 },
  { id:'ev086', triggerYear:2055, triggerMonth:8, category:'POS', title:'Erupção Vulcânica nos Andes', description:'Cinzas vulcânicas paralisam voos no cone sul, desviando passageiros e cargas para o modal ferroviário brasileiro por 4 meses.', gameEvent:{ type:'positive', statusEffect:'ERUPCAO_ANDES', durationMonths:4, revenueMultiplier:1.10 } },
  { id:'ev087', triggerYear:2055, triggerMonth:12, category:'POL', title:'Eleição — Partido Social assume', description:'O Partido Social retorna ao poder com agenda de reindustrialização e expansão ferroviária, restabelecendo o subsídio mensal à RENIF.', party:'PS' },

  // ── 2056 ──
  { id:'ev088', triggerYear:2056, triggerMonth:4, category:'CRI', title:'Greve Geral dos Servidores Públicos', description:'Paralisação de servidores impacta órgãos reguladores e fiscalizadores, gerando multas e atrasos de licenciamento para a RENIF.', gameEvent:{ type:'strike', statusEffect:'GREVE_SERVIDORES', durationMonths:4, costPerMonth:3_000_000_000 } },
  { id:'ev089', triggerYear:2056, triggerMonth:8, category:'POS', title:'Maior Pátio da América Latina Inaugurado', description:'Centro de manutenção de última geração automatiza os processos de reparo e revisão, reduzindo drasticamente a folha de pagamento por 5 anos.', gameEvent:{ type:'positive', statusEffect:'PATIO_MAIOR', durationMonths:60, payrollMultiplier:0.70 } },
  { id:'ev090', triggerYear:2056, triggerMonth:12, category:'CRI', title:'Tempestade de Granizo no Sul', description:'Granizo histórico danifica estoques de cimento em armazéns abertos no Rio Grande do Sul, elevando o preço do insumo temporariamente.', gameEvent:{ type:'natural', statusEffect:'GRANIZO', durationMonths:3, resourceMultipliers:{ cimento:1.50 } } },

  // ── 2057 ──
  { id:'ev091', triggerYear:2057, triggerMonth:4, category:'POS', title:'Acordo com FMI', description:'O Fundo Monetário Internacional aprova pacote de crédito especial para infraestrutura brasileira, repassando recursos à RENIF.', immediateCash:6_000_000_000 },
  { id:'ev092', triggerYear:2057, triggerMonth:8, category:'CRI', title:'Furto Massivo de Cabos de Cobre', description:'Gangues especializadas furtam toneladas de cabos de sinalização em trechos rurais. O preço do cobre dobra no mercado nacional por 2 meses.', gameEvent:{ type:'crisis', statusEffect:'FURTO_COBRE', durationMonths:2, resourceMultipliers:{ cobre:2.0 } } },
  { id:'ev093', triggerYear:2057, triggerMonth:12, category:'NEU', title:'Metrô de Superfície Integrado em SP', description:'Integração tarifária do metrô paulistano com a malha da RENIF aumenta o número de usuários nas linhas que passam pela capital.', gameEvent:{ type:'neutral', statusEffect:'METRO_SP', durationMonths:3, revenueMultiplier:1.05 } },

  // ── 2058 ──
  { id:'ev094', triggerYear:2058, triggerMonth:4, category:'CRI', title:'Crise Cambial — Dólar nas Alturas 💵', description:'O real sofre desvalorização histórica frente ao dólar, encarecendo todos os insumos importados: aço, cobre e explosivos disparam.', gameEvent:{ type:'crisis', statusEffect:'CRISE_CAMBIAL', durationMonths:8, resourceMultipliers:{ aco:1.50, cobre:1.60, explosivos:1.40 }, costToResolve:15_000_000_000 } },
  { id:'ev095', triggerYear:2058, triggerMonth:8, category:'POS', title:'Acordo Bilateral Brasil–Portugal 🇵🇹', description:'Convênio com Portugal traz engenheiros ferroviários especializados e tecnologia europeia, reduzindo custos de construção por 2 anos.', gameEvent:{ type:'positive', statusEffect:'ACORDO_PORTUGAL', durationMonths:24, resourceMultipliers:{ aco:0.85, brita:0.85, cimento:0.85 } } },
  { id:'ev096', triggerYear:2058, triggerMonth:12, category:'POS', title:'Bônus de Produtividade RENIF', description:'Metas anuais de eficiência superadas geram bônus único pago pelo governo federal à RENIF como incentivo ao bom desempenho.', immediateCash:3_000_000_000 },

  // ── 2059 ──
  { id:'ev097', triggerYear:2059, triggerMonth:4, category:'CRI', title:'Protestos Contra Pedágios Ferroviários', description:'Movimentos populares organizam boicotes às tarifas, reduzindo a receita de passageiros por 4 meses.', gameEvent:{ type:'politics', statusEffect:'PROTESTOS_PEDAGIO', durationMonths:4, revenueMultiplier:0.80 } },
  { id:'ev098', triggerYear:2059, triggerMonth:8, category:'POS', title:'Ferrovia Magnética — Nova Tecnologia', description:'Licenciamento de tecnologia magnética japonesa reduz o custo de manutenção de trilhos e estruturas de aço e cimento.', gameEvent:{ type:'positive', statusEffect:'FERROVIA_MAG', durationMonths:120, resourceMultipliers:{ aco:0.85, cimento:0.85 } } },
  { id:'ev099', triggerYear:2059, triggerMonth:12, category:'POL', title:'Eleição — Partido Brasil assume', description:'O Partido Brasil assume com proposta de revisão de gastos e modernização da RENIF, sem alterar o nível de repasse atual.', party:'PB' },

  // ── 2060 ──
  { id:'ev100', triggerYear:2060, triggerMonth:4, category:'CRI', title:'Gripe Aviária — Segunda Onda', description:'Retorno do vírus H5N1 reduz o movimento de passageiros nas ferrovias por medidas preventivas de saúde pública.', gameEvent:{ type:'natural', statusEffect:'GRIPE_AVIARIA_2', durationMonths:6, revenueMultiplier:0.95 } },
  { id:'ev101', triggerYear:2060, triggerMonth:8, category:'POS', title:'Descoberta de Nióbio no Cerrado', description:'Maior depósito de nióbio do mundo descoberto durante obras no cerrado goiano gera royalties generosos mensais à RENIF por um ano.', gameEvent:{ type:'positive', statusEffect:'NIOBIO', durationMonths:12, monthlyBonus:4_000_000_000 } },
  { id:'ev102', triggerYear:2060, triggerMonth:12, category:'CRI', title:'Queda de Barreira em Túnel', description:'Desmoronamento parcial de um túnel exige paralisação e reparos emergenciais dispendiosos na estrutura.', immediateCash:-9_000_000_000 },

  // ── 2061 ──
  { id:'ev103', triggerYear:2061, triggerMonth:4, category:'CRI', title:'Escassez de Mão de Obra Especializada', description:'Aposentadoria em massa de engenheiros sênior e falta de novos formandos criam gargalo grave, atrasando todas as obras por 6 meses.', gameEvent:{ type:'crisis', statusEffect:'ESCASSEZ_MO', durationMonths:6, constructionSlowFactor:1.50 } },
  { id:'ev104', triggerYear:2061, triggerMonth:8, category:'POS', title:'Novo Recorde Histórico de Passageiros', description:'A malha ferroviária bate recorde absoluto de passageiros transportados, gerando bônus mensal de receita por um ano inteiro.', gameEvent:{ type:'positive', statusEffect:'RECORDE_PASS2', durationMonths:12, monthlyBonus:2_000_000_000 } },
  { id:'ev105', triggerYear:2061, triggerMonth:12, category:'POS', title:'Leilão de Satélites de Monitoramento', description:'Novo consórcio de satélites contrata a RENIF como parceira logística, gerando receita imediata de serviços.', immediateCash:5_000_000_000 },

  // ── 2062 ──
  { id:'ev106', triggerYear:2062, triggerMonth:4, category:'CRI', title:'Crise Energética — Apagão Prolongado ⚡', description:'Falha sistêmica na matriz energética provoca apagão de longa duração, paralisando sinalização e reduzindo fortemente a receita.', gameEvent:{ type:'natural', statusEffect:'APAGAO_LONGO', durationMonths:3, revenueMultiplier:0.70 } },
  { id:'ev107', triggerYear:2062, triggerMonth:8, category:'POS', title:'Acordo de Cooperação com Japão 🇯🇵', description:'Convênio técnico com o Japão traz tecnologia de fabricação de aço e equipamentos de cobre com desconto por 8 anos.', gameEvent:{ type:'positive', statusEffect:'ACORDO_JAPAO', durationMonths:96, resourceMultipliers:{ aco:0.80, cobre:0.80 } } },
  { id:'ev108', triggerYear:2062, triggerMonth:12, category:'CRI', title:'Greve dos Fiscais Ambientais', description:'Paralisação dos fiscais do IBAMA suspende novas licenças e gera multas mensais por obras em andamento sem aprovação renovada.', gameEvent:{ type:'env_delay', statusEffect:'GREVE_AMBIENTAIS', durationMonths:6, costPerMonth:3_000_000_000, costToResolve:10_000_000_000 } },

  // ── 2063 ──
  { id:'ev109', triggerYear:2063, triggerMonth:4, category:'CRI', title:'Pandemia Global — Nova Cepa', description:'Novo vírus de transmissão rápida impõe restrições de circulação, reduzindo o fluxo de passageiros e carga por 8 meses.', gameEvent:{ type:'natural', statusEffect:'PANDEMIA2', durationMonths:8, revenueMultiplier:0.80 } },
  { id:'ev110', triggerYear:2063, triggerMonth:8, category:'POS', title:'Maior Recorde de Exportação da História', description:'O Brasil bate o recorde absoluto de exportações, com a RENIF respondendo por 40% do escoamento logístico, gerando bônus extraordinário.', immediateCash:25_000_000_000 },
  { id:'ev111', triggerYear:2063, triggerMonth:12, category:'POL', title:'Eleição — Partido Liberal assume', description:'O Partido Liberal retorna ao poder com agenda de corte de gastos, reduzindo novamente em 15% a receita repassada à RENIF.', party:'PL' },

  // ── 2064 ──
  { id:'ev112', triggerYear:2064, triggerMonth:4, category:'POS', title:'Brasil Sedia Fórum Mundial de Infraestrutura 🌍', description:'Evento internacional em Brasília atrai investidores multilaterais, resultando em subsídio direto e aumento temporário da receita por exposição global.', immediateCash:14_000_000_000, gameEvent:{ type:'positive', statusEffect:'FORUM_INFRA', durationMonths:4, revenueMultiplier:1.10 } },
  { id:'ev113', triggerYear:2064, triggerMonth:8, category:'CRI', title:'Terremoto em Rondônia', description:'Tremor incomum para a região danifica estruturas ferroviárias em RO, exigindo reparo emergencial de viadutos e pontes.', immediateCash:-12_000_000_000 },
  { id:'ev114', triggerYear:2064, triggerMonth:12, category:'CRI', title:'Ciclone no Atlântico Sul', description:'Ciclone extratropical atinge o litoral sul, danificando terminais portuários e reduzindo as operações marítimas integradas à malha ferroviária.', gameEvent:{ type:'natural', statusEffect:'CICLONE_ATL', durationMonths:2, revenueMultiplier:0.80 } },

  // ── 2065 ──
  { id:'ev115', triggerYear:2065, triggerMonth:4, category:'POS', title:'Inteligência Artificial na Logística 🤖', description:'Sistema de IA desenvolvido para a RENIF otimiza rotas, reduz ociosidade e maximiza a receita operacional de forma permanente.', gameEvent:{ type:'positive', statusEffect:'IA_LOGISTICA', durationMonths:120, revenueMultiplier:1.15 } },
  { id:'ev116', triggerYear:2065, triggerMonth:8, category:'CRI', title:'Greve dos Controladores de Tráfego', description:'Paralisação dos controladores de tráfego ferroviário reduz a velocidade operacional e a receita coletada por 3 meses.', gameEvent:{ type:'strike', statusEffect:'GREVE_CONTROLE', durationMonths:3, revenueMultiplier:0.85 } },
  { id:'ev117', triggerYear:2065, triggerMonth:12, category:'NEU', title:'Neve Histórica no Sul ❄️', description:'Neve atípica em cidades do interior gaúcho atrai turismo de inverno, aumentando o movimento ferroviário nas regiões afetadas.', gameEvent:{ type:'neutral', statusEffect:'NEVE_SUL', durationMonths:1, revenueMultiplier:1.10 } },

  // ── 2066 ──
  { id:'ev118', triggerYear:2066, triggerMonth:4, category:'CRI', title:'Guerra na Argentina — Êxodo no Sul 🇦🇷', description:'Conflito armado nas fronteiras gera fluxo massivo de refugiados pelo RS e SC. Infraestrutura ferroviária é requisitada para uso humanitário, reduzindo a receita comercial.', gameEvent:{ type:'crisis', statusEffect:'GUERRA_ARG', durationMonths:6, revenueMultiplier:0.75, costPerMonth:2_000_000_000, costToResolve:12_000_000_000 } },
  { id:'ev119', triggerYear:2066, triggerMonth:8, category:'POS', title:'Prêmio Nobel da Paz para a RENIF 🏆', description:'O Comitê Nobel reconhece a RENIF pela integração pacífica de regiões historicamente isoladas, gerando doação simbólica e visibilidade internacional.', immediateCash:10_000_000_000 },
  { id:'ev120', triggerYear:2066, triggerMonth:12, category:'POS', title:'Descoberta de Petróleo — Margem Equatorial', description:'Novo campo petrolífero descoberto na costa norte gera royalties que o governo federal repassa mensalmente à RENIF por um ano.', gameEvent:{ type:'positive', statusEffect:'PETROLEO_EQ', durationMonths:12, monthlyBonus:5_000_000_000 } },

  // ── 2067 ──
  { id:'ev121', triggerYear:2067, triggerMonth:4, category:'CRI', title:'Conflito Garimpeiro em Roraima ⛏️', description:'Garimpo ilegal bloqueia rotas de fornecimento de explosivos industriais no Norte. O preço dos explosivos sobe drasticamente por 5 meses.', gameEvent:{ type:'crisis', statusEffect:'CONFLITO_GARIMPO', durationMonths:5, resourceMultipliers:{ explosivos:2.20 }, costToResolve:5_000_000_000 } },
  { id:'ev122', triggerYear:2067, triggerMonth:8, category:'POS', title:'Copa do Mundo — Brasil de Novo! ⚽', description:'O Brasil sedia a Copa do Mundo novamente, gerando fluxo extraordinário de visitantes que lotam as ferrovias nacionais.', gameEvent:{ type:'positive', statusEffect:'COPA_MUNDO_2067', durationMonths:6, monthlyBonus:3_000_000_000 } },
  { id:'ev123', triggerYear:2067, triggerMonth:12, category:'POL', title:'Eleição — Partido Social assume', description:'O Partido Social vence com promessa de grande expansão ferroviária nacional, restabelecendo o subsídio mensal de R$2B à RENIF.', party:'PS' },

  // ── 2068 ──
  { id:'ev124', triggerYear:2068, triggerMonth:4, category:'NEU', title:'Fusão das Ferrovias Nacionais', description:'Consolidação das operações ferroviárias nacionais sob a marca RENIF cria eficiências de escala e aumenta a receita de toda a malha.', gameEvent:{ type:'neutral', statusEffect:'FUSAO_FERROVIAS', durationMonths:120, revenueMultiplier:1.12 } },
  { id:'ev125', triggerYear:2068, triggerMonth:8, category:'CRI', title:'Vazamento no Rio Doce — Embargo IBAMA 🌊', description:'Acidente com rejeitos de mineração contamina o Rio Doce. IBAMA embarga fornecedores regionais de brita e cimento, elevando os preços.', gameEvent:{ type:'env_delay', statusEffect:'VAZAMENTO_DOCE', durationMonths:6, costPerMonth:2_000_000_000, resourceMultipliers:{ brita:1.60, cimento:1.60 }, costToResolve:7_000_000_000 } },
  { id:'ev126', triggerYear:2068, triggerMonth:12, category:'POS', title:'Megaporto Marítimo Concluído', description:'O maior porto da América Latina entra em operação integrado à malha da RENIF, ampliando permanentemente as rotas de exportação e a receita.', gameEvent:{ type:'positive', statusEffect:'MEGAPORTO', durationMonths:120, revenueMultiplier:1.15 } },

  // ── 2069 ──
  { id:'ev127', triggerYear:2069, triggerMonth:4, category:'CRI', title:'Incêndio Florestal no Pantanal', description:'Incêndios destroem estoques de dormentes de madeira armazenados ao longo do corredor pantaneiro, gerando prejuízo imediato.', immediateCash:-8_000_000_000 },
  { id:'ev128', triggerYear:2069, triggerMonth:8, category:'CRI', title:'Terremoto em Brasília', description:'Tremor incomum abala a capital federal, danificando instalações administrativas da RENIF e gerando custos mensais de manutenção emergencial.', gameEvent:{ type:'natural', statusEffect:'TERREMOTO_BSB', durationMonths:6, costPerMonth:2_000_000_000 } },
  { id:'ev129', triggerYear:2069, triggerMonth:12, category:'POS', title:'Normalização Diplomática com China', description:'Retomada das relações comerciais plenas com a China resulta em grande acordo de fornecimento e investimento direto na RENIF.', immediateCash:20_000_000_000 },

  // ── 2070 ──
  { id:'ev130', triggerYear:2070, triggerMonth:4, category:'CRI', title:'Crise de Água em São Paulo', description:'Colapso no abastecimento hídrico da Grande SP impacta obras na região metropolitana, tornando a construção mais cara e lenta.', gameEvent:{ type:'natural', statusEffect:'CRISE_AGUA_SP', durationMonths:4, constructionSlowFactor:1.50 } },
  { id:'ev131', triggerYear:2070, triggerMonth:8, category:'POS', title:'Descoberta de Gás Natural no Pré-Sal', description:'Novo campo de gás na camada pré-sal garante energia barata para indústrias fornecedoras da RENIF, gerando royalties mensais por um ano.', gameEvent:{ type:'positive', statusEffect:'GAS_PRESAL', durationMonths:12, monthlyBonus:3_000_000_000 } },
  { id:'ev132', triggerYear:2070, triggerMonth:12, category:'NEU', title:'Neve Histórica no Rio de Janeiro ❄️', description:'Fenômeno climático raro cobre o Rio de Janeiro de neve pela primeira vez em décadas, gerando turismo extraordinário e alta demanda ferroviária.', gameEvent:{ type:'neutral', statusEffect:'NEVE_RIO', durationMonths:1, revenueMultiplier:1.15 } },

  // ── 2071 ──
  { id:'ev133', triggerYear:2071, triggerMonth:4, category:'CRI', title:'Surto de Dengue — Emergência Nacional', description:'Epidemia de dengue de proporções históricas obriga o governo a decretar emergência sanitária, impactando a produtividade nas obras.', gameEvent:{ type:'natural', statusEffect:'DENGUE', durationMonths:4, costPerMonth:1_000_000_000, constructionSlowFactor:1.15 } },
  { id:'ev134', triggerYear:2071, triggerMonth:8, category:'POS', title:'Acordo BRICS de Livre Comércio', description:'Novo acordo multilateral do BRICS reduz tarifas de insumos industriais entre os países membros, beneficiando as compras da RENIF.', immediateCash:10_000_000_000, gameEvent:{ type:'positive', statusEffect:'BRICS_COMERCIO', durationMonths:12, resourceMultipliers:{ aco:0.95, cobre:0.95, explosivos:0.95 } } },
  { id:'ev135', triggerYear:2071, triggerMonth:12, category:'POL', title:'Eleição — Partido Brasil assume', description:'O Partido Brasil vence a eleição com proposta de gestão técnica e continuidade dos projetos em andamento, sem impacto financeiro imediato.', party:'PB' },

  // ── 2072 ──
  { id:'ev136', triggerYear:2072, triggerMonth:4, category:'CRI', title:'Onda de Frio Extremo no Sul', description:'Temperaturas recordes negativas paralisam obras na região Sul e causam danos em estruturas metálicas, gerando custos emergenciais.', immediateCash:-4_000_000_000, gameEvent:{ type:'natural', statusEffect:'FRIO_SUL', durationMonths:2, constructionSlowFactor:1.40 } },
  { id:'ev137', triggerYear:2072, triggerMonth:8, category:'POS', title:'Programa Espacial — Satélites Logísticos 🛰️', description:'Lançamento de constelação de satélites brasileiros melhora o monitoramento e otimiza as rotas ferroviárias, aumentando a receita por dois anos.', gameEvent:{ type:'positive', statusEffect:'SATELITES', durationMonths:24, revenueMultiplier:1.05 } },
  { id:'ev138', triggerYear:2072, triggerMonth:12, category:'CRI', title:'Greve Nacional da Construção Civil', description:'Paralisação ampla da categoria da construção civil impõe reajustes e reduz o ritmo de obras ferroviárias por 4 meses.', gameEvent:{ type:'strike', statusEffect:'GREVE_CIVIL', durationMonths:4, constructionSlowFactor:1.35 } },

  // ── 2073 ──
  { id:'ev139', triggerYear:2073, triggerMonth:4, category:'POS', title:'Copa do Mundo Feminino no Brasil ⚽', description:'O Brasil sedia o Mundial Feminino, com grande público e fluxo de visitantes que aumentam a demanda pelo transporte ferroviário.', gameEvent:{ type:'positive', statusEffect:'COPA_FEM', durationMonths:3, monthlyBonus:2_000_000_000 } },
  { id:'ev140', triggerYear:2073, triggerMonth:8, category:'NEU', title:'Superlua — Momento de Leveza 🌕', description:'Fenômeno astronômico gera cobertura midiática inusitada sobre as linhas ferroviárias noturnas da RENIF. Sem impacto financeiro direto.', },
  { id:'ev141', triggerYear:2073, triggerMonth:12, category:'CRI', title:'Escassez Global de Chips Eletrônicos', description:'Crise global de semicondutores afeta os sistemas de sinalização e controle ferroviário, reduzindo a eficiência operacional temporariamente.', gameEvent:{ type:'crisis', statusEffect:'ESCASSEZ_CHIPS', durationMonths:3, revenueMultiplier:0.85 } },

  // ── 2074 ──
  { id:'ev142', triggerYear:2074, triggerMonth:4, category:'POS', title:'Acordo Ferroviário Mercosul', description:'Os países do Mercosul firmam acordo de interoperabilidade ferroviária, com a RENIF recebendo compensação pela integração de sua malha.', immediateCash:8_000_000_000 },
  { id:'ev143', triggerYear:2074, triggerMonth:8, category:'CRI', title:'Onda de Calor Histórica no Nordeste', description:'Temperaturas recordes no Nordeste superam 50°C em algumas regiões, impossibilitando obras no período mais quente e atrasando o cronograma.', gameEvent:{ type:'natural', statusEffect:'CALOR_NORDESTE', durationMonths:6, constructionSlowFactor:1.30 } },
  { id:'ev144', triggerYear:2074, triggerMonth:12, category:'POS', title:'Leilão Ferroviário Internacional', description:'Leilão de concessões ferroviárias atrai investidores internacionais, gerando entrada significativa de recursos para a RENIF.', immediateCash:15_000_000_000 },

  // ── 2075 ──
  { id:'ev145', triggerYear:2075, triggerMonth:4, category:'CRI', title:'Inundação Severa na Amazônia', description:'Cheia histórica dos rios amazônicos paralisa todas as balsas na região Norte e gera custas mensais de manutenção emergencial.', gameEvent:{ type:'natural', statusEffect:'INUNDACAO_SEV', durationMonths:5, balsaFrozen:true, costPerMonth:1_500_000_000 } },
  { id:'ev146', triggerYear:2075, triggerMonth:8, category:'POS', title:'Maior Exportação da História do Brasil', description:'Volume histórico de exportações consolida o Brasil como potência logística global, com a RENIF recebendo bônus pelo papel central na cadeia de escoamento.', immediateCash:25_000_000_000 },
  { id:'ev147', triggerYear:2075, triggerMonth:12, category:'POL', title:'Eleição — Partido Liberal assume', description:'Retorno do Partido Liberal ao poder no final da era ferroviária, implementando seu tradicional corte de 15% nos repasses à RENIF.', party:'PL' },

  // ── 2076 ──
  { id:'ev148', triggerYear:2076, triggerMonth:4, category:'CRI', title:'Ciclone Devastador no Litoral', description:'Ciclone de categoria histórica atinge o litoral causando danos severos em terminais portuários e trechos litorâneos da malha ferroviária.', immediateCash:-10_000_000_000, gameEvent:{ type:'natural', statusEffect:'CICLONE_DEV', durationMonths:3, constructionSlowFactor:1.30 } },
  { id:'ev149', triggerYear:2076, triggerMonth:8, category:'POS', title:'Bônus Final — Legado Ferroviário 🚂', description:'O governo federal reconhece o legado histórico da RENIF com um bônus extraordinário pelos 50 anos de construção e operação da malha nacional.', immediateCash:30_000_000_000 },
  { id:'ev150', triggerYear:2076, triggerMonth:12, category:'NEU', title:'Encerramento da Era RENIF — 50 Anos de Trilhos', description:'A RENIF celebra meio século de operação ferroviária ininterrupta, conectando o Brasil de Norte a Sul e transformando a logística nacional para sempre.', },
];
