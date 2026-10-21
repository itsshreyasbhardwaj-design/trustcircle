/**
 * Local translation dictionaries. No translation API, no network, no build step.
 *
 * Honesty rules baked into the type:
 *  - `t()` returns `{ text, translated }`. When a key has no entry for the chosen
 *    language it falls back to English and reports `translated: false`, and the UI
 *    marks it. The app never implies English content is a translation.
 *  - These strings were written by the project author, not reviewed by a professional
 *    translator. The UI says so on the language setting. See LIMITATIONS.md.
 */
export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
] as const;

export type Lang = (typeof LANGUAGES)[number]['code'];

export const isLang = (v: string): v is Lang => LANGUAGES.some((l) => l.code === v);

type Entry = { en: string; hi?: string; bn?: string };

const DICT = {
  // ---- navigation ----
  'nav.dashboard': { en: 'Dashboard', hi: 'डैशबोर्ड', bn: 'ড্যাশবোর্ড' },
  'nav.scan': { en: 'Check something', hi: 'कुछ जाँचें', bn: 'কিছু যাচাই করুন' },
  'nav.history': { en: 'My checks', hi: 'मेरी जाँचें', bn: 'আমার যাচাই' },
  'nav.family': { en: 'Trusted circle', hi: 'भरोसेमंद मंडली', bn: 'বিশ্বস্ত বৃত্ত' },
  'nav.reviews': { en: 'Second opinions', hi: 'दूसरी राय', bn: 'দ্বিতীয় মত' },
  'nav.verify': { en: 'Verify a claim', hi: 'दावे की पुष्टि करें', bn: 'দাবি যাচাই করুন' },
  'nav.payment': { en: 'Payment check', hi: 'भुगतान जाँच', bn: 'পেমেন্ট যাচাই' },
  'nav.recovery': { en: 'After a fraud', hi: 'ठगी के बाद', bn: 'প্রতারণার পরে' },
  'nav.academy': { en: 'Learn', hi: 'सीखें', bn: 'শিখুন' },
  'nav.notifications': { en: 'Notifications', hi: 'सूचनाएँ', bn: 'বিজ্ঞপ্তি' },
  'nav.settings': { en: 'Settings', hi: 'सेटिंग्स', bn: 'সেটিংস' },

  // ---- actions ----
  'action.checkMessage': { en: 'Check a message', hi: 'संदेश जाँचें', bn: 'বার্তা যাচাই করুন' },
  'action.pasteMessage': { en: 'Paste a message', hi: 'संदेश चिपकाएँ', bn: 'বার্তা পেস্ট করুন' },
  'action.uploadScreenshot': { en: 'Upload a screenshot', hi: 'स्क्रीनशॉट अपलोड करें', bn: 'স্ক্রিনশট আপলোড করুন' },
  'action.checkLink': { en: 'Check a link', hi: 'लिंक जाँचें', bn: 'লিঙ্ক যাচাই করুন' },
  'action.checkPayment': { en: 'Review a payment request', hi: 'भुगतान अनुरोध की समीक्षा करें', bn: 'পেমেন্ট অনুরোধ পর্যালোচনা করুন' },
  'action.scanQr': { en: 'Check a QR code', hi: 'क्यूआर कोड जाँचें', bn: 'কিউআর কোড যাচাই করুন' },
  'action.askFamily': { en: 'Ask someone I trust', hi: 'किसी भरोसेमंद से पूछें', bn: 'বিশ্বস্ত কাউকে জিজ্ঞাসা করুন' },
  'action.save': { en: 'Save', hi: 'सहेजें', bn: 'সংরক্ষণ করুন' },
  'action.delete': { en: 'Delete', hi: 'हटाएँ', bn: 'মুছুন' },
  'action.cancel': { en: 'Cancel', hi: 'रद्द करें', bn: 'বাতিল করুন' },
  'action.continue': { en: 'Continue', hi: 'आगे बढ़ें', bn: 'চালিয়ে যান' },
  'action.skip': { en: 'Skip', hi: 'छोड़ें', bn: 'এড়িয়ে যান' },
  'action.signIn': { en: 'Sign in', hi: 'साइन इन करें', bn: 'সাইন ইন করুন' },
  'action.signOut': { en: 'Sign out', hi: 'साइन आउट करें', bn: 'সাইন আউট করুন' },
  'action.createAccount': { en: 'Create account', hi: 'खाता बनाएँ', bn: 'অ্যাকাউন্ট তৈরি করুন' },

  // ---- outcomes ----
  'outcome.warning_signs': { en: 'Warning signs detected', hi: 'चेतावनी के संकेत मिले', bn: 'সতর্কতার চিহ্ন পাওয়া গেছে' },
  'outcome.verification_recommended': { en: 'Additional verification recommended', hi: 'अतिरिक्त पुष्टि की सलाह', bn: 'অতিরিক্ত যাচাই করার পরামর্শ' },
  'outcome.insufficient_information': { en: 'Not enough to assess', hi: 'जाँच के लिए पर्याप्त नहीं', bn: 'মূল্যায়নের জন্য যথেষ্ট নয়' },
  'outcome.no_known_warning_signs': { en: 'No known warning signs identified', hi: 'कोई ज्ञात चेतावनी संकेत नहीं मिला', bn: 'কোনও পরিচিত সতর্কতা চিহ্ন পাওয়া যায়নি' },

  // ---- safety copy: the load-bearing strings ----
  'safety.notAGuarantee': {
    en: 'This is not a safety guarantee. TrustCircle checks for known patterns. It cannot verify who sent a message or who owns an account.',
    hi: 'यह सुरक्षा की गारंटी नहीं है। TrustCircle केवल ज्ञात तरीकों की जाँच करता है। यह नहीं बता सकता कि संदेश किसने भेजा या खाता किसका है।',
    bn: 'এটি নিরাপত্তার নিশ্চয়তা নয়। TrustCircle কেবল পরিচিত ধরনগুলি পরীক্ষা করে। কে বার্তা পাঠিয়েছে বা অ্যাকাউন্ট কার, তা এটি যাচাই করতে পারে না।',
  },
  'safety.neverShare': {
    en: 'Never share an OTP, PIN, CVV or password. No bank, courier, government office or support desk ever needs one.',
    hi: 'ओटीपी, पिन, सीवीवी या पासवर्ड कभी साझा न करें। कोई बैंक, कूरियर, सरकारी दफ़्तर या सहायता केंद्र इन्हें कभी नहीं मांगता।',
    bn: 'ওটিপি, পিন, সিভিভি বা পাসওয়ার্ড কখনও শেয়ার করবেন না। কোনও ব্যাংক, কুরিয়ার, সরকারি অফিস বা সহায়তা কেন্দ্র কখনও এগুলি চায় না।',
  },
  'safety.verifyYourself': {
    en: 'Check this through a channel you already had — your own app, the number on your card, or a contact you already saved. Never through the message.',
    hi: 'इसे उस माध्यम से जाँचें जो आपके पास पहले से था — अपना ऐप, कार्ड पर छपा नंबर, या पहले से सेव किया संपर्क। संदेश के ज़रिए कभी नहीं।',
    bn: 'আগে থেকেই আপনার কাছে থাকা মাধ্যমে এটি যাচাই করুন — নিজের অ্যাপ, কার্ডে লেখা নম্বর, বা আগে সেভ করা পরিচিতি। বার্তার মাধ্যমে কখনও নয়।',
  },
  'safety.noSignsIsNotSafe': {
    en: 'No warning signs found is not the same as safe. Anything asking for money, codes or personal details still needs independent verification.',
    hi: 'कोई चेतावनी संकेत न मिलना सुरक्षित होने के बराबर नहीं है। पैसे, कोड या निजी जानकारी मांगने वाली किसी भी बात की स्वतंत्र पुष्टि ज़रूरी है।',
    bn: 'সতর্কতার চিহ্ন না পাওয়া মানে নিরাপদ নয়। টাকা, কোড বা ব্যক্তিগত তথ্য চাওয়া যেকোনও কিছু স্বাধীনভাবে যাচাই করা দরকার।',
  },
  'safety.urgentFirst': {
    en: 'If money has already left your account, call your bank and then 1930 before anything else. Do not wait for a scan.',
    hi: 'अगर पैसे पहले ही खाते से जा चुके हैं, तो सबसे पहले अपने बैंक को और फिर 1930 पर फ़ोन करें। जाँच का इंतज़ार न करें।',
    bn: 'যদি টাকা ইতিমধ্যে অ্যাকাউন্ট থেকে চলে গিয়ে থাকে, সবার আগে আপনার ব্যাংকে এবং তারপর ১৯৩০-এ ফোন করুন। যাচাইয়ের জন্য অপেক্ষা করবেন না।',
  },
  'safety.privateByDefault': {
    en: 'Your checks are private. Nobody in your circle sees them unless you share a specific one.',
    hi: 'आपकी जाँचें निजी हैं। जब तक आप कोई एक जाँच साझा न करें, आपकी मंडली में कोई उसे नहीं देख सकता।',
    bn: 'আপনার যাচাই ব্যক্তিগত। আপনি নির্দিষ্ট কোনওটি শেয়ার না করলে আপনার বৃত্তের কেউ তা দেখতে পায় না।',
  },

  // ---- labels ----
  'label.language': { en: 'Language', hi: 'भाषा', bn: 'ভাষা' },
  'label.textSize': { en: 'Text size', hi: 'अक्षरों का आकार', bn: 'লেখার আকার' },
  'label.reduceMotion': { en: 'Reduce animation', hi: 'एनिमेशन कम करें', bn: 'অ্যানিমেশন কমান' },
  'label.email': { en: 'Email', hi: 'ईमेल', bn: 'ইমেল' },
  'label.password': { en: 'Password', hi: 'पासवर्ड', bn: 'পাসওয়ার্ড' },
  'label.name': { en: 'Your name', hi: 'आपका नाम', bn: 'আপনার নাম' },
  'label.untranslated': { en: 'English — not translated yet', hi: 'अंग्रेज़ी — अभी अनुवाद नहीं हुआ', bn: 'ইংরেজি — এখনও অনুবাদ হয়নি' },
} satisfies Record<string, Entry>;

