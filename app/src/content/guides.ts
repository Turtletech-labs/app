// Newcomer guides: one per country, because the rules are the same in every
// city. Each guide is a list of topics in the order people usually need them.
// A topic opens its own page with what to do, what to bring and practical tips,
// plus a link to the official source.
//
// Every fact here was checked against an official source on the date in
// `checked`. Re-check before each release, and see docs/guides.md before adding
// a tip.

export type GuideIcon =
  | 'bus' | 'stamp' | 'hash' | 'landmark' | 'stethoscope' | 'hospital' | 'flag' | 'house' | 'ambulance' | 'file-text';

export interface GuideLink { label: string; url: string }

export interface GuideTopic {
  id: string;
  title: string;
  /** One line shown on the tile. */
  blurb: string;
  icon: GuideIcon;
  /** Why this matters, in a sentence or two. */
  intro: string;
  /** What to do, in order. */
  steps: string[];
  /** Documents or things to have ready. */
  bring?: string[];
  /** Practical tips that the official pages do not spell out. */
  tips?: string[];
  /** Addresses, phone numbers and emails, shown as plain text. */
  contact?: string[];
  /** Mistakes and scams to avoid. */
  watchOut?: string[];
  /** Official links first. Use https: for pages and mailto: for email addresses. */
  links: GuideLink[];
}

export interface Guide {
  id: string;
  country: string;
  /** Launch cities this guide covers; used to show the right guide first. */
  cities: string[];
  title: string;
  summary: string;
  checked: string;
  /** Shown at the top of the guide under "In an emergency", outside the numbered order. */
  emergency: string;
  topics: GuideTopic[];
}

const CHECKED = '3 Nov 2026';

