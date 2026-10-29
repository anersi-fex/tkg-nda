/**
 * The agreement template: the Company's Visitor Non-Disclosure Agreement.
 *
 * Drafted and reviewed on 2026-10-29 by a panel (three drafters: a Michigan business litigator's
 * lens, an insurance compliance lens and a plain-language lens; two judges; a synthesizer; two
 * rounds of three adversarial reviewers for Michigan enforceability, E-SIGN and Michigan UETA
 * evidence, and language; a fixer; a final completeness critic). It is careful work, not legal
 * advice: the owner was told to have a Michigan attorney read it once. The panel's notes for the
 * owner are at the bottom (NOTES_FOR_OWNER).
 *
 * Placeholders: {{COMPANY}}, {{COMPANY_ADDRESS}}, {{OWNER_NAME}} are filled when an agreement is
 * issued (Settings); {{SIGNER_NAME}} and {{EFFECTIVE_DATE}} when it is shown and signed. Keep the
 * text ASCII (straight quotes, hyphens): the PDF draws it with the standard Helvetica. Sections
 * with initial: true get a gold tab the signer taps. Bump `version` with any wording change; an
 * issued agreement keeps the wording it was issued with (envelopes.document).
 */
export type NdaTemplate = {
  version: string;
  title: string;
  intro: string[];
  sections: Array<{ key: string; heading: string; paragraphs: string[]; initial: boolean }>;
  acknowledgment: string[];
  /** The checkbox text a signer agrees to before anything else (E-SIGN consent). Frozen and hashed with the agreement. */
  consent: string;
  /** The line under the signature pad when a signature is adopted. Frozen and hashed with the agreement. */
  adoption: string;
};

