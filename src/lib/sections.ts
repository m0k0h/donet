// Secciones del súper, en el orden en que se suele recorrer la tienda.
export const SECTIONS = [
  { id: "fruta", label: "Fruta y verdura" },
  { id: "panaderia", label: "Panadería" },
  { id: "carne", label: "Carne" },
  { id: "pescado", label: "Pescado y marisco" },
  { id: "charcuteria", label: "Charcutería y quesos" },
  { id: "lacteos", label: "Lácteos y huevos" },
  { id: "despensa", label: "Despensa" },
  { id: "desayuno", label: "Desayuno y dulces" },
  { id: "bebidas", label: "Bebidas" },
  { id: "congelados", label: "Congelados" },
  { id: "limpieza", label: "Limpieza y hogar" },
  { id: "higiene", label: "Higiene y farmacia" },
  { id: "mascotas", label: "Mascotas" },
  { id: "otros", label: "Otros" },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

export const OTHER: SectionId = "otros";

const IDS = new Set<string>(SECTIONS.map((s) => s.id));
export const isSectionId = (v: unknown): v is SectionId => typeof v === "string" && IDS.has(v);

// Palabras que no dicen qué es: artículos, cantidades y envases («2 kg de», «una bolsa de»).
const IGNORED = new Set(
  (
    "de del la el los las lo en con sin para por y o a al un una unos unas mi su algo poco mas " +
    "dos tres cuatro cinco seis siete ocho nueve diez doce media medio cuarto docena docenas " +
    "kg kilo kilos g gr grs gramo gramos l lt litro litros ml cl ud uds unidad unidades x " +
    "paquete paquetes bolsa bolsas bote botes lata latas caja cajas botella botellas brick bricks " +
    "pack packs tarro tarros sobre sobres bandeja bandejas malla mallas garrafa garrafas rollo rollos tubo tubos"
  ).split(" "),
);

// Singular aproximado y el mismo para las dos formas: tomate/tomates → «tomat»,
// limón/limones → «limon», nuez/nueces → «nuec». No tiene que ser una palabra real,
// solo coincidir entre lo que se escribe y el diccionario.
function stem(w: string) {
  w = w.replace(/z$/, "c");
  if (w.length > 3 && w.endsWith("s")) w = w.slice(0, -1);
  if (w.length > 3 && w.endsWith("e") && !/[aeiou]/.test(w[w.length - 2])) w = w.slice(0, -1);
  return w;
}

// Palabras que importan, normalizadas: sin tildes, sin cantidades y en singular.
function tokens(text: string) {
  return text
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w && !/^\d/.test(w) && !IGNORED.has(w))
    .map(stem);
}

// Clave con la que se recuerda un artículo: «2 Tomates» y «tomate» son lo mismo.
export const itemKey = (name: string) => tokens(name).join(" ");

