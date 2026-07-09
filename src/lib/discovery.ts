// Base de municípios brasileiros para o modo Descoberta Automática.
// Estruturada por UF, com estimativa populacional (IBGE) para permitir
// filtrar cidades pequenas e focar em municípios com maior potencial
// comercial. Os critérios são configuráveis — basta ajustar
// DEFAULT_DISCOVERY_CRITERIA ou passar critérios explícitos.

export type UF =
  | "AC" | "AL" | "AM" | "AP" | "BA" | "CE" | "DF" | "ES" | "GO" | "MA"
  | "MG" | "MS" | "MT" | "PA" | "PB" | "PE" | "PI" | "PR" | "RJ" | "RN"
  | "RO" | "RR" | "RS" | "SC" | "SE" | "SP" | "TO";

export type Municipality = {
  name: string;      // Nome sem UF (ex: "Campinas")
  uf: UF;
  pop: number;       // População estimada
};

export type DiscoveryCriteria = {
  minPopulation: number;
  // Ganchos para evolução futura sem quebrar chamadas existentes.
  onlyEconomicallyRelevant?: boolean;
  requireActiveCommerce?: boolean;
};

export const DEFAULT_DISCOVERY_CRITERIA: DiscoveryCriteria = {
  minPopulation: 15000,
  onlyEconomicallyRelevant: true,
  requireActiveCommerce: true,
};

export const UF_LIST: { value: UF; label: string }[] = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
];

export const AUTO_NICHES: string[] = [
  "Clínica médica", "Dentista", "Ortodontista", "Psicólogo", "Nutricionista",
  "Fisioterapeuta", "Estética", "Salão de beleza", "Barbearia", "Veterinária",
  "Pet Shop", "Academia", "Estúdio de pilates", "Crossfit", "Restaurante",
  "Hamburgueria", "Pizzaria", "Cafeteria", "Confeitaria", "Contabilidade",
  "Escritório de advocacia", "Consultoria empresarial", "Oficina mecânica",
  "Auto Center", "Auto elétrica", "Funilaria", "Vidraçaria", "Marmoraria",
  "Marcenaria", "Serralheria", "Energia solar", "Climatização", "Ar condicionado",
  "Segurança eletrônica", "Dedetização", "Empresa de limpeza", "Imobiliária",
  "Construtora", "Arquitetura", "Engenharia civil", "Escola de idiomas",
  "Escola infantil", "Curso profissionalizante", "Fotógrafo", "Buffet infantil",
  "Cerimonial de casamento", "Transportadora", "Despachante", "Gráfica",
  "Loja de móveis planejados",
];