export const NDA_TEMPLATE: NdaTemplate = {
  version: "2026-10-29.2",
  consent:
    "I agree to sign this Agreement electronically and to receive my copy electronically. My typed name, the signature and initials I adopt, and each tap I make to initial, agree or sign are my signature. I understand that the time of each tap, the network (IP) address it came from, an approximate location for that address and my device and browser are recorded. I can ask {{OWNER_NAME}} for a paper copy at any time at no charge.",
  adoption: "By tapping Adopt and continue, I agree that the signature and initials shown are my electronic signature and initials, with the same legal effect as my handwriting, and that they need not look like my handwriting.",
  title: "Visitor Non-Disclosure Agreement",
  intro: [
    'This Visitor Non-Disclosure Agreement (the "Agreement") is made on {{EFFECTIVE_DATE}} (the "Effective Date") between {{COMPANY}} (the "Company"), an independent insurance agency in Troy, Michigan, with its office at {{COMPANY_ADDRESS}}, and {{SIGNER_NAME}} ("Recipient"), an individual. The Company and Recipient are each a "Party" and together the "Parties."',
    "The Company is a Goosehead Insurance franchise agency that sells home, auto and other personal lines of property and casualty insurance. Its principal, {{OWNER_NAME}}, also runs a life-insurance telephone sales team from the same office. In its daily work the Company holds private personal, financial and health information about clients and prospective clients, and confidential business information of its own and of its franchisor, insurance carriers and referral partners, all of which it must protect by law and by contract.",
    'Recipient has asked, or has been invited, to visit the Company\'s office to learn about the business, meet the team, observe work (which may include live or recorded sales calls) and explore joining the team, together with any later visit, call or contact the Company allows for the same purposes (the "Visit"). Recipient is not an employee, contractor or agent of the Company, receives no pay for the Visit, and is not promised a job.',
    "In exchange for Recipient's promises below, the Company will admit Recipient to its office for the Visit and will let Recipient see and hear Confidential Information it would otherwise keep private. Recipient agrees that the Company's promise to allow the Visit, and the access itself, are good and sufficient consideration, even if the Visit is short, is cut short or is moved to another day, and that the Company would not allow the Visit without this Agreement.",
    "Recipient confirms that Recipient is at least 18 years old and has full legal capacity to enter into this Agreement. Recipient also confirms that, except as Recipient has told {{OWNER_NAME}} in writing before the Visit, Recipient is not employed by, contracted with or recruiting for any other insurance agency, carrier, marketing organization or lead vendor, and has no agreement with anyone that conflicts with this Agreement.",
  ],
  sections: [
    {
      key: "confidential_information",
      heading: "Confidential Information",
      initial: true,
      paragraphs: [
        'In this Agreement, "Confidential Information" means all information, in any form, that Recipient sees, hears, overhears, reads or otherwise learns during or because of the Visit, or from any Company team member in connection with the Visit or Recipient\'s possible joining of the team, whether or not it is marked confidential. It includes information shared on purpose and information Recipient merely happens to notice, such as a screen left open, a call in progress or a conversation nearby. It includes information that belongs to the Company and information the Company holds for others, including its franchisor (Goosehead Insurance), insurance carriers, referral partners, clients and prospective clients.',
        "Confidential Information includes, without limitation: (a) Client Personal Information, defined in the Client Personal Information section; (b) live and recorded sales calls, transcripts and call reviews; (c) the Company's customer relationship management system, dialer and other internal applications, and what their screens show; (d) lead sources and lead lists; (e) the identities of referral partners, mainly mortgage loan officers, and their clients; (f) sales scripts, processes, methods and training; (g) carrier relationships and commission and pricing information; (h) team production numbers and compensation; (i) business plans, strategies and ideas; and (j) every note, summary, copy or other material that contains or reflects any of the above.",
        "Confidential Information does not include information that Recipient can show: (a) is or becomes generally available to the public through no act or failure of Recipient; (b) was already known to Recipient before the Visit, as shown by Recipient's written records, free of any duty to keep it confidential; (c) Recipient developed independently without using Confidential Information; or (d) Recipient received rightfully from a third party who had the right to share it without restriction. Recipient has the burden of proving that an exclusion applies. A compilation of information is Confidential Information even if some of its pieces are publicly available.",
        "Confidential Information also does not include the general nature of the Company's business, the fact and date of the Visit, Recipient's own general impressions of the office and the team, or the general skills, knowledge and experience Recipient gains, so long as Recipient discloses no Client Personal Information and no specific Confidential Information.",
        "These exclusions do not apply to Client Personal Information, which stays protected by this Agreement and by law however Recipient learned it, unless Recipient already lawfully held that same information from a source unrelated to the Company and the Visit.",
      ],
    },
    {
      key: "non_disclosure",
      heading: "Non-Disclosure and Non-Use",
      initial: true,
      paragraphs: [
        "Recipient will hold all Confidential Information in strict confidence. Recipient will not disclose Confidential Information to anyone, including family members, friends, roommates, classmates, instructors, employers and anyone in the insurance business, and will not post about it online or in any group chat. Recipient will not use Confidential Information for any purpose other than taking part in the Visit and deciding whether to join the team; in particular, Recipient will not use it for any other personal, academic or business purpose. Recipient will protect Confidential Information with at least the care Recipient uses for Recipient's own most sensitive information, and never less than reasonable care.",
        "During the Visit, Recipient will not: (a) copy, photograph, screenshot, scan, record (audio or video), transcribe or otherwise capture any Confidential Information or anything shown on a screen or document; (b) take notes of any personal information about a client or prospective client; (c) remove, email, text, upload or otherwise send any paper, file, device or other material from the office or from any Company system; or (d) use a phone, camera, smartwatch, smart glasses, laptop or any other personal device to capture, store or send anything that contains or reflects Confidential Information or anything shown on a screen or document at the office.",
        "On request, Recipient will put personal devices away, turn them off or leave them where the Company directs.",
        "Recipient will not touch, log in to or access any Company computer, phone system, application, account, file, drive or network, including the office Wi-Fi, unless a Company team member invites Recipient to do so for a specific purpose, and then only as directed and while that person is present. Recipient will not share, guess, record or write down any password, code or login. Recipient will not listen in on calls, meetings or conversations beyond what the Company invites Recipient to observe, and will not open, read or handle any file, mail, document or screen Recipient was not shown.",
        "If Recipient is unsure whether something is Confidential Information, Recipient will treat it as Confidential Information and ask {{OWNER_NAME}}. If Recipient sees or overhears Confidential Information by accident, Recipient will treat it the same way and will not repeat, use or record it. Recipient is responsible for any use or disclosure of Confidential Information by anyone who learned it from Recipient.",
        "Recipient will follow every instruction a Company team member gives about where Recipient may go, what Recipient may see and when Recipient must step away from a call, a screen or a conversation. Recipient understands that the Company records its sales calls and may have security cameras, and consents to being recorded while at the office and to the Company keeping those recordings and using them for security, training, compliance, record-keeping and to enforce this Agreement.",
      ],
    },
    {
      key: "client_personal_information",
      heading: "Client Personal Information",
      initial: true,
      paragraphs: [
        "The Company's clients and prospective clients trust it with highly sensitive personal information. \"Client Personal Information\" means any information about an identified or identifiable client, prospective client, applicant, insured, beneficiary or referral partner's client that Recipient learns during or because of the Visit. It includes names, addresses, phone numbers, email addresses, dates of birth, Social Security numbers, driver's license numbers, bank account, routing, debit and credit card numbers, income, employment, policy and application details, and health, medical, prescription or lifestyle information from life-insurance applications, calls or records, in any form, including something Recipient only hears or overhears. Client Personal Information is Confidential Information.",
        "Recipient understands that this information is protected by federal and Michigan law, including the Gramm-Leach-Bliley Act (15 U.S.C. § 6801 et seq.), which requires financial institutions, insurance agencies included, to protect the security and confidentiality of consumers' nonpublic personal information, which Michigan applies to insurance licensees through the Michigan Insurance Code and its privacy rules (Michigan Administrative Code R 500.501 et seq.); the Insurance Code's data security chapter (MCL 500.550 et seq.); the Michigan Identity Theft Protection Act (MCL 445.61 et seq.); and the Michigan Social Security Number Privacy Act (MCL 445.81 et seq.); and that health information receives added protection under federal and state law.",
        "Recipient agrees to treat all Client Personal Information as protected under these laws, whether or not a particular law applies to Recipient directly, and Recipient's duties under this Agreement do not depend on whether any of these laws reaches Recipient or the Company.",
        "Recipient will never record, write down, type, photograph, copy, keep, use, share, discuss or disclose Client Personal Information, in any form, for any purpose, at any time, during or after the Visit. Recipient will not use Client Personal Information to look up, contact, friend, follow, message or approach any person it is about. Recipient's contact with clients, prospective clients and referral partners is also limited by the Non-Solicitation section, for the period stated there.",
        "Recipient will not use any Client Personal Information to open an account, apply for credit, verify an identity, make a purchase or complete any other transaction, which may also be a crime. If Recipient learns Client Personal Information by accident, Recipient will not repeat it to anyone.",
        "If Recipient loses, exposes, accidentally captures, shares or discloses any Client Personal Information or other Confidential Information, learns that someone else may have done so, or learns that a device Recipient used at the office was lost, stolen or compromised, Recipient will tell {{OWNER_NAME}} immediately, by phone and in writing, on the same day Recipient learns of it, with every detail Recipient knows.",
        "Recipient will cooperate fully with the Company's efforts to contain the problem and to meet any legal notice duties, including deleting or returning copies. Prompt reporting does not excuse a breach, and failing to report is itself a separate breach of this Agreement.",
      ],
    },
    {
      key: "non_solicitation",
      heading: "Non-Solicitation",
      initial: true,
      paragraphs: [
        'For twelve (12) months after the later of the last day of the Visit or the last date the Company discloses Confidential Information to Recipient (the "Restricted Period"), Recipient will not, directly or through anyone else: (a) solicit, call on or divert, or use Confidential Information to do insurance business with, any client, prospective client or referral partner whose identity or needs Recipient learned about through Confidential Information; or (b) induce or try to induce any such client, prospective client or referral partner to reduce or end its business with the Company.',
        "In this section, a prospective client is a person the Company quoted, contacted or carried as a lead in the twelve (12) months before the Restricted Period began, and a referral partner is a person or business, such as a mortgage loan officer, that refers clients to the Company.",
        "During the Restricted Period, Recipient will not solicit or recruit any of the Company's team members (employees, agents, producers or contractors) to work for another insurance agency, carrier, marketing organization or lead business, and will not knowingly induce any of them to leave the Company or help anyone else do so. A general job posting not aimed at the Company's people, ordinary social contact, and answering a team member's unsolicited questions are not breaches.",
        "This section does not stop Recipient from working in the insurance industry or for any other agency, carrier or employer, from buying insurance for Recipient's own needs, or from dealing with people Recipient already knew before the Visit without using any Confidential Information. Accepting business that a client, prospective client or referral partner brings to Recipient without any solicitation by Recipient or anyone acting for Recipient, and without any use of Confidential Information, is not a breach. This Agreement contains no non-compete.",
        "Each promise in this section applies only to the extent the law allows. The Parties agree these limits are narrow, reasonable and necessary to protect the Company's Confidential Information and its relationships, which were built at great expense, and that a court may narrow any part that goes too far rather than strike it.",
      ],
    },
    {
      key: "term",
      heading: "How Long These Promises Last",
      initial: false,
      paragraphs: [
        "Recipient's confidentiality and non-use obligations under this Agreement last for three (3) years from the Effective Date or, for Confidential Information Recipient first learns during a later visit or disclosure, three (3) years from that later date.",
        "Two exceptions extend that period: (a) for any Confidential Information that is a trade secret under the Michigan Uniform Trade Secrets Act (MCL 445.1901 et seq.) or the federal Defend Trade Secrets Act of 2016 (18 U.S.C. § 1836), the obligations last as long as the information remains a trade secret; and (b) for Client Personal Information, the obligations last as long as the law protects it, which the Parties intend to be indefinitely.",
        "The Company treats the following, among other things, as trade secrets and takes reasonable steps, including this Agreement, to keep them secret: its lead lists and lead sources, its referral partner relationships, its pricing and commission information, its scripts and processes, and the compilation of its client and prospective client information. Recipient acknowledges having been told this, that this Agreement is one of those steps, and that those steps are reasonable measures to keep the information secret.",
        "The Non-Solicitation section lasts for the Restricted Period described there. The end of the Visit, the Company's decision not to offer Recipient a position, or Recipient's decision not to join the team does not end this Agreement or shorten any period in it. The end of a period does not excuse a breach that happened before it ended.",
      ],
    },
    {
      key: "return_or_destruction",
      heading: "Return or Destruction",
      initial: false,
      paragraphs: [
        "Recipient will leave the office with nothing that contains Confidential Information. If Recipient ever has any document, file, note, photo, recording, message, link, login or other material that contains Confidential Information, in any form, Recipient will tell the Company at once and will return it to the Company or, if the Company so chooses, permanently destroy it at the earliest of (a) the end of the Visit, (b) the Company's request, or (c) the moment Recipient discovers it. Recipient will not destroy anything the Company has asked Recipient to keep or anything that relates to a suspected breach.",
        "Destroying includes deleting electronic copies from email, messages, cloud accounts, photo libraries, backups and recently deleted or trash folders, so far as Recipient reasonably can. If the Company asks, Recipient will confirm in writing within three (3) calendar days (an email or text message is enough) that Recipient has returned or destroyed everything and kept no copy. Returning or destroying material does not release Recipient from any other obligation in this Agreement, which continues to apply to everything Recipient remembers.",
      ],
    },
    {
      key: "no_license_no_relationship",
      heading: "No License, No Relationship, No Pay",
      initial: false,
      paragraphs: [
        "All Confidential Information belongs to the Company or to the person or business it came from, such as its franchisor, a carrier, a referral partner or a client. This Agreement gives Recipient no license, ownership interest or other right in any Confidential Information, trademark, system or material, except the limited right to see and hear it during the Visit for the purposes of the Visit.",
        "The Company has no duty to disclose anything to Recipient, and it may limit, supervise, change or end the Visit at any time, for any reason, without notice. Ending or limiting the Visit does not affect the consideration Recipient has already received. Recipient may leave at any time; either way, this Agreement continues to apply.",
        'Confidential Information is provided "as is." The Company makes no promise that it is accurate or complete, and the Company is not responsible for anything Recipient does in reliance on it.',
        "Nothing in this Agreement or in the Visit makes Recipient an employee, contractor, agent, partner or joint venturer of the Company, or of Goosehead Insurance or any carrier, or creates any other relationship. Recipient will receive no pay, benefits or reimbursement for the Visit and performs no work for the Company. The Company makes no promise, express or implied, of a job, a contract, licensing sponsorship, training or any future relationship. Any such arrangement would require a separate written agreement signed by the Company. Recipient will not tell anyone that Recipient works for or represents the Company.",
        "Recipient will not speak with any client or prospective client, take part in any call, quote, application, payment or sale, or give any insurance advice, even if asked, and will not hold Recipient out as licensed or as acting for the Company. Recipient performs no work for the Company during the Visit and will not accept any task, even if a team member offers one.",
        "If Recipient later joins the Company in any role, this Agreement continues to apply, including to Confidential Information Recipient learns in that role, until the Company and Recipient sign a written agreement that replaces it.",
      ],
    },
    {
      key: "compelled_disclosure",
      heading: "Disclosure Required by Law",
      initial: false,
      paragraphs: [
        "If a law, court order, subpoena or government request requires Recipient to disclose Confidential Information, Recipient will, where the law allows, tell {{OWNER_NAME}} promptly and in writing before disclosing anything, so the Company can seek a protective order or other remedy, and will reasonably cooperate with that effort at the Company's expense. Recipient will then disclose only the part of the Confidential Information that the law clearly requires, and will ask that it be treated as confidential.",
        "A disclosure made under this section is not a breach of this Agreement, but the information disclosed remains Confidential Information for all other purposes.",
      ],
    },
    {
      key: "dtsa_notice",
      heading: "Notice of Immunity Under the Defend Trade Secrets Act",
      initial: false,
      paragraphs: [
        "Nothing in this Agreement prohibits Recipient from reporting a possible violation of law to any government agency or official, or from making any other disclosure that the law protects, and Recipient does not need the Company's permission, or to give the Company notice, to do so. Under 18 U.S.C. § 1833(b), Recipient has the immunity described in the next two paragraphs.",
        "An individual shall not be held criminally or civilly liable under any federal or state trade secret law for the disclosure of a trade secret that (A) is made (i) in confidence to a federal, state or local government official, either directly or indirectly, or to an attorney, and (ii) solely for the purpose of reporting or investigating a suspected violation of law; or (B) is made in a complaint or other document filed in a lawsuit or other proceeding, if such filing is made under seal.",
        "An individual who files a lawsuit for retaliation by an employer for reporting a suspected violation of law may disclose the trade secret to the attorney of the individual and use the trade secret information in the court proceeding, if the individual (A) files any document containing the trade secret under seal, and (B) does not disclose the trade secret, except pursuant to court order.",
      ],
    },
    {
      key: "remedies_law_venue",
      heading: "Remedies, Governing Law and Venue",
      initial: true,
      paragraphs: [
        "Recipient agrees that any breach or threatened breach of this Agreement would cause the Company irreparable harm that money alone could not fix, and could also harm the Company's clients, referral partners, carriers and franchisor and its standing with regulators. The Company may therefore seek a temporary restraining order, an injunction and specific performance from a court, without posting a bond and without having to prove actual damages, in each case to the extent the court allows. These remedies are in addition to money damages and every other remedy available at law or in equity.",
        "Recipient agrees that this section is evidence of irreparable harm and will not argue that money damages alone would be adequate. Recipient may also face separate liability under privacy, identity theft and trade secret laws.",
        "Recipient will indemnify and hold harmless the Company, its owners and team members, and its franchisor and carriers, from every loss, cost, claim, fine and expense, including reasonable attorney fees, that results from Recipient's breach of this Agreement, including the cost of investigating the breach and of any notice the law or the Company's contracts require.",
        "In any action to enforce or interpret this Agreement, the prevailing Party will recover its reasonable attorney fees, expert fees and costs from the other Party, in addition to any other relief awarded.",
        "Michigan law governs this Agreement and any dispute arising out of or relating to it or the Visit, without regard to any conflict-of-laws rule that would apply another state's law. Except as this section otherwise allows for injunctions and judgments, any such dispute must be brought only in the state courts located in Oakland County, Michigan, or in the United States District Court for the Eastern District of Michigan.",
        "Each Party consents to the personal jurisdiction of those courts, agrees that venue there is proper and convenient, and waives any objection to it, including any claim that another court is more convenient. Either Party may enforce a judgment in any court with jurisdiction, and the Company may also seek a temporary restraining order or injunction in any court that has jurisdiction over Recipient or over the place where a breach occurs or threatens to occur.",
        "To the extent the law allows, Recipient agrees that legal papers in any such action may be served on Recipient by email or text message to the contact details Recipient gave when signing, with a copy by first-class mail to any mailing address Recipient has provided, in addition to any other method the law permits.",
      ],
    },
    {
      key: "jury_waiver",
      heading: "Waiver of Jury Trial",
      initial: true,
      paragraphs: [
        "EACH PARTY KNOWINGLY, VOLUNTARILY AND INTENTIONALLY WAIVES ANY RIGHT TO A TRIAL BY JURY IN ANY ACTION ARISING OUT OF OR RELATING TO THIS AGREEMENT OR THE USE OR DISCLOSURE OF CONFIDENTIAL INFORMATION. Each Party has had the chance to discuss this waiver with a lawyer, understands it, makes it freely, and agrees that any such action will be decided by a judge without a jury. Recipient's initial on this section confirms this waiver specifically.",
      ],
    },
    {
      key: "electronic_signatures",
      heading: "Electronic Signatures and Records",
      initial: true,
      paragraphs: [
        "The Parties agree to sign this Agreement electronically and to conduct this transaction by electronic means under the federal Electronic Signatures in Global and National Commerce Act (15 U.S.C. § 7001 et seq.) and the Michigan Uniform Electronic Transactions Act (MCL 450.831 et seq.). Recipient's electronic signature has the same legal effect as a handwritten signature in ink, and this electronic record has the same legal effect as a signed paper document.",
        "The Parties intend the Effective Date stated at the top of this Agreement to be the calendar day, in Eastern Time (Detroit, Michigan), on which Recipient completes the final signature recorded in the Audit Trail (defined below); if the Audit Trail shows a different day, the day in the Audit Trail controls. The Company accepts and is bound by this Agreement when {{OWNER_NAME}} signs it for the Company, when it admits Recipient for the Visit or when it sends Recipient the completed copy, whichever comes first; no Company signature is needed for this Agreement to bind Recipient.",
        "Recipient agrees that each of the following is Recipient's signature and shows Recipient's intent to sign and to be bound by this Agreement: typing Recipient's legal name; adopting the signature image and initials the application shows, which need not look like Recipient's handwriting; and tapping or clicking a button to initial a section, agree to a statement or sign the Agreement. Recipient confirms that the typed name is Recipient's true legal name and that Recipient alone is completing the signing, on a device Recipient controls. Recipient agrees that the Audit Trail is strong evidence that each signature and initial it records was Recipient's own act.",
        "When Recipient arrives for the Visit, Recipient will show a government-issued photo ID so the Company can confirm that the name on it matches the typed name, and the Company may record that check, with the date, in its records.",
        "The signing application records Recipient's typed name, adopted signature image and initials and, for each tap or click by which Recipient initials a section, agrees to a statement, adopts a signature or signs, the date and time by the application's server clock, shown with its time zone; the public IP address from which Recipient's device connected, which may be an address shared by a network or carrier; an approximate location estimated from that IP address; and the device type and browser that Recipient's browser reported (together, the \"Audit Trail\"). Recipient consents to the Company collecting and keeping this information to record and prove the signing.",
        "The application makes these entries automatically as each act happens, without anyone typing them in. The Company makes and keeps such a record, with the completed PDF, for every agreement signed through the application, as its regular practice in the ordinary course of business. The Audit Trail is attached to and logically associated with this Agreement and with each signature and initial in it. Either Party may offer the Audit Trail and the completed PDF as evidence that the signature and initials are Recipient's, of the terms Recipient agreed to and of when, and neither Party will object to their authenticity or admission.",
        "The Company will keep the completed PDF and the Audit Trail in a form that accurately reflects them and remains accessible and reproducible for later reference, and will give Recipient a copy on request. The Company will use and share them, and the contact details Recipient provides, only to keep, prove or enforce this Agreement, to send Recipient the copies and notices this section describes, or as the law requires, including with its franchisor, carriers, regulators, lawyers and the courts.",
        "Recipient will review the PDF copy on receipt and will tell {{OWNER_NAME}} in writing within ten (10) calendar days if any signature, initial, date or time in it is not Recipient's own act; otherwise the Company may rely on the copy and the Audit Trail as accurate, and Recipient's silence is further evidence that they are accurate. Neither Party will object to this Agreement, the Audit Trail or the completed PDF because they are electronic records, are not originals, or were signed, sent or kept on a phone. A printed or electronically stored copy of this Agreement and the Audit Trail is as valid as the original.",
        "Recipient consents to receive this Agreement, Recipient's signed copy, a certificate of completion and any notice about them electronically, as a PDF, by a download link shown when signing is complete or by email or text message to an email address or mobile number Recipient gives the Company for this purpose. This consent covers only those records. The Company will make the completed PDF and certificate of completion available to Recipient promptly after signing. Recipient will tell the Company if that email address or mobile number changes.",
        "Recipient may ask the Company for a paper copy at any time at no charge, and may withdraw this consent for future records, or update the email address or mobile number on file, by writing to {{OWNER_NAME}}; a withdrawal does not affect this Agreement or anything already signed. Recipient may download, save or print this Agreement before and after signing. To sign and keep this Agreement electronically, Recipient needs only a phone, tablet or computer with an internet connection, a current web browser and a PDF reader, plus an email address or mobile number that can receive messages.",
        "By signing, Recipient confirms that Recipient has these and has been able to read this entire Agreement on the device used to sign. If Recipient cannot open the PDF copy, Recipient will tell {{OWNER_NAME}} at once, and the Company will send it another way or on paper at no charge; this Agreement stays in force meanwhile.",
      ],
    },
    {
      key: "general_terms",
      heading: "General Terms",
      initial: false,
      paragraphs: [
        "This Agreement is the entire agreement between the Parties about its subject and replaces every earlier discussion or understanding about confidentiality for the Visit. Every later part of the Visit and every further disclosure by the Company to Recipient is covered by this Agreement without a new signature, unless the Parties sign a different written agreement. This Agreement may be changed only by a written document signed by both Parties; an electronic signature counts. A Party's delay or failure to enforce any term is not a waiver of that term or of any later breach, and a waiver is effective only in writing.",
        "If a court finds any term of this Agreement unenforceable, including the length, scope or reach of any restriction, the Parties ask and authorize the court to reform or narrow that term to the extent necessary to make it enforceable and to enforce it as reformed, and the rest of the Agreement stays in full force. The Parties intend each promise to be enforced to the fullest extent the law allows.",
        "The Company may assign this Agreement to any successor to all or part of its business or to an affiliate without Recipient's consent, and this Agreement benefits and may be enforced by the Company's successors and assigns. Recipient's obligations are personal and may not be assigned or delegated. The Company may enforce this Agreement to protect information of its franchisor, carriers, referral partners and clients, and may recover from Recipient the losses they suffer from Recipient's breach to the extent the Company is responsible for them. No one other than the Parties and the Company's successors and assigns may enforce this Agreement.",
        "Every obligation that by its nature should continue, including confidentiality, the Client Personal Information section, non-solicitation, return or destruction, remedies, governing law, the jury waiver and electronic records, survives the end of the Visit and any expiration of this Agreement.",
        'This Agreement may be signed in counterparts and by electronic means, and each counterpart is an original and all of them together are one agreement. Headings are for convenience only and do not affect meaning. "Including" and "includes" mean "including without limitation," and the singular includes the plural.',
        "Notices to the Company go to {{OWNER_NAME}} at {{COMPANY_ADDRESS}} or by email or text message to the contact the Company provides; notices to Recipient go to the most recent email address or mobile number Recipient has given the Company. Recipient has read this Agreement, had the chance to review it with a lawyer, and signs it knowingly and voluntarily, and no rule construing an agreement against its drafter applies.",
      ],
    },
  ],
  acknowledgment: [
    "I have read this entire Agreement and I understand it.",
    "I had the chance to ask questions and to talk with a lawyer before signing.",
    "I am signing voluntarily, and nobody is pressuring me.",
    "I am at least 18 years old and I am signing with my true legal name.",
    "I agree to sign electronically and to receive my copy of this Agreement electronically.",
    "I will not record, photograph, screenshot or copy anything at the office, and I will not write down any client or prospect information.",
    "I understand that I am not an employee and that no job has been promised to me.",
    "I understand that I am giving up my right to a jury trial for any dispute about this Agreement.",
  ],
};