export type Key = keyof typeof DICT;

export type Translated = { text: string; translated: boolean };

export function t(lang: Lang, key: Key): Translated {
  const entry: Entry = DICT[key];
  if (lang === 'en') return { text: entry.en, translated: true };
  const value = entry[lang];
  return value ? { text: value, translated: true } : { text: entry.en, translated: false };
}

/** Plain string when the caller does not need the fallback flag. */
export const tx_ = (lang: Lang, key: Key): string => t(lang, key).text;

/** Picks a field off a `Localized<T>` record, reporting whether it was a fallback. */
export function pick<T>(lang: Lang, value: { en: T; hi?: T; bn?: T }): { value: T; translated: boolean } {
  if (lang === 'en') return { value: value.en, translated: true };
  const v = value[lang];
  return v === undefined ? { value: value.en, translated: false } : { value: v, translated: true };
}

/** Coverage report, so the UI and docs can state the real numbers rather than guess. */
export function coverage(): Record<Lang, { translated: number; total: number }> {
  const keys = Object.keys(DICT) as Key[];
  const out = {} as Record<Lang, { translated: number; total: number }>;
  for (const { code } of LANGUAGES) {
    out[code] = {
      translated: keys.filter((k) => code === 'en' || DICT[k][code as 'hi' | 'bn'] !== undefined).length,
      total: keys.length,
    };
  }
  return out;
}
