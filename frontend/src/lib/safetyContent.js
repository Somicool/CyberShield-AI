/**
 * Educational content for the Cyber Safety Center. Plain-language guidance for
 * non-technical citizens. Icons are lucide icon names resolved in the page.
 */
export const SAFETY_TOPICS = [
  {
    id: 'phishing',
    title: 'How to spot phishing',
    icon: 'Fish',
    summary: 'Fake messages that trick you into giving away passwords or money.',
    points: [
      'Be suspicious of urgent messages: "Your account will be blocked in 24 hours".',
      'Check the sender address and links carefully — scammers use look-alike names.',
      'Never enter your password after clicking a link in an email or SMS.',
      'When in doubt, open the official app or website yourself instead of clicking.',
    ],
  },
  {
    id: 'upi',
    title: 'Safe UPI payments',
    icon: 'IndianRupee',
    summary: 'You never need to enter a PIN to RECEIVE money.',
    points: [
      'Entering your UPI PIN only sends money — never to receive it.',
      'Do not scan a QR code or approve a "collect request" to get a refund or prize.',
      'Verify the receiver name before paying.',
      'Ignore calls asking you to install screen-sharing apps like AnyDesk or TeamViewer.',
    ],
  },
  {
    id: 'qr',
    title: 'QR code scam awareness',
    icon: 'QrCode',
    summary: 'A QR code can quietly open a dangerous website or payment.',
    points: [
      'Scanning a QR code to "receive" money is always a scam.',
      'Check where a QR link leads before you act — use the Check QR tool here.',
      'Be careful with QR codes stuck over the original in shops or parking.',
      'Never approve a payment you did not start yourself.',
    ],
  },
  {
    id: 'otp',
    title: 'OTP fraud',
    icon: 'KeyRound',
    summary: 'Your OTP is a secret. No genuine person will ever ask for it.',
    points: [
      'Banks, police and companies will NEVER ask for your OTP.',
      'Do not read your OTP out to anyone on a call.',
      'An OTP received unexpectedly may mean someone is trying to access your account.',
      'If pressured to share an OTP, stop and report it.',
    ],
  },
  {
    id: 'jobs',
    title: 'Fake job scams',
    icon: 'Briefcase',
    summary: 'Real jobs do not ask you to pay money to get hired.',
    points: [
      'Be wary of work-from-home offers with very high pay for little work.',
      'Never pay a "registration" or "training" fee to get a job.',
      '"Task" or "like and earn" jobs that ask you to deposit money are scams.',
      'Verify the company through its official website and phone number.',
    ],
  },
  {
    id: 'social',
    title: 'Social media scams',
    icon: 'Users',
    summary: 'Not everyone online is who they claim to be.',
    points: [
      'Be careful with friend requests from strangers and sudden money requests.',
      'A hacked friend\u2019s account may ask you for money or OTPs — verify by calling.',
      'Avoid "investment" and crypto tips from people you have not met.',
      'Keep your accounts private and turn on two-factor authentication.',
    ],
  },
]
