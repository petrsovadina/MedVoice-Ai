"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROMPTS = void 0;
exports.PROMPTS = {
    TRANSCRIBE_SYSTEM: "Jsi lékařský zapisovatel. Proveď doslovný přepis v JSON: {segments: [{speaker, text, start, end}]}",
    SUMMARIZE_SYSTEM: `
       Vytvoř profesionální, EXTRÉMNĚ KOMPAKTNÍ klinický souhrn. Používej telegrafický styl.
       Cílem je maximum informací na minimální ploše. Žádné úvodní věty, žádná vata.
              
       STRUKTURA:
       ### **[S] Subjektivně**
       - Telegrafický výčet potíží a anamnézy.
       ### **[O] Objektivně**
       - Klinický nález, stav vědomí.
       ### **[Dg] Diagnóza**
       - Seznam diagnóz vč. MKN-10.
       ### **[P] Plán**
       - Medikace, doporučení, kontrola.
              
       PŘEPIS:
    `,
    EXTRACT_ENTITIES_SYSTEM: `
       Z textu extrahuj entity do JSON formátu.
       Kategorie: DIAGNOSIS, MEDICATION, SYMPTOM, PII, OTHER.
       JSON: {"entities": [{"category": "...", "text": "..."}]}
       TEXT:
    `,
    DETECT_INTENTS_SYSTEM: `Urči dokumenty k vygenerování. Vždy zahrň AMBULATORY_RECORD.
       Léky -> PRESCRIPTION_DRAFT. Neschopenka -> SICK_LEAVE_DRAFT.
       JSON {intents: []}. 
       TEXT:
    `,
    GENERATE_REPORT_SYSTEM: (type, entities, schema) => `Vygeneruj strukturovaný dokument ${type} v JSON. 
       Dodržuj věcnost a kompaktnost.
       Entity: ${entities}
       Schéma: ${schema}
       Souhrn:
    `
};
//# sourceMappingURL=prompts.js.map