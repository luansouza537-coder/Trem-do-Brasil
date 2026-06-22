import { City } from '../types';

export const CITIES: City[] = [
  // --- As 27 Capitais Brasileiras ---
  { id: '1', name: 'São Paulo', state: 'SP', lat: -23.5505, lng: -46.6333, type: 'capital' },
  { id: '2', name: 'Rio de Janeiro', state: 'RJ', lat: -22.9068, lng: -43.1729, type: 'capital', portType: 'maritime' },
  { id: '3', name: 'Belo Horizonte', state: 'MG', lat: -19.9173, lng: -43.9345, type: 'capital' },
  { id: '4', name: 'Vitória', state: 'ES', lat: -20.3155, lng: -40.3128, type: 'capital', portType: 'maritime' },
  { id: '5', name: 'Porto Alegre', state: 'RS', lat: -30.0346, lng: -51.2177, type: 'capital', portType: 'fluvial' },
  { id: '6', name: 'Florianópolis', state: 'SC', lat: -27.5954, lng: -48.5480, type: 'capital' },
  { id: '7', name: 'Curitiba', state: 'PR', lat: -25.4290, lng: -49.2671, type: 'capital' },
  { id: '8', name: 'Salvador', state: 'BA', lat: -12.9777, lng: -38.5016, type: 'capital', portType: 'maritime' },
  { id: '9', name: 'Aracaju', state: 'SE', lat: -10.9472, lng: -37.0731, type: 'capital', portType: 'maritime' },
  { id: '10', name: 'Maceió', state: 'AL', lat: -9.6658, lng: -35.7350, type: 'capital', portType: 'maritime' },
  { id: '11', name: 'Recife', state: 'PE', lat: -8.0578, lng: -34.8778, type: 'capital', portType: 'maritime' },
  { id: '12', name: 'João Pessoa', state: 'PB', lat: -7.1195, lng: -34.8450, type: 'capital' },
  { id: '13', name: 'Natal', state: 'RN', lat: -5.7945, lng: -35.2110, type: 'capital', portType: 'maritime' },
  { id: '14', name: 'Fortaleza', state: 'CE', lat: -3.7319, lng: -38.5267, type: 'capital', portType: 'maritime' },
  { id: '15', name: 'Teresina', state: 'PI', lat: -5.0920, lng: -42.8038, type: 'capital' },
  { id: '16', name: 'São Luís', state: 'MA', lat: -2.5307, lng: -44.3068, type: 'capital', portType: 'maritime' },
  { id: '17', name: 'Belém', state: 'PA', lat: -1.4557, lng: -48.4902, type: 'capital', portType: 'fluvial' },
  { id: '18', name: 'Macapá', state: 'AP', lat: 0.0356, lng: -51.0705, type: 'capital', portType: 'fluvial' },
  { id: '19', name: 'Boa Vista', state: 'RR', lat: 2.8235, lng: -60.6758, type: 'capital' },
  { id: '20', name: 'Manaus', state: 'AM', lat: -3.1190, lng: -60.0217, type: 'capital', portType: 'fluvial' },
  { id: '21', name: 'Porto Velho', state: 'RO', lat: -8.7612, lng: -63.9039, type: 'capital', portType: 'fluvial' },
  { id: '22', name: 'Rio Branco', state: 'AC', lat: -9.9754, lng: -67.8106, type: 'capital' },
  { id: '23', name: 'Cuiabá', state: 'MT', lat: -15.6010, lng: -56.0967, type: 'capital' },
  { id: '24', name: 'Goiânia', state: 'GO', lat: -16.6869, lng: -49.2648, type: 'capital' },
  { id: '25', name: 'Brasília', state: 'DF', lat: -15.7801, lng: -47.9292, type: 'capital' },
  { id: '26', name: 'Campo Grande', state: 'MS', lat: -20.4697, lng: -54.6201, type: 'capital' },
  { id: '27', name: 'Palmas', state: 'TO', lat: -10.2128, lng: -48.3603, type: 'capital' },

  // --- As Cidades Não Capitais Originais ---
  { id: '28', name: 'Campinas', state: 'SP', lat: -22.9099, lng: -47.0626, type: 'cidade' },
  { id: '29', name: 'Santos', state: 'SP', lat: -23.9608, lng: -46.3331, type: 'cidade', portType: 'maritime' },
  { id: '30', name: 'Ribeirão Preto', state: 'SP', lat: -21.1704, lng: -47.8103, type: 'cidade' },
  { id: '31', name: 'São José dos Campos', state: 'SP', lat: -23.2237, lng: -45.9009, type: 'cidade' },
  { id: '32', name: 'Joinville', state: 'SC', lat: -26.3044, lng: -48.8464, type: 'cidade' },
  { id: '33', name: 'Blumenau', state: 'SC', lat: -26.9194, lng: -49.0661, type: 'cidade' },
  { id: '34', name: 'Caxias do Sul', state: 'RS', lat: -29.1678, lng: -51.1794, type: 'cidade' },
  { id: '35', name: 'Pelotas', state: 'RS', lat: -31.7654, lng: -52.3376, type: 'cidade', portType: 'fluvial' },
  { id: '36', name: 'Londrina', state: 'PR', lat: -23.3040, lng: -51.1696, type: 'cidade' },
  { id: '37', name: 'Maringá', state: 'PR', lat: -23.4209, lng: -51.9331, type: 'cidade' },
  { id: '38', name: 'Uberlândia', state: 'MG', lat: -18.9186, lng: -48.2772, type: 'cidade' },
  { id: '39', name: 'Juiz de Fora', state: 'MG', lat: -21.7595, lng: -43.3437, type: 'cidade' },
  { id: '40', name: 'Montes Claros', state: 'MG', lat: -16.7269, lng: -43.8617, type: 'cidade' },
  { id: '41', name: 'Campos dos Goytacazes', state: 'RJ', lat: -21.7583, lng: -41.3255, type: 'cidade' },
  { id: '42', name: 'Petrópolis', state: 'RJ', lat: -22.5049, lng: -43.1798, type: 'cidade' },
  { id: '43', name: 'Vila Velha', state: 'ES', lat: -20.3297, lng: -40.2912, type: 'cidade', portType: 'maritime' },
  { id: '44', name: 'Arapiraca', state: 'AL', lat: -9.7512, lng: -36.6597, type: 'cidade' },
  { id: '45', name: 'Caruaru', state: 'PE', lat: -8.2839, lng: -35.9730, type: 'cidade' },
  { id: '46', name: 'Juazeiro do Norte', state: 'CE', lat: -7.2241, lng: -39.3134, type: 'cidade' },
  { id: '47', name: 'Sobral', state: 'CE', lat: -3.6874, lng: -40.3499, type: 'cidade' },
  { id: '48', name: 'Imperatriz', state: 'MA', lat: -5.5263, lng: -47.4789, type: 'cidade' },
  { id: '49', name: 'Marabá', state: 'PA', lat: -5.3686, lng: -49.1218, type: 'cidade' },
  { id: '50', name: 'Santarém', state: 'PA', lat: -2.4431, lng: -54.7084, type: 'cidade', portType: 'fluvial' },
  { id: '51', name: 'Porto Seguro', state: 'BA', lat: -16.4497, lng: -39.0641, type: 'cidade' },
  { id: '52', name: 'Vitória da Conquista', state: 'BA', lat: -14.8661, lng: -40.8394, type: 'cidade' },
  { id: '53', name: 'Anápolis', state: 'GO', lat: -16.3267, lng: -48.9528, type: 'cidade' },
  { id: '54', name: 'Rio Verde', state: 'GO', lat: -17.7911, lng: -50.9204, type: 'cidade' },
  { id: '55', name: 'Dourados', state: 'MS', lat: -22.2238, lng: -54.8091, type: 'cidade' },
  { id: '56', name: 'Chapecó', state: 'SC', lat: -27.1004, lng: -52.6152, type: 'cidade' },
  { id: '57', name: 'Araguaína', state: 'TO', lat: -7.1952, lng: -48.2043, type: 'cidade' },

  // --- Novos Portos Marítimos Adicionados ---
  { id: '58', name: 'Itaguaí', state: 'RJ', lat: -22.8522, lng: -43.7753, type: 'cidade', portType: 'maritime' },
  { id: '59', name: 'Angra dos Reis', state: 'RJ', lat: -22.9972, lng: -44.3168, type: 'cidade', portType: 'maritime' },
  { id: '60', name: 'Aracruz', state: 'ES', lat: -19.8203, lng: -40.2741, type: 'cidade', portType: 'maritime' },
  { id: '61', name: 'Candeias (Aratu)', state: 'BA', lat: -12.6711, lng: -38.5178, type: 'cidade', portType: 'maritime' },
  { id: '62', name: 'Ilhéus', state: 'BA', lat: -14.7935, lng: -39.0463, type: 'cidade', portType: 'maritime' },
  { id: '63', name: 'Areia Branca', state: 'RN', lat: -4.9542, lng: -37.1356, type: 'cidade', portType: 'maritime' },
  { id: '64', name: 'Cabedelo', state: 'PB', lat: -6.9749, lng: -34.8364, type: 'cidade', portType: 'maritime' },
  { id: '65', name: 'Ipojuca (Suape)', state: 'PE', lat: -8.4016, lng: -34.9961, type: 'cidade', portType: 'maritime' },
  { id: '66', name: 'Paranaguá', state: 'PR', lat: -25.5186, lng: -48.5135, type: 'cidade', portType: 'maritime' },
  { id: '67', name: 'Antonina', state: 'PR', lat: -25.4322, lng: -48.7119, type: 'cidade', portType: 'maritime' },
  { id: '68', name: 'Itajaí', state: 'SC', lat: -26.9078, lng: -48.6619, type: 'cidade', portType: 'maritime' },
  { id: '69', name: 'Navegantes', state: 'SC', lat: -26.8920, lng: -48.6530, type: 'cidade', portType: 'maritime' },
  { id: '70', name: 'S. Francisco do Sul', state: 'SC', lat: -26.2435, lng: -48.6381, type: 'cidade', portType: 'maritime' },
  { id: '71', name: 'Imbituba', state: 'SC', lat: -28.2400, lng: -48.6703, type: 'cidade', portType: 'maritime' },
  { id: '72', name: 'Rio Grande', state: 'RS', lat: -32.0350, lng: -52.0986, type: 'cidade', portType: 'maritime' },

  // --- Novos Portos Fluviais Adicionados ---
  { id: '73', name: 'Barcarena', state: 'PA', lat: -1.5061, lng: -48.6252, type: 'cidade', portType: 'fluvial' },
  { id: '74', name: 'Santana', state: 'AP', lat: -0.0614, lng: -51.1818, type: 'cidade', portType: 'fluvial' },
  { id: '75', name: 'Itacoatiara', state: 'AM', lat: -3.1431, lng: -58.4442, type: 'cidade', portType: 'fluvial' },
  { id: '76', name: 'Itaituba', state: 'PA', lat: -4.2761, lng: -55.9836, type: 'cidade', portType: 'fluvial' },
  { id: '77', name: 'Juruti', state: 'PA', lat: -2.1542, lng: -56.0969, type: 'cidade', portType: 'fluvial' },
  { id: '78', name: 'Óbidos', state: 'PA', lat: -1.9167, lng: -55.5167, type: 'cidade', portType: 'fluvial' },
  { id: '79', name: 'Corumbá', state: 'MS', lat: -19.0064, lng: -57.6536, type: 'cidade', portType: 'fluvial' },
  { id: '80', name: 'Porto Murtinho', state: 'MS', lat: -21.6989, lng: -57.8778, type: 'cidade', portType: 'fluvial' },
  { id: '81', name: 'Cáceres', state: 'MT', lat: -16.0706, lng: -57.6789, type: 'cidade', portType: 'fluvial' },
  { id: '82', name: 'Coari', state: 'AM', lat: -4.0850, lng: -63.1414, type: 'cidade', portType: 'fluvial' },

  // --- Novos Portos e Hubs Adicionais de Carga ---
  { id: '83', name: 'São Sebastião', state: 'SP', lat: -23.8052, lng: -45.4103, type: 'cidade', portType: 'maritime' },
  { id: '84', name: 'Pecém (S. G. Amarante)', state: 'CE', lat: -3.5484, lng: -38.8315, type: 'cidade', portType: 'maritime' },
  { id: '85', name: 'Macaé', state: 'RJ', lat: -22.3789, lng: -41.7858, type: 'cidade', portType: 'maritime' },
  { id: '86', name: 'Oriximiná', state: 'PA', lat: -1.7656, lng: -55.8647, type: 'cidade', portType: 'fluvial' },
  { id: '87', name: 'Rondonópolis', state: 'MT', lat: -16.4678, lng: -54.6358, type: 'cidade' },
  { id: '88', name: 'Pederneiras', state: 'SP', lat: -22.3532, lng: -48.7758, type: 'cidade', portType: 'fluvial' },
  { id: '89', name: 'Foz do Iguaçu', state: 'PR', lat: -25.5478, lng: -54.5881, type: 'cidade', portType: 'fluvial' },
  { id: '90', name: 'Niterói', state: 'RJ', lat: -22.8858, lng: -43.1154, type: 'cidade', portType: 'maritime' },
  { id: '91', name: 'Luís Correia', state: 'PI', lat: -2.8792, lng: -41.6672, type: 'cidade', portType: 'maritime' },
  { id: '92', name: 'Barra dos Coqueiros', state: 'SE', lat: -10.9080, lng: -37.0345, type: 'cidade', portType: 'maritime' },
  { id: '93', name: 'Guamaré', state: 'RN', lat: -5.1054, lng: -36.4312, type: 'cidade', portType: 'maritime' },
  { id: '94', name: 'Arraial do Cabo', state: 'RJ', lat: -22.9669, lng: -42.0194, type: 'cidade', portType: 'maritime' },
  { id: '95', name: 'Presidente Epitácio', state: 'SP', lat: -21.7629, lng: -52.1153, type: 'cidade', portType: 'fluvial' },
  { id: '96', name: 'Altamira', state: 'PA', lat: -3.2014, lng: -52.2065, type: 'cidade', portType: 'fluvial' },
  { id: '97', name: 'Tucuruí', state: 'PA', lat: -3.7554, lng: -49.6738, type: 'cidade', portType: 'fluvial' },

  // --- Cidades de Mineração ---
  { id: '98',  name: 'Carajás', state: 'PA', lat: -6.0583, lng: -50.1619, type: 'mineracao' },
  { id: '99',  name: 'Itabira', state: 'MG', lat: -19.6189, lng: -43.2269, type: 'mineracao' },
  { id: '100', name: 'Sorriso', state: 'MT', lat: -12.5490, lng: -55.7212, type: 'polo_agricola' },
  { id: '101', name: 'Sinop', state: 'MT', lat: -11.8617, lng: -55.5054, type: 'polo_agricola' },
  { id: '102', name: 'Ji-Paraná', state: 'RO', lat: -10.8798, lng: -61.9461, type: 'cidade' },
  { id: '103', name: 'Redenção', state: 'PA', lat: -8.0271, lng: -49.9793, type: 'cidade' },
  { id: '104', name: 'Marabá (Porto)', state: 'PA', lat: -5.3574, lng: -49.0917, type: 'mineracao', portType: 'fluvial' },

  // --- Polos Agrícolas ---
  { id: '105', name: 'Barreiras', state: 'BA', lat: -12.1521, lng: -44.9990, type: 'polo_agricola' },
  { id: '106', name: 'Luis Eduardo Magalhães', state: 'BA', lat: -12.0963, lng: -45.7874, type: 'polo_agricola' },
  { id: '107', name: 'Santa Maria', state: 'RS', lat: -29.6908, lng: -53.8008, type: 'polo_agricola' },
  { id: '108', name: 'Passo Fundo', state: 'RS', lat: -28.2626, lng: -52.4064, type: 'polo_agricola' },
  { id: '109', name: 'Cascavel', state: 'PR', lat: -24.9578, lng: -53.4596, type: 'polo_agricola' },
  { id: '110', name: 'Sete Lagoas', state: 'MG', lat: -19.4658, lng: -44.2463, type: 'polo_industrial' },

  // --- Polos Industriais ---
  { id: '111', name: 'São José dos Campos', state: 'SP', lat: -23.2237, lng: -45.9009, type: 'polo_industrial' },
  { id: '112', name: 'Camaçari', state: 'BA', lat: -12.6939, lng: -38.3266, type: 'polo_industrial', portType: 'maritime' },
  { id: '113', name: 'Sorocaba', state: 'SP', lat: -23.5015, lng: -47.4526, type: 'polo_industrial' },
  { id: '114', name: 'Bauru', state: 'SP', lat: -22.3246, lng: -49.0607, type: 'polo_industrial' },
  { id: '115', name: 'Mossoró', state: 'RN', lat: -5.1878, lng: -37.3442, type: 'cidade' },
  { id: '116', name: 'Petrolina', state: 'PE', lat: -9.3891, lng: -40.5004, type: 'cidade', portType: 'fluvial' },
  { id: '117', name: 'Juazeiro', state: 'BA', lat: -9.4317, lng: -40.5017, type: 'cidade', portType: 'fluvial' },

  // --- Cidades de Fronteira (Rio São Francisco / Araguaia) ---
  { id: '118', name: 'Pirapora', state: 'MG', lat: -17.3428, lng: -44.9427, type: 'fronteira', portType: 'fluvial' },
  { id: '119', name: 'Ibotirama', state: 'BA', lat: -12.1822, lng: -43.2192, type: 'fronteira', portType: 'fluvial' },
  { id: '120', name: 'Barra do Garças', state: 'MT', lat: -15.8863, lng: -52.2564, type: 'fronteira', portType: 'fluvial' },
  { id: '121', name: 'Xambioá', state: 'TO', lat: -6.4131, lng: -48.5338, type: 'fronteira', portType: 'fluvial' },
  { id: '122', name: 'Tabatinga', state: 'AM', lat: -4.2553, lng: -69.9355, type: 'fronteira', portType: 'fluvial' },
  { id: '123', name: 'Foz do Iguaçu (porto)', state: 'PR', lat: -25.5478, lng: -54.5881, type: 'fronteira', portType: 'fluvial' },

  // --- Novas Cidades: Polos Agrícolas ---
  { id: '124', name: 'Lucas do Rio Verde', state: 'MT', lat: -13.0560, lng: -55.9169, type: 'polo_agricola' },
  { id: '125', name: 'Primavera do Leste', state: 'MT', lat: -15.5565, lng: -54.2847, type: 'polo_agricola' },
  { id: '126', name: 'Balsas', state: 'MA', lat: -7.5322, lng: -46.0355, type: 'polo_agricola' },
  { id: '127', name: 'Uruçuí', state: 'PI', lat: -7.2322, lng: -44.5551, type: 'polo_agricola' },
  { id: '128', name: 'Cristalina', state: 'GO', lat: -16.7714, lng: -47.6142, type: 'polo_agricola' },
  { id: '129', name: 'Paragominas', state: 'PA', lat: -2.9945, lng: -47.3552, type: 'polo_agricola' },
  { id: '130', name: 'Unaí', state: 'MG', lat: -16.3600, lng: -46.9039, type: 'polo_agricola' },
  { id: '131', name: 'Patos de Minas', state: 'MG', lat: -18.5784, lng: -46.5185, type: 'polo_agricola' },

  // --- Novas Cidades: Mineração / Industrial ---
  { id: '132', name: 'Parauapebas', state: 'PA', lat: -6.0686, lng: -49.9017, type: 'mineracao' },
  { id: '133', name: 'Canaã dos Carajás', state: 'PA', lat: -6.4997, lng: -49.8775, type: 'mineracao' },
  { id: '134', name: 'Volta Redonda', state: 'RJ', lat: -22.5231, lng: -44.1040, type: 'polo_industrial' },
  { id: '135', name: 'Três Lagoas', state: 'MS', lat: -20.7517, lng: -51.7003, type: 'polo_industrial' },
  { id: '136', name: 'Açailândia', state: 'MA', lat: -4.9456, lng: -47.5003, type: 'polo_industrial' },
  { id: '137', name: 'João Monlevade', state: 'MG', lat: -19.8131, lng: -43.1735, type: 'polo_industrial' },
  { id: '138', name: 'São José do Rio Preto', state: 'SP', lat: -20.8197, lng: -49.3794, type: 'polo_industrial' },
  { id: '139', name: 'Novo Hamburgo', state: 'RS', lat: -29.6783, lng: -51.1314, type: 'polo_industrial' },

  // --- Novas Cidades: Fronteira Internacional ---
  { id: '140', name: 'Santana do Livramento', state: 'RS', lat: -30.8906, lng: -55.5329, type: 'fronteira' },
  { id: '141', name: 'Guajará-Mirim', state: 'RO', lat: -10.7829, lng: -65.3400, type: 'fronteira', portType: 'fluvial' },
  { id: '142', name: 'Oiapoque', state: 'AP', lat: 3.8406, lng: -51.8340, type: 'fronteira', portType: 'fluvial' },
  { id: '143', name: 'Bonfim', state: 'RR', lat: 3.3390, lng: -59.8210, type: 'fronteira' },
  { id: '144', name: 'Epitaciolândia', state: 'AC', lat: -11.0233, lng: -68.7467, type: 'fronteira' },

  // --- Novas Cidades: Cidades Médias Estratégicas ---
  { id: '145', name: 'Feira de Santana', state: 'BA', lat: -12.2664, lng: -38.9663, type: 'cidade' },
  { id: '146', name: 'Uberaba', state: 'MG', lat: -19.7476, lng: -47.9318, type: 'cidade' },
  { id: '147', name: 'Garanhuns', state: 'PE', lat: -8.8905, lng: -36.4965, type: 'cidade' },
  { id: '148', name: 'Picos', state: 'PI', lat: -7.0768, lng: -41.4669, type: 'cidade' },
  { id: '149', name: 'Alagoinhas', state: 'BA', lat: -12.1353, lng: -38.4199, type: 'cidade' },
  { id: '150', name: 'Lages', state: 'SC', lat: -27.8158, lng: -50.3260, type: 'cidade' },
  { id: '151', name: 'Juína', state: 'MT', lat: -11.3765, lng: -58.7364, type: 'cidade' },
  { id: '152', name: 'Palmas do Tocantins', state: 'TO', lat: -12.9530, lng: -48.3419, type: 'polo_agricola' },

  // --- Novas Cidades: Portos e Energia ---
  { id: '153', name: 'Itumbiara', state: 'GO', lat: -18.4186, lng: -49.2153, type: 'cidade', portType: 'fluvial' },
  { id: '154', name: 'Ituiutaba', state: 'MG', lat: -18.9747, lng: -49.4649, type: 'polo_industrial' },
  { id: '155', name: 'Penedo', state: 'AL', lat: -10.2896, lng: -36.5864, type: 'cidade', portType: 'fluvial' },
  { id: '156', name: 'Barras', state: 'PI', lat: -4.2451, lng: -42.2948, type: 'cidade' },
  { id: '157', name: 'Crato', state: 'CE', lat: -7.2342, lng: -39.4095, type: 'cidade' },
  { id: '158', name: 'Jacobina', state: 'BA', lat: -11.1819, lng: -40.5148, type: 'mineracao' },
  { id: '159', name: 'Porto Walter', state: 'AC', lat: -8.2706, lng: -72.7523, type: 'fronteira', portType: 'fluvial' },
  { id: '160', name: 'Humaitá', state: 'AM', lat: -7.5058, lng: -63.0144, type: 'cidade', portType: 'fluvial' },
  { id: '161', name: 'Parintins', state: 'AM', lat: -2.6295, lng: -56.7357, type: 'cidade', portType: 'fluvial' },
  { id: '162', name: 'Tefé', state: 'AM', lat: -3.3836, lng: -64.7106, type: 'cidade', portType: 'fluvial' },

  // --- Expansão: mínimo 5 cidades por estado ---

  // AC (Acre): +3
  { id: '163', name: 'Cruzeiro do Sul', state: 'AC', lat: -7.6297, lng: -72.6726, type: 'polo_agricola', portType: 'fluvial' },
  { id: '164', name: 'Sena Madureira', state: 'AC', lat: -9.0664, lng: -68.6583, type: 'cidade' },
  { id: '165', name: 'Tarauacá', state: 'AC', lat: -8.1589, lng: -70.7742, type: 'fronteira' },

  // AL (Alagoas): +3
  { id: '166', name: 'Palmeira dos Índios', state: 'AL', lat: -9.4089, lng: -36.6264, type: 'cidade' },
  { id: '167', name: 'Delmiro Gouveia', state: 'AL', lat: -9.3892, lng: -37.9983, type: 'polo_industrial' },
  { id: '168', name: 'União dos Palmares', state: 'AL', lat: -9.1644, lng: -36.0328, type: 'polo_agricola' },

  // AP (Amapá): +2
  { id: '169', name: 'Laranjal do Jarí', state: 'AP', lat: -0.7993, lng: -52.4669, type: 'polo_agricola', portType: 'fluvial' },
  { id: '170', name: 'Amapá', state: 'AP', lat: 2.0531, lng: -50.7963, type: 'fronteira' },

  // DF (Distrito Federal): +4
  { id: '171', name: 'Taguatinga', state: 'DF', lat: -15.8311, lng: -48.0591, type: 'polo_industrial' },
  { id: '172', name: 'Ceilândia', state: 'DF', lat: -15.8139, lng: -48.1119, type: 'cidade' },
  { id: '173', name: 'Gama', state: 'DF', lat: -16.0114, lng: -48.0613, type: 'polo_industrial' },
  { id: '174', name: 'Sobradinho', state: 'DF', lat: -15.6519, lng: -47.7947, type: 'cidade' },

  // ES (Espírito Santo): +2
  { id: '175', name: 'Cachoeiro de Itapemirim', state: 'ES', lat: -20.8488, lng: -41.1126, type: 'polo_industrial' },
  { id: '176', name: 'Colatina', state: 'ES', lat: -19.5388, lng: -40.6303, type: 'polo_agricola' },

  // GO (Goiás): +1
  { id: '177', name: 'Catalão', state: 'GO', lat: -18.1661, lng: -47.9447, type: 'mineracao' },

  // MA (Maranhão): +1
  { id: '178', name: 'Caxias', state: 'MA', lat: -4.8658, lng: -43.3589, type: 'polo_agricola' },

  // PB (Paraíba): +3
  { id: '179', name: 'Campina Grande', state: 'PB', lat: -7.2306, lng: -35.8811, type: 'polo_industrial' },
  { id: '180', name: 'Patos', state: 'PB', lat: -7.0244, lng: -37.2797, type: 'polo_agricola' },
  { id: '181', name: 'Sousa', state: 'PB', lat: -6.7597, lng: -38.2289, type: 'cidade' },

  // PE (Pernambuco): +1
  { id: '182', name: 'Serra Talhada', state: 'PE', lat: -7.9878, lng: -38.2953, type: 'cidade' },

  // PI (Piauí): +1
  { id: '183', name: 'Floriano', state: 'PI', lat: -6.7672, lng: -43.0239, type: 'polo_agricola' },

  // RN (Rio Grande do Norte): +1
  { id: '184', name: 'São Gonçalo do Amarante', state: 'RN', lat: -5.7972, lng: -35.3311, type: 'polo_industrial', portType: 'maritime' },

  // RO (Rondônia): +2
  { id: '185', name: 'Vilhena', state: 'RO', lat: -12.7406, lng: -60.1456, type: 'polo_agricola' },
  { id: '186', name: 'Cacoal', state: 'RO', lat: -11.4381, lng: -61.4472, type: 'polo_agricola' },

  // RR (Roraima): +3
  { id: '187', name: 'Caracaraí', state: 'RR', lat: 1.8186, lng: -61.1283, type: 'cidade', portType: 'fluvial' },
  { id: '188', name: 'Mucajaí', state: 'RR', lat: 2.4503, lng: -60.9211, type: 'polo_agricola' },
  { id: '189', name: 'Alto Alegre', state: 'RR', lat: 2.9897, lng: -61.3178, type: 'fronteira' },

  // SE (Sergipe): +3
  { id: '190', name: 'Estância', state: 'SE', lat: -11.2681, lng: -37.4417, type: 'polo_agricola' },
  { id: '191', name: 'Lagarto', state: 'SE', lat: -10.9167, lng: -37.6578, type: 'cidade' },
  { id: '192', name: 'Propriá', state: 'SE', lat: -10.2131, lng: -36.8414, type: 'cidade', portType: 'fluvial' },

  // TO (Tocantins): +2
  { id: '193', name: 'Gurupi', state: 'TO', lat: -11.7297, lng: -49.0678, type: 'polo_agricola' },
  { id: '194', name: 'Porto Nacional', state: 'TO', lat: -10.7064, lng: -48.4164, type: 'cidade', portType: 'fluvial' },
];
