/**
 * The agreement template. PROVISIONAL text: replaced by the reviewed wording once the drafting
 * panel finishes. Placeholders: {{COMPANY}}, {{COMPANY_ADDRESS}}, {{OWNER_NAME}} (filled when an
 * agreement is issued), {{SIGNER_NAME}}, {{EFFECTIVE_DATE}} (filled when it is shown and signed).
 */
export type NdaTemplate = {
  version: string;
  title: string;
  intro: string[];
  sections: Array<{ key: string; heading: string; paragraphs: string[]; initial: boolean }>;
  acknowledgment: string[];
};

export const NDA_TEMPLATE: NdaTemplate = {
  version: "2026-10-29-draft",
  title: "Confidentiality and Non-Disclosure Agreement",
  intro: [
    "This Confidentiality and Non-Disclosure Agreement (the \"Agreement\") is made as of {{EFFECTIVE_DATE}} (the \"Effective Date\") between {{COMPANY}}, located at {{COMPANY_ADDRESS}} (the \"Company\"), and {{SIGNER_NAME}} (\"Recipient\").",
  ],
  sections: [
    { key: "confidential_information", heading: "Confidential Information", paragraphs: ["Provisional wording."], initial: true },
    { key: "client_personal_information", heading: "Client Personal Information", paragraphs: ["Provisional wording."], initial: true },
    { key: "obligations", heading: "What Recipient Agrees To Do", paragraphs: ["Provisional wording."], initial: true },
    { key: "non_solicitation", heading: "Non-Solicitation", paragraphs: ["Provisional wording."], initial: true },
    { key: "remedies_law", heading: "Remedies, Governing Law and Jury Waiver", paragraphs: ["Provisional wording."], initial: true },
    { key: "electronic_signatures", heading: "Electronic Signatures and Records", paragraphs: ["Provisional wording."], initial: true },
  ],
  acknowledgment: ["I have read and understand this Agreement."],
};