// Dataset compacto: [nome, população_estimada]
// Focado em municípios com comércio ativo e concentração de serviços (IBGE 2022).
const DATA: Record<UF, Array<[string, number]>> = {
  SP: [
    ["São Paulo", 11451245], ["Guarulhos", 1291784], ["Campinas", 1139047],
    ["São Bernardo do Campo", 810979], ["Santo André", 748919],
    ["Osasco", 728615], ["São José dos Campos", 697054], ["Ribeirão Preto", 698418],
    ["Sorocaba", 687357], ["Mauá", 417281], ["São José do Rio Preto", 480780],
    ["Mogi das Cruzes", 458005], ["Diadema", 393277], ["Jundiaí", 405180],
    ["Piracicaba", 407252], ["Carapicuíba", 383941], ["Bauru", 379146],
    ["Itaquaquecetuba", 375011], ["São Vicente", 356551], ["Franca", 351784],
    ["Praia Grande", 330845], ["Guarujá", 322750], ["Taubaté", 317915],
    ["Limeira", 306660], ["Suzano", 300559], ["Taboão da Serra", 282390],
    ["Sumaré", 279187], ["Barueri", 275650], ["Embu das Artes", 256230],
    ["São Carlos", 254484], ["Marília", 240590], ["Indaiatuba", 256223],
    ["Cotia", 253744], ["Americana", 242018], ["Araraquara", 236072],
    ["Jacareí", 235406], ["Presidente Prudente", 231953], ["Hortolândia", 234259],
    ["Santos", 418608], ["Bragança Paulista", 172764], ["Itapetininga", 158471],
    ["Ourinhos", 111702], ["Assis", 105307], ["Registro", 55555],
    ["Botucatu", 148130], ["Jaú", 151359], ["Catanduva", 123199],
    ["Araçatuba", 197713],
  ],
  RJ: [
    ["Rio de Janeiro", 6211423], ["São Gonçalo", 896744], ["Duque de Caxias", 855048],
    ["Nova Iguaçu", 787563], ["Niterói", 481749], ["Belford Roxo", 419155],
    ["Campos dos Goytacazes", 483692], ["São João de Meriti", 458673],
    ["Petrópolis", 278488], ["Volta Redonda", 244859], ["Magé", 232171],
    ["Macaé", 250851], ["Itaboraí", 233897], ["Cabo Frio", 232822],
    ["Nova Friburgo", 178305], ["Barra Mansa", 174869], ["Angra dos Reis", 195268],
    ["Teresópolis", 181205], ["Resende", 133335], ["Rio das Ostras", 155193],
    ["Araruama", 133284], ["Itaguaí", 132472], ["Maricá", 197233],
  ],
  MG: [
    ["Belo Horizonte", 2315560], ["Uberlândia", 713224], ["Contagem", 668949],
    ["Juiz de Fora", 540756], ["Betim", 444690], ["Montes Claros", 414240],
    ["Ribeirão das Neves", 328871], ["Uberaba", 337092], ["Governador Valadares", 257420],
    ["Ipatinga", 240223], ["Sete Lagoas", 240180], ["Divinópolis", 240408],
    ["Santa Luzia", 218897], ["Ibirité", 179362], ["Poços de Caldas", 172712],
    ["Patos de Minas", 152488], ["Pouso Alegre", 152549], ["Teófilo Otoni", 137744],
    ["Barbacena", 138204], ["Varginha", 138813], ["Passos", 115463],
    ["Araguari", 118032], ["Coronel Fabriciano", 105367], ["Muriaé", 100765],
    ["Ubá", 106827], ["Itabira", 118316],
  ],
  ES: [
    ["Vitória", 322869], ["Vila Velha", 467722], ["Serra", 527226],
    ["Cariacica", 383917], ["Cachoeiro de Itapemirim", 210589],
    ["Linhares", 176688], ["São Mateus", 132321], ["Colatina", 124395],
    ["Guarapari", 128312], ["Aracruz", 106017], ["Nova Venécia", 47590],
  ],
  PR: [
    ["Curitiba", 1773718], ["Londrina", 575377], ["Maringá", 430157],
    ["Ponta Grossa", 358838], ["Cascavel", 348051], ["São José dos Pinhais", 329058],
    ["Foz do Iguaçu", 285415], ["Colombo", 253866], ["Guarapuava", 180364],
    ["Paranaguá", 154936], ["Araucária", 143843], ["Toledo", 143014],
    ["Apucarana", 135092], ["Pinhais", 130789], ["Campo Largo", 132570],
    ["Umuarama", 111730], ["Almirante Tamandaré", 121566], ["Piraquara", 111511],
    ["Cambé", 106952], ["Arapongas", 128537], ["Francisco Beltrão", 92216],
    ["Pato Branco", 82881], ["Campo Mourão", 96131],
  ],
  RS: [
    ["Porto Alegre", 1332570], ["Caxias do Sul", 517451], ["Pelotas", 328107],
    ["Canoas", 347635], ["Santa Maria", 271085], ["Gravataí", 272311],
    ["Viamão", 224520], ["Novo Hamburgo", 247620], ["São Leopoldo", 240630],
    ["Rio Grande", 211965], ["Alvorada", 195673], ["Passo Fundo", 205489],
    ["Sapucaia do Sul", 141808], ["Uruguaiana", 121892], ["Santa Cruz do Sul", 130416],
    ["Cachoeirinha", 125113], ["Bagé", 121143], ["Bento Gonçalves", 122180],
    ["Erechim", 105787], ["Lajeado", 89932], ["Ijuí", 84955],
  ],
  SC: [
    ["Florianópolis", 508826], ["Joinville", 616317], ["Blumenau", 361261],
    ["São José", 254128], ["Chapecó", 254125], ["Itajaí", 264054],
    ["Criciúma", 217311], ["Jaraguá do Sul", 184579], ["Lages", 156727],
    ["Palhoça", 172086], ["Balneário Camboriú", 148228], ["Brusque", 141671],
    ["Tubarão", 106171], ["Camboriú", 92110], ["São Bento do Sul", 84387],
    ["Caçador", 78168], ["Concórdia", 74641], ["Rio do Sul", 71017],
  ],
  DF: [
    ["Brasília", 2817381], ["Taguatinga", 205670], ["Ceilândia", 349644],
  ],
  GO: [
    ["Goiânia", 1437366], ["Aparecida de Goiânia", 545982], ["Anápolis", 391772],
    ["Rio Verde", 253742], ["Luziânia", 214119], ["Águas Lindas de Goiás", 210141],
    ["Valparaíso de Goiás", 172966], ["Trindade", 132420], ["Formosa", 122176],
    ["Novo Gama", 116103], ["Itumbiara", 102456], ["Senador Canedo", 118372],
    ["Catalão", 115541], ["Jataí", 102000], ["Planaltina", 90000],
    ["Caldas Novas", 90690], ["Mineiros", 66550],
  ],
  MS: [
    ["Campo Grande", 897938], ["Dourados", 227502], ["Três Lagoas", 122909],
    ["Corumbá", 96520], ["Ponta Porã", 93937], ["Naviraí", 55372],
    ["Nova Andradina", 55589], ["Aquidauana", 47614],
  ],
  MT: [
    ["Cuiabá", 650912], ["Várzea Grande", 302548], ["Rondonópolis", 250227],
    ["Sinop", 200674], ["Tangará da Serra", 106040], ["Cáceres", 91271],
    ["Sorriso", 100792], ["Lucas do Rio Verde", 82278], ["Barra do Garças", 60833],
    ["Primavera do Leste", 76550],
  ],
  BA: [
    ["Salvador", 2418005], ["Feira de Santana", 616272], ["Vitória da Conquista", 341128],
    ["Camaçari", 300373], ["Itabuna", 213219], ["Juazeiro", 218162],
    ["Lauro de Freitas", 197615], ["Ilhéus", 159187], ["Jequié", 156642],
    ["Teixeira de Freitas", 158445], ["Alagoinhas", 155887], ["Barreiras", 158292],
    ["Porto Seguro", 154648], ["Simões Filho", 132224], ["Paulo Afonso", 120000],
    ["Eunápolis", 108162], ["Santo Antônio de Jesus", 101282],
    ["Guanambi", 82963],
  ],
  PE: [
    ["Recife", 1488920], ["Jaboatão dos Guararapes", 686107], ["Olinda", 359016],
    ["Caruaru", 365278], ["Petrolina", 386791], ["Paulista", 322591],
    ["Cabo de Santo Agostinho", 210227], ["Camaragibe", 141822],
    ["Garanhuns", 137810], ["Vitória de Santo Antão", 143603], ["Igarassu", 117051],
    ["São Lourenço da Mata", 118036], ["Serra Talhada", 84589],
  ],
  CE: [
    ["Fortaleza", 2428708], ["Caucaia", 366208], ["Juazeiro do Norte", 279755],
    ["Maracanaú", 224804], ["Sobral", 210711], ["Crato", 133032],
    ["Itapipoca", 130074], ["Maranguape", 133191], ["Iguatu", 103427],
    ["Quixadá", 84483], ["Pacatuba", 84812], ["Aquiraz", 82443],
  ],
  MA: [
    ["São Luís", 1037775], ["Imperatriz", 259980], ["São José de Ribamar", 179015],
    ["Timon", 173453], ["Caxias", 165525], ["Codó", 121002],
    ["Paço do Lumiar", 122438], ["Açailândia", 105121], ["Bacabal", 103359],
    ["Balsas", 95873],
  ],
  RN: [
    ["Natal", 751300], ["Mossoró", 264577], ["Parnamirim", 267036],
    ["São Gonçalo do Amarante", 106881], ["Macaíba", 92047], ["Ceará-Mirim", 74428],
    ["Caicó", 68926], ["Currais Novos", 41773],
  ],
  PB: [
    ["João Pessoa", 833932], ["Campina Grande", 419379], ["Santa Rita", 137599],
    ["Patos", 108766], ["Bayeux", 91708], ["Cabedelo", 66450],
    ["Sousa", 70320], ["Cajazeiras", 63174], ["Guarabira", 60638],
  ],
  AL: [
    ["Maceió", 957916], ["Arapiraca", 233047], ["Palmeira dos Índios", 74749],
    ["Rio Largo", 78310], ["União dos Palmares", 66628], ["Penedo", 63036],
    ["Coruripe", 55910],
  ],
  SE: [
    ["Aracaju", 602757], ["Nossa Senhora do Socorro", 168738], ["Lagarto", 105047],
    ["Itabaiana", 96574], ["São Cristóvão", 91274], ["Estância", 66614],
    ["Tobias Barreto", 51849],
  ],
  PI: [
    ["Teresina", 866300], ["Parnaíba", 154716], ["Picos", 79038],
    ["Piripiri", 62960], ["Floriano", 60000], ["Barras", 44850],
  ],
  AM: [
    ["Manaus", 2063689], ["Parintins", 116924], ["Itacoatiara", 100301],
    ["Manacapuru", 96792], ["Coari", 85910], ["Tefé", 61453],
    ["Tabatinga", 78912],
  ],
  PA: [
    ["Belém", 1303403], ["Ananindeua", 484278], ["Santarém", 306480],
    ["Marabá", 283542], ["Castanhal", 208045], ["Parauapebas", 233669],
    ["Abaetetuba", 156292], ["Cametá", 137915], ["Marituba", 137986],
    ["Bragança", 129358], ["Altamira", 126279], ["Tucuruí", 117260],
  ],
  RO: [
    ["Porto Velho", 460413], ["Ji-Paraná", 116610], ["Ariquemes", 109523],
    ["Vilhena", 106470], ["Cacoal", 85893], ["Rolim de Moura", 63232],
  ],
  AC: [
    ["Rio Branco", 413418], ["Cruzeiro do Sul", 92263], ["Sena Madureira", 45097],
    ["Tarauacá", 46503],
  ],
  RR: [
    ["Boa Vista", 436591], ["Rorainópolis", 26449], ["Caracaraí", 20126],
  ],
  AP: [
    ["Macapá", 442933], ["Santana", 121364], ["Laranjal do Jari", 47554],
  ],
  TO: [
    ["Palmas", 313349], ["Araguaína", 183381], ["Gurupi", 87393],
    ["Porto Nacional", 53912], ["Paraíso do Tocantins", 55408],
  ],
};

