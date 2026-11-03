// Newcomer guides. Plain facts with links to the official source; every
// section was checked on the date below. Re-check before each release.
export interface Guide {
  id: string;
  city: string;
  title: string;
  summary: string;
  checked: string;
  sections: { heading: string; body: string; link?: { label: string; url: string } }[];
}

export const GUIDES: Guide[] = [
  {
    id: 'dublin-first-90',
    city: 'Dublin',
    title: 'Your first 90 days in Dublin',
    summary: 'Emergencies, doctors, PPS number, tax, immigration registration and getting around.',
    checked: '3 Nov 2026',
    sections: [
      { heading: 'In an emergency', body: 'Call 112 or 999 for Gardaí (police), ambulance, fire or coast guard. Both numbers are free from any phone, including a phone without credit.' },
      { heading: 'Find a GP (family doctor)', body: "Your GP is the first stop for anything that isn't an emergency. Register with a practice near your home; many are full, so ask a few. GP visits usually cost a fee unless you have a medical card or GP visit card. Pharmacists can advise on minor illnesses without an appointment.", link: { label: 'HSE: find a GP', url: 'https://www2.hse.ie/services/find-a-gp/' } },
      { heading: 'Out of hours and A&E', body: "When your GP is closed, ring their number: the recorded message gives the local out-of-hours service. Hospital emergency departments are for serious emergencies. If you go without a GP referral letter, there is a charge unless you're exempt." },
      { heading: 'Get your PPS number', body: 'Your Personal Public Service Number is needed for work, tax and public services. Apply through MyWelfare with photo ID and proof of address.', link: { label: 'MyWelfare', url: 'https://www.mywelfare.ie' } },
      { heading: 'Set up your tax', body: 'Once you have a PPS number, register for Revenue myAccount and add your job. That puts your tax credits on your payslip so you are not taxed at the emergency rate.', link: { label: 'Revenue myAccount', url: 'https://www.revenue.ie' } },
      { heading: 'Register your immigration permission', body: 'If you are from outside the EU, EEA or Switzerland and staying longer than 90 days, register your permission and get an Irish Residence Permit (IRP) card. Book early; appointments fill up.', link: { label: 'Irish Immigration Service', url: 'https://www.irishimmigration.ie' } },
      { heading: 'Getting around', body: 'A Leap Card gives cheaper fares than cash on Dublin Bus, Luas, DART and commuter trains, with daily and weekly caps.', link: { label: 'Leap Card', url: 'https://about.leapcard.ie' } },
      { heading: 'Indian consular help', body: 'The Embassy of India in Dublin handles passports and consular services. For problems that need the Indian government, you can also raise a request on the MADAD portal.', link: { label: 'MADAD portal', url: 'https://www.madad.gov.in' } },
    ],
  },
  {
    id: 'london-first-90',
    city: 'London',
    title: 'Your first 90 days in London',
    summary: 'Emergencies, NHS and GP registration, National Insurance, your eVisa and getting around.',
    checked: '3 Nov 2026',
    sections: [
      { heading: 'In an emergency', body: 'Call 999 (or 112) for police, ambulance, fire or coastguard. For urgent medical help that is not an emergency, call NHS 111 or use 111.nhs.uk. For police matters that are not emergencies, call 101.', link: { label: 'NHS 111 online', url: 'https://111.nhs.uk' } },
      { heading: 'Register with a GP', body: "GP registration is free. You don't need proof of address or ID to register. Register online or ask the practice for its form. Treatment in A&E is free for everyone.", link: { label: 'NHS: register with a GP', url: 'https://www.nhs.uk/nhs-services/gps/how-to-register-with-a-gp-surgery/' } },
      { heading: 'National Insurance number', body: 'Apply online if you have the right to work in the UK. You can start work before your number arrives.', link: { label: 'GOV.UK: apply for an NI number', url: 'https://www.gov.uk/apply-national-insurance-number' } },
      { heading: 'Your immigration status is digital', body: 'Most visa holders now prove their status with an eVisa through a UKVI account. Keep your passport details in it up to date, and use the share code service when an employer or landlord asks for proof.', link: { label: 'GOV.UK: view and prove your status', url: 'https://www.gov.uk/view-prove-immigration-status' } },
      { heading: 'Getting around', body: 'Pay with a contactless card or Oyster card on the Tube, buses and trains. Daily and weekly caps limit what you spend; use the same card every time to get them.', link: { label: 'TfL fares', url: 'https://tfl.gov.uk/fares' } },
      { heading: 'Council tax', body: 'Register with your local council when you move into a home. Households where everyone is a full-time student may be exempt.', link: { label: 'GOV.UK: council tax', url: 'https://www.gov.uk/council-tax' } },
      { heading: 'Indian consular help', body: 'The High Commission of India in London handles passports, OCI and consular services. For problems that need the Indian government, you can also raise a request on the MADAD portal.', link: { label: 'MADAD portal', url: 'https://www.madad.gov.in' } },
    ],
  },
];