/** What the panel asked the owner (or his attorney) to confirm. Shown nowhere in the app. */
export const NOTES_FOR_OWNER: string[] = [
  "Confirm the exact legal name and entity type of {{COMPANY}} (an LLC, a corporation, or a sole proprietor with an assumed name) and its office address; the wrong name is the most common way these agreements fail.",
  'Ask Goosehead Insurance whether its franchise agreement or policies require specific confidentiality language or approval before a non-employee observes client calls or systems, and add any required language. If it prefers not to be named, change "Goosehead Insurance" to "the Company\'s franchisor" throughout.',
  "Have a Michigan attorney confirm every statutory citation and the enforceability, against a non-employee visitor, of the 12-month non-solicitation, the fee-shifting clause, the jury waiver and the indemnity. HIPAA is not cited because the agency is generally not a covered entity; ask the attorney to confirm.",
  "The Agreement is a backstop, not a safeguard: a visitor is a nonaffiliated third party under the Gramm-Leach-Bliley Act, so keep Social Security numbers, health details and account numbers off screens and out of earshot. Check that your call-recording notices and carrier contracts allow a non-employee to listen in.",
  "Keep the signed PDF, the certificate of completion, the exported Audit Trail and the exact text signed together, unaltered and backed up, for as long as any duty lasts plus six years (MCL 600.5807); since the Client Personal Information duties never end, plan to keep them indefinitely.",
  "Send the Agreement a day or more before the visit so the chance to consult a lawyer is real, confirm the visitor is 18 or older first (a minor needs a version a parent or guardian signs), and send the link only to contact details the visitor gave you.",
  "In the app, fill {{EFFECTIVE_DATE}} from the final signature's Detroit date, add {{OWNER_NAME}}'s countersignature with title, record the visitor's own IP address (not the hosting provider's) and label the certificate's location as estimated from the IP address.",
  "Name a backup contact for incident reports (the Agreement names only {{OWNER_NAME}}) and decide how a same-day report is logged and answered. If the visitor's program requires a written report of the visit, agree in writing beforehand on what it may describe and sign it as an addendum.",
];