export const ALL_MUNICIPALITIES: Municipality[] = Object.entries(DATA).flatMap(
  ([uf, list]) => list.map(([name, pop]) => ({ name, uf: uf as UF, pop })),
);

export function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length > 0) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Retorna os municípios de um estado que atendem aos critérios.
 * Prioriza cidades maiores (mais empresas e comércio) mas embaralha
 * dentro de cada faixa para variar as buscas entre execuções.
 */
export function getMunicipalitiesForState(
  uf: UF,
  criteria: Partial<DiscoveryCriteria> = {},
): Municipality[] {
  const c = { ...DEFAULT_DISCOVERY_CRITERIA, ...criteria };
  const list = ALL_MUNICIPALITIES.filter(
    (m) => m.uf === uf && m.pop >= c.minPopulation,
  );
  // Ordena por pop desc, então embaralha dentro de tiers de 100k para
  // manter cidades grandes primeiro mas variar a ordem interna.
  const tiers = new Map<number, Municipality[]>();
  for (const m of list) {
    const tier = Math.floor(m.pop / 100000);
    if (!tiers.has(tier)) tiers.set(tier, []);
    tiers.get(tier)!.push(m);
  }
  const tierKeys = [...tiers.keys()].sort((a, b) => b - a);
  const out: Municipality[] = [];
  for (const k of tierKeys) out.push(...shuffle(tiers.get(k)!));
  return out;
}
