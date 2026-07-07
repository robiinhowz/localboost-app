// Listas expansíveis para o modo Descoberta Automática.
// Basta adicionar/remover itens aqui — o resto do sistema se ajusta.

export const AUTO_NICHES: string[] = [
  "Clínica médica",
  "Dentista",
  "Veterinária",
  "Pet Shop",
  "Academia",
  "Restaurante",
  "Hamburgueria",
  "Pizzaria",
  "Contabilidade",
  "Escritório de advocacia",
  "Oficina mecânica",
  "Auto Center",
  "Auto elétrica",
  "Vidraçaria",
  "Marmoraria",
  "Marcenaria",
  "Energia solar",
  "Climatização",
  "Segurança eletrônica",
  "Dedetização",
  "Limpeza",
  "Imobiliária",
  "Construtora",
  "Serralheria",
];

export const AUTO_CITIES: string[] = [
  "São Paulo SP",
  "Rio de Janeiro RJ",
  "Belo Horizonte MG",
  "Curitiba PR",
  "Porto Alegre RS",
  "Salvador BA",
  "Recife PE",
  "Fortaleza CE",
  "Manaus AM",
  "Brasília DF",
  "Goiânia GO",
  "Vitória ES",
  "Florianópolis SC",
  "Campinas SP",
  "Ribeirão Preto SP",
  "Sorocaba SP",
  "Uberlândia MG",
  "Juiz de Fora MG",
  "Londrina PR",
  "Maringá PR",
  "Joinville SC",
  "Natal RN",
  "João Pessoa PB",
  "Aracaju SE",
  "Cuiabá MT",
  "Campo Grande MS",
];

export function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length > 0) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}