export const GUIDES: Guide[] = [
  {
    id: 'ireland',
    country: 'Ireland',
    cities: ['Dublin'],
    title: 'Settling in Ireland: your first 90 days',
    summary: 'Seven steps in the order most people need them, from your Leap Card to the Indian Embassy.',
    checked: CHECKED,
    emergency: 'Call 112 or 999 for Gardaí (police), ambulance, fire or coast guard. Free from any phone, even without credit.',
    topics: [
      {
        id: 'getting-around',
        title: 'Getting around',
        blurb: 'Get a Leap Card and where to find one.',
        icon: 'bus',
        intro: 'A Leap Card is a prepaid travel card. It gives cheaper fares than cash on Dublin Bus, Luas, DART and commuter trains, and you will use it from day one.',
        steps: [
          'Get a Leap Card. See below for where.',
          'Put some money on it (top up) before you travel.',
          'On the Luas, DART and trains, tap the card on the reader before you board and tap it again when you finish.',
          'Check your balance now and then, and top up before it runs out.',
        ],
        tips: [
          'You can buy a card at ticket machines in stations, at post offices and PostPoint shops, in selected shops, or online at leapcard.ie. Look for the Leap Card sign in a shop window: many convenience shops and supermarkets sell and top up cards.',
          'Forgetting to tap off on the Luas, DART or trains may cost you a higher fare, so make tapping off a habit.',
          'Students and young adults may qualify for a cheaper card. Check the Leap Card site before you buy.',
        ],
        links: [{ label: 'Leap Card', url: 'https://about.leapcard.ie' }],
      },
      {
        id: 'immigration',
        title: 'Immigration permission',
        blurb: 'Book your registration appointment and bring the right documents.',
        icon: 'stamp',
        intro: 'If you are from outside the EU, EEA or Switzerland and staying longer than 90 days, you must register your permission and get an Irish Residence Permit (IRP) card. You can only book once you are in Ireland, and slots fill up, so book as soon as you arrive.',
        steps: [
          'Create a personal Customer Service account on the Immigration Service Delivery portal.',
          'Book your registration appointment online. The registration office is at Burgh Quay, Dublin.',
          'Gather your original documents (list below). Registration is not completed without all of them.',
          'Go to your appointment, pay the fee by card and attend with your sponsor if your permission needs one.',
        ],
        bring: [
          'Your passport and the entry visa, if you needed one',
          'The landing stamp for the permission you are registering',
          'Proof of address',
          'Private medical insurance that covers accidents, medical incidents and hospital stays in Ireland, valid for 12 months or your whole stay if shorter. Cash-back plans are not accepted',
          'Documents for your type of permission. For example: a Stamp 1 employment permit and proof of your new job, or for a Stamp 2 student a college enrolment letter and proof of fee payment',
          'Approved preclearance, if your permission requires it',
        ],
        tips: [
          'Bring originals, not copies.',
          'Sort out your insurance and proof of address before you book, so you are not scrambling for them later.',
          'The registration fee is €300, by credit or debit card only. Some groups are exempt, so check the official page.',
          'If you cannot see a free slot, keep checking the portal.',
        ],
        watchOut: [
          'Book only through the official portal. Be careful of anyone who offers to sell you an appointment.',
        ],
        links: [
          { label: 'Required documents (Irish Immigration Service)', url: 'https://www.irishimmigration.ie/registering-your-immigration-permission/how-to-register-your-immigration-permission-for-the-first-time/required-documents/' },
          { label: 'Irish Immigration Service', url: 'https://www.irishimmigration.ie' },
        ],
      },
      {
        id: 'pps-number',
        title: 'PPS number',
        blurb: 'The number you need to work, pay tax and use public services.',
        icon: 'hash',
        intro: 'Your Personal Public Service Number (PPSN) is needed for work, tax and public services. Your employer needs it to put you on payroll, so apply in your first week.',
        steps: [
          'Set up a MyGovID account (basic or verified).',
          'Apply online at MyWelfare. You must be 18 or over.',
          'Have your identity, proof of address and the reason you need a PPSN ready (see below).',
          'Give the number to your employer as soon as you have it.',
        ],
        bring: [
          'Identity: your current passport',
          'Address: a document with your name and address dated within the last 3 months, such as a utility bill, bank statement, lease or official letter',
          'Reason: evidence of why you need a PPSN, for example your job offer or contract, or a college letter',
        ],
        tips: [
          'No bill in your name yet? A lease is accepted.',
          'Staying with friends or relatives? Use an original bill in their name together with a signed note from the bill holder saying you live there.',
          'Do this before your first payday so you are not taxed at the emergency rate (see the next step).',
          'If the online application cannot be completed, contact your local PPS Number Allocation Centre. The gov.ie page below has details.',
        ],
        links: [
          { label: 'Get a PPS number (gov.ie)', url: 'https://www.gov.ie/en/department-of-social-protection/services/get-a-personal-public-service-pps-number' },
          { label: 'MyWelfare', url: 'https://www.mywelfare.ie' },
        ],
      },
      {
        id: 'tax',
        title: 'Tax with Revenue',
        blurb: 'Register your job so you do not pay emergency tax.',
        icon: 'landmark',
        intro: 'Once you have a PPS number, register your job with Revenue. If your employer cannot get your details from Revenue, they have to deduct tax at the higher emergency rate until it is fixed. The Irish tax year is the calendar year, 1 January to 31 December.',
        steps: [
          'Register for Revenue myAccount.',
          'Ask your employer for their Tax Registration Number (TRN). It looks like a PPS number.',
          'In myAccount, go to the PAYE Services tab and choose "Add Job or Pension Details". Do this before your first payday if you can.',
          'Revenue then sends your employer a Revenue Payroll Notification (RPN), which they use to work out your tax and USC.',
          'Check your first payslip. If the tax looks high, check that your job is registered in myAccount.',
        ],
        tips: [
          'Make sure your employer has your PPS number from day one.',
          'If this is not your first job in Ireland, ask your new employer to register your employment.',
          'After the year ends, you can review your tax in myAccount and claim back anything you overpaid.',
        ],
        links: [
          { label: 'Starting your first job (Revenue)', url: 'https://www.revenue.ie/en/jobs-and-pensions/starting-your-first-job/index.aspx' },
          { label: 'Emergency tax (Revenue)', url: 'https://revenue.ie/en/jobs-and-pensions/emergency-tax/index.aspx' },
        ],
      },
      {
        id: 'gp-and-insurance',
        title: 'Doctor and health insurance',
        blurb: 'Find a GP, what it costs, and the insurance you may need.',
        icon: 'stethoscope',
        intro: 'Your GP (family doctor) is the first stop for anything that is not an emergency. Most people pay for GP visits. Care is free for people with a Medical Card or a GP Visit Card.',
        steps: [
          'Find a GP practice near your home on the HSE site.',
          'Ring a few. Many practices are full and are not taking new patients.',
          'Register as a patient and keep the practice number in your phone.',
          'Ask about the fee when you book, so it is not a surprise.',
        ],
        tips: [
          'GP fees vary by practice, so ask before you book.',
          'Free GP care goes to people with a Medical Card or GP Visit Card. The HSE decides who qualifies, based mainly on income, age and whether you normally live in Ireland. You can check and apply on the HSE site.',
          'Pharmacists can advise on minor illnesses without an appointment.',
          'For your immigration registration you need private medical insurance that covers hospital stays. Cash-back plans do not count. Your employer may offer a group scheme, so ask.',
          'Keep your insurance documents together. You need them for the immigration appointment.',
        ],
        links: [
          { label: 'HSE: find a GP', url: 'https://www2.hse.ie/services/find-a-gp/' },
        ],
      },
      {
        id: 'out-of-hours',
        title: 'Out of hours and A&E',
        blurb: 'What to do when your GP is closed, and when to go to hospital.',
        icon: 'hospital',
        intro: 'Hospital emergency departments are for serious and urgent problems. For anything less, start with your GP or their out-of-hours service.',
        steps: [
          'In a life-threatening emergency, call 112 or 999.',
          'For anything else when your GP is closed, ring your GP practice. The recorded message gives the local out-of-hours service.',
          'If you are told to go to an emergency department, bring photo ID and your insurance details.',
        ],
        tips: [
          'If your GP refers you to an emergency department, that visit is free. Going without a referral carries a charge, unless you are exempt. Ask for a referral letter when your GP sends you.',
          'Waits at emergency departments can be long for problems that are not urgent.',
        ],
        links: [
          { label: 'HSE: find a GP', url: 'https://www2.hse.ie/services/find-a-gp/' },
        ],
      },
      {
        id: 'indian-consular-help',
        title: 'Indian Embassy and MADAD',
        blurb: 'Passports, OCI and help from the Indian government.',
        icon: 'flag',
        intro: 'The Embassy of India in Dublin handles passports, OCI and other consular services. It has stopped general phone enquiries, so email the right address for your request.',
        steps: [
          'Pick the email address for your request (see the links below).',
          'If you get no reply within 3 working days, email the escalation address.',
          'For problems that need the Indian government, you can also raise a request on the MADAD portal.',
        ],
        contact: [
          'Embassy of India, 69 Merrion Road, Ballsbridge, Dublin 4',
          'Passport, Indian police clearance certificate (PCC) and surrender of an Indian passport: passport.dublin@mea.gov.in',
          'OCI card: oci.dublin@mea.gov.in',
          'Visa, birth certificate and other consular queries: cons.dublin@mea.gov.in',
          'No reply within 3 working days: sscons.dublin@mea.gov.in',
          'Switchboard: +353 1 260 4806 (general phone enquiries have stopped, so email)',
        ],
        tips: [
          'The emergency number on the embassy site, +353 899423734, is for urgent matters only: a death or medical emergency in India, or severe distress.',
        ],
        watchOut: [
          'The embassy has warned about phishing calls. Check any contact detail on the official website before you give personal or payment details.',
        ],
        links: [
          { label: 'Email: passport queries', url: 'mailto:passport.dublin@mea.gov.in' },
          { label: 'Email: OCI queries', url: 'mailto:oci.dublin@mea.gov.in' },
          { label: 'Email: visa and other consular queries', url: 'mailto:cons.dublin@mea.gov.in' },
          { label: 'Embassy of India, Dublin', url: 'https://www.indianembassydublin.gov.in' },
          { label: 'MADAD portal', url: 'https://www.madad.gov.in' },
        ],
      },
    ],
  },
  {
    id: 'uk',
    country: 'United Kingdom',
    cities: ['London'],
    title: 'Settling in the UK: your first 90 days',
    summary: 'Eight steps in the order most people need them, from your travel card to the Indian High Commission.',
    checked: CHECKED,
    emergency: 'Call 999 (or 112) for police, ambulance, fire or coastguard. For urgent medical help that is not an emergency, call NHS 111. For police matters that are not urgent, call 101.',
    topics: [
      {
        id: 'getting-around',
        title: 'Getting around',
        blurb: 'Contactless or Oyster in London, and how fare caps work.',
        icon: 'bus',
        intro: 'In London you pay for the Tube, buses and many trains with a contactless card or an Oyster card. Daily and weekly caps stop you paying more than a set amount, but only if you use the same card every time.',
        steps: [
          'Choose one card or phone to pay with, and use it every time.',
          'On the Tube and trains, tap in at the start and tap out at the end.',
          'On buses, tap in when you board. You do not tap out.',
        ],
        tips: [
          'A phone and a card count as different payment methods, so your caps work only if you stick to one of them.',
          'You can buy an Oyster card from machines at Tube stations and ticket offices, and from shops showing the Oyster Ticket Stop sign.',
          'A card issued abroad may add a foreign fee every time you tap. An Oyster card avoids that.',
        ],
        links: [{ label: 'TfL fares', url: 'https://tfl.gov.uk/fares' }],
      },
      {
        id: 'immigration-status',
        title: 'Your immigration status',
        blurb: 'Set up your UKVI account and learn to share your eVisa.',
        icon: 'stamp',
        intro: 'Most visa holders now prove their status online with an eVisa, not with a physical card. You will need to prove it to employers and landlords.',
        steps: [
          'Sign in to your UKVI account, or create one.',
          'Check that your name, date of birth and passport details are right and up to date.',
          'When an employer or landlord asks, generate a share code and give it to them.',
        ],
        tips: [
          'A share code is valid for a limited time, so create it close to when you need it.',
          'If you renew your passport, update it in your UKVI account.',
          'If you paid the Immigration Health Surcharge with your visa application, you can use the NHS on the same basis as a resident.',
        ],
        links: [{ label: 'GOV.UK: view and prove your status', url: 'https://www.gov.uk/view-prove-immigration-status' }],
      },
      {
        id: 'national-insurance',
        title: 'National Insurance number',
        blurb: 'Apply online. You can start work before it arrives.',
        icon: 'hash',
        intro: 'Your National Insurance (NI) number is your reference for tax and benefits. Apply online if you have the right to work in the UK.',
        steps: [
          'Apply online on GOV.UK.',
          'Tell your employer you have applied.',
          'Keep the number safe when it arrives. It is on your payslips and P60.',
        ],
        tips: [
          'You can start work before your number arrives.',
          'It can take a few weeks to get your number.',
        ],
        links: [{ label: 'GOV.UK: apply for an NI number', url: 'https://www.gov.uk/apply-national-insurance-number' }],
      },
      {
        id: 'tax',
        title: 'Tax with HMRC',
        blurb: 'Give your employer the right details so you pay the right tax.',
        icon: 'landmark',
        intro: 'Your employer deducts tax from your pay. The UK tax year runs from 6 April to 5 April. If your employer does not have your details, you might pay the wrong amount of tax at first.',
        steps: [
          'If you had a job in the UK before, give your new employer your P45.',
          'If you have no P45, fill in the starter checklist your employer gives you.',
          'Check the tax code on your first payslip.',
          'Set up your personal tax account or the HMRC app so you can see your pay and tax.',
        ],
        tips: [
          'A lost P45 cannot be replaced. Use the starter checklist instead.',
          'In your personal tax account you can view pay and tax for the last 5 tax years.',
          'If your tax code looks wrong, tell HMRC. Do not wait for the end of the year.',
        ],
        links: [{ label: 'GOV.UK: P45 and starting a new job', url: 'https://www.gov.uk/paye-forms-p45-p46-p60-p11d/p45' }],
      },
      {
        id: 'gp',
        title: 'Register with a GP',
        blurb: 'Free to register, and no ID or proof of address needed.',
        icon: 'stethoscope',
        intro: 'A GP is your family doctor and your way into most NHS care. Register as soon as you are settled, before you are ill.',
        steps: [
          'Find a GP surgery near your home on the NHS website.',
          'Register online or ask the surgery for its registration form.',
          'Ask how to book appointments once you are registered.',
        ],
        tips: [
          'Registering is free. You do not need proof of address or ID.',
          'In England, NHS prescriptions and dental care carry charges, with some exemptions.',
        ],
        links: [{ label: 'NHS: register with a GP', url: 'https://www.nhs.uk/nhs-services/gps/how-to-register-with-a-gp-surgery/' }],
      },
      {
        id: 'urgent-care',
        title: 'Urgent care and A&E',
        blurb: 'NHS 111, and when to go to A&E.',
        icon: 'hospital',
        intro: 'A&E is for serious and life-threatening emergencies. For urgent help that is not an emergency, start with NHS 111.',
        steps: [
          'In a life-threatening emergency, call 999.',
          'For urgent help that is not an emergency, call NHS 111 or use 111.nhs.uk.',
          'If you are told to go to A&E, go. Treatment in A&E is free for everyone.',
        ],
        tips: [
          'Waits at A&E can be long when your problem is not urgent.',
        ],
        links: [{ label: 'NHS 111 online', url: 'https://111.nhs.uk' }],
      },
      {
        id: 'council-tax',
        title: 'Council tax',
        blurb: 'Register with your council when you move in.',
        icon: 'house',
        intro: 'Council tax is a yearly charge for your home that pays for local services. You pay it to your local council.',
        steps: [
          'Tell your local council when you move in.',
          'Ask your landlord or housemates who is responsible for paying.',
        ],
        tips: [
          'Households where everyone is a full-time student may be exempt.',
        ],
        links: [{ label: 'GOV.UK: council tax', url: 'https://www.gov.uk/council-tax' }],
      },
      {
        id: 'indian-consular-help',
        title: 'Indian High Commission and MADAD',
        blurb: 'Passports, OCI and help from the Indian government.',
        icon: 'flag',
        intro: 'The High Commission of India in London handles passports, OCI and consular services. Contact details for each service are on its website.',
        steps: [
          'Go to the High Commission website and find the service you need.',
          'Use the contact details listed there for that service.',
          'For problems that need the Indian government, you can also raise a request on the MADAD portal.',
        ],
        contact: [
          'High Commission of India, India House, Aldwych, London WC2B 4NA',
        ],
        watchOut: [
          'Check any phone number or email on the official website before you give personal or payment details.',
        ],
        links: [
          { label: 'High Commission of India, London', url: 'https://www.hcilondon.gov.in' },
          { label: 'MADAD portal', url: 'https://www.madad.gov.in' },
        ],
      },
    ],
  },
];

/** The guide that covers a member's city, if we have one. */
export function guideForCity(city: string | undefined | null): Guide | undefined {
  return city ? GUIDES.find((g) => g.cities.includes(city)) : undefined;
}

/** Guides sorted so the one for the member's city comes first. */
export function guidesFor(city: string | undefined | null): Guide[] {
  const mine = guideForCity(city);
  return [...GUIDES].sort((a, b) => Number(b === mine) - Number(a === mine));
}
