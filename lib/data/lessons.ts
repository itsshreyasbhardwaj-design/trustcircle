/**
 * TrustAcademy content.
 *
 * Localisation honesty: `Localized<T>` carries `en` plus optional `hi`/`bn`. The UI
 * falls back to English and shows a "not translated yet" badge when it does, rather
 * than silently serving English as if it were the chosen language. Lesson titles and
 * summaries are translated; lesson bodies and quizzes are English-only in this build.
 *
 * Every scenario below is fictional and uses RFC 2606 reserved example domains.
 * No live link, real brand domain or working scam instruction appears here.
 */
export type Localized<T = string> = { en: T; hi?: T; bn?: T };

export type Question = {
  id: string;
  prompt: string;
  /** A fictional message the learner has to judge. */
  scenario?: string;
  options: Array<{ id: string; label: string }>;
  correct: string;
  /** Shown after answering, whichever option was picked. */
  explanation: string;
};

export type Lesson = {
  slug: string;
  minutes: number;
  title: Localized;
  summary: Localized;
  /** Markdown-lite: paragraphs and "- " bullets only. Rendered as text, never HTML. */
  body: string[];
  questions: Question[];
};

export const lessons: Lesson[] = [
  {
    slug: 'secrets-nobody-should-ask',
    minutes: 4,
    title: {
      en: 'The four things nobody may ask you for',
      hi: 'चार चीज़ें जो कोई आपसे नहीं मांग सकता',
      bn: 'চারটি জিনিস যা কেউ আপনার কাছে চাইতে পারে না',
    },
    summary: {
      en: 'OTP, PIN, CVV and password. No bank, courier, government office or support desk ever needs any of them.',
      hi: 'ओटीपी, पिन, सीवीवी और पासवर्ड। कोई बैंक, कूरियर, सरकारी दफ़्तर या सहायता केंद्र इन्हें कभी नहीं मांगता।',
      bn: 'ওটিপি, পিন, সিভিভি ও পাসওয়ার্ড। কোনও ব্যাংক, কুরিয়ার, সরকারি অফিস বা সহায়তা কেন্দ্র কখনও এগুলি চায় না।',
    },
    body: [
      'An OTP is not a password. It is a signature. When you read one out, you are not proving who you are to the other person — you are signing something they are doing right now, usually a payment or a password reset.',
      'That is why the rule has no exceptions:',
      '- Nobody needs your OTP. Not a bank employee, not a delivery agent, not "the verification department".',
      '- Nobody needs your UPI PIN or ATM PIN. Those exist only to authorise money leaving your account.',
      '- Nobody needs your card CVV. A genuine merchant asks for it on their own checkout page, which you reached yourself.',
      '- Nobody needs your net-banking password. Support staff can see your account without it.',
      'If someone asks, the question itself is the answer. End the conversation there. You do not owe anyone an explanation for refusing.',
    ],
    questions: [
      {
        id: 'q1',
        prompt: 'A caller says they are from your bank\'s fraud team. They say a suspicious transaction is in progress and they need the OTP you just received to block it. What do you do?',
        options: [
          { id: 'a', label: 'Share the OTP so they can block the transaction' },
          { id: 'b', label: 'Hang up and check your account in your own bank app' },
          { id: 'c', label: 'Share only the first three digits' },
          { id: 'd', label: 'Ask for their employee ID, then share the OTP' },
        ],
        correct: 'b',
        explanation:
          'An OTP can only authorise an action, never block one. "Give me the code to stop a payment" is a contradiction, and it is the single most common script in use. An employee ID can be invented, and half an OTP is still half of a secret you should not be giving out. Hang up and look in your own app.',
      },
      {
        id: 'q2',
        prompt: 'Which of these can you safely send to a courier company that messages you about a stuck parcel?',
        options: [
          { id: 'a', label: 'Your UPI PIN, to pay the pending charge' },
          { id: 'b', label: 'A screenshot of your bank app showing you paid' },
          { id: 'c', label: 'Nothing — check the order in the app you ordered from' },
          { id: 'd', label: 'Your card number and CVV' },
        ],
        correct: 'c',
        explanation:
          'A real delivery problem appears against a real order in the app you ordered from. A bank screenshot leaks your balance, account number and transaction history. The other two options hand over the ability to take money.',
      },
    ],
  },
  {
    slug: 'reading-a-link',
    minutes: 5,
    title: {
      en: 'How to read a link before you tap it',
      hi: 'लिंक पर टैप करने से पहले उसे कैसे पढ़ें',
      bn: 'লিঙ্কে ট্যাপ করার আগে কীভাবে পড়বেন',
    },
    summary: {
      en: 'Only one part of a web address decides where you go. Learn to find it, and most fake links stop working on you.',
      hi: 'वेब पते का केवल एक हिस्सा तय करता है कि आप कहाँ जाएँगे। उसे पहचानना सीखें, और ज़्यादातर फ़र्ज़ी लिंक बेअसर हो जाएँगे।',
      bn: 'একটি ওয়েব ঠিকানার শুধু একটি অংশ ঠিক করে আপনি কোথায় যাবেন। সেটি চিনতে শিখুন, তাহলে বেশিরভাগ ভুয়ো লিঙ্ক আর কাজ করবে না।',
    },
    body: [
      'Read a web address from the right, not the left. Find the part immediately before the first single slash. Then take the last two labels of it. That is the domain, and that is the only part that decides where you land.',
      'In "https://sbi.secure-verify.example.net/login", the domain is example.net. The words "sbi" and "secure-verify" are decoration that anyone can add.',
      'Four patterns worth recognising:',
      '- A familiar name in front of an unfamiliar domain. sbi.example.net is not SBI.',
      '- A familiar name glued to other words. sbi-kyc-update.example.com is a different domain entirely.',
      '- Anything before an @ sign. In https://sbi.co.in@example.net the browser ignores everything before the @ and goes to example.net.',
      '- Shortened links. They hide the destination completely, which is the whole point of them.',
      'And the one that catches careful people: https:// means the connection is encrypted. It says nothing about who is on the other end. A scam site can get a padlock in about four minutes.',
    ],
    questions: [
      {
        id: 'q1',
        prompt: 'Where does https://netbanking.examplebank.co.in.account-verify.example.org/kyc actually take you?',
        options: [
          { id: 'a', label: 'examplebank.co.in' },
          { id: 'b', label: 'example.org' },
          { id: 'c', label: 'netbanking.examplebank.co.in' },
          { id: 'd', label: 'account-verify.example.org' },
        ],
        correct: 'b',
        explanation:
          'Read from the right. The last two labels before the first slash are "example.org", so that is the site. Everything to the left of it, including the full bank name and ".co.in", is just subdomain text the owner of example.org chose to write.',
      },
      {
        id: 'q2',
        prompt: 'A message shows the link text "www.examplebank.co.in" but the underlying address is https://example-login.example.net/in. What does this tell you?',
        options: [
          { id: 'a', label: 'Nothing — link text and address are usually different' },
          { id: 'b', label: 'It is fine because it ends in /in' },
          { id: 'c', label: 'The visible text is a lie; the destination is example.net' },
          { id: 'd', label: 'It is safe because the text shows a .co.in address' },
        ],
        correct: 'c',
        explanation:
          'Link text is free text. It can say anything, including a complete, correct-looking address for a different site. Only the destination matters, and here the destination is example.net.',
      },
    ],
  },
  {
    slug: 'impersonation',
    minutes: 4,
    title: {
      en: 'When someone claims to be family',
      hi: 'जब कोई परिवार का सदस्य होने का दावा करे',
      bn: 'যখন কেউ পরিবারের সদস্য বলে দাবি করে',
    },
    summary: {
      en: 'A new number, a familiar relationship, an urgent need. One phone call to the number you already have ends it.',
      hi: 'नया नंबर, जाना-पहचाना रिश्ता, और तुरंत ज़रूरत। आपके पास पहले से सेव नंबर पर एक फ़ोन कॉल इसे ख़त्म कर देती है।',
      bn: 'নতুন নম্বর, চেনা সম্পর্ক, আর তড়িঘড়ি প্রয়োজন। আপনার কাছে আগে থেকে সেভ করা নম্বরে একটি ফোন কলেই এর শেষ।',
    },
    body: [
      'The impersonation script has three parts, always in the same order: a claimed relationship, a reason the usual number is unavailable, and a request that cannot wait.',
      '"Hi, this is your nephew, I have changed my number — save this one. I am stuck and need ₹18,000 urgently, I will return it tomorrow. Please do not tell mummy, she will worry."',
      'Every element is doing work. The relationship borrows trust. The new number explains away the unfamiliar sender. The urgency prevents checking. And the secrecy request removes the one person who would have said "call him first".',
      'The counter is a single action: call the number already saved in your contacts. Call, do not message — an answered call settles it in five seconds. If they do not pick up, ask someone else in the family who speaks to them.',
      'If you want to test the person messaging you, ask something unpublished. Not a birthday, not a school name, not a pet — those are on social media. Ask about something that happened between the two of you with nobody else present.',
    ],
    questions: [
      {
        id: 'q1',
        prompt: 'A WhatsApp message from an unknown number says: "Papa, my phone broke, this is my friend\'s number. Please send ₹25,000 to this UPI ID for the repair. Don\'t tell mummy." What is the first thing to do?',
        scenario: 'Fictional example. Nothing in this message is real.',
        options: [
          { id: 'a', label: 'Send a smaller amount to be safe' },
          { id: 'b', label: 'Reply asking for proof it is really them' },
          { id: 'c', label: 'Call your child on the number already in your contacts' },
          { id: 'd', label: 'Send the money and discuss it later' },
        ],
        correct: 'c',
        explanation:
          'Calling the saved number is the only step that tests the claim rather than negotiating with it. Replying tells the sender the approach is working, and any "proof" they send — a photo, a voice note, a name — can be found or faked. The "don\'t tell mummy" line is the clearest signal in the whole message.',
      },
    ],
  },
  {
    slug: 'payment-requests',
    minutes: 5,
    title: {
      en: 'Paying someone you have not paid before',
      hi: 'किसी नए व्यक्ति को पहली बार भुगतान करना',
      bn: 'আগে কখনও পেমেন্ট করেননি এমন কাউকে টাকা পাঠানো',
    },
    summary: {
      en: 'The name shown at payment time is not checked by anyone. Confirm the UPI ID on a channel you already had.',
      hi: 'भुगतान के समय दिखने वाला नाम कोई जाँचता नहीं है। यूपीआई आईडी की पुष्टि उसी माध्यम से करें जो आपके पास पहले से था।',
      bn: 'পেমেন্টের সময় দেখানো নামটি কেউ যাচাই করে না। আগে থেকেই আপনার কাছে থাকা মাধ্যমে ইউপিআই আইডি নিশ্চিত করুন।',
    },
    body: [
      'Two facts about UPI that change how you should treat a payment request:',
      '- The name displayed when you scan a code or open a request comes from the code, not from the bank. Whoever generated it typed that name in. It can be any name at all.',
      '- Scanning a QR code always sends money out of your account. There is no QR code anywhere in UPI that pulls money in. If someone says "scan this to receive your refund", they have reversed the direction deliberately.',
      'So the check is never "does the name look right". The check is: contact the person or business on a channel you already had, and have them read out the UPI ID. Read it back digit by digit.',
      'For a first payment to a new recipient, send ₹1 and have them confirm it arrived — on the channel you called them on, not the one that sent the request.',
      'One more: a request to "approve" a collect request you did not start is someone asking to pull money from you. Decline it. You initiate payments; you do not approve other people\'s.',
    ],
    questions: [
      {
        id: 'q1',
        prompt: 'A vendor you deal with emails that their bank account has changed and sends new UPI details for this month\'s payment. What do you do?',
        options: [
          { id: 'a', label: 'Pay the new details — the email came from their address' },
          { id: 'b', label: 'Call the vendor on the number you have used before and confirm' },
          { id: 'c', label: 'Reply to the email asking them to confirm' },
          { id: 'd', label: 'Pay half now and half after confirming' },
        ],
        correct: 'b',
        explanation:
          'Changed payment details arriving by message is the standard invoice-fraud pattern, and a compromised or spoofed email account sends from the right address. Replying to the email reaches whoever controls it. Call the number you already had.',
      },
      {
        id: 'q2',
        prompt: 'Someone says they will refund you ₹4,000 and asks you to scan a QR code to receive it. What is happening?',
        options: [
          { id: 'a', label: 'A normal refund flow' },
          { id: 'b', label: 'Scanning will send ₹4,000 out of your account, not into it' },
          { id: 'c', label: 'It works but the refund will be delayed' },
          { id: 'd', label: 'It depends which payment app you use' },
        ],
        correct: 'b',
        explanation:
          'Scanning a UPI QR code authorises a payment from you. There is no receiving-by-scanning flow in UPI, in any app. Anyone framing it that way knows exactly which direction the money goes.',
      },
    ],
  },
  {
    slug: 'official-communication',
    minutes: 4,
    title: {
      en: 'What official contact actually looks like',
      hi: 'सरकारी या बैंक का असली संपर्क कैसा होता है',
      bn: 'সরকারি বা ব্যাংকের আসল যোগাযোগ কেমন হয়',
    },
    summary: {
      en: 'Real processes are checkable from your side, leave a record, and survive you hanging up to verify.',
      hi: 'असली प्रक्रिया आपकी तरफ़ से जाँची जा सकती है, उसका रिकॉर्ड होता है, और फ़ोन काटकर पुष्टि करने पर भी वह ख़त्म नहीं होती।',
      bn: 'আসল প্রক্রিয়া আপনার দিক থেকে যাচাই করা যায়, তার রেকর্ড থাকে, আর ফোন কেটে যাচাই করলেও তা বাতিল হয় না।',
    },
    body: [
      'You cannot tell a real message from a fake one by looking at it. Logos, sender names, letterheads, officer names and case numbers are all copyable, and the fakes are often better formatted than the real thing.',
      'What you can test is the process around it. Real institutional contact has three properties:',
      '- It is visible from your side. A real bank issue appears in your bank app. A real tax notice appears on the tax portal when you log in yourself. A real order problem appears in your order history.',
      '- It leaves a record and a timeline. Written notices, reference numbers you can look up on the official portal, a process with steps.',
      '- It survives verification. You can say "I will call you back on the number on my card" and nothing is lost. Genuine processes do not collapse because you checked.',
      'A demand that fails all three — invisible on your own account, no checkable reference, and urgently insistent that you stay on this call — is telling you what it is.',
      'And a format rule worth knowing: no Indian agency conducts an arrest, an interrogation or a settlement over a video call. The "digital arrest" format is not a real procedure anywhere.',
    ],
    questions: [
      {
        id: 'q1',
        prompt: 'A caller says they are from the police, that a parcel in your name contained contraband, and that you must stay on a video call while they "process" it, and tell nobody. What is the correct read?',
        options: [
          { id: 'a', label: 'Cooperate fully to avoid making it worse' },
          { id: 'b', label: 'Stay on the call but refuse to pay anything' },
          { id: 'c', label: 'This format does not exist in real policing — end the call and tell someone' },
          { id: 'd', label: 'Ask them to email the case documents first' },
        ],
        correct: 'c',
        explanation:
          'The video-call interrogation is not a procedure that exists. Staying on the line is the mechanism: isolation plus escalating fear. Ending the call costs you nothing if it were somehow real, because a real case does not depend on one phone call. Telling someone immediately breaks the isolation the script needs.',
      },
    ],
  },
  {
    slug: 'account-security-basics',
    minutes: 4,
    title: {
      en: 'Three habits that do most of the work',
      hi: 'तीन आदतें जो सबसे ज़्यादा काम करती हैं',
      bn: 'তিনটি অভ্যাস যা সবচেয়ে বেশি কাজ করে',
    },
    summary: {
      en: 'A different password on your email, two-factor on what matters, and app installs only from the official store.',
      hi: 'ईमेल पर अलग पासवर्ड, ज़रूरी खातों पर दो-चरणीय सुरक्षा, और ऐप केवल आधिकारिक स्टोर से।',
      bn: 'ইমেলে আলাদা পাসওয়ার্ড, গুরুত্বপূর্ণ অ্যাকাউন্টে দুই-ধাপ সুরক্ষা, এবং অ্যাপ শুধু অফিসিয়াল স্টোর থেকে।',
    },
    body: [
      'Your email account is the master key. Password resets for your bank, your wallet and your shopping accounts all land there. If one password in your life is unique and long, make it that one.',
      'Turn on two-factor authentication where money or identity lives: email first, then bank and wallet apps. An app-based code or a passkey beats an SMS code, because SIM swaps exist.',
      'Install apps only from the Play Store or App Store. Side-loaded APKs are the main delivery route for the banking overlays and SMS-readers used in India — the app draws a fake login screen over your real bank app, or quietly forwards your OTPs.',
      'Two smaller habits worth having: review which apps can read your SMS, and check your bank statement monthly rather than only when something feels wrong. Small test debits often come before large ones.',
    ],
    questions: [
      {
        id: 'q1',
        prompt: 'Which single account should get your strongest, most unique password?',
        options: [
          { id: 'a', label: 'Your bank account' },
          { id: 'b', label: 'Your primary email account' },
          { id: 'c', label: 'Your social media account' },
          { id: 'd', label: 'Your shopping account' },
        ],
        correct: 'b',
        explanation:
          'Email is where password resets for everything else arrive, including the bank. Someone with your email can obtain the others. That makes it the highest-value target even though it holds no money directly.',
      },
    ],
  },
  {
    slug: 'social-engineering',
    minutes: 5,
    title: {
      en: 'Why these messages work on careful people',
      hi: 'ये संदेश सतर्क लोगों पर भी क्यों असर करते हैं',
      bn: 'সতর্ক মানুষের উপরেও এই বার্তাগুলি কেন কাজ করে',
    },
    summary: {
      en: 'Scams do not target gullibility. They target urgency, authority, fear and isolation — states anyone can be pushed into.',
      hi: 'ठगी भोलेपन को निशाना नहीं बनाती। वह जल्दबाज़ी, रौब, डर और अकेलेपन को निशाना बनाती है — जिनमें कोई भी धकेला जा सकता है।',
      bn: 'প্রতারণা সরলতাকে লক্ষ্য করে না। এটি তাড়াহুড়ো, কর্তৃত্ব, ভয় ও বিচ্ছিন্নতাকে লক্ষ্য করে — যেখানে যে কাউকে ঠেলে দেওয়া যায়।',
    },
    body: [
      'People who fall for these are not careless. They were placed, briefly, in a state where checking felt like the wrong move. Four levers do that:',
      '- Urgency. A deadline removes the pause in which you would have verified.',
      '- Authority. A bank, a police officer, a manager. Instructions from authority get followed before they get questioned.',
      '- Fear. An account about to be blocked, a case about to be filed. Fear narrows attention to the threat and away from the inconsistencies.',
      '- Isolation. "Do not tell anyone." This is the most reliable single indicator, because no legitimate process ever needs it.',
      'Notice what these have in common: they all attack the gap between receiving a message and acting on it. So the defence is structural, not clever. You do not need to out-think the script. You need to make the gap bigger.',
      'Three ways to do that: decide in advance that you never act on a first message; keep one person you always check with; and treat "do not tell anyone" as an instruction to tell someone immediately.',
    ],
    questions: [
      {
        id: 'q1',
        prompt: 'Which element in a message is the strongest single indicator that something is wrong?',
        options: [
          { id: 'a', label: 'Spelling and grammar mistakes' },
          { id: 'b', label: 'An instruction not to tell anyone' },
          { id: 'c', label: 'A long message' },
          { id: 'd', label: 'An unknown phone number' },
        ],
        correct: 'b',
        explanation:
          'Secrecy has no legitimate function in a bank, delivery, or government process — its only purpose is to remove the person who would have told you to stop. Spelling is a weak signal: plenty of real organisations write badly, plenty of scams are written well, and judging messages by grammar mostly penalises people writing in a second language.',
      },
      {
        id: 'q2',
        prompt: 'What is the most reliable defence against a well-written scam?',
        options: [
          { id: 'a', label: 'Learning to spot fake messages by sight' },
          { id: 'b', label: 'Installing an antivirus app' },
          { id: 'c', label: 'Having a fixed habit of verifying through your own channel first' },
          { id: 'd', label: 'Only using one bank' },
        ],
        correct: 'c',
        explanation:
          'Spotting fakes by sight fails as the fakes improve, and it fails exactly when you are rushed or frightened. A habit works in the state you will actually be in: it does not depend on the message being badly made, or on you being calm.',
      },
    ],
  },
  {
    slug: 'reporting-fraud',
    minutes: 4,
    title: {
      en: 'What to do in the first hour after losing money',
      hi: 'पैसे जाने के बाद पहले एक घंटे में क्या करें',
      bn: 'টাকা হারানোর পর প্রথম এক ঘণ্টায় কী করবেন',
    },
    summary: {
      en: 'Bank first, then 1930, then the cybercrime portal. Speed matters more than a complete account of what happened.',
      hi: 'पहले बैंक, फिर 1930, फिर साइबर क्राइम पोर्टल। पूरी जानकारी जुटाने से ज़्यादा ज़रूरी है जल्दी करना।',
      bn: 'প্রথমে ব্যাংক, তারপর ১৯৩০, তারপর সাইবার ক্রাইম পোর্টাল। সম্পূর্ণ বিবরণের চেয়ে দ্রুততা বেশি গুরুত্বপূর্ণ।',
    },
    body: [
      'If money has left your account, the order matters, and so does the clock. Funds can sometimes be held while they are still sitting in the receiving account, which is often a matter of hours.',
      'Do these in order, and do not wait until you have the full story:',
      '- Call your bank and report an unauthorised transaction. Ask them to freeze the beneficiary and raise a dispute. Note the reference number and the time.',
      '- Call 1930, the national cyber financial fraud helpline. Keep the transaction ID, amount and date in front of you.',
      '- File a written complaint on the National Cyber Crime Reporting Portal, cybercrime.gov.in, and keep the acknowledgement number.',
      'Then collect evidence: screenshots of the messages, the transaction reference, the UPI ID or account you paid, the number that contacted you, and a timeline of what happened when. TrustCircle\'s RecoveryGuide keeps these together in one place for you.',
      'Two honest notes. Reporting does not guarantee recovery — it improves the odds, and the odds are better the earlier you report. And nobody who contacts you offering to recover your money for a fee is genuine; recovery fraud specifically targets people who have already been defrauded.',
    ],
    questions: [
      {
        id: 'q1',
        prompt: 'Money left your account 20 minutes ago through a fraudulent UPI transfer. What comes first?',
        options: [
          { id: 'a', label: 'Collect all the evidence, then report' },
          { id: 'b', label: 'Call your bank to report it and freeze the beneficiary' },
          { id: 'c', label: 'Post about it in a consumer group for advice' },
          { id: 'd', label: 'Message the recipient and ask for the money back' },
        ],
        correct: 'b',
        explanation:
          'The bank is the only party that can act on the money itself, and only while it is still in the receiving account. Evidence collection matters, but it can happen after the call. Messaging the recipient simply tells them to move the funds.',
      },
      {
        id: 'q2',
        prompt: 'A few days later, someone contacts you saying they can recover your lost money for a 10% fee. What is this?',
        options: [
          { id: 'a', label: 'A legitimate recovery service' },
          { id: 'b', label: 'Worth trying since the money is already gone' },
          { id: 'c', label: 'A second scam targeting fraud victims' },
          { id: 'd', label: 'A government-approved agency' },
        ],
        correct: 'c',
        explanation:
          'Recovery fraud deliberately targets people who have already lost money, because they are motivated and their details are already circulating. No genuine agency charges a percentage to recover funds. Recovery happens through your bank and the official reporting channels, which do not charge fees.',
      },
    ],
  },
];

export const lessonBySlug = (slug: string): Lesson | undefined => lessons.find((l) => l.slug === slug);