// Diccionario por sección. Se admiten frases («pan rallado», «pasta de dientes»):
// la frase más larga gana, y entre iguales la que va antes («helado de chocolate» → helado).
const WORDS: Record<Exclude<SectionId, "otros">, string> = {
  fruta: `fruta, verdura, hortaliza, manzana, pera, platano, banana, naranja, mandarina, clementina, limon, lima,
    pomelo, uva, fresa, freson, frambuesa, arandano, mora, cereza, picota, melocoton, nectarina, paraguayo,
    albaricoque, ciruela, kiwi, mango, pina, papaya, maracuya, melon, sandia, higo, granada, caqui, chirimoya,
    aguacate, coco, datil fresco, tomate, cherry, lechuga, escarola, rucula, canonigo, ensalada, espinaca, acelga,
    col, repollo, lombarda, coliflor, brocoli, romanesco, kale, alcachofa, esparrago, berenjena, calabacin,
    calabaza, pepino, pimiento, guindilla, cebolla, cebolleta, chalota, puerro, ajo, ajete, zanahoria, patata,
    papa, boniato, batata, nabo, rabano, remolacha, apio, hinojo, endibia, judia verde, haba, champinon, seta,
    boletus, perejil, cilantro, albahaca, menta, hierbabuena, romero fresco, jengibre, brote, germinado`,
  panaderia: `pan, barra, baguette, chapata, hogaza, pan de molde, pan integral, pan de hamburguesa, pan de perrito,
    pan de pita, pita, croissant, cruasan, napolitana, ensaimada, bollo, bolleria, empanada, tarta, pastel,
    pastela, tortilla de trigo, wrap, picos, colines, rosquilleta`,
  carne: `carne, pollo, pechuga, muslo, contramuslo, alita, pavo, ternera, vaca, buey, cerdo, lomo, solomillo,
    chuleta, chuleton, costilla, filete, entrecot, cordero, conejo, carne picada, picada, hamburguesa,
    albondiga, salchicha, butifarra, secreto, presa, pluma, carrillada, codillo, higado, pato, codorniz,
    milanesa, escalope, churrasco, rabo, osobuco, magro, carne guisar`,
  pescado: `pescado, merluza, pescadilla, bacalao, salmon, atun fresco, emperador, pez espada, sardina, boqueron,
    dorada, lubina, rape, lenguado, gallo, trucha, caballa, jurel, rodaballo, sepia, calamar, pulpo, chipiron,
    gamba, langostino, mejillon, almeja, navaja, cigala, bogavante, cangrejo, surimi, palito de cangrejo, gula,
    marisco, salmon ahumado`,
  charcuteria: `jamon, jamon serrano, jamon york, jamon cocido, pechuga de pavo, fiambre, embutido, chorizo,
    salchichon, fuet, lomo embuchado, mortadela, salami, sobrasada, morcilla, bacon, beicon, panceta, cecina,
    lacon, pate, foie, queso, mozzarella, parmesano, manchego, brie, camembert, cheddar, emmental, gouda,
    burrata, rulo de cabra, queso rallado`,
  lacteos: `leche, yogur, yogurt, kefir, skyr, nata, mantequilla, margarina, natilla, flan, cuajada, requeson,
    petit suisse, batido, huevo, bebida de avena, bebida de soja, bebida de almendra, bebida vegetal,
    arroz con leche, queso batido, actimel, danone`,
  despensa: `arroz, pasta, espagueti, macarron, tallarin, fideo, lasana, canelon, ravioli, tortellini, cuscus,
    quinoa, harina, levadura, maicena, azucar, edulcorante, sal, pimienta, especia, oregano, comino, pimenton,
    canela, curry, laurel, nuez moscada, aceite, vinagre, lenteja, garbanzo, alubia, judia, legumbre,
    tomate frito, tomate triturado, tomate natural, salsa, mayonesa, ketchup, mostaza, alioli, pesto, caldo,
    pastilla de caldo, sopa, pure, conserva, atun, bonito, sardinilla, anchoa, berberecho, aceituna, pepinillo,
    maiz, pan rallado, patatas fritas, nacho, palomita, fruto seco, almendra, nuez, cacahuete, pipa, pistacho,
    anacardo, avellana, pasa, datil, aperitivo, gazpacho, salmorejo, hummus, masa de pizza, masa quebrada,
    hojaldre`,
  desayuno: `cafe, cafe molido, capsula, te, infusion, manzanilla, poleo, cola cao, colacao, cacao, nesquik,
    cereal, muesli, avena, copos de avena, granola, galleta, magdalena, bizcocho, mermelada, miel,
    crema de cacao, nocilla, nutella, chocolate, bombon, caramelo, dulce, chuche, chucheria, chicle, gominola, turron,
    polvoron, donut, palmera, sobao, tortita, biscote, pan tostado, barrita`,
  bebidas: `agua, agua con gas, refresco, coca cola, cola, fanta, sprite, gaseosa, tonica, zumo, nectar, cerveza,
    vino, cava, champan, sidra, vermut, whisky, ron, ginebra, gin, vodka, licor, tequila, bebida, isotonica,
    aquarius, red bull, bebida energetica, horchata, granizado, kombucha, mosto, tinto de verano`,
  congelados: `congelado, congelada, helado, hielo, pizza, croqueta, empanadilla, guisante, varita de merluza,
    san jacobo, nugget, polo, calamares a la romana, verdura congelada`,
  limpieza: `detergente, suavizante, lejia, amoniaco, friegasuelos, lavavajillas, jabon de lavadora,
    jabon lavavajillas, gel de lavadora, pastilla lavavajillas, sal lavavajillas, abrillantador, estropajo,
    bayeta, fregona, escoba, recogedor, guante, basura, papel de cocina, servilleta, papel de aluminio,
    papel albal, film, papel film, papel de horno, ambientador, insecticida, limpiacristales, quitagrasas,
    limpiador, pila, bombilla, vela, cerilla, mechero, carbon, lavadora, quitamanchas`,
  higiene: `papel higienico, papel, champu, acondicionador, mascarilla, gel, gel de ducha, jabon, jabon de manos,
    desodorante, pasta de dientes, dentifrico, cepillo de dientes, colutorio, enjuague bucal, hilo dental,
    crema, crema hidratante, protector solar, crema solar, maquinilla, cuchilla, espuma de afeitar, compresa,
    tampon, salvaslip, panal, toallita, bastoncillo, algodon, tirita, panuelo, clinex, kleenex, colonia,
    perfume, laca, gomina, tinte, quitaesmalte, pintalabios, maquillaje, rimel, medicina, paracetamol,
    ibuprofeno, termometro, preservativo`,
  mascotas: `pienso, arena para gato, comida de perro, comida de gato, mascota, perro, gato, cachorro, antiparasitario`,
};

const DICTIONARY = new Map<string, SectionId>();
for (const [section, list] of Object.entries(WORDS) as [SectionId, string][]) {
  for (const phrase of list.split(",")) {
    const key = itemKey(phrase);
    if (key && !DICTIONARY.has(key)) DICTIONARY.set(key, section);
  }
}

// Palabras que deciden la sección estén donde estén: «guisantes congelados», «salchichas para perro».
const DECISIVE = new Map<string, SectionId>(
  [
    ["congelado", "congelados"],
    ["congelada", "congelados"],
    ["perro", "mascotas"],
    ["gato", "mascotas"],
    ["mascota", "mascotas"],
  ].map(([w, s]) => [stem(w), s as SectionId]),
);

// Memoria de un hogar: clave del artículo (itemKey) → sección elegida a mano.
export type SectionMemory = Record<string, SectionId>;

// Sección de un artículo: lo que el hogar corrigió, si no el diccionario. Sin coincidencia, undefined.
export function classifySection(name: string, memory?: SectionMemory): SectionId | undefined {
  const t = tokens(name);
  if (!t.length) return undefined;
  const remembered = memory?.[t.join(" ")];
  if (remembered) return remembered;
  for (const w of t) {
    const s = DECISIVE.get(w);
    if (s) return s;
  }
  for (let n = Math.min(3, t.length); n >= 1; n--) {
    for (let i = 0; i + n <= t.length; i++) {
      const s = DICTIONARY.get(t.slice(i, i + n).join(" "));
      if (s) return s;
    }
  }
  return undefined;
}
