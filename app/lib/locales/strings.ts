// UI string catalog. Grows as screens are migrated to t().
// Country/capital names are NOT here — those come from
// app/assets/data/country-i18n.json (generated). See scripts/gen-country-i18n.js.
// NOTE: nested objects — i18n-js reads a dot in t('quiz.flag') as a path, so keys
// must be nested (translations.en.quiz.flag), NOT flat "quiz.flag" strings.

type Catalog = Record<string, unknown>;

export const translations: Record<string, Catalog> = {
  en: {
    quizzes: { title: 'Quizzes' },
    quiz: {
      millionaire: 'Millionaire Quiz',
      flag: 'Flags',
      shape: 'Shapes',
      capitals: 'Capitals',
      borders: 'Borders',
      trail: 'Trail',
      draw: 'Map Maker',
      gauntlet: 'The Gauntlet',
      nightmare: 'The Nightmare',
    },
    menu: { language: 'Language', signOut: 'Sign Out', deleteAccount: 'Delete Account' },
    tabs: {
      home: 'Home',
      quizzes: 'Quizzes',
      shop: 'Shop',
      leaderboard: 'Leaderboard',
      quests: 'Quests',
    },
    nav: {
      flagQuiz: 'Flag Quiz',
      shapeQuiz: 'Shape Quiz',
      bordersQuiz: 'Borders Quiz',
      capitalsQuiz: 'Capitals Quiz',
      trailQuiz: 'Trail Quiz',
      millionaireQuiz: 'Millionaire Quiz',
      nightmareMode: 'Nightmare Mode',
      nightmareQuiz: 'The Nightmare',
      drawBorder: 'Draw the Border',
      results: 'Results',
      setPassword: 'Set New Password',
      setPasswordMsg: 'Enter a new password for your account.',
      newPassword: 'New password',
      confirmPassword: 'Confirm new password',
      saving: 'Saving…',
      savePassword: 'Save Password',
      passwordMismatch: 'Passwords must match and cannot be empty.',
      passwordShort: 'Password must be at least 6 characters.',
      passwordSuccess: 'Your password has been updated!',
      passwordFailed: 'Failed to update password.',
    },
    difficulty: { title: 'Difficulty', easy: 'Easy', medium: 'Medium', hard: 'Hard' },
    quizCommon: {
      paused: 'PAUSED',
      resume: 'RESUME',
      quit: 'Quit',
      letsGo: "LET'S GO",
      goBack: 'Go Back',
      tapToContinue: 'Tap anywhere to continue →',
      sixOptions: '6 OPTIONS',
      noQuestions: 'No questions available',
      offline: {
        title: "You're Offline",
        body: "Upgrade to Conqueror's Pass to play offline.",
        upgrade: 'Upgrade',
      },
      learn: 'Learn',
      stay: 'Stay',
      leaveQuiz: 'Leave Quiz?',
      progressLost: 'Your progress will be lost.',
    },
    infoModal: {
      capital: 'Capital',
      region: 'Region',
      population: 'Population',
      area: 'Area',
      neighbors: 'Neighbors',
      islandNation: '🏝️ Island nation',
      gotIt: 'Got it!',
      na: 'N/A',
    },
    flagQuiz: {
      subtitle: 'Identify countries by their flags.',
      loading: 'Preparing flags…',
      whichFlagOf: 'Which flag belongs to %{country}?',
      whichCountry: 'Which country does this flag belong to?',
    },
    shapeQuiz: {
      subtitle: 'Identify countries by their shape.',
      loading: 'Preparing shapes…',
      whichCountry: 'Which country has this shape?',
      whichShapeOf: 'Which shape belongs to %{country}?',
    },
    bordersQuiz: {
      subtitle: 'Identify countries that border each other.',
      loading: 'Preparing borders…',
      doesBorder: 'Does %{a} border %{b}?',
      doesNotBorder: "Which country doesn't border %{country}?",
      sharesBorder: 'Which country shares a border with %{country}?',
      yes: 'Yes',
      no: 'No',
    },
    capitalsQuiz: {
      subtitle: 'Match countries to their capitals.',
      loading: 'Preparing capitals…',
      capitalOf: 'What is the capital of %{country}?',
      countryOf: 'Which country has %{capital} as its capital?',
    },
    trailQuiz: {
      subtitle: 'Navigate a trail of neighboring countries.',
      loading: 'Preparing trail…',
      question: 'Which country comes next in the trail?',
      whatCountry: 'What country is this?',
      whatCapital: 'What is the capital of this country?',
      whatFlag: "What is this country's flag?",
    },
    millionaireQuiz: {
      loading: 'Preparing questions…',
      lifeline50: '50/50',
      lifelineSkip: 'Swap',
      lifelineAudience: 'Audience',
      walkTitle: "You're on Fire!",
      walkBody: 'Walk away with %{amount} gold?',
      walk: 'Walk Away',
      keepGoing: 'Keep Going',
      winTitle: 'JACKPOT!',
      winBody: 'You won %{amount} gold!',
      secondChanceTitle: 'Second Chance?',
      secondChanceBody: 'Use a ticket for one more try?',
      useTicket: 'Use Ticket',
      noThanks: 'No Thanks',
      pushForward: 'Push Forward!',
      takeGold: 'Take my %{amount} gold',
      readySubtitle: '15 questions for the jackpot, make sure you\'re ready',
      loadingChallenge: 'Preparing your challenge…',
      prizeNow: 'Now',
      prizeNext: 'Next',
      claimGold: 'Claim Your Gold',
      conquerBody: "You've conquered all 15 questions!",
      walkNoXp: "Taking the gold ends the run with no XP. XP is only awarded for a perfect 15/15.", checkpointBody: "You're so close to the next tier. One more correct answer could change everything.",
      secondChanceWatchBody: 'Watch an ad to replace this question and keep going.',
      watchAd: 'Watch ad',
      loadingAd: 'Loading ad…',
      powerUpLocked: 'Power-Up Locked',
      powerUpLockedBody: 'This power-up needs to be purchased from the Upgrades shop.',
    },
    nightmareQuiz: {
      loading: 'Preparing nightmare…',
      curseDrawn: 'CURSE DRAWN',
      penaltyRoll: 'ROLL FOR YOUR PENALTY',
      penaltyTaken: '%{pct}% of your gold is taken.',
      blind: 'BLIND',
      blindDesc: 'The question is hidden behind a haze that slowly clears.',
      shuffle: 'SHUFFLE',
      shuffleDesc: 'Answer options shuffle every 3 seconds.',
      rush: 'RUSH',
      rushDesc: 'Timer is halved for this question.',
      phantom: 'PHANTOM',
      phantomDesc: 'One correct answer is hidden.',
      winTitle: 'The beast mark is yours',
      winBody: 'You conquered the nightmare.',
      readySubtitle: 'You VS the Dark Lord',
      loadingChallenge: 'Awakening the Nightmare…',
      blindReveal: 'Through the haze...',
      shuffleReveal: 'Careful where you click.',
      rushReveal: '5 seconds. Clock starts now.',
      phantomReveal: 'Trust the Phantom.',
      winKing: 'You are the new king of the underworld',
      takeOwed: 'Take What Is Owed',
      leaveTitle: 'Leave Nightmare?',
    },
    gauntlet: {
      welcomeTo: 'WELCOME TO',
      inARow: 'CORRECT IN A ROW',
      round: 'Round %{n}',
      bossRound: 'BOSS ROUND  x2',
      shieldAbsorbed: 'SHIELD ABSORBED',
      shieldAcquired: 'SHIELD ACQUIRED',
      whichFlag: 'Which country has this flag?',
      whichCapital: 'What is the capital of %{country}?',
      whichCountryCapital: 'Which country has this capital?',
      sharesBorder: 'Which country shares a border with %{country}?',
      whichShape: 'Which country has this shape?',
      t2FlagCapital: 'Which capital belongs to this flag?',
      t2FlagBorder: "Which country borders this flag's country?",
      t2FlagShape: 'Which shape belongs to this flag?',
      t2ShapeCapital: 'Which capital belongs to this shape?',
      t2ShapeBorder: "Which country borders this shape's country?",
      t2ShapeFlag: 'Which flag belongs to this shape?',
      t2CapitalFlag: 'Which flag belongs to this capital?',
      t2CapitalShape: 'Which shape belongs to this capital?',
      t2CapitalBorder: "Which country borders this capital's country?",
      tiers: {
        eternity: 'ETERNITY',
        oblivion: 'OBLIVION',
        inferno: 'INFERNO',
        hell: 'HELL',
        void: 'VOID',
        abyss: 'ABYSS',
        peril: 'PERIL',
        danger: 'DANGER',
      },
      loading: 'Entering the Gauntlet...',
      title: 'THE GAUNTLET',
      finalPhase: 'FINAL PHASE',
      nextPhase: 'NEXT PHASE %{progress}/%{step}',
      correctLeft: '%{n} more to advance',
      readySubtitle: 'Your quest only begins',
      keepGoing: 'KEEP GOING',
      tierDescPeril: 'The heat is rising...',
      tierDescAbyss: 'The deep unknown...',
      tierDescVoid: 'Endless conquest',
      tierDescHell: 'Hell - REBORN',
      tierDescInferno: 'Subjugation',
      tierDescOblivion: 'Nothing remains',
      tierDescEternity: 'The beyond',
      milestone5: 'JUST GETTING STARTED',
      milestone10: 'DOUBLE DIGITS',
      milestone15: 'LOCKED IN',
      milestone20: 'INTO THE ABYSS',
      milestone25: 'QUARTER CENTURY',
      milestone30: 'THE VOID OPENS',
      milestone40: 'WELCOME TO HELL',
      milestone50: 'HALFWAY TO INFERNO',
      milestone60: 'NO TURNING BACK',
      milestone70: 'OBLIVION REACHED',
      milestone75: 'LEGENDARY',
      milestone100: 'UNSTOPPABLE',
      leaveTitle: 'Leave Gauntlet?',
    },
    drawQuiz: {
      submit: 'Submit',
      nextRound: 'Next Round',
      done: 'Done',
      round: 'Round %{current} / %{total}',
      drawBorderBetween: 'Draw the border between %{a} and %{b}',
      loading: 'Building border pairs…',
      error: 'Could not build enough quiz pairs. Try again later.',
      title: 'MAP MAKER',
      subtitle: 'Draw the borders of the earth as accurately as you can',
      borderParts: 'This border has %{n} parts: draw each one', drawPrompt: 'Draw the border between them:',
      revealPrompt: "Here's the actual border:",
      actualBorder: 'Actual border',
      yourStroke: 'Your stroke',
      clear: 'Clear',
      seeResults: 'See Results',
      next: 'Next →',
      ratingPerfect: 'Perfect!',
      ratingGreat: 'Great!',
      ratingGood: 'Good',
      ratingClose: 'Close',
      ratingMiss: 'Missed',
      rating: {
        gold: 'GOLD',
        silver: 'SILVER',
        bronze: 'BRONZE',
        miss: 'MISS',
      },
    },
    results: {
      score: 'Score',
      totalTime: 'Total Time',
      xpEarned: 'XP Earned',
      boost: 'Boost',
      x2Applied: 'x2 Applied',
      level: 'Level %{n}',
      levelUpBonus: 'Level-Up Bonus +%{bonus}',
      gold: 'Gold',
      balance: 'Balance',
      penalty: 'PENALTY',
      reward: 'REWARD',
      playAgain: 'Play Again',
      backToQuizzes: 'Back to Quizzes',
      shareResult: 'Share Result',
      shareText: 'This is how much I scored on %{quiz}... Download Geo Conquest!',
      shareHeadline: "This is how much I scored in the quiz,\nthink you can do better?",
      shareDownload: 'Download Geo Conquest',
      levelUpTitle: 'Level Up — Level %{n} (+%{bonus})',
      remarks: {
        wellPlayed: 'Well played!',
        almostThere: 'Almost there!',
        pumpNumbers: 'Gotta pump those numbers up',
        solidEffort: 'Solid effort',
        oof: 'Oof...',
        wellPlayedGauntlet: 'Well played..',
        payUp: 'Pay up and get out',
        flawless: 'Flawless Victory!',
        notGoodEnough: 'Not good enough',
        wastedTicket: 'No way you wasted a ticket for this..',
      },
      doubleRewardsTitle: 'Double Rewards Next Quiz?',
      doubleRewardsBody: 'Watch one ad now to get x2 Gold + x2 XP on your next quiz.',
      watchAdBtn: 'Watch Ad',
      notNow: 'Not now',
      boostReady: 'Boost Ready',
      boostReadyMsg: 'Your next quiz rewards will be doubled.',
      adUnavailableTitle: 'Ad Unavailable',
      noTicketsPlayMsg: 'You need at least 1 ticket to play again.\n\nEarn tickets from daily rewards or buy them in Shop → Items.',
      ticketCostMsg: 'This will cost 1 ticket. You have %{n} ticket%{s}.',
      play: 'Play',
      cancelBtn: 'Cancel',
      go: 'Go',
      watch: 'Watch',
    },
    maps: {
      outOfMaps: 'Out of Maps!',
      readyToConquer: 'Ready to Conquer!',
      refillRate: 'Maps refill 1 every 60 minutes.',
      becomeConqueror: 'Become a Conqueror',
      unlimitedMaps: 'Unlimited maps — never wait again',
      watchAd: 'Watch an Ad',
      comeBackTomorrow: 'Come back tomorrow',
      getMap: 'Get 1 map · %{left} left today',
      wait: 'Wait',
      noTickets: 'No Tickets',
      playAgainPrompt: 'Play Again?',
    },
    achievements: {
      title: 'Quests',
      progress: '%{claimed} / %{total} Claimed',
      conquerorPass: "Conqueror's Pass — Unlock Everything",
      locked: '???',
      claim: 'Claim',
      rewards: 'Rewards',
      error: 'Error',
    },
    home: {
      empire: 'Your Empire',
      worldProgress: 'World Domination Progress',
      countries: 'Countries ▸',
      invite: 'Invite a Friend — Both get 1,500 gold',
      dailyReward: 'Daily Reward',
      claim: 'Claim',
      streak: '%{n} day streak',
      deleteAccount: 'Delete Account',
      deleteBody: 'This will permanently delete your account and all your data. This cannot be undone.',
      deleteForever: 'Delete Forever',
      earthArea: '%{pct}% of Earth\'s land area',
      questsDone: 'Quests Done',
      avatarsOwned: 'Avatars Owned',
      quizzesDone: 'Quizzes Done',
      topExplorers: 'Top Explorers',
      loadingRankings: 'Loading rankings...',
      you: ' (You)',
      level: 'Level %{n}',
      becomeConqueror: 'Become a Conqueror',
      manageSubscription: 'Manage Subscription',
      closeGoldShop: '✕ Close',
      ownedCountries: 'Owned Countries (%{n})',
      noCountries: 'No countries owned yet. Earn gold and visit the Shop!',
      welcomeTitle: 'Welcome, Explorer!',
      welcomeSubtitle: 'Time to build your empire.',
      welcomeStep1: 'Earn gold by taking quizzes. The better you score, the more you earn.',
      welcomeStep2: 'Spend gold in the Shop to buy countries, avatars, and gameplay upgrades.',
      welcomeStep3: 'Complete quests to unlock exclusive rewards and rare avatars.',
      welcomeStep4: 'Compete in daily challenges against explorers from around the world.',
      letsConquer: "Let's Conquer!",
      updateTitle: 'v%{version} is Available!',
      updateBody: "You're on v%{current}. Update to get the latest features and fixes.",
      updateNow: 'Update Now',
      later: 'Later',
    },
    login: {
      tagline: 'Conquer the world, one quiz at a time',
      email: 'Email',
      password: 'Password',
      signIn: 'Sign In',
      forgotPassword: 'Forgot Password?',
      noAccount: "Don't have an account? Sign Up",
      signingIn: 'Signing in…',
      resetSent: 'Password reset email sent!',
      error: 'Error',
      or: 'or',
      continueWithGoogle: 'Continue with Google',
      connecting: 'Connecting…',
      forgotPasswordTitle: 'Reset Password',
      forgotPasswordBody: "Enter your email and we'll send you a reset link.",
      emailSentTitle: 'Email Sent',
      emailSentBody: 'Check your inbox for a password reset link.',
      done: 'Done',
      sending: 'Sending…',
      sendResetLink: 'Send Reset Link',
      cancel: 'Cancel',
      fillFields: 'Please fill in all fields',
      enterEmail: 'Please enter your email address.',
      signInFailed: 'Sign In Failed',
      googleFailed: 'Google Sign In Failed',
      appleFailed: 'Apple Sign In Failed',
    },
    signup: {
      title: 'Start your conquest',
      email: 'Email',
      password: 'Password',
      signUp: 'Sign Up',
      haveAccount: 'Already have an account? Sign In',
      signingUp: 'Creating account…',
      error: 'Error',
      or: 'or',
      continueWithGoogle: 'Continue with Google',
      connecting: 'Connecting…',
      passwordMin: 'Password (min 6 characters)',
      fillFields: 'Please fill in all fields',
      passwordTooShort: 'Password must be at least 6 characters',
      googleFailed: 'Google Sign In Failed',
      appleFailed: 'Apple Sign In Failed',
    },
    onboarding: {
      chooseName: 'Choose Your Name',
      chooseAvatar: 'Choose Your Avatar',
      chooseFlag: 'Choose Your Flag',
      referral: 'Got a Referral Code?',
      usernamePlaceholder: 'Username',
      referralPlaceholder: 'Referral code (optional)',
      next: 'Next →',
      finish: 'Start Conquering!',
      usernameTaken: 'This username is already taken',
      usernameShort: 'Username must be at least 3 characters',
      referralAccepted: 'Referral accepted! You both get 1,500 gold',
      referralInvalid: 'Invalid referral code',
      error: 'Error',
      usernameSubtitle: 'Pick a unique username for the leaderboard',
      enterUsername: 'Enter your username',
      usernameHint: '3–20 characters, letters, numbers, underscores',
      checking: 'Checking…',
      avatarSubtitle: 'This will represent you in the game',
      avatarHint: 'Not feeling it? Unlock 50+ more characters in the Avatar Shop anytime.',
      back: '← Back',
      flagSubtitle: "Pick your country's flag to fly beside your avatar",
      searchCountry: 'Search country…',
      referralSubtitle: 'If a friend invited you to the conquest, enter their username below.',
      verify: 'Verify',
      creating: 'Creating…',
      imReady: "I'm ready",
      ownUsername: "You can't use your own username as a referral code.",
      referralNotFound: 'Referral code not found. Please check and try again.',
    },
    goldShop: {
      title: 'Gold Shop',
      subtitle: 'Supercharge your conquest',
      mostPopular: 'MOST POPULAR',
      bestValue: 'BEST VALUE',
      confirmTitle: 'Confirm Purchase',
      youReceive: 'You receive',
      price: 'Price',
      buy: 'Buy',
      cancel: 'Cancel',
      goldAdded: '%{amount} Gold Added!',
      goldAddedBody: 'Your gold balance has been updated.',
      pending: 'Purchase Pending',
      pendingBody: 'Your purchase is being processed.',
      error: 'Error',
      devWarning: 'Dev mode — no real purchase',
      purchaseSuccessTitle: 'Purchase Successful',
      goldAddedTitle: '%{amount} Gold Added',
      goldAddedSubtitle: 'Your balance has been updated.',
      purchaseFailedTitle: 'Purchase Failed',
      purchaseFailed: 'Please try again.',
      iapTitle: 'In-App Purchases',
      tempUnavailableTitle: 'Temporarily Unavailable',
      tempUnavailableBody: 'This gold pack is not available from the store right now. Please try again in a little while.',
      gold: 'Gold',
      devModeWarning: '⚠️ Running in development mode. Build with EAS for real purchases.',
      previewMode: 'Preview — build with EAS to purchase',
      pendingDelivery: 'Your payment was detected, but the gold could not be confirmed yet. Please reopen the Gold Shop and we will retry the delivery.',
    },
    crateShop: {
      title: 'Mystery Crates',
      legendary: 'Legendary Crate',
      legendaryDesc: 'SVG avatars & faction flags. Chance at Legendary drops!',
      dropRates: 'Drop Rates',
      common: 'Common',
      rare: 'Rare',
      epic: 'Epic',
      legendaryRarity: 'LEGENDARY',
      notEnoughGold: 'Not enough gold to open this crate.',
      open: 'Open Crate',
      error: 'Error',
    },
    shop: {
      countries: 'Countries',
      avatars: 'Avatars',
      flags: 'Flags',
      upgrades: 'Upgrades',
      buy: 'Buy',
      owned: 'Owned',
      equipped: 'Equipped',
      equip: 'Equip',
      notEnoughGold: 'Not enough gold',
      purchaseSuccess: 'Purchase successful!',
      error: 'Error',
      conquererPass: "Conqueror's Pass — Unlock Everything",
      needMoreGold: 'Need more Gold?',
      buyGold: 'Buy Gold →',
      bulkBuy: 'Bulk Buy',
      bulkBuyDesc: 'Conquer %{count} countries for %{cost} gold',
      goldRemaining: '%{n} gold remaining',
      buyAll: 'Buy All',
      loadingCountries: 'Loading countries…',
      searchCountries: 'Search countries…',
      ownedCheck: 'Owned ✓',
      ownedMinus: '- Owned',
      locked: 'Locked',
      conquered: 'Conquered!',
      countriesAdded: '%{n} countries added to your empire.',
      avatarUnlockedTitle: 'Avatar Unlocked!',
      flagUnlockedTitle: 'Flag Unlocked!',
      switchToOwned: 'Switch to the Owned tab to equip it.',
      avatarEquippedTitle: 'Avatar Equipped!',
      avatarEquippedBody: 'Your avatar is visible to everyone on the leaderboard.',
      mustOwnFirst: 'You must own %{name} first.',
      easterEggTitle: '🎉 Easter Egg Found!',
      easterEggBody: 'Good job on finding the easter egg! Here are 5 free tickets.',
      ticketPackAddedTitle: 'Ticket Pack Added',
      ticketsAddedBody: '5 tickets added to your inventory.',
      ticketAddedTitle: 'Ticket Added',
      ticketAddedBody: 'Added to your inventory.',
      thanksForWatchingTitle: 'Thanks for Watching!',
      ticketWatchBody: '1 ticket added to your inventory.',
      upgradesSubtitle: 'Extend your map expeditions to earn massive streak multipliers.',
      capitalsQuizUpgrade: 'Capitals Quiz',
      bordersQuizUpgrade: 'Borders Quiz',
      standardExpedition: 'Standard Expedition (10)', level2Expedition: 'Level 2 Expedition',
      level2Desc: 'Play up to 20 turns per quiz',
      level3Expedition: 'Level 3 Expedition',
      level3Desc: 'Play up to 30 turns per quiz',
      millionaireSwap: 'Millionaire Swap',
      millionaireSwapDesc: 'Swap one question in the Millionaire Quiz',
      darkScroll: 'Dark Scroll',
      darkScrollDesc: 'Unlocks the Nightmare Quiz',
      infiniteMaps: 'Infinite Maps',
      infiniteMapsDesc: 'Never wait for maps again',
      speedDetectiveQuest: 'Turn in Speed Detective quest',
      groundInvasionQuest: 'Turn in Ground Invasion quest',
      acquireTickets: 'acquire millionaire tickets',
      millionaireTicket: 'Millionaire Ticket',
      oneTicket: '1 ticket',
      ticketPack: 'Ticket Pack',
      ticketsCount: '5 millionaire tickets',
      watchAnAd: 'Watch an ad',
      oneAdTicket: '1 ticket for 1 ad',
      bulkBuyTitle: 'Bulk Buy',
      purchaseFailed: 'Purchase Failed',
      purchaseFailedBody: 'Something went wrong.',
      conqueredTitle: 'Conquered!',
      previousTier: 'Previous Tier',
      featuredToday: 'FEATURED TODAY',
      todayOff: '20% off today only',
      adUnavailable: 'Ad Unavailable',
      free: 'Free',
      cancel: 'Cancel',
      claim: 'Claim!',
      tapToClose: 'Tap anywhere to close',
      premiumTreasure: 'PREMIUM TREASURE',
      mythicChestSubtitle: 'Unique avatars and rare rewards',
      mythicAvatarTitle: '✦ MYTHIC AVATARS',
      mythicAvatarSubtitle: 'Unique avatars with hidden bonuses',
      mythicAvatarEmpty: 'Open Mythic Chests to discover avatars with unique bonuses.',
      mythicAvatarBonusHint: '? BONUS',
      mythicAvatarBonusBadge: '✦ UNIQUE MYTHIC BONUS',
      mythicBonusGold: '+10% Gold gained',
      mythicBonusXp: '+10% XP gained',
    },
    premium: {
      heroTitle: 'Become a\nWorld Conqueror',
      heroSubtitle: "The world won't conquer itself.",
      heroSub: 'Master geography. Dominate the leaderboard.\nConquer the world without limits.',
      joinExplorers: 'Join 1,200 Premium Explorers',
      hookHighlight: 'Conqueror-tier explorers own 3× more territory',
      hookSuffix: 'and climb the leaderboard 5× faster than free players.',
      sectionEverything: 'Everything in Conqueror',
      sectionFreeVsPro: 'Free vs Conqueror',
      featureHeader: 'Feature',
      freeHeader: 'Free',
      sectionChoosePlan: 'Choose Your Plan',
      once: 'once',
      lifetimeBreakdown: 'One-time payment · Lifetime access',
      monthlyPer: '/mo',
      cancelAnytime: 'Cancel anytime',
      securePayment: 'Processed securely via App Store / Google Play',
      trustSecure: 'Secure Payment',
      trustLifetime: 'Lifetime Access',
      trustInstant: 'Instant Access',
      sectionTestimonials: 'What Conquerors Say',
      ratingLabel: '4.9 / 5 from 2,000+ commanders',
      urgencyBanner: 'Monthly plan — first month 50% off — expires in ',
      mostPopular: 'MOST POPULAR',
      flagOnly: 'Flag only',
      allQuizzes: 'All quizzes',
      feature1Title: 'Daily Triple Rewards',
      feature1Desc: 'Earn 3× gold and 3× tickets from daily login rewards.',
      feature2Title: '2× Quiz Rewards',
      feature2Desc: 'Double gold and XP from every quiz you complete.',
      feature3Title: 'Play Offline',
      feature3Desc: 'Capitals, Borders & Shape quizzes work with no internet connection.',
      feature4Title: 'Unique Avatars',
      feature4Desc: 'Exclusive Conqueror avatars not available anywhere else.',
      feature5Title: 'Unique Quests',
      feature5Desc: 'Access to exclusive quest content and rewards only for Conquerors.',
      feature6Title: 'Conqueror Badge',
      feature6Desc: 'Exclusive crown badge displayed on the global leaderboard.',
      compare1: 'Daily Login Gold Multiplier',
      compare2: 'Daily Login Ticket Multiplier',
      compare3: 'Leaderboard Badge',
      compare4: 'Unique Avatars',
      compare5: 'Unique Quests',
      compare6: 'Quiz Gold & XP',
      compare7: 'Early Feature Access',
      compare8: 'Play Offline',
      faq1q: 'How does the Lifetime plan work?',
      faq1a: "It's a one-time payment — no subscription, no renewals. You get permanent Conqueror access plus 10 tickets and 3 Mythic Chests credited instantly.",
      faq2q: 'Can I cancel my Monthly plan?',
      faq2a: 'Yes. Cancel with one tap from your App Store / Google Play subscription settings at any time. You keep Conqueror access until the end of your billing period.',
      faq3q: 'Do I keep my items if I cancel?',
      faq3a: "Yes! Every country, avatar, and flag you've purchased remains yours permanently, regardless of subscription status.",
      faq4q: 'What payment methods are accepted?',
      faq4a: 'All payments are processed securely via the App Store or Google Play Billing — no direct card details are ever stored by us.',
      lifetime: 'Lifetime',
      monthly: 'Monthly',
      bestDeal: 'BEST DEAL',
      getLifetime: 'Get Lifetime Access',
      getMonthly: 'Start Monthly',
      restore: 'Restore Purchase',
      restoring: 'Restoring…',
      terms: 'Terms',
      privacy: 'Privacy',
      faq: 'FAQ',
      welcomeTitle: 'Welcome, Conqueror!',
      welcomeBody: "You now have unlimited access. Let's go!",
      failedTitle: 'Purchase Failed',
      failedBody: 'Something went wrong. Please try again.',
      restoredTitle: 'Restored!',
      restoredBody: 'Your purchase has been restored.',
      nothingTitle: 'Nothing to Restore',
      nothingBody: 'No previous purchase found.',
      ok: 'OK',
    },
    leaderboard: {
      title: 'Leaderboard',
      mostXP: 'Most XP Earned',
      mostQuizzes: 'Most Quizzes Done',
      mostGold: 'Most Gold Earned',
      mostCorrect: 'Most Correct Answers',
      highestAccuracy: 'Highest Accuracy',
      loading: 'Loading…',
      error: 'Error',
      rank: '#%{n}',
      daily: 'Daily',
      weekly: 'Weekly',
      allTime: 'All-Time',
      searchPlayers: 'Search players…',
      explorers: '%{n} explorers',
      competingToday: '%{n} competing today',
      competingThisWeek: '%{n} competing this week',
      thisWeeksChallenge: "This week's Challenge:",
      weeklyChallengeRewards: 'Weekly Challenge Rewards',
      resetsIn: 'resets in',
      updatesIn: 'updates in',
      todaysChallenge: "Today's Challenge:",
      rewards: 'Rewards',
      noPlayersFound: 'No players found for "%{query}"',
      noExplorers: 'No explorers yet. Be the first!',
      levelShort: 'Lv %{n}',
      you: ' (You)',
      awesome: 'Awesome!',
      dailyChallengeRewards: 'Daily Challenge Rewards',
      explorerProfile: 'Explorer Profile',
      loadingProfile: 'Loading profile…',
      memberSince: 'Member since %{date}',
      worldDomination: 'World Domination',
      conquestLabel: "%{pct}% of Earth's land · %{area}M km²",
      empireMap: 'Empire Map',
      questsCount: 'Quests (%{claimed} / %{total})',
      inventory: 'Inventory',
      avatarsCount: 'Avatars (%{n})',
      flagsCount: 'Flags (%{n})',
      tapToClose: 'Tap anywhere to close',
      paidOut: "Paid out when the countdown reaches zero · Top 3 by today's challenge",
      metricXP: 'XP',
      metricQuizzes: 'Quizzes',
      metricGold: 'Gold',
      metricCorrect: 'Correct',
      metricAccuracy: 'Accuracy',
      catXP: 'XP',
      catLand: 'Land',
      catQuizzes: 'Quizzes',
      catAvatars: 'Avatars',
      toppedYesterday: "You topped yesterday's leaderboard!",
      finishedYesterday: 'You finished #%{rank} on yesterday\'s leaderboard!',
      rankPlace: '#%{rank} Place!',
    },
    mythicChest: {
      header: 'MYTHIC CHEST',
      eyebrow: 'THE HIGHEST TIER OF TREASURE',
      title: 'A reward worthy of legends',
      subtitle: 'Every opening grants Mythic Dust. Ten Dust lets you choose any reward.',
      rewardUnlocked: 'MYTHIC REWARD UNLOCKED',
      rewardAppliedXp: 'Applied instantly · no level-up gold bonus',
      rewardPotionStored: '+200% for 10 quizzes · stored in your Potions',
      rewardAdded: 'Added to your account instantly',
      dustAward: '+1 Mythic Dust',
      chestsAvailable: 'CHESTS AVAILABLE',
      monthlyOpened: 'Monthly Conqueror chests opened',
      dust: 'MYTHIC DUST',
      opening: 'OPENING…',
      rewardClaimed: 'REWARD CLAIMED',
      openAnother: 'Open another', openChest: 'OPEN MYTHIC CHEST',
      noChests: 'NO CHESTS AVAILABLE',
      openGuaranteed: '✦ OPEN GUARANTEED CHOICE',
      hideRates: 'HIDE DROP RATES',
      viewRates: 'VIEW DROP RATES',
      dropRatesTitle: 'MYTHIC DROP RATES',
      dustGuaranteed: '+1 Mythic Dust is guaranteed with every chest',
      devPreview: 'Developer chest preview · no rewards granted',
      hidePreview: 'Hide developer preview',
      previewRewards: 'Preview rewards',
      chooseReward: 'Choose any Mythic reward',
      consumeDust: '10 Mythic Dust will be consumed.',
      uniqueAvatars: 'UNIQUE AVATARS',
      errors: {
        open: 'Could not open the Mythic Chest. Please try again.',
        choice: 'Could not choose the Mythic reward. Please try again.',
      },
      accessibility: { rewardReceived: '%{reward} received.' },
      rewards: {
        gold: '%{amount} Gold',
        xp: '%{amount} XP',
        xpPotion: 'Mythic XP Potion',
        goldPotion: 'Mythic Gold Potion',
        avatar: 'Mythic Avatar',
      },
      dropRates: {
        gold_25000: '25,000 Gold',
        gold_75000: '75,000 Gold',
        gold_150000: '150,000 Gold',
        xp: '20,000 XP',
        xp_potion: 'Mythic XP Potion · 10 quizzes',
        gold_potion: 'Mythic Gold Potion · 10 quizzes',
        avatar: 'Unique Mythic Avatar',
      },
      avatars: {
        png_worldbreaker_empress: 'Worldbreaker Empress',
        png_storm_navigator: 'Storm Navigator',
        png_mapless_heroine: 'Mapless Heroine',
        png_mapless_hero: 'Mapless Hero',
        png_longitude_ronin: 'Longitude Ronin',
        png_meridian_oracle: 'Meridian Oracle',
        png_border_phantom: 'Border Phantom',
        png_cosmic_pigeon: 'Cosmic Pigeon',
        png_globe_eater: 'Globe Eater',
        png_conquest_frog: 'Conquest Frog',
      },
    },
    worldMap: {
      title: 'World Map',
      subtitle: '%{n} countries to conquer',
      loading: 'Loading countries…',
      purchaseTitle: 'Purchase %{country}?',
      purchaseBody: 'Conquer %{country} for %{cost} gold?',
      confirm: 'Confirm',
      cancel: 'Cancel',
      success: '%{country} conquered!',
      successTitle: 'Conquered!',
      notEnoughGold: 'Not enough gold',
      notEnoughGoldBody: 'You need %{cost} gold to purchase %{country}.',
      alreadyOwned: 'You already own this country!',
      error: 'Error',
    },
    quizMenu: {
      howItWorks: 'How It Works',
      mapsLeft: '%{n} maps left',
      trailLocked: 'Trail Quiz Locked',
      trailLockedBody: 'Complete more quizzes to unlock Trail Quiz.',
      gauntletLocked: 'Gauntlet Locked',
      gauntletLockedBody: 'Reach a higher level to unlock The Gauntlet.',
      acquireTickets: 'Acquire Millionaire Tickets',
      acquireTicketsBody: 'Win tickets by completing quests.',
      tickets: '%{n} tickets',
      goldSuffix: 'gold',
      quizLocked: 'Quiz Locked',
      unlockCapitals: 'Unlock the Capitals Quiz in the Shop.',
      unlockBorders: 'Unlock the Borders Quiz in the Shop.',
      displayInShop: 'Display in Shop',
      gotIt: 'Got it',
      noTicketsBody: 'You need at least 1 ticket to play the Millionaire Quiz.\n\nEarn tickets from daily rewards or buy them in Shop → Items.',
      watch: 'Watch',
      nextMap: 'Next map in %{min}m',
      mapsRemaining: '%{n} / %{max} maps remaining. 1 per quiz.',
      endgame: 'ENDGAME',
      acquireTicketsModalTitle: 'Acquire Millionaire Tickets',
      oneTicketLabel: '1 Ticket',
      fiveTicketsLabel: '5 Tickets',
      adTicketLabel: '1 Ad = 1 Ticket',
      watchBtn: 'Watch',
      cancelBtn: 'Cancel',
      perCorrect: 'per correct',
      byAccuracy: 'by accuracy',
      maxPrize: 'max prize',
      repeatReward: 'repeat reward',
      oneTimeReward: 'one-time reward',
    },
    common: {
      error: 'Error',
      cancel: 'Cancel',
      ok: 'OK',
      loading: 'Loading…',
      retry: 'Retry',
    },
    dailyChest: {
      hubTitle: 'Daily chest',
      tapToRetry: 'Tap to retry',
      loading: 'Loading…',
      readyToOpen: 'Ready to open',
      claimedToday: 'Claimed today',
      potions: 'Potions',
      active: 'ACTIVE',
      eyebrow: 'DAILY TREASURE',
      yoursToKeep: 'Yours to keep.',
      revealedSubtitle: 'One chest. One new reward.',
      previewSubtitle: 'Preview mode · no rewards are granted.',
      availableSubtitle: "A little treasure for today's adventure.",
      nextSubtitle: 'Your next treasure arrives at 00:00 UTC.',
      nextChestTomorrow: 'New %{tier} chest tomorrow',
      chestUpgraded: 'CHEST UPGRADED',
      maxTier: 'Maximum chest tier reached',
      daysToUpgrade: '%{n} more %{day} to %{tier}',
      rules: 'Miss a day: drop one tier. Daily reset: 00:00 UTC.',
      letsPlay: "Let's play",
      opening: 'Opening…',
      openChest: 'Open chest',
      comeBackTomorrow: 'Come back tomorrow',
      retry: 'Retry',
      viewOdds: 'Rewards & drop rates',
      hideOdds: 'Hide rewards & drop rates',
      oneRewardPerChest: 'Exactly one reward per chest',
      randomAvatar: 'Random avatar',
      goldAmount: '%{n} gold',
      ticketsAmount: '%{n} tickets',
      potionWithDuration: '1 %{name} · %{n} quizzes',
      conquerorNote: 'Conqueror ×3 is included in gold and ticket amounts.',
      potionNote: 'Potions add 50% of base quiz earnings. Activate them from Potions when ready.',
      avatarCollectionTitle: 'Avatar collection · %{n} left',
      avatarUnlockNote: 'Unowned avatars from this tier and lower tiers have equal chances within the avatar drop. When all are owned, receive %{n} gold instead.',
      yourPotions: 'YOUR POTIONS',
      pickYourBoost: 'Pick your boost.',
      potionStackNote: 'Activate a potion before a quiz. Each completed quiz uses one charge.',
      emptyPotions: 'No potions yet.',
      use: 'Use',
      activateLabel: 'Active',
      potionActiveStatus: '%{name} active · +%{boost}% · %{n} quizzes left',
      rewardPotion: '+%{boost}% for %{n} completed quizzes. Saved to Potions.',
      rewardAvatar: 'Unlocked! Equip it in Shop → Owned.',
      rewardDuplicate: 'Avatar collection complete — gold awarded instead.',
      rewardBalance: 'Added to your balance.',
      chestLabel: '%{tier} Chest',
      previewChest: 'Preview chest',
      quizCount: '%{n} quizzes',
      tiers: {
        Wooden: 'Wooden',
        Bronze: 'Bronze',
        Silver: 'Silver',
        Gold: 'Gold',
        Royal: 'Royal',
        Legendary: 'Legendary',
      },
      rewardNames: {
        gold: 'Gold',
        tickets: 'Tickets',
        xp_potion: 'XP potion',
        gold_potion: 'Gold potion',
        avatar: 'New avatar',
      },
    },
    questData: {
      level_10: { title: 'First Ascension', desc: 'Reach Level 10.' },
      level_25: { title: 'Seasoned Explorer', desc: 'Reach Level 25.' },
      level_30: { title: 'Veteran Tactician', desc: 'Reach Level 30.' },
      level_50: { title: 'Elite Conqueror', desc: 'Reach Level 50.' },
      level_80: { title: 'Legendary Commander', desc: 'Reach Level 80.' },
      level_100: { title: 'God of Geography', desc: 'Reach Level 100.' },
      first_blood: { title: 'First Conquest', desc: 'Claim your very first country on the map.' },
      empire_5: { title: 'Growing Empire', desc: 'Claim 5 different countries.' },
      empire_10: { title: 'Imperial Ambitions', desc: 'Claim 10 different countries.' },
      empire_25: { title: 'World Power', desc: 'Claim 25 different countries.' },
      empire_50: { title: 'Global Hegemon', desc: 'Claim 50 different countries.' },
      streak_20: { title: 'GeoConquest Addict', desc: 'Log in for 20 days in a row.' },
      area_1m: { title: 'Vast Territories', desc: 'Control over 1M sq km.' },
      area_10m: { title: 'Continental Span', desc: 'Control over 10M sq km.' },
      area_100m: { title: 'Master of Earth', desc: 'Control over 100M sq km.' },
      conquer_africa: { title: 'Sovereign of Africa', desc: 'Own every country on the African continent.' },
      conquer_europe: { title: 'Emperor of Europe', desc: 'Own every country in Europe.' },
      conquer_asia: { title: 'Sultan of Asia', desc: 'Own every country in Asia.' },
      conquer_oceania: { title: 'Pacific Overlord', desc: 'Own every country in Oceania.' },
      conquer_americas: { title: 'Commander of the Americas', desc: 'Own every country in the Americas.' },
      flag_mastery_30s: { title: 'Speed Detective', desc: 'Finish the Flag Quiz with >90% accuracy in under 30s.' },
      ground_invasion: { title: 'Ground Invasion', desc: 'Finish the Capitals Quiz with >90% accuracy in under 30s.' },
      quiz_10: { title: 'Quiz Rookie', desc: 'Complete 10 quizzes of any type.' },
      quiz_50: { title: 'Quiz Veteran', desc: 'Complete 50 quizzes of any type.' },
      excellence_20: { title: 'Scholar of the World', desc: 'Score 85% or higher in 20 different quizzes.' },
      trail_blazer_50: { title: 'Trail Blazer', desc: 'Answer 30 questions correctly in a single Trail Quiz run.' },
      gauntlet_ascendant: { title: 'Ascendant', desc: 'Reach level 100 in the Gauntlet.' },
      perfect_accuracy_15: { title: 'Precision', desc: 'Achieve 100% accuracy in 15 different quizzes.' },
      game_master: { title: 'Game Master', desc: 'Complete a Millionaire Quiz perfectly without using 50/50, Audience, or Swap.' },
      daily_champion_5: { title: 'Champion of the Day', desc: 'Finish in 1st place in the daily challenge 5 times.' },
      avatar_collector_10: { title: 'Avatar Hunter', desc: 'Collect 10 different avatars.' },
      max_tier_avatar: { title: 'Pinnacle Collector', desc: 'Obtain the highest tier avatar in any collection.' },
      complete_the_world: { title: 'World Domination', desc: 'Own all 250 countries in the world.' },
      nightmare_complete: { title: 'Nightmare Survived', desc: 'Well played, conqueror of the underworld.' },
      true_conqueror: { title: 'There is only one.', desc: 'Wield the Divine High King, Divine High Queen, and Beast Mark.' },
      never_enough: { title: 'Never Enough', desc: 'Wield the Divine High King and the Cosmic Armor.' },
      level_150: { title: 'Ascended Mind', desc: 'Reach Level 150.' },
      level_200: { title: 'Myth of the Atlas', desc: 'Reach Level 200.' },
      level_250: { title: 'Eternal Sovereign', desc: 'Reach Level 250.' },
      level_300: { title: 'Beyond the Veil', desc: 'Reach Level 300.' },
    },
  },

  es: {
    quizzes: { title: 'Cuestionarios' },
    quiz: {
      millionaire: 'Cuestionario Millonario',
      flag: 'Banderas',
      shape: 'Formas',
      capitals: 'Capitales',
      borders: 'Fronteras',
      trail: 'Ruta',
      draw: 'Creador de Mapas',
      gauntlet: 'El Desafío',
      nightmare: 'La Pesadilla',
    },
    menu: { language: 'Idioma', signOut: 'Cerrar Sesión', deleteAccount: 'Eliminar Cuenta' },
    tabs: { home: 'Inicio', quizzes: 'Cuestionarios', shop: 'Tienda', leaderboard: 'Clasificación', quests: 'Misiones' },
    nav: {
      flagQuiz: 'Cuestionario de Banderas',
      shapeQuiz: 'Cuestionario de Formas',
      bordersQuiz: 'Cuestionario de Fronteras',
      capitalsQuiz: 'Cuestionario de Capitales',
      trailQuiz: 'Cuestionario de Ruta',
      millionaireQuiz: 'Cuestionario Millonario',
      nightmareMode: 'Modo Pesadilla',
      drawBorder: 'Dibuja la Frontera',
      results: 'Resultados',
      setPassword: 'Establecer Nueva Contraseña',
      setPasswordMsg: 'Ingresa una nueva contraseña para tu cuenta.',
      newPassword: 'Nueva contraseña',
      confirmPassword: 'Confirmar nueva contraseña',
      saving: 'Guardando…',
      savePassword: 'Guardar Contraseña',
      passwordMismatch: 'Las contraseñas deben coincidir y no pueden estar vacías.',
      passwordShort: 'La contraseña debe tener al menos 6 caracteres.',
      passwordSuccess: '¡Tu contraseña ha sido actualizada!',
      passwordFailed: 'Error al actualizar la contraseña.',
    },
    difficulty: { title: 'Dificultad', easy: 'Fácil', medium: 'Media', hard: 'Difícil' },
    quizCommon: {
      paused: 'PAUSADO',
      resume: 'CONTINUAR',
      quit: 'Salir',
      letsGo: '¡VAMOS!',
      goBack: 'Volver',
      tapToContinue: 'Toca en cualquier lugar para continuar →',
      noQuestions: 'No hay preguntas disponibles',
      offline: { title: 'Sin conexión', body: "Actualiza al Pase del Conquistador para jugar sin conexión.", upgrade: 'Actualizar' },
      learn: 'Aprender',
    },
    infoModal: { capital: 'Capital', region: 'Región', population: 'Población', area: 'Área', neighbors: 'Vecinos', islandNation: '🏝️ Nación insular', gotIt: '¡Entendido!', na: 'N/D' },
    flagQuiz: { subtitle: 'Identifica países por sus banderas.', loading: 'Preparando banderas…', whichFlagOf: '¿Qué bandera pertenece a %{country}?', whichCountry: '¿A qué país pertenece esta bandera?' },
    shapeQuiz: { subtitle: 'Identifica países por su forma.', loading: 'Preparando formas…', whichCountry: '¿Qué país tiene esta forma?', whichShapeOf: '¿Qué forma pertenece a %{country}?' },
    bordersQuiz: { subtitle: 'Identifica países que comparten frontera.', loading: 'Preparando fronteras…', doesBorder: '¿%{a} tiene frontera con %{b}?', doesNotBorder: '¿Qué país no tiene frontera con %{country}?', sharesBorder: '¿Qué país comparte frontera con %{country}?', yes: 'Sí', no: 'No' },
    capitalsQuiz: { subtitle: 'Relaciona países con sus capitales.', loading: 'Preparando capitales…', capitalOf: '¿Cuál es la capital de %{country}?', countryOf: '¿En qué país %{capital} es la capital?' },
    trailQuiz: { subtitle: 'Navega por países vecinos.', loading: 'Preparando ruta…', question: '¿Qué país sigue en la ruta?', whatCountry: '¿Qué país es este?', whatCapital: '¿Cuál es la capital de este país?', whatFlag: '¿Cuál es la bandera de este país?' },
    millionaireQuiz: { loading: 'Preparando preguntas…', lifeline50: '50/50', lifelineSkip: 'Cambiar', lifelineAudience: 'Público', walkTitle: '¡Estás en racha!', walkBody: '¿Retirarte con %{amount} de oro?', walk: 'Retirarme', keepGoing: 'Seguir', winTitle: '¡JACKPOT!', winBody: '¡Ganaste %{amount} de oro!', secondChanceTitle: '¿Segunda oportunidad?', secondChanceBody: '¿Usar un boleto para otro intento?', useTicket: 'Usar boleto', noThanks: 'No, gracias', pushForward: '¡Adelante!', takeGold: 'Tomar mis %{amount} de oro', readySubtitle: '15 preguntas por el jackpot, asegúrate de estar listo', loadingChallenge: 'Preparando tu desafío…', prizeNow: 'Ahora', prizeNext: 'Siguiente', claimGold: 'Reclamar Oro', conquerBody: '¡Conquistaste las 15 preguntas!', walkNoXp: "Retirarte termina la partida sin XP. Solo se gana XP con un 15/15 perfecto.", checkpointBody: 'Estás muy cerca del siguiente nivel. Una respuesta más podría cambiarlo todo.', secondChanceWatchBody: 'Mira un anuncio para reemplazar esta pregunta y seguir.', watchAd: 'Ver anuncio', loadingAd: 'Cargando anuncio…', powerUpLocked: 'Mejora Bloqueada', powerUpLockedBody: 'Esta mejora debe comprarse en la tienda de Mejoras.' },
    nightmareQuiz: { penaltyRoll: 'TIRA POR TU CASTIGO', penaltyTaken: 'Se lleva el %{pct}% de tu oro.', loading: 'Preparando pesadilla…', curseDrawn: 'MALDICIÓN ACTIVADA', blind: 'CIEGO', blindDesc: 'La pregunta está oculta tras una neblina que se disipa poco a poco.', shuffle: 'MEZCLA', shuffleDesc: 'Las opciones se mezclan cada 3 segundos.', rush: 'PRISA', rushDesc: 'El tiempo se reduce a la mitad.', phantom: 'FANTASMA', phantomDesc: 'Una respuesta correcta está oculta.', winTitle: 'La marca de la bestia es tuya', winBody: 'Conquistaste la pesadilla.', readySubtitle: 'Tú contra el Señor Oscuro', loadingChallenge: 'Despertando la Pesadilla…', blindReveal: 'A través de la neblina...', shuffleReveal: 'Cuidado donde haces clic.', rushReveal: '5 segundos. El reloj empieza ya.', phantomReveal: 'Confía en el Fantasma.', winKing: 'Eres el nuevo rey del inframundo', takeOwed: 'Toma Lo Que Se Te Debe' },
    gauntlet: { inARow: 'ACIERTOS SEGUIDOS', welcomeTo: 'BIENVENIDO A', round: 'Ronda %{n}', bossRound: 'RONDA JEFE  x2', shieldAbsorbed: 'ESCUDO ABSORBIDO', shieldAcquired: 'ESCUDO ADQUIRIDO', whichFlag: '¿Qué país tiene esta bandera?', whichCapital: '¿Cuál es la capital de %{country}?', whichCountryCapital: '¿Qué país tiene esta capital?', sharesBorder: '¿Qué país comparte frontera con %{country}?', whichShape: '¿Qué país tiene esta forma?', t2FlagCapital: '¿Qué capital pertenece a esta bandera?', t2FlagBorder: '¿Qué país bordea el país de esta bandera?', t2FlagShape: '¿Qué forma pertenece a esta bandera?', t2ShapeCapital: '¿Qué capital pertenece a esta forma?', t2ShapeBorder: '¿Qué país bordea el país de esta forma?', t2ShapeFlag: '¿Qué bandera pertenece a esta forma?', t2CapitalFlag: '¿Qué bandera pertenece a esta capital?', t2CapitalShape: '¿Qué forma pertenece a esta capital?', t2CapitalBorder: '¿Qué país bordea el país de esta capital?', tiers: { eternity: 'ETERNIDAD', oblivion: 'OLVIDO', inferno: 'INFIERNO', hell: 'INFIERNO', void: 'VACÍO', abyss: 'ABISMO', peril: 'PELIGRO', danger: 'PELIGRO' }, loading: 'Entrando al Desafío...', title: 'EL DESAFÍO', finalPhase: 'FASE FINAL', nextPhase: 'PRÓXIMA FASE %{progress}/%{step}', correctLeft: '%{n} más para avanzar', readySubtitle: 'Tu aventura apenas comienza', keepGoing: 'SIGUE', tierDescPeril: 'El calor sube...', tierDescAbyss: 'Lo desconocido profundo...', tierDescVoid: 'Conquista sin fin', tierDescHell: 'Infierno - RENACIDO', tierDescInferno: 'Subyugación', tierDescOblivion: 'No queda nada', tierDescEternity: 'Más allá', milestone5: 'EMPEZANDO', milestone10: 'DOBLE DÍGITO', milestone15: 'CONCENTRADO', milestone20: 'AL ABISMO', milestone25: 'CUARTO DE SIGLO', milestone30: 'EL VACÍO SE ABRE', milestone40: 'BIENVENIDO AL INFIERNO', milestone50: 'A MITAD DEL CAMINO', milestone60: 'SIN RETORNO', milestone70: 'OLVIDO ALCANZADO', milestone75: 'LEGENDARIO', milestone100: 'IMPARABLE' },
    drawQuiz: { submit: 'Enviar', nextRound: 'Siguiente Ronda', done: 'Listo', round: 'Ronda %{current} / %{total}', drawBorderBetween: 'Dibuja la frontera entre %{a} y %{b}', loading: 'Construyendo pares de fronteras…', error: 'No se pudo crear suficientes pares. Inténtalo más tarde.', title: 'CREADOR DE MAPAS', subtitle: 'Dibuja las fronteras del mundo con la mayor precisión posible', borderParts: 'Esta frontera tiene %{n} partes: dibuja cada una', drawPrompt: 'Dibuja la frontera entre ellos:', revealPrompt: 'Aquí está la frontera real:', actualBorder: 'Frontera real', yourStroke: 'Tu trazo', clear: 'Borrar', seeResults: 'Ver Resultados', next: 'Siguiente →', ratingPerfect: '¡Perfecto!', ratingGreat: '¡Genial!', ratingGood: 'Bien', ratingClose: 'Cerca', ratingMiss: 'Fallado', rating: { gold: 'ORO', silver: 'PLATA', bronze: 'BRONCE', miss: 'FALLO' } },
    results: { score: 'Puntuación', totalTime: 'Tiempo Total', xpEarned: 'XP Ganado', boost: 'Impulso', x2Applied: 'x2 Aplicado', level: 'Nivel %{n}', levelUpBonus: 'Bono de Nivel +%{bonus}', gold: 'Oro', balance: 'Saldo', penalty: 'PENALIZACIÓN', reward: 'RECOMPENSA', playAgain: 'Jugar de Nuevo', backToQuizzes: 'Volver a Cuestionarios', shareResult: 'Compartir Resultado', shareText: 'Esta es mi puntuación en %{quiz}... ¡Descarga Geo Conquest!', shareHeadline: "Esta es mi puntuación en el cuestionario,\n¿crees que puedes hacerlo mejor?", shareDownload: 'Descarga Geo Conquest', levelUpTitle: 'Subiste de Nivel — Nivel %{n} (+%{bonus})', remarks: { wellPlayed: '¡Bien jugado!', almostThere: '¡Casi!', pumpNumbers: 'Hay que mejorar esos números', solidEffort: 'Buen esfuerzo', oof: 'Uf...', wellPlayedGauntlet: 'Bien jugado..', payUp: 'Paga y sal', flawless: '¡Victoria Perfecta!', notGoodEnough: 'No es suficiente', wastedTicket: 'No puede ser que hayas gastado un boleto para esto...' } },
    maps: { outOfMaps: '¡Sin mapas!', readyToConquer: '¡Listo para conquistar!', refillRate: 'Los mapas se recargan 1 cada 60 minutos.', becomeConqueror: 'Conviértete en Conquistador', unlimitedMaps: 'Mapas ilimitados — nunca esperes', watchAd: 'Ver un anuncio', comeBackTomorrow: 'Vuelve mañana', getMap: 'Obtener 1 mapa · %{left} restantes hoy', wait: 'Esperar', noTickets: 'Sin Boletos', playAgainPrompt: '¿Jugar de nuevo?' },
    achievements: { title: 'Misiones', progress: '%{claimed} / %{total} Reclamadas', conquerorPass: "Pase del Conquistador — Desbloquea Todo", locked: '???', claim: 'Reclamar', rewards: 'Recompensas', error: 'Error' },
    home: { empire: 'Tu Imperio', worldProgress: 'Progreso de Dominación Mundial', countries: 'Países ▸', invite: 'Invita a un amigo — Ambos reciben 1.500 de oro', dailyReward: 'Recompensa Diaria', claim: 'Reclamar', streak: '%{n} días seguidos', deleteAccount: 'Eliminar cuenta', deleteBody: 'Esto eliminará permanentemente tu cuenta y todos tus datos. No se puede deshacer.', deleteForever: 'Eliminar para siempre', earthArea: '%{pct}% del área terrestre de la Tierra', questsDone: 'Misiones completadas', avatarsOwned: 'Avatares poseídos', quizzesDone: 'Cuestionarios hechos', topExplorers: 'Mejores exploradores', loadingRankings: 'Cargando clasificaciones...', you: ' (Tú)', level: 'Nivel %{n}', becomeConqueror: 'Conviértete en Conquistador', manageSubscription: 'Gestionar suscripción', closeGoldShop: '✕ Cerrar', ownedCountries: 'Países poseídos (%{n})', noCountries: 'Aún no tienes países. ¡Gana oro y visita la tienda!', welcomeTitle: '¡Bienvenido, Explorador!', welcomeSubtitle: 'Es hora de construir tu imperio.', welcomeStep1: 'Gana oro haciendo cuestionarios. Cuanto mejor puntúes, más ganas.', welcomeStep2: 'Gasta oro en la tienda para comprar países, avatares y mejoras.', welcomeStep3: 'Completa misiones para desbloquear recompensas exclusivas y avatares raros.', welcomeStep4: 'Compite en desafíos diarios contra exploradores de todo el mundo.', letsConquer: '¡A conquistar!', updateTitle: '¡v%{version} está disponible!', updateBody: 'Estás en v%{current}. Actualiza para obtener las últimas funciones y correcciones.', updateNow: 'Actualizar ahora', later: 'Más tarde' },
    login: { tagline: 'Conquista el mundo, un cuestionario a la vez', email: 'Correo', password: 'Contraseña', signIn: 'Iniciar Sesión', forgotPassword: '¿Olvidaste tu contraseña?', noAccount: '¿No tienes cuenta? Regístrate', signingIn: 'Iniciando sesión…', resetSent: '¡Correo de restablecimiento enviado!', error: 'Error', or: 'o', continueWithGoogle: 'Continuar con Google', connecting: 'Conectando…', forgotPasswordTitle: 'Restablecer Contraseña', forgotPasswordBody: 'Ingresa tu correo y te enviaremos un enlace de restablecimiento.', emailSentTitle: 'Correo Enviado', emailSentBody: 'Revisa tu bandeja de entrada para el enlace de restablecimiento.', done: 'Listo', sending: 'Enviando…', sendResetLink: 'Enviar Enlace', cancel: 'Cancelar', fillFields: 'Por favor completa todos los campos', enterEmail: 'Por favor ingresa tu correo.', signInFailed: 'Error al Iniciar Sesión', googleFailed: 'Error con Google', appleFailed: 'Error con Apple' },
    signup: { title: 'Empieza tu conquista', email: 'Correo', password: 'Contraseña', signUp: 'Registrarse', haveAccount: '¿Ya tienes cuenta? Inicia sesión', signingUp: 'Creando cuenta…', error: 'Error', or: 'o', continueWithGoogle: 'Continuar con Google', connecting: 'Conectando…', passwordMin: 'Contraseña (mín 6 caracteres)', fillFields: 'Por favor completa todos los campos', passwordTooShort: 'La contraseña debe tener al menos 6 caracteres', googleFailed: 'Error con Google', appleFailed: 'Error con Apple' },
    onboarding: { chooseName: 'Elige Tu Nombre', chooseAvatar: 'Elige Tu Avatar', chooseFlag: 'Elige Tu Bandera', referral: '¿Tienes un código de referido?', usernamePlaceholder: 'Nombre de usuario', referralPlaceholder: 'Código de referido (opcional)', next: 'Siguiente →', finish: '¡Empieza a Conquistar!', usernameTaken: 'Este nombre de usuario ya está en uso', usernameShort: 'El nombre debe tener al menos 3 caracteres', referralAccepted: '¡Referido aceptado! Ambos reciben 1.500 de oro', referralInvalid: 'Código de referido inválido', error: 'Error', usernameSubtitle: 'Elige un nombre de usuario único para la clasificación', enterUsername: 'Ingresa tu nombre de usuario', usernameHint: '3–20 caracteres, letras, números, guiones bajos', checking: 'Verificando…', avatarSubtitle: 'Te representará en el juego', avatarHint: '¿No te convence? Desbloquea 50+ personajes en la Tienda de Avatares.', back: '← Atrás', flagSubtitle: 'Elige la bandera de tu país para mostrar junto a tu avatar', searchCountry: 'Buscar país…', referralSubtitle: 'Si un amigo te invitó a la conquista, ingresa su nombre de usuario abajo.', verify: 'Verificar', creating: 'Creando…', imReady: 'Estoy listo', ownUsername: 'No puedes usar tu propio nombre como código de referido.', referralNotFound: 'Código no encontrado. Por favor verifica e intenta de nuevo.' },
    shop: { countries: 'Países', avatars: 'Avatares', flags: 'Banderas', upgrades: 'Mejoras', buy: 'Comprar', owned: 'Adquirido', equipped: 'Equipado', equip: 'Equipar', notEnoughGold: 'Oro insuficiente', purchaseSuccess: '¡Compra exitosa!', error: 'Error', conquererPass: 'Pase del Conquistador — Desbloquea Todo', needMoreGold: '¿Necesitas más Oro?', buyGold: 'Comprar Oro →', bulkBuy: 'Compra Masiva', bulkBuyDesc: 'Conquista %{count} países por %{cost} de oro', goldRemaining: '%{n} de oro restante', buyAll: 'Comprar Todo', loadingCountries: 'Cargando países…', searchCountries: 'Buscar países…', ownedCheck: 'Adquirido ✓', ownedMinus: '- Adquirido', locked: 'Bloqueado', conquered: '¡Conquistado!', countriesAdded: '%{n} países añadidos a tu imperio.', avatarUnlockedTitle: '¡Avatar Desbloqueado!', flagUnlockedTitle: '¡Bandera Desbloqueada!', switchToOwned: 'Ve a la pestaña Adquirido para equiparlo.', avatarEquippedTitle: '¡Avatar Equipado!', avatarEquippedBody: 'Tu avatar es visible para todos en la clasificación.', mustOwnFirst: 'Debes tener %{name} primero.', easterEggTitle: '🎉 ¡Huevo de Pascua Encontrado!', easterEggBody: '¡Buen trabajo! Aquí tienes 5 tickets gratis.', ticketPackAddedTitle: 'Pack de Tickets Añadido', ticketsAddedBody: '5 tickets añadidos a tu inventario.', ticketAddedTitle: 'Ticket Añadido', ticketAddedBody: 'Añadido a tu inventario.', thanksForWatchingTitle: '¡Gracias por Ver!', ticketWatchBody: '1 ticket añadido a tu inventario.', upgradesSubtitle: 'Amplía tus expediciones para ganar multiplicadores de racha masivos.', capitalsQuizUpgrade: 'Cuestionario de Capitales', bordersQuizUpgrade: 'Cuestionario de Fronteras', standardExpedition: 'Expedición estándar (10)', level2Expedition: 'Expedición Nivel 2', level2Desc: 'Juega hasta 20 turnos por cuestionario', level3Expedition: 'Expedición Nivel 3', level3Desc: 'Juega hasta 30 turnos por cuestionario', millionaireSwap: 'Cambio Millonario', millionaireSwapDesc: 'Cambia una pregunta en el Cuestionario Millonario', darkScroll: 'Pergamino Oscuro', darkScrollDesc: 'Desbloquea el Cuestionario Pesadilla', infiniteMaps: 'Mapas Infinitos', infiniteMapsDesc: 'Nunca esperes mapas de nuevo', speedDetectiveQuest: 'Entrega la misión Detective Veloz', groundInvasionQuest: 'Entrega la misión Invasión Terrestre', acquireTickets: 'conseguir tickets millonario', millionaireTicket: 'Ticket Millonario', oneTicket: '1 ticket', ticketPack: 'Pack de Tickets', ticketsCount: '5 tickets millonario', watchAnAd: 'Ver un anuncio', oneAdTicket: '1 ticket por 1 anuncio', bulkBuyTitle: 'Compra Masiva', purchaseFailed: 'Compra Fallida', purchaseFailedBody: 'Algo salió mal.', conqueredTitle: '¡Conquistado!', previousTier: 'Nivel Anterior', featuredToday: 'DESTACADO HOY', todayOff: '20% de descuento hoy', adUnavailable: 'Anuncio No Disponible', free: 'Gratis', cancel: 'Cancelar', claim: '¡Reclamar!', tapToClose: 'Toca en cualquier lugar para cerrar' },
    goldShop: { title: 'Tienda de Oro', subtitle: 'Potencia tu conquista', mostPopular: 'MÁS POPULAR', bestValue: 'MEJOR VALOR', confirmTitle: 'Confirmar Compra', youReceive: 'Recibes', price: 'Precio', buy: 'Comprar', cancel: 'Cancelar', goldAdded: '¡%{amount} de Oro Añadido!', goldAddedBody: 'Tu saldo de oro ha sido actualizado.', pending: 'Compra Pendiente', pendingBody: 'Tu compra está siendo procesada.', error: 'Error', devWarning: 'Modo dev — sin compra real', purchaseSuccessTitle: '¡Compra Exitosa!', goldAddedTitle: '%{amount} de Oro Añadido', goldAddedSubtitle: 'Tu saldo ha sido actualizado.', purchaseFailedTitle: 'Compra Fallida', purchaseFailed: 'Por favor intenta de nuevo.', iapTitle: 'Compras en la App', tempUnavailableTitle: 'Temporalmente No Disponible', tempUnavailableBody: 'Este paquete no está disponible ahora. Intenta de nuevo en un momento.', gold: 'Oro', devModeWarning: '⚠️ Modo de desarrollo. Construye con EAS para compras reales.', previewMode: 'Vista previa — construye con EAS para comprar', pendingDelivery: 'Tu pago fue detectado pero el oro no pudo confirmarse aún. Reabre la Tienda de Oro y reintentaremos la entrega.' },
    crateShop: { title: 'Cajas Misteriosas', legendary: 'Caja Legendaria', legendaryDesc: 'Avatares SVG y banderas de facción. ¡Posibilidad de drops Legendarios!', dropRates: 'Tasas de Caída', common: 'Común', rare: 'Raro', epic: 'Épico', legendaryRarity: 'LEGENDARIO', notEnoughGold: 'No tienes suficiente oro para abrir esta caja.', open: 'Abrir Caja', error: 'Error' },
    premium: { heroTitle: 'Conviértete en\nConquistador Mundial', heroSubtitle: 'El mundo no se conquistará solo.', heroSub: 'Domina la geografía. Lidera la clasificación.\nConquista el mundo sin límites.', joinExplorers: 'Únete a 1.200 Exploradores Premium', hookHighlight: 'Los Conquistadores tienen 3× más territorios', hookSuffix: 'y suben 5× más rápido en la clasificación que los jugadores gratuitos.', sectionEverything: 'Todo en Conquistador', sectionFreeVsPro: 'Gratuito vs Conquistador', featureHeader: 'Función', freeHeader: 'Gratuito', sectionChoosePlan: 'Elige Tu Plan', once: 'única vez', lifetimeBreakdown: 'Pago único · Acceso de por vida', monthlyPer: '/mes', cancelAnytime: 'Cancela en cualquier momento', securePayment: 'Procesado de forma segura vía App Store / Google Play', trustSecure: 'Pago Seguro', trustLifetime: 'Acceso de por Vida', trustInstant: 'Acceso Inmediato', sectionTestimonials: 'Lo que Dicen los Conquistadores', ratingLabel: '4.9 / 5 de más de 2.000 comandantes', urgencyBanner: 'Plan mensual — primer mes 50% de descuento — expira en ', mostPopular: 'MÁS POPULAR', flagOnly: 'Solo bandera', allQuizzes: 'Todos los cuestionarios', feature1Title: 'Triple Recompensa Diaria', feature1Desc: 'Gana 3× oro y 3× tickets de las recompensas diarias.', feature2Title: '2× Recompensas de Cuestionario', feature2Desc: 'Doble oro y XP de cada cuestionario completado.', feature3Title: 'Jugar Sin Conexión', feature3Desc: 'Los cuestionarios de Capitales, Fronteras y Formas funcionan sin internet.', feature4Title: 'Avatares Únicos', feature4Desc: 'Avatares exclusivos del Conquistador no disponibles en ningún otro lugar.', feature5Title: 'Misiones Únicas', feature5Desc: 'Acceso a contenido y recompensas exclusivos solo para Conquistadores.', feature6Title: 'Insignia de Conquistador', feature6Desc: 'Insignia de corona exclusiva en la clasificación global.', compare1: 'Multiplicador de Oro de Inicio Diario', compare2: 'Multiplicador de Tickets de Inicio Diario', compare3: 'Insignia en Clasificación', compare4: 'Avatares Únicos', compare5: 'Misiones Únicas', compare6: 'Oro y XP del Cuestionario', compare7: 'Acceso Anticipado', compare8: 'Jugar Sin Conexión', faq1q: '¿Cómo funciona el plan de por vida?', faq1a: 'Es un pago único — sin suscripción ni renovaciones. Obtienes acceso permanente al Conquistador más 10 tickets y 3 Cofres Míticos al instante.', faq2q: '¿Puedo cancelar el plan mensual?', faq2a: 'Sí. Cancela con un toque desde los ajustes de suscripción de la App Store / Google Play en cualquier momento.', faq3q: '¿Conservo mis artículos si cancelo?', faq3a: '¡Sí! Cada país, avatar y bandera que compraste permanece tuyo de forma permanente.', faq4q: '¿Qué métodos de pago se aceptan?', faq4a: 'Todos los pagos se procesan de forma segura a través de la App Store o Google Play Billing.', lifetime: 'De por Vida', monthly: 'Mensual', bestDeal: 'MEJOR OFERTA', getLifetime: 'Acceso de por Vida', getMonthly: 'Comenzar Mensual', restore: 'Restaurar Compra', restoring: 'Restaurando…', terms: 'Términos', privacy: 'Privacidad', faq: 'Preguntas', welcomeTitle: '¡Bienvenido, Conquistador!', welcomeBody: '¡Ya tienes acceso ilimitado. ¡Vamos!', failedTitle: 'Compra Fallida', failedBody: 'Algo salió mal. Por favor intenta de nuevo.', restoredTitle: '¡Restaurado!', restoredBody: 'Tu compra ha sido restaurada.', nothingTitle: 'Nada que Restaurar', nothingBody: 'No se encontró ninguna compra anterior.', ok: 'OK' },
    leaderboard: { title: 'Clasificación', mostXP: 'Más XP Ganado', mostQuizzes: 'Más Cuestionarios', mostGold: 'Más oro ganado', mostCorrect: 'Más respuestas correctas', highestAccuracy: 'Mayor precisión', loading: 'Cargando…', error: 'Error', rank: '#%{n}', daily: 'Diario', allTime: 'Total', searchPlayers: 'Buscar jugadores…', explorers: '%{n} exploradores', competingToday: '%{n} compitiendo hoy', resetsIn: 'se reinicia en', updatesIn: 'actualiza en', todaysChallenge: 'Desafío de hoy:', rewards: 'Recompensas', noPlayersFound: 'No se encontraron jugadores para "%{query}"', noExplorers: 'Aún no hay exploradores. ¡Sé el primero!', levelShort: 'Nv %{n}', you: ' (Tú)', awesome: '¡Genial!', dailyChallengeRewards: 'Recompensas del desafío diario', explorerProfile: 'Perfil del explorador', loadingProfile: 'Cargando perfil…', memberSince: 'Miembro desde %{date}', worldDomination: 'Dominación mundial', conquestLabel: '%{pct}% de la tierra · %{area}M km²', empireMap: 'Mapa del imperio', questsCount: 'Misiones (%{claimed} / %{total})', inventory: 'Inventario', avatarsCount: 'Avatares (%{n})', flagsCount: 'Banderas (%{n})', tapToClose: 'Toca en cualquier lugar para cerrar', paidOut: 'Pagado cuando el contador llegue a cero · Top 3 en el desafío de hoy', metricXP: 'XP', metricQuizzes: 'Cuestionarios', metricGold: 'Oro', metricCorrect: 'Correctas', metricAccuracy: 'Precisión', catXP: 'XP', catLand: 'Tierra', catQuizzes: 'Cuestionarios', catAvatars: 'Avatares' },
    worldMap: { title: 'Mapa Mundial', subtitle: '%{n} países por conquistar', loading: 'Cargando países…', purchaseTitle: '¿Comprar %{country}?', purchaseBody: '¿Conquistar %{country} por %{cost} de oro?', confirm: 'Confirmar', cancel: 'Cancelar', success: '¡%{country} conquistado!', successTitle: '¡Conquistado!', notEnoughGold: 'Oro insuficiente', notEnoughGoldBody: 'Necesitas %{cost} de oro para comprar %{country}.', alreadyOwned: 'Ya posees este país', error: 'Error' },
    quizMenu: { howItWorks: 'Cómo Funciona', mapsLeft: '%{n} mapas restantes', trailLocked: 'Ruta Bloqueada', trailLockedBody: 'Completa más cuestionarios para desbloquear.', gauntletLocked: 'Desafío Bloqueado', gauntletLockedBody: 'Alcanza un nivel más alto para desbloquearlo.', acquireTickets: 'Adquirir Boletos', acquireTicketsBody: 'Gana boletos completando misiones.', tickets: '%{n} boletos', goldSuffix: 'oro', quizLocked: 'Cuestionario Bloqueado', unlockCapitals: 'Desbloquea el Cuestionario de Capitales en la Tienda.', unlockBorders: 'Desbloquea el Cuestionario de Fronteras en la Tienda.', displayInShop: 'Ver en Tienda', gotIt: 'Entendido', noTicketsBody: 'Necesitas al menos 1 boleto para jugar al Cuestionario Millonario.\n\nGana boletos de recompensas diarias o cómpralos en Tienda → Artículos.', watch: 'Ver', nextMap: 'Próximo mapa en %{min}m', mapsRemaining: '%{n} / %{max} mapas restantes. 1 por cuestionario.' },
    common: { error: 'Error', cancel: 'Cancelar', ok: 'OK', loading: 'Cargando…', retry: 'Reintentar' },
    questData: { level_10: { title: 'Primera Ascensión', desc: 'Alcanza el Nivel 10.' }, level_25: { title: 'Explorador Experimentado', desc: 'Alcanza el Nivel 25.' }, level_30: { title: 'Táctico Veterano', desc: 'Alcanza el Nivel 30.' }, level_50: { title: 'Conquistador de Élite', desc: 'Alcanza el Nivel 50.' }, level_80: { title: 'Comandante Legendario', desc: 'Alcanza el Nivel 80.' }, level_100: { title: 'Dios de la Geografía', desc: 'Alcanza el Nivel 100.' }, first_blood: { title: 'Primera Conquista', desc: 'Reclama tu primer país en el mapa.' }, empire_5: { title: 'Imperio en Crecimiento', desc: 'Reclama 5 países diferentes.' }, empire_10: { title: 'Ambiciones Imperiales', desc: 'Reclama 10 países diferentes.' }, empire_25: { title: 'Potencia Mundial', desc: 'Reclama 25 países diferentes.' }, empire_50: { title: 'Hegemon Global', desc: 'Reclama 50 países diferentes.' }, streak_20: { title: 'Adicto a GeoConquest', desc: 'Inicia sesión 20 días seguidos.' }, area_1m: { title: 'Vastos Territorios', desc: 'Controla más de 1M km².' }, area_10m: { title: 'Extensión Continental', desc: 'Controla más de 10M km².' }, area_100m: { title: 'Amo de la Tierra', desc: 'Controla más de 100M km².' }, conquer_africa: { title: 'Soberano de África', desc: 'Posee todos los países del continente africano.' }, conquer_europe: { title: 'Emperador de Europa', desc: 'Posee todos los países de Europa.' }, conquer_asia: { title: 'Sultán de Asia', desc: 'Posee todos los países de Asia.' }, conquer_oceania: { title: 'Señor del Pacífico', desc: 'Posee todos los países de Oceanía.' }, conquer_americas: { title: 'Comandante de las Américas', desc: 'Posee todos los países de las Américas.' }, flag_mastery_30s: { title: 'Detective Veloz', desc: 'Termina el Cuestionario de Banderas con >90% de precisión en menos de 30s.' }, ground_invasion: { title: 'Invasión Terrestre', desc: 'Termina el Cuestionario de Capitales con >90% de precisión en menos de 30s.' }, quiz_10: { title: 'Novato de Cuestionarios', desc: 'Completa 10 cuestionarios de cualquier tipo.' }, quiz_50: { title: 'Veterano de Cuestionarios', desc: 'Completa 50 cuestionarios de cualquier tipo.' }, excellence_20: { title: 'Erudito del Mundo', desc: 'Obtén 85% o más en 20 cuestionarios.' }, trail_blazer_50: { title: 'Pionero del Camino', desc: 'Responde 30 preguntas correctamente en una partida de Cuestionario de Ruta.' }, gauntlet_ascendant: { title: 'Ascendido', desc: 'Alcanza el nivel 100 en el Desafío.' }, perfect_accuracy_15: { title: 'Precisión', desc: 'Logra 100% de precisión en 15 cuestionarios.' }, daily_champion_5: { title: 'Campeón del Día', desc: 'Termina en 1er lugar en el desafío diario 5 veces.' }, avatar_collector_10: { title: 'Cazador de Avatares', desc: 'Colecciona 10 avatares diferentes.' }, max_tier_avatar: { title: 'Coleccionista Cumbre', desc: 'Obtén el avatar de mayor nivel en cualquier colección.' }, complete_the_world: { title: 'Dominación Mundial', desc: 'Posee los 250 países del mundo.' }, nightmare_complete: { title: 'Pesadilla Superada', desc: 'Bien jugado, conquistador del inframundo.' }, true_conqueror: { title: 'No hay más que uno.', desc: 'Empuña al Rey Divino, la Reina Divina y la Marca de la Bestia.' }, never_enough: { title: 'Nunca es Suficiente', desc: 'Empuña al Rey Divino y la Armadura Cósmica.' }, level_150: { title: 'Mente Ascendida', desc: 'Alcanza el Nivel 150.' }, level_200: { title: 'Mito del Atlas', desc: 'Alcanza el Nivel 200.' }, level_250: { title: 'Soberano Eterno', desc: 'Alcanza el Nivel 250.' }, level_300: { title: 'Más Allá del Velo', desc: 'Alcanza el Nivel 300.' } },
  },

  fr: {
    quizzes: { title: 'Quiz' },
    quiz: {
      millionaire: 'Quiz Millionnaire',
      flag: 'Drapeaux',
      shape: 'Formes',
      capitals: 'Capitales',
      borders: 'Frontières',
      trail: 'Parcours',
      draw: 'Cartographe',
      gauntlet: 'Le Défi',
      nightmare: 'Le Cauchemar',
    },
    menu: { language: 'Langue', signOut: 'Se Déconnecter', deleteAccount: 'Supprimer le Compte' },
    tabs: { home: 'Accueil', quizzes: 'Quiz', shop: 'Boutique', leaderboard: 'Classement', quests: 'Quêtes' },
    nav: {
      flagQuiz: 'Quiz des Drapeaux',
      shapeQuiz: 'Quiz des Formes',
      bordersQuiz: 'Quiz des Frontières',
      capitalsQuiz: 'Quiz des Capitales',
      trailQuiz: 'Quiz du Parcours',
      millionaireQuiz: 'Quiz Millionnaire',
      nightmareMode: 'Mode Cauchemar',
      drawBorder: 'Dessine la Frontière',
      results: 'Résultats',
      setPassword: 'Nouveau Mot de Passe',
      setPasswordMsg: 'Entrez un nouveau mot de passe pour votre compte.',
      newPassword: 'Nouveau mot de passe',
      confirmPassword: 'Confirmer le mot de passe',
      saving: 'Enregistrement…',
      savePassword: 'Enregistrer',
      passwordMismatch: 'Les mots de passe doivent correspondre et ne peuvent pas être vides.',
      passwordShort: 'Le mot de passe doit contenir au moins 6 caractères.',
      passwordSuccess: 'Votre mot de passe a été mis à jour !',
      passwordFailed: 'Échec de la mise à jour du mot de passe.',
    },
    difficulty: { title: 'Difficulté', easy: 'Facile', medium: 'Moyen', hard: 'Difficile' },
    quizCommon: { paused: 'EN PAUSE', resume: 'REPRENDRE', quit: 'Quitter', letsGo: 'ALLONS-Y !', goBack: 'Retour', tapToContinue: 'Appuyez pour continuer →', noQuestions: 'Aucune question disponible', offline: { title: 'Hors ligne', body: "Passez au Passe Conquérant pour jouer hors ligne.", upgrade: 'Améliorer' }, learn: 'Apprendre' },
    infoModal: { capital: 'Capitale', region: 'Région', population: 'Population', area: 'Superficie', neighbors: 'Voisins', islandNation: '🏝️ Nation insulaire', gotIt: 'Compris !', na: 'N/A' },
    flagQuiz: { subtitle: 'Identifiez les pays par leurs drapeaux.', loading: 'Préparation des drapeaux…', whichFlagOf: 'Quel drapeau appartient à %{country} ?', whichCountry: 'À quel pays appartient ce drapeau ?' },
    shapeQuiz: { subtitle: 'Identifiez les pays par leur forme.', loading: 'Préparation des formes…', whichCountry: 'Quel pays a cette forme ?', whichShapeOf: 'Quelle forme appartient à %{country} ?' },
    bordersQuiz: { subtitle: 'Identifiez les pays frontaliers.', loading: 'Préparation des frontières…', doesBorder: '%{a} est-il frontalier de %{b} ?', doesNotBorder: 'Quel pays ne partage pas de frontière avec %{country} ?', sharesBorder: 'Quel pays partage une frontière avec %{country} ?', yes: 'Oui', no: 'Non' },
    capitalsQuiz: { subtitle: 'Associez les pays à leurs capitales.', loading: 'Préparation des capitales…', capitalOf: 'Quelle est la capitale de %{country} ?', countryOf: 'Dans quel pays %{capital} est la capitale ?' },
    trailQuiz: { subtitle: 'Naviguez à travers des pays voisins.', loading: 'Préparation du parcours…', question: 'Quel pays vient ensuite ?', whatCountry: 'Quel est ce pays ?', whatCapital: 'Quelle est la capitale de ce pays ?', whatFlag: 'Quel est le drapeau de ce pays ?' },
    millionaireQuiz: { loading: 'Préparation des questions…', lifeline50: '50/50', lifelineSkip: 'Changer', lifelineAudience: 'Public', walkTitle: 'Vous êtes en feu !', walkBody: 'Partir avec %{amount} or ?', walk: 'Partir', keepGoing: 'Continuer', winTitle: 'JACKPOT !', winBody: 'Vous avez gagné %{amount} or !', secondChanceTitle: 'Deuxième chance ?', secondChanceBody: 'Utiliser un ticket pour un nouvel essai ?', useTicket: 'Utiliser ticket', noThanks: 'Non merci', pushForward: 'En avant !', takeGold: 'Prendre mes %{amount} or', readySubtitle: '15 questions pour le jackpot, soyez prêt', loadingChallenge: 'Préparation de votre défi…', prizeNow: 'Maintenant', prizeNext: 'Suivant', claimGold: 'Réclamer votre or', conquerBody: 'Vous avez conquis les 15 questions !', walkNoXp: "Encaisser met fin à la partie sans XP. L'XP n'est accordée que pour un 15/15 parfait.", checkpointBody: 'Vous êtes si proche du prochain palier. Une bonne réponse de plus peut tout changer.', secondChanceWatchBody: 'Regardez une pub pour remplacer cette question et continuer.', watchAd: 'Voir pub', loadingAd: 'Chargement pub…', powerUpLocked: 'Amélioration Verrouillée', powerUpLockedBody: "Cette amélioration doit être achetée dans la boutique d'Améliorations." },
    nightmareQuiz: { penaltyRoll: 'LANCEZ POUR VOTRE PÉNALITÉ', penaltyTaken: '%{pct} % de votre or est prélevé.', loading: 'Préparation du cauchemar…', curseDrawn: 'MALÉDICTION ACTIVÉE', blind: 'AVEUGLE', blindDesc: 'La question est cachée par une brume qui se dissipe lentement.', shuffle: 'MÉLANGE', shuffleDesc: 'Les options se mélangent toutes les 3 secondes.', rush: 'RUSH', rushDesc: 'Le temps est réduit de moitié.', phantom: 'FANTÔME', phantomDesc: 'Une bonne réponse est cachée.', winTitle: 'La marque de la bête est à vous', winBody: 'Vous avez vaincu le cauchemar.', readySubtitle: 'Vous contre le Seigneur des Ténèbres', loadingChallenge: 'Réveil du Cauchemar…', blindReveal: 'À travers la brume...', shuffleReveal: 'Attention où vous cliquez.', rushReveal: '5 secondes. Le chrono commence maintenant.', phantomReveal: 'Faites confiance au Fantôme.', winKing: 'Vous êtes le nouveau roi des enfers', takeOwed: 'Prenez Ce Qui Vous Est Dû' },
    gauntlet: { inARow: 'BONNES RÉPONSES DE SUITE', welcomeTo: 'BIENVENUE DANS', round: 'Round %{n}', bossRound: 'ROUND BOSS  x2', shieldAbsorbed: 'BOUCLIER ABSORBÉ', shieldAcquired: 'BOUCLIER ACQUIS', whichFlag: 'Quel pays a ce drapeau ?', whichCapital: 'Quelle est la capitale de %{country} ?', whichCountryCapital: 'Quel pays a cette capitale ?', sharesBorder: 'Quel pays partage une frontière avec %{country} ?', whichShape: 'Quel pays a cette forme ?', t2FlagCapital: 'Quelle capitale appartient à ce drapeau ?', t2FlagBorder: 'Quel pays borde le pays de ce drapeau ?', t2FlagShape: 'Quelle forme appartient à ce drapeau ?', t2ShapeCapital: 'Quelle capitale appartient à cette forme ?', t2ShapeBorder: 'Quel pays borde le pays de cette forme ?', t2ShapeFlag: 'Quel drapeau appartient à cette forme ?', t2CapitalFlag: 'Quel drapeau appartient à cette capitale ?', t2CapitalShape: 'Quelle forme appartient à cette capitale ?', t2CapitalBorder: 'Quel pays borde le pays de cette capitale ?', tiers: { eternity: 'ÉTERNITÉ', oblivion: 'OUBLI', inferno: 'ENFER', hell: 'ENFER', void: 'VIDE', abyss: 'ABÎME', peril: 'PÉRIL', danger: 'DANGER' }, loading: 'Entrée dans le Défi...', title: 'LE DÉFI', finalPhase: 'PHASE FINALE', nextPhase: 'PROCHAINE PHASE %{progress}/%{step}', correctLeft: 'encore %{n} pour avancer', readySubtitle: 'Votre quête ne fait que commencer', keepGoing: 'CONTINUEZ', tierDescPeril: 'La chaleur monte...', tierDescAbyss: 'L\'inconnu profond...', tierDescVoid: 'Conquête sans fin', tierDescHell: 'Enfer - RENAISSANCE', tierDescInferno: 'Soumission', tierDescOblivion: 'Il ne reste rien', tierDescEternity: 'L\'au-delà', milestone5: 'DÉBUT', milestone10: 'DEUX CHIFFRES', milestone15: 'CONCENTRÉ', milestone20: 'DANS L\'ABÎME', milestone25: 'UN QUART DE SIÈCLE', milestone30: 'LE VIDE S\'OUVRE', milestone40: 'BIENVENUE EN ENFER', milestone50: 'À MI-CHEMIN', milestone60: 'SANS RETOUR', milestone70: 'OUBLI ATTEINT', milestone75: 'LÉGENDAIRE', milestone100: 'INARRÊTABLE' },
    drawQuiz: { submit: 'Valider', nextRound: 'Round Suivant', done: 'Terminé', round: 'Round %{current} / %{total}', drawBorderBetween: 'Tracez la frontière entre %{a} et %{b}', loading: 'Construction des paires de frontières…', error: 'Impossible de créer assez de paires. Réessayez plus tard.', title: 'CARTOGRAPHE', subtitle: 'Dessinez les frontières du monde aussi précisément que possible', borderParts: 'Cette frontière a %{n} parties : dessinez-les toutes', drawPrompt: 'Dessinez la frontière entre eux :', revealPrompt: 'Voici la vraie frontière :', actualBorder: 'Frontière réelle', yourStroke: 'Votre trait', clear: 'Effacer', seeResults: 'Voir les Résultats', next: 'Suivant →', ratingPerfect: 'Parfait !', ratingGreat: 'Super !', ratingGood: 'Bien', ratingClose: 'Proche', ratingMiss: 'Raté', rating: { gold: 'OR', silver: 'ARGENT', bronze: 'BRONZE', miss: 'RATÉ' } },
    results: { score: 'Score', totalTime: 'Temps Total', xpEarned: 'XP Gagné', boost: 'Boost', x2Applied: 'x2 Appliqué', level: 'Niveau %{n}', levelUpBonus: 'Bonus de Niveau +%{bonus}', gold: 'Or', balance: 'Solde', penalty: 'PÉNALITÉ', reward: 'RÉCOMPENSE', playAgain: 'Rejouer', backToQuizzes: 'Retour aux Quiz', shareResult: 'Partager', shareText: 'Voici mon score sur %{quiz}… Téléchargez Geo Conquest !', shareHeadline: "Voici mon score au quiz,\nvous pensez faire mieux ?", shareDownload: 'Téléchargez Geo Conquest', levelUpTitle: 'Niveau Supérieur — Niveau %{n} (+%{bonus})', remarks: { wellPlayed: 'Bien joué !', almostThere: 'Presque !', pumpNumbers: 'Il faut améliorer ces chiffres', solidEffort: 'Bon effort', oof: 'Aïe...', wellPlayedGauntlet: 'Bien joué..', payUp: 'Paye et sors', flawless: 'Victoire Parfaite !', notGoodEnough: 'Pas assez bien', wastedTicket: "Impossible que tu aies gaspillé un ticket pour ça..." } },
    maps: { outOfMaps: 'Plus de cartes !', readyToConquer: 'Prêt à conquérir !', refillRate: 'Les cartes se rechargent 1 toutes les 60 minutes.', becomeConqueror: 'Devenir Conquérant', unlimitedMaps: 'Cartes illimitées — sans attente', watchAd: 'Voir une pub', comeBackTomorrow: 'Revenez demain', getMap: 'Obtenir 1 carte · %{left} restantes', wait: 'Attendre', noTickets: 'Sans Tickets', playAgainPrompt: 'Rejouer ?' },
    achievements: { title: 'Quêtes', progress: '%{claimed} / %{total} Réclamées', conquerorPass: "Passe Conquérant — Tout Débloquer", locked: '???', claim: 'Réclamer', rewards: 'Récompenses', error: 'Erreur' },
    home: { empire: 'Votre Empire', worldProgress: 'Progression Mondiale', countries: 'Pays ▸', invite: 'Invitez un ami — Chacun reçoit 1 500 or', dailyReward: 'Récompense Quotidienne', claim: 'Réclamer', streak: '%{n} jours consécutifs', deleteAccount: 'Supprimer le compte', deleteBody: 'Cela supprimera définitivement votre compte et toutes vos données. Cette action est irréversible.', deleteForever: 'Supprimer définitivement', earthArea: '%{pct}% des terres de la Terre', questsDone: 'Quêtes accomplies', avatarsOwned: 'Avatars possédés', quizzesDone: 'Quiz effectués', topExplorers: 'Meilleurs explorateurs', loadingRankings: 'Chargement des classements...', you: ' (Vous)', level: 'Niveau %{n}', becomeConqueror: 'Devenez Conquérant', manageSubscription: "Gérer l'abonnement", closeGoldShop: '✕ Fermer', ownedCountries: 'Pays possédés (%{n})', noCountries: "Aucun pays possédé. Gagnez de l'or et visitez la boutique !", welcomeTitle: 'Bienvenue, Explorateur !', welcomeSubtitle: 'Il est temps de construire votre empire.', welcomeStep1: "Gagnez de l'or en passant des quiz. Meilleur est votre score, plus vous gagnez.", welcomeStep2: "Dépensez de l'or dans la boutique pour acheter des pays, avatars et améliorations.", welcomeStep3: 'Accomplissez des quêtes pour débloquer des récompenses exclusives et des avatars rares.', welcomeStep4: 'Affrontez des explorateurs du monde entier dans des défis quotidiens.', letsConquer: 'À la conquête !', updateTitle: 'v%{version} est disponible !', updateBody: 'Vous êtes sur v%{current}. Mettez à jour pour les dernières fonctionnalités et corrections.', updateNow: 'Mettre à jour', later: 'Plus tard' },
    login: { tagline: 'Conquérez le monde, un quiz à la fois', email: 'E-mail', password: 'Mot de passe', signIn: 'Se Connecter', forgotPassword: 'Mot de passe oublié ?', noAccount: 'Pas de compte ? Inscrivez-vous', signingIn: 'Connexion…', resetSent: 'E-mail de réinitialisation envoyé !', error: 'Erreur', or: 'ou', continueWithGoogle: 'Continuer avec Google', connecting: 'Connexion…', forgotPasswordTitle: 'Réinitialiser le mot de passe', forgotPasswordBody: 'Entrez votre e-mail et nous vous enverrons un lien.', emailSentTitle: 'E-mail envoyé', emailSentBody: 'Vérifiez votre boîte de réception pour le lien de réinitialisation.', done: 'Terminé', sending: 'Envoi…', sendResetLink: 'Envoyer le lien', cancel: 'Annuler', fillFields: 'Veuillez remplir tous les champs', enterEmail: 'Veuillez entrer votre adresse e-mail.', signInFailed: 'Échec de la connexion', googleFailed: 'Échec Google', appleFailed: 'Échec Apple' },
    signup: { title: 'Commencez votre conquête', email: 'E-mail', password: 'Mot de passe', signUp: "S'inscrire", haveAccount: 'Déjà un compte ? Se connecter', signingUp: 'Création du compte…', error: 'Erreur', or: 'ou', continueWithGoogle: 'Continuer avec Google', connecting: 'Connexion…', passwordMin: 'Mot de passe (min 6 caractères)', fillFields: 'Veuillez remplir tous les champs', passwordTooShort: 'Le mot de passe doit comporter au moins 6 caractères', googleFailed: 'Échec Google', appleFailed: 'Échec Apple' },
    onboarding: { chooseName: 'Choisissez Votre Nom', chooseAvatar: 'Choisissez Votre Avatar', chooseFlag: 'Choisissez Votre Drapeau', referral: 'Avez-vous un code de parrainage ?', usernamePlaceholder: "Nom d'utilisateur", referralPlaceholder: 'Code de parrainage (facultatif)', next: 'Suivant →', finish: 'Commencer à Conquérir !', usernameTaken: "Ce nom d'utilisateur est déjà pris", usernameShort: 'Le nom doit avoir au moins 3 caractères', referralAccepted: 'Parrainage accepté ! Chacun reçoit 1 500 or', referralInvalid: 'Code de parrainage invalide', error: 'Erreur', usernameSubtitle: 'Choisissez un pseudo unique pour le classement', enterUsername: "Entrez votre nom d'utilisateur", usernameHint: '3–20 caractères, lettres, chiffres, underscores', checking: 'Vérification…', avatarSubtitle: 'Il vous représentera dans le jeu', avatarHint: 'Pas convaincu ? Débloquez 50+ personnages dans la Boutique.', back: '← Retour', flagSubtitle: 'Choisissez le drapeau de votre pays', searchCountry: 'Rechercher un pays…', referralSubtitle: 'Si un ami vous a invité, entrez son pseudo ci-dessous.', verify: 'Vérifier', creating: 'Création…', imReady: "Je suis prêt", ownUsername: 'Vous ne pouvez pas utiliser votre propre pseudo.', referralNotFound: 'Code introuvable. Vérifiez et réessayez.' },
    shop: { countries: 'Pays', avatars: 'Avatars', flags: 'Drapeaux', upgrades: 'Améliorations', buy: 'Acheter', owned: 'Possédé', equipped: 'Équipé', equip: 'Équiper', notEnoughGold: "Pas assez d'or", purchaseSuccess: 'Achat réussi !', error: 'Erreur', conquererPass: 'Pass Conquérant — Tout Débloquer', needMoreGold: "Besoin d'or ?", buyGold: "Acheter de l'Or →", bulkBuy: 'Achat Groupé', bulkBuyDesc: 'Conquérir %{count} pays pour %{cost} or', goldRemaining: '%{n} or restant', buyAll: 'Tout Acheter', loadingCountries: 'Chargement des pays…', searchCountries: 'Rechercher des pays…', ownedCheck: 'Possédé ✓', ownedMinus: '- Possédé', locked: 'Verrouillé', conquered: 'Conquis !', countriesAdded: '%{n} pays ajoutés à votre empire.', avatarUnlockedTitle: 'Avatar Débloqué !', flagUnlockedTitle: 'Drapeau Débloqué !', switchToOwned: "Allez dans l'onglet Possédé pour l'équiper.", avatarEquippedTitle: 'Avatar Équipé !', avatarEquippedBody: 'Votre avatar est visible dans le classement.', mustOwnFirst: 'Vous devez posséder %{name} en premier.', easterEggTitle: '🎉 Œuf de Pâques Trouvé !', easterEggBody: 'Bravo ! Voici 5 tickets gratuits.', ticketPackAddedTitle: 'Pack de Tickets Ajouté', ticketsAddedBody: '5 tickets ajoutés à votre inventaire.', ticketAddedTitle: 'Ticket Ajouté', ticketAddedBody: 'Ajouté à votre inventaire.', thanksForWatchingTitle: 'Merci de regarder !', ticketWatchBody: '1 ticket ajouté à votre inventaire.', upgradesSubtitle: 'Étendez vos expéditions pour gagner des multiplicateurs massifs.', capitalsQuizUpgrade: 'Quiz Capitales', bordersQuizUpgrade: 'Quiz Frontières', standardExpedition: 'Expédition standard (10)', level2Expedition: 'Expédition Niveau 2', level2Desc: "Jouez jusqu'à 20 tours par quiz", level3Expedition: 'Expédition Niveau 3', level3Desc: "Jouez jusqu'à 30 tours par quiz", millionaireSwap: 'Échange Millionnaire', millionaireSwapDesc: 'Échangez une question dans le Quiz Millionnaire', darkScroll: 'Parchemin Sombre', darkScrollDesc: 'Débloque le Quiz Cauchemar', infiniteMaps: 'Cartes Infinies', infiniteMapsDesc: "Ne attendez plus jamais de cartes", speedDetectiveQuest: 'Terminez la quête Détective Express', groundInvasionQuest: 'Terminez la quête Invasion Terrestre', acquireTickets: 'obtenir tickets millionnaire', millionaireTicket: 'Ticket Millionnaire', oneTicket: '1 ticket', ticketPack: 'Pack de Tickets', ticketsCount: '5 tickets millionnaire', watchAnAd: 'Regarder une pub', oneAdTicket: '1 ticket pour 1 pub', bulkBuyTitle: 'Achat Groupé', purchaseFailed: 'Achat Échoué', purchaseFailedBody: "Une erreur s'est produite.", conqueredTitle: 'Conquis !', previousTier: 'Niveau Précédent', featuredToday: "EN VEDETTE AUJOURD'HUI", todayOff: '20% de réduction aujourd\'hui', adUnavailable: 'Pub Indisponible', free: 'Gratuit', cancel: 'Annuler', claim: 'Réclamer !', tapToClose: "Appuyez n'importe où pour fermer" },
    goldShop: { title: "Boutique d'Or", subtitle: 'Boostez votre conquête', mostPopular: 'PLUS POPULAIRE', bestValue: 'MEILLEUR RAPPORT', confirmTitle: "Confirmer l'Achat", youReceive: 'Vous recevez', price: 'Prix', buy: 'Acheter', cancel: 'Annuler', goldAdded: '%{amount} Or Ajouté !', goldAddedBody: 'Votre solde a été mis à jour.', pending: 'Achat en Attente', pendingBody: 'Votre achat est en cours de traitement.', error: 'Erreur', devWarning: 'Mode dev — pas de vrai achat', purchaseSuccessTitle: 'Achat Réussi !', goldAddedTitle: '%{amount} Or Ajouté', goldAddedSubtitle: 'Votre solde a été mis à jour.', purchaseFailedTitle: "Échec de l'Achat", purchaseFailed: 'Veuillez réessayer.', iapTitle: 'Achats in-app', tempUnavailableTitle: 'Temporairement Indisponible', tempUnavailableBody: "Ce pack n'est pas disponible pour l'instant. Réessayez plus tard.", gold: 'Or', devModeWarning: '⚠️ Mode développement. Construisez avec EAS pour de vrais achats.', previewMode: 'Aperçu — construisez avec EAS pour acheter', pendingDelivery: "Paiement détecté mais l'or n'a pas pu être confirmé. Rouvrez la Boutique d'Or." },
    crateShop: { title: 'Caisses Mystères', legendary: 'Caisse Légendaire', legendaryDesc: 'Avatars SVG et drapeaux de faction. Chance de drops Légendaires !', dropRates: 'Taux de Chute', common: 'Commun', rare: 'Rare', epic: 'Épique', legendaryRarity: 'LÉGENDAIRE', notEnoughGold: "Pas assez d'or pour ouvrir cette caisse.", open: 'Ouvrir', error: 'Erreur' },
    premium: { heroTitle: 'Devenez un\nConquérant Mondial', heroSubtitle: 'Le monde ne se conquerra pas tout seul.', heroSub: 'Maîtrisez la géographie. Dominez le classement.\nConquérez le monde sans limites.', joinExplorers: '1 200 Explorateurs Premium', hookHighlight: 'Les Conquérants possèdent 3× plus de territoires', hookSuffix: 'et montent 5× plus vite dans le classement que les joueurs gratuits.', sectionEverything: 'Tout dans Conquérant', sectionFreeVsPro: 'Gratuit vs Conquérant', featureHeader: 'Fonctionnalité', freeHeader: 'Gratuit', sectionChoosePlan: 'Choisissez votre plan', once: 'une fois', lifetimeBreakdown: 'Paiement unique · Accès à vie', monthlyPer: '/mois', cancelAnytime: 'Annulez à tout moment', securePayment: 'Traité en toute sécurité via App Store / Google Play', trustSecure: 'Paiement Sécurisé', trustLifetime: 'Accès à Vie', trustInstant: 'Accès Instantané', sectionTestimonials: 'Ce que disent les Conquérants', ratingLabel: '4,9 / 5 de plus de 2 000 commandants', urgencyBanner: 'Plan mensuel — 50% de remise le premier mois — expire dans ', mostPopular: 'PLUS POPULAIRE', flagOnly: 'Drapeau seulement', allQuizzes: 'Tous les quiz', feature1Title: 'Triple Récompense Quotidienne', feature1Desc: 'Gagnez 3× or et 3× tickets des récompenses quotidiennes.', feature2Title: '2× Récompenses Quiz', feature2Desc: "Double or et XP de chaque quiz complété.", feature3Title: 'Jouer Hors Ligne', feature3Desc: 'Les quiz Capitales, Frontières et Formes fonctionnent sans connexion.', feature4Title: 'Avatars Uniques', feature4Desc: 'Avatars Conquérant exclusifs non disponibles ailleurs.', feature5Title: 'Quêtes Uniques', feature5Desc: 'Accès au contenu exclusif réservé aux Conquérants.', feature6Title: 'Badge Conquérant', feature6Desc: 'Badge couronne exclusif dans le classement mondial.', compare1: 'Multiplicateur Or Quotidien', compare2: 'Multiplicateur Tickets Quotidien', compare3: 'Badge Classement', compare4: 'Avatars Uniques', compare5: 'Quêtes Uniques', compare6: 'Or et XP Quiz', compare7: 'Accès Anticipé', compare8: 'Jouer Hors Ligne', faq1q: 'Comment fonctionne le plan À Vie ?', faq1a: "C'est un paiement unique — pas d'abonnement. Vous obtenez un accès permanent plus 10 tickets et 3 Coffres Mythiques.", faq2q: 'Puis-je annuler le plan mensuel ?', faq2a: "Oui. Annulez en un clic depuis vos paramètres App Store / Google Play.", faq3q: 'Est-ce que je conserve mes articles si j\'annule ?', faq3a: "Oui ! Chaque pays, avatar et drapeau acheté reste définitivement le vôtre.", faq4q: 'Quels moyens de paiement sont acceptés ?', faq4a: 'Tous les paiements sont traités via App Store ou Google Play Billing.', lifetime: 'À Vie', monthly: 'Mensuel', bestDeal: 'MEILLEURE OFFRE', getLifetime: 'Accès À Vie', getMonthly: 'Commencer Mensuel', restore: "Restaurer l'Achat", restoring: 'Restauration…', terms: 'Conditions', privacy: 'Confidentialité', faq: 'FAQ', welcomeTitle: 'Bienvenue, Conquérant !', welcomeBody: "Vous avez maintenant un accès illimité. Allons-y !", failedTitle: "Échec de l'Achat", failedBody: "Une erreur s'est produite. Veuillez réessayer.", restoredTitle: 'Restauré !', restoredBody: 'Votre achat a été restauré.', nothingTitle: 'Rien à Restaurer', nothingBody: 'Aucun achat précédent trouvé.', ok: 'OK' },
    leaderboard: { title: 'Classement', mostXP: 'Plus de XP Gagné', mostQuizzes: 'Plus de Quiz', mostGold: "Plus d'or gagné", mostCorrect: 'Meilleures réponses', highestAccuracy: 'Meilleure précision', loading: 'Chargement…', error: 'Erreur', rank: '#%{n}', daily: 'Quotidien', allTime: 'Historique', searchPlayers: 'Rechercher des joueurs…', explorers: '%{n} explorateurs', competingToday: "%{n} en compétition aujourd'hui", resetsIn: 'réinitialisation dans', updatesIn: 'mise à jour dans', todaysChallenge: 'Défi du jour :', rewards: 'Récompenses', noPlayersFound: 'Aucun joueur trouvé pour "%{query}"', noExplorers: "Aucun explorateur pour l'instant. Soyez le premier !", levelShort: 'Nv %{n}', you: ' (Vous)', awesome: 'Super !', dailyChallengeRewards: 'Récompenses du défi quotidien', explorerProfile: "Profil de l'explorateur", loadingProfile: 'Chargement du profil…', memberSince: 'Membre depuis %{date}', worldDomination: 'Domination mondiale', conquestLabel: "%{pct}% des terres · %{area}M km²", empireMap: "Carte de l'empire", questsCount: 'Quêtes (%{claimed} / %{total})', inventory: 'Inventaire', avatarsCount: 'Avatars (%{n})', flagsCount: 'Drapeaux (%{n})', tapToClose: "Appuyez n'importe où pour fermer", paidOut: 'Versé quand le compte à rebours atteint zéro · Top 3 du défi du jour', metricXP: 'XP', metricQuizzes: 'Quiz', metricGold: 'Or', metricCorrect: 'Correctes', metricAccuracy: 'Précision', catXP: 'XP', catLand: 'Terre', catQuizzes: 'Quiz', catAvatars: 'Avatars' },
    worldMap: { title: 'Carte du Monde', subtitle: '%{n} pays à conquérir', loading: 'Chargement des pays…', purchaseTitle: 'Acheter %{country} ?', purchaseBody: 'Conquérir %{country} pour %{cost} or ?', confirm: 'Confirmer', cancel: 'Annuler', success: '%{country} conquis !', successTitle: 'Conquis !', notEnoughGold: "Pas assez d'or", notEnoughGoldBody: "Vous avez besoin de %{cost} or pour acheter %{country}.", alreadyOwned: 'Vous possédez déjà ce pays', error: 'Erreur' },
    quizMenu: { howItWorks: 'Comment ça marche', mapsLeft: '%{n} cartes restantes', trailLocked: 'Parcours Verrouillé', trailLockedBody: 'Complétez plus de quiz pour débloquer.', gauntletLocked: 'Défi Verrouillé', gauntletLockedBody: 'Atteignez un niveau supérieur pour débloquer.', acquireTickets: 'Acquérir des Tickets', acquireTicketsBody: 'Gagnez des tickets en complétant des quêtes.', tickets: '%{n} tickets', goldSuffix: 'or', quizLocked: 'Quiz Verrouillé', unlockCapitals: 'Débloquez le Quiz Capitales dans la Boutique.', unlockBorders: 'Débloquez le Quiz Frontières dans la Boutique.', displayInShop: 'Voir en Boutique', gotIt: 'Compris', noTicketsBody: 'Vous avez besoin d\'au moins 1 ticket pour jouer au Quiz Millionnaire.\n\nGagnez des tickets avec les récompenses quotidiennes ou achetez-en en Boutique → Articles.', watch: 'Regarder', nextMap: 'Prochaine carte dans %{min}m', mapsRemaining: '%{n} / %{max} cartes restantes. 1 par quiz.' },
    common: { error: 'Erreur', cancel: 'Annuler', ok: 'OK', loading: 'Chargement…', retry: 'Réessayer' },
    questData: { level_10: { title: 'Première Ascension', desc: 'Atteindre le Niveau 10.' }, level_25: { title: 'Explorateur Aguerri', desc: 'Atteindre le Niveau 25.' }, level_30: { title: 'Tacticien Vétéran', desc: 'Atteindre le Niveau 30.' }, level_50: { title: "Conquérant d'Élite", desc: 'Atteindre le Niveau 50.' }, level_80: { title: 'Commandant Légendaire', desc: 'Atteindre le Niveau 80.' }, level_100: { title: 'Dieu de la Géographie', desc: 'Atteindre le Niveau 100.' }, first_blood: { title: 'Première Conquête', desc: 'Revendiquez votre tout premier pays sur la carte.' }, empire_5: { title: 'Empire Naissant', desc: 'Revendiquez 5 pays différents.' }, empire_10: { title: 'Ambitions Impériales', desc: 'Revendiquez 10 pays différents.' }, empire_25: { title: 'Puissance Mondiale', desc: 'Revendiquez 25 pays différents.' }, empire_50: { title: 'Hégémon Mondial', desc: 'Revendiquez 50 pays différents.' }, streak_20: { title: 'Accro à GeoConquest', desc: 'Connectez-vous 20 jours de suite.' }, area_1m: { title: 'Vastes Territoires', desc: 'Contrôlez plus de 1M km².' }, area_10m: { title: 'Étendue Continentale', desc: 'Contrôlez plus de 10M km².' }, area_100m: { title: 'Maître de la Terre', desc: 'Contrôlez plus de 100M km².' }, conquer_africa: { title: "Souverain d'Afrique", desc: 'Possédez chaque pays du continent africain.' }, conquer_europe: { title: "Empereur d'Europe", desc: "Possédez chaque pays d'Europe." }, conquer_asia: { title: "Sultan d'Asie", desc: "Possédez chaque pays d'Asie." }, conquer_oceania: { title: 'Seigneur du Pacifique', desc: "Possédez chaque pays d'Océanie." }, conquer_americas: { title: 'Commandant des Amériques', desc: 'Possédez chaque pays des Amériques.' }, flag_mastery_30s: { title: 'Détective Express', desc: 'Terminez le Quiz Drapeaux avec >90% de précision en moins de 30s.' }, ground_invasion: { title: 'Invasion Terrestre', desc: 'Terminez le Quiz Capitales avec >90% de précision en moins de 30s.' }, quiz_10: { title: 'Novice des Quiz', desc: "Complétez 10 quiz de n'importe quel type." }, quiz_50: { title: 'Vétéran des Quiz', desc: "Complétez 50 quiz de n'importe quel type." }, excellence_20: { title: 'Érudit du Monde', desc: 'Obtenez 85% ou plus dans 20 quiz différents.' }, trail_blazer_50: { title: 'Défricheur', desc: "Répondez correctement à 30 questions lors d'une seule partie de Quiz du Parcours." }, gauntlet_ascendant: { title: 'Ascendant', desc: 'Atteignez le niveau 100 dans Le Défi.' }, perfect_accuracy_15: { title: 'Précision', desc: 'Atteignez 100% de précision dans 15 quiz différents.' }, daily_champion_5: { title: 'Champion du Jour', desc: 'Terminez en 1ère place au défi quotidien 5 fois.' }, avatar_collector_10: { title: "Chasseur d'Avatars", desc: 'Collectionnez 10 avatars différents.' }, max_tier_avatar: { title: 'Collectionneur Ultime', desc: "Obtenez l'avatar du rang le plus élevé dans n'importe quelle collection." }, complete_the_world: { title: 'Domination Mondiale', desc: 'Possédez les 250 pays du monde.' }, nightmare_complete: { title: 'Cauchemar Survécu', desc: 'Bien joué, conquérant des enfers.' }, true_conqueror: { title: "Il n'en existe qu'un.", desc: 'Maniez le Roi Divin, la Reine Divine et la Marque de la Bête.' }, never_enough: { title: 'Jamais Assez', desc: "Maniez le Roi Divin et l'Armure Cosmique." }, level_150: { title: 'Esprit Ascendant', desc: 'Atteindre le Niveau 150.' }, level_200: { title: "Mythe de l'Atlas", desc: 'Atteindre le Niveau 200.' }, level_250: { title: 'Souverain Éternel', desc: 'Atteindre le Niveau 250.' }, level_300: { title: 'Au-delà du Voile', desc: 'Atteindre le Niveau 300.' } },
  },

  hi: {
    quizzes: { title: 'क्विज़' },
    quiz: {
      millionaire: 'करोड़पति क्विज़',
      flag: 'झंडे',
      shape: 'आकृतियाँ',
      capitals: 'राजधानियाँ',
      borders: 'सीमाएँ',
      trail: 'मार्ग',
      draw: 'मानचित्रकार',
      gauntlet: 'चुनौती',
      nightmare: 'दुःस्वप्न',
    },
    menu: { language: 'भाषा', signOut: 'साइन आउट', deleteAccount: 'खाता हटाएं' },
    tabs: { home: 'होम', quizzes: 'क्विज़', shop: 'दुकान', leaderboard: 'लीडरबोर्ड', quests: 'मिशन' },
    nav: {
      flagQuiz: 'झंडा क्विज़',
      shapeQuiz: 'आकृति क्विज़',
      bordersQuiz: 'सीमा क्विज़',
      capitalsQuiz: 'राजधानी क्विज़',
      trailQuiz: 'मार्ग क्विज़',
      millionaireQuiz: 'करोड़पति क्विज़',
      nightmareMode: 'दुःस्वप्न मोड',
      drawBorder: 'सीमा बनाएं',
      results: 'परिणाम',
      setPassword: 'नया पासवर्ड सेट करें',
      setPasswordMsg: 'अपने खाते के लिए नया पासवर्ड दर्ज करें।',
      newPassword: 'नया पासवर्ड',
      confirmPassword: 'पासवर्ड की पुष्टि करें',
      saving: 'सहेज रहे हैं…',
      savePassword: 'पासवर्ड सहेजें',
      passwordMismatch: 'पासवर्ड मेल नहीं खाते और खाली नहीं हो सकते।',
      passwordShort: 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।',
      passwordSuccess: 'आपका पासवर्ड अपडेट हो गया!',
      passwordFailed: 'पासवर्ड अपडेट करने में विफल।',
    },
    difficulty: { title: 'कठिनाई', easy: 'आसान', medium: 'मध्यम', hard: 'कठिन' },
    quizCommon: { paused: 'रुका हुआ', resume: 'जारी रखें', quit: 'छोड़ें', letsGo: 'चलो!', goBack: 'वापस जाएं', tapToContinue: 'जारी रखने के लिए टैप करें →', noQuestions: 'कोई प्रश्न उपलब्ध नहीं', offline: { title: 'ऑफलाइन', body: 'ऑफलाइन खेलने के लिए कॉन्करर पास अपग्रेड करें।', upgrade: 'अपग्रेड' }, learn: 'जानें' },
    infoModal: { capital: 'राजधानी', region: 'क्षेत्र', population: 'जनसंख्या', area: 'क्षेत्रफल', neighbors: 'पड़ोसी', islandNation: '🏝️ द्वीप राष्ट्र', gotIt: 'समझ गया!', na: 'N/A' },
    flagQuiz: { subtitle: 'झंडों से देशों को पहचानें।', loading: 'झंडे तैयार हो रहे हैं…', whichFlagOf: '%{country} का झंडा कौन सा है?', whichCountry: 'यह झंडा किस देश का है?' },
    shapeQuiz: { subtitle: 'आकृति से देशों को पहचानें।', loading: 'आकृतियां तैयार हो रही हैं…', whichCountry: 'इस आकृति का देश कौन सा है?', whichShapeOf: '%{country} की आकृति कौन सी है?' },
    bordersQuiz: { subtitle: 'सीमा साझा करने वाले देशों को पहचानें।', loading: 'सीमाएं तैयार हो रही हैं…', doesBorder: 'क्या %{a} की सीमा %{b} से मिलती है?', doesNotBorder: 'कौन सा देश %{country} से सीमा साझा नहीं करता?', sharesBorder: '%{country} के साथ सीमा साझा करने वाला देश कौन सा है?', yes: 'हाँ', no: 'नहीं' },
    capitalsQuiz: { subtitle: 'देशों को उनकी राजधानियों से मिलाएं।', loading: 'राजधानियां तैयार हो रही हैं…', capitalOf: '%{country} की राजधानी क्या है?', countryOf: '%{capital} किस देश की राजधानी है?' },
    trailQuiz: { subtitle: 'पड़ोसी देशों की यात्रा करें।', loading: 'मार्ग तैयार हो रहा है…', question: 'मार्ग में अगला देश कौन सा है?', whatCountry: 'यह कौन सा देश है?', whatCapital: 'इस देश की राजधानी क्या है?', whatFlag: 'इस देश का झंडा कौन सा है?' },
    millionaireQuiz: { loading: 'प्रश्न तैयार हो रहे हैं…', lifeline50: '50/50', lifelineSkip: 'बदलें', lifelineAudience: 'दर्शक', walkTitle: 'आप जोश में हैं!', walkBody: '%{amount} सोने के साथ जाएं?', walk: 'जाएं', keepGoing: 'जारी रखें', winTitle: 'जैकपॉट!', winBody: 'आपने %{amount} सोना जीता!', secondChanceTitle: 'दूसरा मौका?', secondChanceBody: 'एक और प्रयास के लिए टिकट उपयोग करें?', useTicket: 'टिकट उपयोग करें', noThanks: 'नहीं धन्यवाद', pushForward: 'आगे बढ़ें!', takeGold: 'मेरा %{amount} सोना लेता हूं', readySubtitle: 'जैकपॉट के लिए 15 प्रश्न, पूरी तरह तैयार रहें', loadingChallenge: 'आपकी चुनौती तैयार हो रही है…', prizeNow: 'अभी', prizeNext: 'अगला', claimGold: 'सोना प्राप्त करें', conquerBody: 'आपने सभी 15 प्रश्न जीत लिए!', walkNoXp: "गोल्ड लेने पर खेल बिना XP के खत्म हो जाता है। XP केवल पूरे 15/15 पर मिलता है।", checkpointBody: 'आप अगले स्तर के बहुत करीब हैं। एक और सही उत्तर सब बदल सकता है।', secondChanceWatchBody: 'इस प्रश्न को बदलने के लिए विज्ञापन देखें और जारी रखें।', watchAd: 'विज्ञापन देखें', loadingAd: 'विज्ञापन लोड हो रहा है…', powerUpLocked: 'पावर-अप बंद है', powerUpLockedBody: 'यह पावर-अप अपग्रेड शॉप से खरीदना होगा।' },
    nightmareQuiz: { penaltyRoll: 'सज़ा के लिए पासा फेंकें', penaltyTaken: 'आपके सोने का %{pct}% कट गया।', loading: 'दुःस्वप्न तैयार हो रहा है…', curseDrawn: 'श्राप मिला', blind: 'अंधा', blindDesc: 'प्रश्न धुंध के पीछे छिपा है, जो धीरे-धीरे छँटती है।', shuffle: 'मिश्रण', shuffleDesc: 'विकल्प हर 3 सेकंड में बदलते हैं।', rush: 'जल्दी', rushDesc: 'इस प्रश्न के लिए समय आधा है।', phantom: 'भूत', phantomDesc: 'एक सही उत्तर छिपा है।', winTitle: 'दानव की छाप आपकी है', winBody: 'आपने दुःस्वप्न जीत लिया।', readySubtitle: 'आप बनाम अंधकार का स्वामी', loadingChallenge: 'दुःस्वप्न जागृत हो रहा है…', blindReveal: 'धुंध के पार...', shuffleReveal: 'ध्यान से क्लिक करें।', rushReveal: '5 सेकंड। घड़ी अभी शुरू होती है।', phantomReveal: 'भूत पर भरोसा रखें।', winKing: 'आप नई दुनिया के राजा हैं', takeOwed: 'जो आपका है वो लें' },
    gauntlet: { inARow: 'लगातार सही', welcomeTo: 'स्वागत है', round: 'राउंड %{n}', bossRound: 'बॉस राउंड  x2', shieldAbsorbed: 'ढाल अवशोषित', shieldAcquired: 'ढाल मिली', whichFlag: 'इस झंडे वाला देश कौन सा है?', whichCapital: '%{country} की राजधानी क्या है?', whichCountryCapital: 'इस राजधानी का देश कौन सा है?', sharesBorder: '%{country} के साथ सीमा साझा करने वाला देश?', whichShape: 'इस आकृति का देश कौन सा है?', t2FlagCapital: 'इस झंडे की राजधानी कौन सी है?', t2FlagBorder: 'इस झंडे के देश से कौन सा देश सीमा साझा करता है?', t2FlagShape: 'इस झंडे की आकृति कौन सी है?', t2ShapeCapital: 'इस आकृति की राजधानी कौन सी है?', t2ShapeBorder: 'इस आकृति के देश से कौन सा देश सीमा साझा करता है?', t2ShapeFlag: 'इस आकृति का झंडा कौन सा है?', t2CapitalFlag: 'इस राजधानी का झंडा कौन सा है?', t2CapitalShape: 'इस राजधानी की आकृति कौन सी है?', t2CapitalBorder: 'इस राजधानी के देश से कौन सा देश सीमा साझा करता है?', tiers: { eternity: 'अनंतकाल', oblivion: 'विस्मृति', inferno: 'नरक', hell: 'नरक', void: 'शून्य', abyss: 'अथाह', peril: 'खतरा', danger: 'खतरा' }, loading: 'गंटलेट में प्रवेश...', title: 'द गंटलेट', finalPhase: 'अंतिम चरण', nextPhase: 'अगला चरण %{progress}/%{step}', correctLeft: 'आगे बढ़ने के लिए %{n} और', readySubtitle: 'आपकी खोज अभी शुरू ही हुई है', keepGoing: 'जारी रखें', tierDescPeril: 'गर्मी बढ़ रही है...', tierDescAbyss: 'अज्ञात गहराई...', tierDescVoid: 'अंतहीन विजय', tierDescHell: 'नरक - पुनर्जन्म', tierDescInferno: 'अधीनता', tierDescOblivion: 'कुछ नहीं बचा', tierDescEternity: 'परे की दुनिया', milestone5: 'शुरुआत', milestone10: 'दो अंक', milestone15: 'केंद्रित', milestone20: 'अथाह में', milestone25: 'पच्चीस', milestone30: 'शून्य खुलता है', milestone40: 'नरक में आपका स्वागत', milestone50: 'आधा रास्ता', milestone60: 'वापसी नहीं', milestone70: 'विस्मृति', milestone75: 'महान', milestone100: 'अजेय' },
    drawQuiz: { submit: 'जमा करें', nextRound: 'अगला राउंड', done: 'हो गया', round: 'राउंड %{current} / %{total}', drawBorderBetween: '%{a} और %{b} के बीच सीमा बनाएं', loading: 'सीमा जोड़े बना रहे हैं…', error: 'पर्याप्त जोड़े नहीं बन सके। बाद में पुनः प्रयास करें।', title: 'मानचित्रकार', subtitle: 'दुनिया की सीमाएँ यथासंभव सटीक बनाएं', borderParts: 'इस सीमा के %{n} हिस्से हैं: हर एक बनाएं', drawPrompt: 'उनके बीच की सीमा बनाएं:', revealPrompt: 'यह है वास्तविक सीमा:', actualBorder: 'वास्तविक सीमा', yourStroke: 'आपका स्ट्रोक', clear: 'मिटाएं', seeResults: 'परिणाम देखें', next: 'अगला →', ratingPerfect: 'परफेक्ट!', ratingGreat: 'बढ़िया!', ratingGood: 'अच्छा', ratingClose: 'करीब', ratingMiss: 'चूक गए', rating: { gold: 'सोना', silver: 'चांदी', bronze: 'कांस्य', miss: 'चूक' } },
    results: { score: 'स्कोर', totalTime: 'कुल समय', xpEarned: 'XP अर्जित', boost: 'बूस्ट', x2Applied: 'x2 लागू', level: 'स्तर %{n}', levelUpBonus: 'लेवल-अप बोनस +%{bonus}', gold: 'सोना', balance: 'बैलेंस', penalty: 'जुर्माना', reward: 'पुरस्कार', playAgain: 'फिर खेलें', backToQuizzes: 'क्विज़ पर वापस', shareResult: 'परिणाम साझा करें', shareText: '%{quiz} में मेरा स्कोर... Geo Conquest डाउनलोड करें!', shareHeadline: "क्विज़ में मेरा स्कोर यह है,\nक्या आप बेहतर कर सकते हैं?", shareDownload: 'Geo Conquest डाउनलोड करें', levelUpTitle: 'लेवल अप — स्तर %{n} (+%{bonus})', remarks: { wellPlayed: 'शाबाश!', almostThere: 'लगभग!', pumpNumbers: 'नंबर सुधारने होंगे', solidEffort: 'अच्छा प्रयास', oof: 'ओह...', wellPlayedGauntlet: 'शाबाश..', payUp: 'चुकाओ और निकलो', flawless: 'शानदार जीत!', notGoodEnough: 'पर्याप्त नहीं', wastedTicket: 'इसके लिए टिकट बर्बाद किया?..' } },
    maps: { outOfMaps: 'मैप खत्म!', readyToConquer: 'जीतने के लिए तैयार!', refillRate: 'मैप हर 60 मिनट में 1 रिफिल होता है।', becomeConqueror: 'विजेता बनें', unlimitedMaps: 'असीमित मैप — कभी न रुकें', watchAd: 'विज्ञापन देखें', comeBackTomorrow: 'कल वापस आएं', getMap: '1 मैप पाएं · आज %{left} बचे', wait: 'प्रतीक्षा करें', noTickets: 'टिकट नहीं', playAgainPrompt: 'फिर खेलें?' },
    achievements: { title: 'मिशन', progress: '%{claimed} / %{total} प्राप्त', conquerorPass: 'कॉन्करर पास — सब अनलॉक करें', locked: '???', claim: 'प्राप्त करें', rewards: 'पुरस्कार', error: 'त्रुटि' },
    home: { empire: 'आपका साम्राज्य', worldProgress: 'विश्व विजय प्रगति', countries: 'देश ▸', invite: 'मित्र को आमंत्रित करें — दोनों को 1,500 सोना मिलेगा', dailyReward: 'दैनिक पुरस्कार', claim: 'प्राप्त करें', streak: '%{n} दिन की लकीर', deleteAccount: 'खाता हटाएं', deleteBody: 'इससे आपका खाता और सभी डेटा स्थायी रूप से हट जाएगा। इसे पूर्ववत नहीं किया जा सकता।', deleteForever: 'हमेशा के लिए हटाएं', earthArea: 'पृथ्वी के भूमि क्षेत्र का %{pct}%', questsDone: 'मिशन पूरे', avatarsOwned: 'अवतार खरीदे', quizzesDone: 'क्विज़ किए', topExplorers: 'शीर्ष खोजकर्ता', loadingRankings: 'रैंकिंग लोड हो रही है...', you: ' (आप)', level: 'स्तर %{n}', becomeConqueror: 'विजेता बनें', manageSubscription: 'सदस्यता प्रबंधित करें', closeGoldShop: '✕ बंद करें', ownedCountries: 'स्वामित्व वाले देश (%{n})', noCountries: 'अभी कोई देश नहीं है। सोना कमाएं और दुकान जाएं!', welcomeTitle: 'स्वागत है, खोजकर्ता!', welcomeSubtitle: 'अपना साम्राज्य बनाने का समय आ गया।', welcomeStep1: 'क्विज़ देकर सोना कमाएं। बेहतर स्कोर से ज्यादा सोना मिलता है।', welcomeStep2: 'दुकान में सोना खर्च कर देश, अवतार और अपग्रेड खरीदें।', welcomeStep3: 'मिशन पूरे करके विशेष पुरस्कार और दुर्लभ अवतार अनलॉक करें।', welcomeStep4: 'दुनिया भर के खोजकर्ताओं के साथ दैनिक चुनौतियों में प्रतिस्पर्धा करें।', letsConquer: 'चलो जीतें!', updateTitle: 'v%{version} उपलब्ध है!', updateBody: 'आप v%{current} पर हैं। नई सुविधाओं और सुधारों के लिए अपडेट करें।', updateNow: 'अभी अपडेट करें', later: 'बाद में' },
    login: { tagline: 'एक क्विज़ में दुनिया जीतें', email: 'ईमेल', password: 'पासवर्ड', signIn: 'साइन इन', forgotPassword: 'पासवर्ड भूल गए?', noAccount: 'खाता नहीं है? साइन अप करें', signingIn: 'साइन इन हो रहे हैं…', resetSent: 'रीसेट ईमेल भेजा गया!', error: 'त्रुटि', or: 'या', continueWithGoogle: 'Google से जारी रखें', connecting: 'कनेक्ट हो रहे हैं…', forgotPasswordTitle: 'पासवर्ड रीसेट करें', forgotPasswordBody: 'अपना ईमेल दर्ज करें और हम आपको रीसेट लिंक भेजेंगे।', emailSentTitle: 'ईमेल भेजा गया', emailSentBody: 'पासवर्ड रीसेट लिंक के लिए अपना इनबॉक्स देखें।', done: 'हो गया', sending: 'भेज रहे हैं…', sendResetLink: 'रीसेट लिंक भेजें', cancel: 'रद्द करें', fillFields: 'कृपया सभी फ़ील्ड भरें', enterEmail: 'कृपया अपना ईमेल पता दर्ज करें।', signInFailed: 'साइन इन विफल', googleFailed: 'Google साइन इन विफल', appleFailed: 'Apple साइन इन विफल' },
    signup: { title: 'अपनी विजय शुरू करें', email: 'ईमेल', password: 'पासवर्ड', signUp: 'साइन अप', haveAccount: 'खाता है? साइन इन करें', signingUp: 'खाता बना रहे हैं…', error: 'त्रुटि', or: 'या', continueWithGoogle: 'Google से जारी रखें', connecting: 'कनेक्ट हो रहे हैं…', passwordMin: 'पासवर्ड (न्यूनतम 6 अक्षर)', fillFields: 'कृपया सभी फ़ील्ड भरें', passwordTooShort: 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए', googleFailed: 'Google साइन इन विफल', appleFailed: 'Apple साइन इन विफल' },
    onboarding: { chooseName: 'अपना नाम चुनें', chooseAvatar: 'अपना अवतार चुनें', chooseFlag: 'अपना झंडा चुनें', referral: 'रेफरल कोड है?', usernamePlaceholder: 'उपयोगकर्ता नाम', referralPlaceholder: 'रेफरल कोड (वैकल्पिक)', next: 'अगला →', finish: 'जीतना शुरू करें!', usernameTaken: 'यह उपयोगकर्ता नाम पहले से लिया गया है', usernameShort: 'नाम कम से कम 3 अक्षरों का होना चाहिए', referralAccepted: 'रेफरल स्वीकृत! दोनों को 1,500 सोना मिलेगा', referralInvalid: 'अमान्य रेफरल कोड', error: 'त्रुटि', usernameSubtitle: 'लीडरबोर्ड के लिए एक अनोखा उपयोगकर्ता नाम चुनें', enterUsername: 'अपना उपयोगकर्ता नाम दर्ज करें', usernameHint: '3–20 अक्षर, अक्षर, संख्याएं, अंडरस्कोर', checking: 'जाँच हो रही है…', avatarSubtitle: 'यह खेल में आपका प्रतिनिधित्व करेगा', avatarHint: 'पसंद नहीं? Avatar Shop में 50+ और अनलॉक करें।', back: '← वापस', flagSubtitle: 'अपने देश का झंडा चुनें', searchCountry: 'देश खोजें…', referralSubtitle: 'यदि किसी मित्र ने आमंत्रित किया हो तो उनका उपयोगकर्ता नाम दर्ज करें।', verify: 'सत्यापित करें', creating: 'बना रहे हैं…', imReady: 'मैं तैयार हूं', ownUsername: 'आप अपना खुद का उपयोगकर्ता नाम उपयोग नहीं कर सकते।', referralNotFound: 'रेफरल कोड नहीं मिला। कृपया जाँच करें।' },
    shop: { countries: 'देश', avatars: 'अवतार', flags: 'झंडे', upgrades: 'अपग्रेड', buy: 'खरीदें', owned: 'खरीदा', equipped: 'सुसज्जित', equip: 'लगाएं', notEnoughGold: 'पर्याप्त सोना नहीं', purchaseSuccess: 'खरीदारी सफल!', error: 'त्रुटि', conquererPass: 'कॉन्करर पास — सब अनलॉक करें', needMoreGold: 'और सोना चाहिए?', buyGold: 'सोना खरीदें →', bulkBuy: 'बल्क खरीद', bulkBuyDesc: '%{count} देश %{cost} सोने में जीतें', goldRemaining: '%{n} सोना बचा', buyAll: 'सब खरीदें', loadingCountries: 'देश लोड हो रहे हैं…', searchCountries: 'देश खोजें…', ownedCheck: 'खरीदा ✓', ownedMinus: '- खरीदा', locked: 'लॉक', conquered: 'जीता!', countriesAdded: '%{n} देश आपके साम्राज्य में जोड़े गए।', avatarUnlockedTitle: 'अवतार अनलॉक!', flagUnlockedTitle: 'झंडा अनलॉक!', switchToOwned: 'इसे लगाने के लिए Owned टैब पर जाएं।', avatarEquippedTitle: 'अवतार लगाया!', avatarEquippedBody: 'आपका अवतार लीडरबोर्ड में दिखेगा।', mustOwnFirst: 'पहले %{name} खरीदना होगा।', easterEggTitle: '🎉 Easter Egg मिला!', easterEggBody: 'बधाई! यहाँ 5 मुफ्त टिकट हैं।', ticketPackAddedTitle: 'टिकट पैक जोड़ा', ticketsAddedBody: '5 टिकट आपकी इन्वेंट्री में जोड़े गए।', ticketAddedTitle: 'टिकट जोड़ा', ticketAddedBody: 'आपकी इन्वेंट्री में जोड़ा गया।', thanksForWatchingTitle: 'देखने के लिए धन्यवाद!', ticketWatchBody: '1 टिकट आपकी इन्वेंट्री में जोड़ा गया।', upgradesSubtitle: 'विशाल गुणक पाने के लिए अपने अभियान बढ़ाएं।', capitalsQuizUpgrade: 'राजधानियाँ क्विज़', bordersQuizUpgrade: 'सीमाएँ क्विज़', standardExpedition: 'मानक अभियान (10)', level2Expedition: 'स्तर 2 अभियान', level2Desc: 'प्रति क्विज़ 20 राउंड तक खेलें', level3Expedition: 'स्तर 3 अभियान', level3Desc: 'प्रति क्विज़ 30 राउंड तक खेलें', millionaireSwap: 'करोड़पति स्वैप', millionaireSwapDesc: 'करोड़पति क्विज़ में एक प्रश्न बदलें', darkScroll: 'अंधेरा स्क्रॉल', darkScrollDesc: 'नाइटमेयर क्विज़ अनलॉक करता है', infiniteMaps: 'असीमित मैप', infiniteMapsDesc: 'मैप के लिए कभी प्रतीक्षा न करें', speedDetectiveQuest: 'Speed Detective क्वेस्ट पूरी करें', groundInvasionQuest: 'Ground Invasion क्वेस्ट पूरी करें', acquireTickets: 'करोड़पति टिकट प्राप्त करें', millionaireTicket: 'करोड़पति टिकट', oneTicket: '1 टिकट', ticketPack: 'टिकट पैक', ticketsCount: '5 करोड़पति टिकट', watchAnAd: 'विज्ञापन देखें', oneAdTicket: '1 विज्ञापन = 1 टिकट', bulkBuyTitle: 'बल्क खरीद', purchaseFailed: 'खरीद विफल', purchaseFailedBody: 'कुछ गलत हो गया।', conqueredTitle: 'जीता!', previousTier: 'पिछला स्तर', featuredToday: 'आज का फ़ीचर्ड', todayOff: 'आज 20% छूट', adUnavailable: 'विज्ञापन उपलब्ध नहीं', free: 'मुफ्त', cancel: 'रद्द करें', claim: 'प्राप्त करें!', tapToClose: 'बंद करने के लिए कहीं भी टैप करें' },
    goldShop: { title: 'सोने की दुकान', subtitle: 'अपनी विजय को बढ़ावा दें', mostPopular: 'सर्वाधिक लोकप्रिय', bestValue: 'सर्वोत्तम मूल्य', confirmTitle: 'खरीद की पुष्टि', youReceive: 'आपको मिलता है', price: 'कीमत', buy: 'खरीदें', cancel: 'रद्द करें', goldAdded: '%{amount} सोना जोड़ा!', goldAddedBody: 'आपका सोने का बैलेंस अपडेट हो गया।', pending: 'खरीद लंबित', pendingBody: 'आपकी खरीद प्रोसेस हो रही है।', error: 'त्रुटि', devWarning: 'Dev मोड — कोई असली खरीद नहीं', purchaseSuccessTitle: 'खरीद सफल!', goldAddedTitle: '%{amount} सोना जोड़ा', goldAddedSubtitle: 'आपका बैलेंस अपडेट हो गया।', purchaseFailedTitle: 'खरीद विफल', purchaseFailed: 'कृपया फिर से प्रयास करें।', iapTitle: 'इन-ऐप खरीदारी', tempUnavailableTitle: 'अस्थायी रूप से अनुपलब्ध', tempUnavailableBody: 'यह गोल्ड पैक अभी उपलब्ध नहीं है। थोड़ी देर बाद पुनः प्रयास करें।', gold: 'सोना', devModeWarning: '⚠️ डेवलपमेंट मोड। असली खरीद के लिए EAS से बनाएं।', previewMode: 'पूर्वावलोकन — खरीदने के लिए EAS से बनाएं', pendingDelivery: 'भुगतान मिला, लेकिन सोना अभी पुष्टि नहीं हो सका। Gold Shop दोबारा खोलें।' },
    crateShop: { title: 'रहस्य बक्से', legendary: 'महान बक्सा', legendaryDesc: 'SVG अवतार और faction झंडे। Legendary ड्रॉप का मौका!', dropRates: 'ड्रॉप दर', common: 'सामान्य', rare: 'दुर्लभ', epic: 'महाकाव्य', legendaryRarity: 'महान', notEnoughGold: 'यह बक्सा खोलने के लिए पर्याप्त सोना नहीं।', open: 'बक्सा खोलें', error: 'त्रुटि' },
    premium: { heroTitle: 'विश्व विजेता बनें', heroSubtitle: 'दुनिया खुद नहीं जीती जाएगी।', heroSub: 'भूगोल में महारत हासिल करें। लीडरबोर्ड पर राज करें।\nबिना किसी सीमा के दुनिया जीतें।', joinExplorers: '1,200 Premium Explorers', hookHighlight: 'Conquerors के पास 3× अधिक क्षेत्र हैं', hookSuffix: 'और मुफ्त खिलाड़ियों से 5× तेजी से लीडरबोर्ड पर चढ़ते हैं।', sectionEverything: 'Conqueror में सब कुछ', sectionFreeVsPro: 'Free vs Conqueror', featureHeader: 'सुविधा', freeHeader: 'मुफ्त', sectionChoosePlan: 'अपना प्लान चुनें', once: 'एक बार', lifetimeBreakdown: 'एकल भुगतान · आजीवन एक्सेस', monthlyPer: '/माह', cancelAnytime: 'कभी भी रद्द करें', securePayment: 'App Store / Google Play के माध्यम से सुरक्षित रूप से संसाधित', trustSecure: 'सुरक्षित भुगतान', trustLifetime: 'आजीवन एक्सेस', trustInstant: 'तत्काल एक्सेस', sectionTestimonials: 'Conquerors क्या कहते हैं', ratingLabel: '2,000+ कमांडरों द्वारा 4.9/5', urgencyBanner: 'मासिक प्लान — पहले महीने 50% छूट — समाप्त होता है ', mostPopular: 'सर्वाधिक लोकप्रिय', flagOnly: 'केवल झंडा', allQuizzes: 'सभी क्विज़', feature1Title: 'तिगुना दैनिक पुरस्कार', feature1Desc: 'दैनिक पुरस्कारों से 3× सोना और 3× टिकट पाएं।', feature2Title: '2× क्विज़ पुरस्कार', feature2Desc: 'हर पूर्ण क्विज़ से दोगुना सोना और XP।', feature3Title: 'ऑफलाइन खेलें', feature3Desc: 'Capitals, Borders और Shapes क्विज़ बिना नेट के काम करते हैं।', feature4Title: 'अनोखे अवतार', feature4Desc: 'एक्सक्लूसिव Conqueror अवतार जो कहीं और उपलब्ध नहीं।', feature5Title: 'अनोखी क्वेस्ट', feature5Desc: 'एक्सक्लूसिव Conqueror-only सामग्री तक पहुंच।', feature6Title: 'Conqueror बैज', feature6Desc: 'वैश्विक लीडरबोर्ड में एक्सक्लूसिव क्राउन बैज।', compare1: 'दैनिक सोना गुणक', compare2: 'दैनिक टिकट गुणक', compare3: 'लीडरबोर्ड बैज', compare4: 'अनोखे अवतार', compare5: 'अनोखी क्वेस्ट', compare6: 'क्विज़ सोना और XP', compare7: 'अर्ली एक्सेस', compare8: 'ऑफलाइन खेलें', faq1q: 'Lifetime प्लान कैसे काम करता है?', faq1a: 'यह एकल भुगतान है — कोई सदस्यता नहीं। आपको स्थायी एक्सेस के साथ 10 टिकट और 3 Mythic Chests मिलते हैं।', faq2q: 'क्या मैं मासिक प्लान रद्द कर सकता हूं?', faq2a: 'हां। App Store / Google Play सेटिंग से एक क्लिक में रद्द करें।', faq3q: 'रद्द करने पर क्या मेरी वस्तुएं रहती हैं?', faq3a: 'हां! प्रत्येक खरीदा गया देश, अवतार और झंडा हमेशा के लिए आपका है।', faq4q: 'कौन से भुगतान स्वीकार किए जाते हैं?', faq4a: 'सभी भुगतान App Store या Google Play Billing के माध्यम से संसाधित होते हैं।', lifetime: 'जीवन भर', monthly: 'मासिक', bestDeal: 'सर्वोत्तम सौदा', getLifetime: 'जीवन भर का एक्सेस', getMonthly: 'मासिक शुरू करें', restore: 'खरीद पुनर्स्थापित करें', restoring: 'पुनर्स्थापित हो रहा है…', terms: 'नियम', privacy: 'गोपनीयता', faq: 'FAQ', welcomeTitle: 'स्वागत है, विजेता!', welcomeBody: 'आपके पास अब असीमित एक्सेस है। चलो!', failedTitle: 'खरीद विफल', failedBody: 'कुछ गलत हुआ। कृपया पुनः प्रयास करें।', restoredTitle: 'पुनर्स्थापित!', restoredBody: 'आपकी खरीद पुनर्स्थापित हो गई।', nothingTitle: 'पुनर्स्थापित करने के लिए कुछ नहीं', nothingBody: 'कोई पिछली खरीद नहीं मिली।', ok: 'ठीक है' },
    leaderboard: { title: 'लीडरबोर्ड', mostXP: 'सर्वाधिक XP अर्जित', mostQuizzes: 'सर्वाधिक क्विज़', mostGold: 'सबसे अधिक सोना कमाया', mostCorrect: 'सबसे अधिक सही उत्तर', highestAccuracy: 'सर्वोच्च सटीकता', loading: 'लोड हो रहा है…', error: 'त्रुटि', rank: '#%{n}', daily: 'दैनिक', allTime: 'सर्वकालिक', searchPlayers: 'खिलाड़ी खोजें…', explorers: '%{n} खोजकर्ता', competingToday: 'आज %{n} प्रतिस्पर्धा कर रहे हैं', resetsIn: 'रीसेट होगा', updatesIn: 'अपडेट होगा', todaysChallenge: 'आज की चुनौती:', rewards: 'पुरस्कार', noPlayersFound: '"%{query}" के लिए कोई खिलाड़ी नहीं मिला', noExplorers: 'अभी कोई खोजकर्ता नहीं। पहले बनें!', levelShort: 'स्तर %{n}', you: ' (आप)', awesome: 'शानदार!', dailyChallengeRewards: 'दैनिक चुनौती पुरस्कार', explorerProfile: 'खोजकर्ता प्रोफ़ाइल', loadingProfile: 'प्रोफ़ाइल लोड हो रही है…', memberSince: '%{date} से सदस्य', worldDomination: 'विश्व विजय', conquestLabel: 'पृथ्वी की भूमि का %{pct}% · %{area}M km²', empireMap: 'साम्राज्य का नक्शा', questsCount: 'मिशन (%{claimed} / %{total})', inventory: 'सूची', avatarsCount: 'अवतार (%{n})', flagsCount: 'झंडे (%{n})', tapToClose: 'बंद करने के लिए कहीं भी टैप करें', paidOut: 'काउंटडाउन शून्य होने पर दिया जाता है · आज की चुनौती में शीर्ष 3', metricXP: 'XP', metricQuizzes: 'क्विज़', metricGold: 'सोना', metricCorrect: 'सही', metricAccuracy: 'सटीकता', catXP: 'XP', catLand: 'भूमि', catQuizzes: 'क्विज़', catAvatars: 'अवतार' },
    worldMap: { title: 'विश्व मानचित्र', subtitle: '%{n} देश जीतने हैं', loading: 'देश लोड हो रहे हैं…', purchaseTitle: '%{country} खरीदें?', purchaseBody: '%{cost} सोने में %{country} जीतें?', confirm: 'पुष्टि करें', cancel: 'रद्द करें', success: '%{country} जीत लिया!', successTitle: 'जीत लिया!', notEnoughGold: 'पर्याप्त सोना नहीं', notEnoughGoldBody: '%{country} खरीदने के लिए आपको %{cost} सोने की जरूरत है।', alreadyOwned: 'आप पहले से इस देश के मालिक हैं', error: 'त्रुटि' },
    quizMenu: { howItWorks: 'यह कैसे काम करता है', mapsLeft: '%{n} मैप बचे', trailLocked: 'मार्ग बंद है', trailLockedBody: 'मार्ग अनलॉक करने के लिए और क्विज़ पूरे करें।', gauntletLocked: 'चुनौती बंद है', gauntletLockedBody: 'अनलॉक के लिए उच्च स्तर तक पहुंचें।', acquireTickets: 'टिकट प्राप्त करें', acquireTicketsBody: 'मिशन पूरे करके टिकट जीतें।', tickets: '%{n} टिकट', goldSuffix: 'सोना', quizLocked: 'क्विज़ बंद है', unlockCapitals: 'शॉप में कैपिटल्स क्विज़ अनलॉक करें।', unlockBorders: 'शॉप में बॉर्डर्स क्विज़ अनलॉक करें।', displayInShop: 'शॉप में दिखाएं', gotIt: 'ठीक है', noTicketsBody: 'मिलियनेयर क्विज़ खेलने के लिए कम से कम 1 टिकट चाहिए।\n\nदैनिक पुरस्कारों से टिकट जीतें या शॉप → आइटम में खरीदें।', watch: 'देखें', nextMap: 'अगला मैप %{min}m में', mapsRemaining: '%{n} / %{max} मैप बचे। प्रति क्विज़ 1।' },
    common: { error: 'त्रुटि', cancel: 'रद्द करें', ok: 'ठीक है', loading: 'लोड हो रहा है…', retry: 'पुनः प्रयास' },
    questData: { level_10: { title: 'पहला उत्थान', desc: 'स्तर 10 तक पहुँचें।' }, level_25: { title: 'अनुभवी खोजकर्ता', desc: 'स्तर 25 तक पहुँचें।' }, level_30: { title: 'अनुभवी रणनीतिकार', desc: 'स्तर 30 तक पहुँचें।' }, level_50: { title: 'कुलीन विजेता', desc: 'स्तर 50 तक पहुँचें।' }, level_80: { title: 'महान सेनापति', desc: 'स्तर 80 तक पहुँचें।' }, level_100: { title: 'भूगोल के देवता', desc: 'स्तर 100 तक पहुँचें।' }, first_blood: { title: 'पहली विजय', desc: 'मानचित्र पर अपना पहला देश प्राप्त करें।' }, empire_5: { title: 'बढ़ता साम्राज्य', desc: '5 अलग देश प्राप्त करें।' }, empire_10: { title: 'साम्राज्यिक महत्वाकांक्षाएं', desc: '10 अलग देश प्राप्त करें।' }, empire_25: { title: 'विश्व शक्ति', desc: '25 अलग देश प्राप्त करें।' }, empire_50: { title: 'वैश्विक आधिपत्य', desc: '50 अलग देश प्राप्त करें।' }, streak_20: { title: 'GeoConquest का दीवाना', desc: 'लगातार 20 दिन लॉग इन करें।' }, area_1m: { title: 'विशाल क्षेत्र', desc: '1M वर्ग किमी पर नियंत्रण करें।' }, area_10m: { title: 'महाद्वीपीय विस्तार', desc: '10M वर्ग किमी पर नियंत्रण करें।' }, area_100m: { title: 'पृथ्वी के स्वामी', desc: '100M वर्ग किमी पर नियंत्रण करें।' }, conquer_africa: { title: 'अफ्रीका का सम्राट', desc: 'अफ्रीकी महाद्वीप के प्रत्येक देश को प्राप्त करें।' }, conquer_europe: { title: 'यूरोप का सम्राट', desc: 'यूरोप के प्रत्येक देश को प्राप्त करें।' }, conquer_asia: { title: 'एशिया का सुलतान', desc: 'एशिया के प्रत्येक देश को प्राप्त करें।' }, conquer_oceania: { title: 'प्रशांत का अधिपति', desc: 'ओशिनिया के प्रत्येक देश को प्राप्त करें।' }, conquer_americas: { title: 'अमेरिका का सेनापति', desc: 'अमेरिका के प्रत्येक देश को प्राप्त करें।' }, flag_mastery_30s: { title: 'गति जासूस', desc: '30 सेकंड में >90% सटीकता के साथ झंडा क्विज़ पूरी करें।' }, ground_invasion: { title: 'भूमि आक्रमण', desc: '30 सेकंड में >90% सटीकता के साथ राजधानी क्विज़ पूरी करें।' }, quiz_10: { title: 'क्विज़ नवसिखिया', desc: 'किसी भी प्रकार के 10 क्विज़ पूरे करें।' }, quiz_50: { title: 'क्विज़ दिग्गज', desc: 'किसी भी प्रकार के 50 क्विज़ पूरे करें।' }, excellence_20: { title: 'विश्व का विद्वान', desc: '20 अलग क्विज़ में 85% या अधिक अंक प्राप्त करें।' }, trail_blazer_50: { title: 'मार्ग प्रशस्तक', desc: 'एक मार्ग क्विज़ में 30 प्रश्न सही उत्तर दें।' }, gauntlet_ascendant: { title: 'उत्थानशील', desc: 'चुनौती में स्तर 100 तक पहुँचें।' }, perfect_accuracy_15: { title: 'सटीकता', desc: '15 अलग क्विज़ में 100% सटीकता प्राप्त करें।' }, daily_champion_5: { title: 'दिन का चैंपियन', desc: 'दैनिक चुनौती में 5 बार 1st स्थान पर समाप्त करें।' }, avatar_collector_10: { title: 'अवतार शिकारी', desc: '10 अलग अवतार एकत्र करें।' }, max_tier_avatar: { title: 'शीर्ष संग्रहकर्ता', desc: 'किसी भी संग्रह में उच्चतम स्तर का अवतार प्राप्त करें।' }, complete_the_world: { title: 'विश्व विजय', desc: 'दुनिया के सभी 250 देश प्राप्त करें।' }, nightmare_complete: { title: 'दुःस्वप्न से बचे', desc: 'शाबाश, अधोलोक के विजेता।' }, true_conqueror: { title: 'बस एक ही है।', desc: 'दिव्य महाराजा, दिव्य महारानी और पशुचिह्न धारण करें।' }, never_enough: { title: 'कभी पर्याप्त नहीं', desc: 'दिव्य महाराजा और ब्रह्मांडीय कवच धारण करें।' }, level_150: { title: 'उत्थित मन', desc: 'स्तर 150 तक पहुँचें।' }, level_200: { title: 'एटलस का मिथक', desc: 'स्तर 200 तक पहुँचें।' }, level_250: { title: 'शाश्वत सम्राट', desc: 'स्तर 250 तक पहुँचें।' }, level_300: { title: 'परदे से परे', desc: 'स्तर 300 तक पहुँचें।' } },
  },

  'zh-Hans': {
    quizzes: { title: '测验' },
    quiz: {
      millionaire: '百万富翁测验',
      flag: '国旗',
      shape: '轮廓',
      capitals: '首都',
      borders: '边界',
      trail: '路线',
      draw: '制图师',
      gauntlet: '挑战关',
      nightmare: '噩梦',
    },
    menu: { language: '语言', signOut: '登出', deleteAccount: '删除账户' },
    tabs: { home: '主页', quizzes: '测验', shop: '商店', leaderboard: '排行榜', quests: '任务' },
    nav: {
      flagQuiz: '国旗测验',
      shapeQuiz: '轮廓测验',
      bordersQuiz: '边界测验',
      capitalsQuiz: '首都测验',
      trailQuiz: '路线测验',
      millionaireQuiz: '百万富翁测验',
      nightmareMode: '噩梦模式',
      drawBorder: '描绘边界',
      results: '结果',
      setPassword: '设置新密码',
      setPasswordMsg: '为您的账户输入新密码。',
      newPassword: '新密码',
      confirmPassword: '确认新密码',
      saving: '保存中…',
      savePassword: '保存密码',
      passwordMismatch: '密码不匹配且不能为空。',
      passwordShort: '密码至少需要6个字符。',
      passwordSuccess: '密码已更新！',
      passwordFailed: '更新密码失败。',
    },
    difficulty: { title: '难度', easy: '简单', medium: '中等', hard: '困难' },
    quizCommon: { paused: '已暂停', resume: '继续', quit: '退出', letsGo: '开始！', goBack: '返回', tapToContinue: '点击任意处继续 →', noQuestions: '没有可用问题', offline: { title: '离线', body: '升级到征服者通行证可离线游玩。', upgrade: '升级' }, learn: '了解' },
    infoModal: { capital: '首都', region: '地区', population: '人口', area: '面积', neighbors: '邻国', islandNation: '🏝️ 岛国', gotIt: '知道了！', na: '不适用' },
    flagQuiz: { subtitle: '通过国旗识别国家。', loading: '准备国旗中…', whichFlagOf: '%{country}的国旗是哪个？', whichCountry: '这面国旗属于哪个国家？' },
    shapeQuiz: { subtitle: '通过轮廓识别国家。', loading: '准备轮廓中…', whichCountry: '这个轮廓是哪个国家？', whichShapeOf: '%{country}的轮廓是哪个？' },
    bordersQuiz: { subtitle: '识别相邻国家。', loading: '准备边界中…', doesBorder: '%{a}与%{b}接壤吗？', doesNotBorder: '哪个国家与%{country}不接壤？', sharesBorder: '哪个国家与%{country}接壤？', yes: '是', no: '否' },
    capitalsQuiz: { subtitle: '将国家与首都配对。', loading: '准备首都中…', capitalOf: '%{country}的首都是什么？', countryOf: '%{capital}是哪个国家的首都？' },
    trailQuiz: { subtitle: '穿越相邻国家的路线。', loading: '准备路线中…', question: '路线中下一个国家是哪个？', whatCountry: '这是哪个国家？', whatCapital: '这个国家的首都是什么？', whatFlag: '这个国家的国旗是哪个？' },
    millionaireQuiz: { loading: '准备题目中…', lifeline50: '50/50', lifelineSkip: '换题', lifelineAudience: '观众', walkTitle: '你势不可挡！', walkBody: '带着%{amount}金币离开？', walk: '离开', keepGoing: '继续', winTitle: '大奖！', winBody: '你赢得了%{amount}金币！', secondChanceTitle: '第二次机会？', secondChanceBody: '用一张票再试一次？', useTicket: '使用票', noThanks: '不了', pushForward: '继续前进！', takeGold: '拿走我的%{amount}金币', readySubtitle: '15道题赢取大奖，请做好准备', loadingChallenge: '正在准备您的挑战…', prizeNow: '现在', prizeNext: '下一步', claimGold: '领取金币', conquerBody: '您征服了全部15道题！', walkNoXp: "拿走金币将结束本局且不获得经验值。只有 15/15 全对才能获得经验值。", checkpointBody: '您离下一个层级非常接近。再答对一题可能改变一切。', secondChanceWatchBody: '观看广告替换此题并继续。', watchAd: '看广告', loadingAd: '广告加载中…', powerUpLocked: '道具已锁定', powerUpLockedBody: '此道具需要在升级商店购买。' },
    nightmareQuiz: { penaltyRoll: '掷骰决定惩罚', penaltyTaken: '扣除你 %{pct}% 的金币。', loading: '准备噩梦中…', curseDrawn: '诅咒降临', blind: '失明', blindDesc: '问题藏在迷雾之后，迷雾会慢慢散去。', shuffle: '混乱', shuffleDesc: '选项每3秒随机排列。', rush: '急速', rushDesc: '本题时间减半。', phantom: '幽灵', phantomDesc: '一个正确答案被隐藏。', winTitle: '兽印属于你', winBody: '你征服了噩梦。', readySubtitle: '你对阵黑暗之王', loadingChallenge: '唤醒噩梦…', blindReveal: '穿过迷雾……', shuffleReveal: '小心点击位置。', rushReveal: '5秒。计时现在开始。', phantomReveal: '信任幽灵。', winKing: '你是冥界新王', takeOwed: '取走属于你的' },
    gauntlet: { inARow: '连续答对', welcomeTo: '欢迎来到', round: '第%{n}轮', bossRound: 'BOSS轮  x2', shieldAbsorbed: '护盾已吸收', shieldAcquired: '获得护盾', whichFlag: '哪个国家有这面国旗？', whichCapital: '%{country}的首都是什么？', whichCountryCapital: '哪个国家有这个首都？', sharesBorder: '哪个国家与%{country}接壤？', whichShape: '哪个国家有这个轮廓？', t2FlagCapital: '这面国旗的首都是什么？', t2FlagBorder: '哪个国家与这面国旗的国家接壤？', t2FlagShape: '这面国旗的轮廓是什么？', t2ShapeCapital: '这个轮廓的首都是什么？', t2ShapeBorder: '哪个国家与这个轮廓的国家接壤？', t2ShapeFlag: '这个轮廓的国旗是什么？', t2CapitalFlag: '这个首都的国旗是什么？', t2CapitalShape: '这个首都的轮廓是什么？', t2CapitalBorder: '哪个国家与这个首都的国家接壤？', tiers: { eternity: '永恒', oblivion: '遗忘', inferno: '炼狱', hell: '地狱', void: '虚空', abyss: '深渊', peril: '危险', danger: '危险' }, loading: '进入挑战...', title: '挑战赛', finalPhase: '最终阶段', nextPhase: '下一阶段 %{progress}/%{step}', correctLeft: '再答对%{n}题晋级', readySubtitle: '你的征途才刚刚开始', keepGoing: '继续', tierDescPeril: '热度在上升...', tierDescAbyss: '深邃的未知...', tierDescVoid: '无尽征服', tierDescHell: '地狱 - 重生', tierDescInferno: '征服', tierDescOblivion: '什么都不剩', tierDescEternity: '超越', milestone5: '刚刚开始', milestone10: '两位数', milestone15: '专注中', milestone20: '深入深渊', milestone25: '四分之一', milestone30: '虚空降临', milestone40: '欢迎来到地狱', milestone50: '已到一半', milestone60: '无路可退', milestone70: '遗忘已至', milestone75: '传奇', milestone100: '无法阻挡' },
    drawQuiz: { submit: '提交', nextRound: '下一轮', done: '完成', round: '第%{current}轮 / 共%{total}轮', drawBorderBetween: '画出%{a}和%{b}之间的边界', loading: '正在构建边界对…', error: '无法构建足够的题目对，请稍后再试。', title: '制图师', subtitle: '尽可能准确地画出地球上的边界', borderParts: '这条边界有%{n}段：请逐段画出', drawPrompt: '画出它们之间的边界：', revealPrompt: '这是实际边界：', actualBorder: '实际边界', yourStroke: '你的笔划', clear: '清除', seeResults: '查看结果', next: '下一个 →', ratingPerfect: '完美！', ratingGreat: '很好！', ratingGood: '不错', ratingClose: '接近', ratingMiss: '偏差太大', rating: { gold: '金牌', silver: '银牌', bronze: '铜牌', miss: '未中' } },
    results: { score: '分数', totalTime: '总时间', xpEarned: '获得XP', boost: '加成', x2Applied: 'x2已应用', level: '等级%{n}', levelUpBonus: '升级奖励 +%{bonus}', gold: '金币', balance: '余额', penalty: '扣分', reward: '奖励', playAgain: '再玩一次', backToQuizzes: '返回测验', shareResult: '分享结果', shareText: '我在%{quiz}的得分是……下载Geo Conquest！', shareHeadline: "这是我在测验中的得分，\n你能做得更好吗？", shareDownload: '下载Geo Conquest', levelUpTitle: '升级 — 等级%{n} (+%{bonus})', remarks: { wellPlayed: '打得好！', almostThere: '差一点！', pumpNumbers: '需要提高成绩', solidEffort: '努力不错', oof: '哎...', wellPlayedGauntlet: '打得好..', payUp: '付钱走人', flawless: '完美胜利！', notGoodEnough: '还不够好', wastedTicket: '不会真的为这个浪费了票吧...' } },
    maps: { outOfMaps: '地图用完了！', readyToConquer: '准备征服！', refillRate: '地图每60分钟补充1张。', becomeConqueror: '成为征服者', unlimitedMaps: '无限地图 — 永不等待', watchAd: '看广告', comeBackTomorrow: '明天再来', getMap: '获得1张地图 · 今天还剩%{left}张', wait: '等待', noTickets: '没有票', playAgainPrompt: '再玩一次？' },
    achievements: { title: '任务', progress: '%{claimed} / %{total} 已领取', conquerorPass: '征服者通行证 — 解锁全部', locked: '???', claim: '领取', rewards: '奖励', error: '错误' },
    home: { empire: '你的帝国', worldProgress: '世界征服进度', countries: '国家 ▸', invite: '邀请朋友 — 双方各得1,500金币', dailyReward: '每日奖励', claim: '领取', streak: '%{n}天连续', deleteAccount: '删除账户', deleteBody: '这将永久删除你的账户和所有数据，无法撤销。', deleteForever: '永久删除', earthArea: '占地球陆地面积的%{pct}%', questsDone: '已完成任务', avatarsOwned: '已拥有头像', quizzesDone: '已完成测验', topExplorers: '顶级探险家', loadingRankings: '加载排名中...', you: '（你）', level: '等级%{n}', becomeConqueror: '成为征服者', manageSubscription: '管理订阅', closeGoldShop: '✕ 关闭', ownedCountries: '已拥有国家（%{n}）', noCountries: '还没有国家。赚取金币并前往商店！', welcomeTitle: '欢迎，探险家！', welcomeSubtitle: '是时候建立你的帝国了。', welcomeStep1: '通过测验赚取金币，分数越高，金币越多。', welcomeStep2: '在商店花费金币购买国家、头像和游戏升级。', welcomeStep3: '完成任务以解锁独家奖励和稀有头像。', welcomeStep4: '在每日挑战中与全球探险家竞争。', letsConquer: '去征服吧！', updateTitle: 'v%{version}已发布！', updateBody: '你当前版本为v%{current}，更新以获取最新功能和修复。', updateNow: '立即更新', later: '稍后' },
    login: { tagline: '征服世界，一次一个测验', email: '邮箱', password: '密码', signIn: '登录', forgotPassword: '忘记密码？', noAccount: '没有账户？注册', signingIn: '登录中…', resetSent: '重置邮件已发送！', error: '错误', or: '或', continueWithGoogle: '使用Google继续', connecting: '连接中…', forgotPasswordTitle: '重置密码', forgotPasswordBody: '输入您的邮箱，我们将发送重置链接。', emailSentTitle: '邮件已发送', emailSentBody: '请查看收件箱中的密码重置链接。', done: '完成', sending: '发送中…', sendResetLink: '发送重置链接', cancel: '取消', fillFields: '请填写所有字段', enterEmail: '请输入您的邮箱地址。', signInFailed: '登录失败', googleFailed: 'Google登录失败', appleFailed: 'Apple登录失败' },
    signup: { title: '开始你的征服', email: '邮箱', password: '密码', signUp: '注册', haveAccount: '已有账户？登录', signingUp: '创建账户中…', error: '错误', or: '或', continueWithGoogle: '使用Google继续', connecting: '连接中…', passwordMin: '密码（最少6位）', fillFields: '请填写所有字段', passwordTooShort: '密码至少需要6个字符', googleFailed: 'Google登录失败', appleFailed: 'Apple登录失败' },
    onboarding: { chooseName: '选择你的名字', chooseAvatar: '选择你的头像', chooseFlag: '选择你的旗帜', referral: '有推荐码？', usernamePlaceholder: '用户名', referralPlaceholder: '推荐码（可选）', next: '下一步 →', finish: '开始征服！', usernameTaken: '该用户名已被使用', usernameShort: '用户名至少需要3个字符', referralAccepted: '推荐码已接受！双方各得1,500金币', referralInvalid: '无效推荐码', error: '错误', usernameSubtitle: '为排行榜选择唯一用户名', enterUsername: '输入您的用户名', usernameHint: '3–20个字符，字母、数字、下划线', checking: '检查中…', avatarSubtitle: '这将代表您在游戏中', avatarHint: '不满意？随时在Avatar Shop解锁50+角色。', back: '← 返回', flagSubtitle: '选择您国家的旗帜', searchCountry: '搜索国家…', referralSubtitle: '如果朋友邀请您，请在下方输入他们的用户名。', verify: '验证', creating: '创建中…', imReady: '我准备好了', ownUsername: '您不能使用自己的用户名作为推荐码。', referralNotFound: '未找到推荐码。请检查后重试。' },
    shop: { countries: '国家', avatars: '头像', flags: '旗帜', upgrades: '升级', buy: '购买', owned: '已拥有', equipped: '已装备', equip: '装备', notEnoughGold: '金币不足', purchaseSuccess: '购买成功！', error: '错误', conquererPass: '征服者通行证 — 解锁全部', needMoreGold: '需要更多金币？', buyGold: '购买金币 →', bulkBuy: '批量购买', bulkBuyDesc: '以%{cost}金币征服%{count}个国家', goldRemaining: '剩余%{n}金币', buyAll: '全部购买', loadingCountries: '加载国家中…', searchCountries: '搜索国家…', ownedCheck: '已拥有 ✓', ownedMinus: '- 已拥有', locked: '已锁定', conquered: '已征服！', countriesAdded: '%{n}个国家已添加到您的帝国。', avatarUnlockedTitle: '头像已解锁！', flagUnlockedTitle: '旗帜已解锁！', switchToOwned: '前往"已拥有"标签页装备它。', avatarEquippedTitle: '头像已装备！', avatarEquippedBody: '您的头像将显示在排行榜中。', mustOwnFirst: '您必须先拥有%{name}。', easterEggTitle: '🎉 发现彩蛋！', easterEggBody: '恭喜！这里有5张免费票。', ticketPackAddedTitle: '票包已添加', ticketsAddedBody: '5张票已添加到您的库存。', ticketAddedTitle: '票已添加', ticketAddedBody: '已添加到您的库存。', thanksForWatchingTitle: '感谢观看！', ticketWatchBody: '1张票已添加到您的库存。', upgradesSubtitle: '扩展您的远征以获得巨大倍数。', capitalsQuizUpgrade: '首都测验', bordersQuizUpgrade: '边界测验', standardExpedition: '标准远征（10）', level2Expedition: '2级远征', level2Desc: '每次测验最多玩20轮', level3Expedition: '3级远征', level3Desc: '每次测验最多玩30轮', millionaireSwap: '百万富翁交换', millionaireSwapDesc: '在百万富翁测验中交换一个问题', darkScroll: '暗卷轴', darkScrollDesc: '解锁噩梦测验', infiniteMaps: '无限地图', infiniteMapsDesc: '永不等待地图', speedDetectiveQuest: '完成Speed Detective任务', groundInvasionQuest: '完成Ground Invasion任务', acquireTickets: '获取百万富翁票', millionaireTicket: '百万富翁票', oneTicket: '1张票', ticketPack: '票包', ticketsCount: '5张百万富翁票', watchAnAd: '看广告', oneAdTicket: '1个广告换1张票', bulkBuyTitle: '批量购买', purchaseFailed: '购买失败', purchaseFailedBody: '出错了。', conqueredTitle: '已征服！', previousTier: '上一级', featuredToday: '今日推荐', todayOff: '今天八折优惠', adUnavailable: '广告不可用', free: '免费', cancel: '取消', claim: '领取！', tapToClose: '点击任意处关闭' },
    goldShop: { title: '金币商店', subtitle: '加速你的征服', mostPopular: '最受欢迎', bestValue: '最超值', confirmTitle: '确认购买', youReceive: '你将获得', price: '价格', buy: '购买', cancel: '取消', goldAdded: '已添加%{amount}金币！', goldAddedBody: '你的金币余额已更新。', pending: '购买待处理', pendingBody: '你的购买正在处理中。', error: '错误', devWarning: 'Dev模式 — 无真实购买', purchaseSuccessTitle: '购买成功！', goldAddedTitle: '已添加%{amount}金币', goldAddedSubtitle: '您的余额已更新。', purchaseFailedTitle: '购买失败', purchaseFailed: '请重试。', iapTitle: '应用内购买', tempUnavailableTitle: '暂时不可用', tempUnavailableBody: '此金币包目前不可用。请稍后重试。', gold: '金币', devModeWarning: '⚠️ 开发模式。使用EAS构建以进行真实购买。', previewMode: '预览 — 使用EAS构建以购买', pendingDelivery: '检测到付款，但金币暂未确认。请重新打开金币商店。' },
    crateShop: { title: '神秘箱子', legendary: '传奇箱子', legendaryDesc: 'SVG头像和派系旗帜。有机会获得传奇掉落！', dropRates: '掉落概率', common: '普通', rare: '稀有', epic: '史诗', legendaryRarity: '传奇', notEnoughGold: '没有足够金币开箱。', open: '开箱', error: '错误' },
    premium: { heroTitle: '成为\n世界征服者', heroSubtitle: '世界不会自己被征服。', heroSub: '掌握地理知识。主宰排行榜。\n无限制地征服世界。', joinExplorers: '1,200名高级探索者', hookHighlight: '征服者拥有3倍以上领土', hookSuffix: '并且比免费玩家在排行榜上攀升快5倍。', sectionEverything: '征服者的全部内容', sectionFreeVsPro: '免费 vs 征服者', featureHeader: '功能', freeHeader: '免费', sectionChoosePlan: '选择您的计划', once: '一次', lifetimeBreakdown: '单次付款 · 终身访问', monthlyPer: '/月', cancelAnytime: '随时取消', securePayment: '通过App Store / Google Play安全处理', trustSecure: '安全支付', trustLifetime: '终身访问', trustInstant: '即时访问', sectionTestimonials: '征服者怎么说', ratingLabel: '2,000+指挥官的4.9/5评分', urgencyBanner: '月度计划 — 首月5折优惠 — 到期 ', mostPopular: '最受欢迎', flagOnly: '仅旗帜', allQuizzes: '所有测验', feature1Title: '三倍每日奖励', feature1Desc: '从每日奖励中获得3倍金币和3倍票。', feature2Title: '2倍测验奖励', feature2Desc: '每次完成测验获得双倍金币和XP。', feature3Title: '离线游戏', feature3Desc: '首都、边界和形状测验无需网络即可运行。', feature4Title: '独特头像', feature4Desc: '其他地方没有的专属征服者头像。', feature5Title: '独特任务', feature5Desc: '访问仅限征服者的专属内容。', feature6Title: '征服者徽章', feature6Desc: '全球排行榜中的专属王冠徽章。', compare1: '每日金币倍增', compare2: '每日票倍增', compare3: '排行榜徽章', compare4: '独特头像', compare5: '独特任务', compare6: '测验金币和XP', compare7: '抢先体验', compare8: '离线游戏', faq1q: '终身计划如何运作？', faq1a: '这是单次付款 — 无订阅。您将获得永久访问权限以及10张票和3个神话宝箱。', faq2q: '我可以取消月度计划吗？', faq2a: '是的。从App Store / Google Play设置一键取消。', faq3q: '取消后我的物品还在吗？', faq3a: '是的！每个购买的国家、头像和旗帜永远属于您。', faq4q: '接受哪些付款方式？', faq4a: '所有付款通过App Store或Google Play Billing处理。', lifetime: '终身', monthly: '月度', bestDeal: '最佳优惠', getLifetime: '获得终身访问', getMonthly: '开始月度订阅', restore: '恢复购买', restoring: '恢复中…', terms: '条款', privacy: '隐私', faq: '常见问题', welcomeTitle: '欢迎，征服者！', welcomeBody: '您现在拥有无限访问权限。出发吧！', failedTitle: '购买失败', failedBody: '出错了。请重试。', restoredTitle: '已恢复！', restoredBody: '您的购买已恢复。', nothingTitle: '无可恢复', nothingBody: '未找到之前的购买记录。', ok: '确定' },
    leaderboard: { title: '排行榜', mostXP: '最多XP', mostQuizzes: '最多测验', mostGold: '最多金币', mostCorrect: '最多正确答案', highestAccuracy: '最高准确率', loading: '加载中…', error: '错误', rank: '第%{n}名', daily: '每日', allTime: '历史', searchPlayers: '搜索玩家…', explorers: '%{n}名探险家', competingToday: '今日%{n}名参赛', resetsIn: '重置于', updatesIn: '更新于', todaysChallenge: '今日挑战：', rewards: '奖励', noPlayersFound: '未找到"%{query}"的玩家', noExplorers: '还没有探险家，快成为第一个！', levelShort: 'Lv%{n}', you: '（你）', awesome: '太棒了！', dailyChallengeRewards: '每日挑战奖励', explorerProfile: '探险家档案', loadingProfile: '加载档案中…', memberSince: '%{date}加入', worldDomination: '世界征服', conquestLabel: '占地球陆地%{pct}% · %{area}M km²', empireMap: '帝国版图', questsCount: '任务（%{claimed} / %{total}）', inventory: '物品栏', avatarsCount: '头像（%{n}）', flagsCount: '旗帜（%{n}）', tapToClose: '点击任意处关闭', paidOut: '倒计时归零时发放 · 今日挑战前3名', metricXP: 'XP', metricQuizzes: '测验', metricGold: '金币', metricCorrect: '正确', metricAccuracy: '准确率', catXP: 'XP', catLand: '土地', catQuizzes: '测验', catAvatars: '头像' },
    worldMap: { title: '世界地图', subtitle: '还有%{n}个国家待征服', loading: '加载国家中…', purchaseTitle: '购买%{country}？', purchaseBody: '花费%{cost}金币征服%{country}？', confirm: '确认', cancel: '取消', success: '%{country}已征服！', successTitle: '征服成功！', notEnoughGold: '金币不足', notEnoughGoldBody: '你需要%{cost}金币来购买%{country}。', alreadyOwned: '你已经拥有这个国家了', error: '错误' },
    quizMenu: { howItWorks: '如何运作', mapsLeft: '剩余%{n}张地图', trailLocked: '路线锁定', trailLockedBody: '完成更多测验以解锁路线。', gauntletLocked: '挑战关锁定', gauntletLockedBody: '达到更高等级以解锁。', acquireTickets: '获取票', acquireTicketsBody: '通过完成任务赢得票。', tickets: '%{n}张票', goldSuffix: '金币', quizLocked: '测验已锁定', unlockCapitals: '在商店中解锁首都测验。', unlockBorders: '在商店中解锁边界测验。', displayInShop: '在商店查看', gotIt: '好的', noTicketsBody: '您需要至少1张票才能参加百万富翁测验。\n\n通过每日奖励赢取票，或在商店→道具中购买。', watch: '观看', nextMap: '%{min}分钟后下一张地图', mapsRemaining: '剩余%{n} / %{max}张地图。每次测验消耗1张。' },
    common: { error: '错误', cancel: '取消', ok: '确定', loading: '加载中…', retry: '重试' },
    questData: { level_10: { title: '初次晋升', desc: '达到等级10。' }, level_25: { title: '老练探索者', desc: '达到等级25。' }, level_30: { title: '资深战略家', desc: '达到等级30。' }, level_50: { title: '精英征服者', desc: '达到等级50。' }, level_80: { title: '传奇指挥官', desc: '达到等级80。' }, level_100: { title: '地理之神', desc: '达到等级100。' }, first_blood: { title: '首次征服', desc: '在地图上占领第一个国家。' }, empire_5: { title: '帝国崛起', desc: '占领5个不同的国家。' }, empire_10: { title: '帝国野心', desc: '占领10个不同的国家。' }, empire_25: { title: '世界强国', desc: '占领25个不同的国家。' }, empire_50: { title: '全球霸主', desc: '占领50个不同的国家。' }, streak_20: { title: 'GeoConquest成瘾者', desc: '连续登录20天。' }, area_1m: { title: '广袤领土', desc: '控制超过100万平方公里。' }, area_10m: { title: '大陆扩张', desc: '控制超过1000万平方公里。' }, area_100m: { title: '地球主宰', desc: '控制超过1亿平方公里。' }, conquer_africa: { title: '非洲霸主', desc: '占领非洲大陆所有国家。' }, conquer_europe: { title: '欧洲皇帝', desc: '占领欧洲所有国家。' }, conquer_asia: { title: '亚洲苏丹', desc: '占领亚洲所有国家。' }, conquer_oceania: { title: '太平洋霸主', desc: '占领大洋洲所有国家。' }, conquer_americas: { title: '美洲指挥官', desc: '占领美洲所有国家。' }, flag_mastery_30s: { title: '速度侦探', desc: '在30秒内以超过90%的准确率完成旗帜测验。' }, ground_invasion: { title: '地面入侵', desc: '在30秒内以超过90%的准确率完成首都测验。' }, quiz_10: { title: '测验新手', desc: '完成任意类型的10个测验。' }, quiz_50: { title: '测验老手', desc: '完成任意类型的50个测验。' }, excellence_20: { title: '世界学者', desc: '在20个不同的测验中获得85%或更高分数。' }, trail_blazer_50: { title: '拓荒者', desc: '在单次路线测验中正确回答30个问题。' }, gauntlet_ascendant: { title: '超凡入圣', desc: '在挑战中达到100级。' }, perfect_accuracy_15: { title: '精确', desc: '在15个不同的测验中达到100%准确率。' }, daily_champion_5: { title: '今日冠军', desc: '在每日挑战中5次获得第1名。' }, avatar_collector_10: { title: '头像猎人', desc: '收集10个不同的头像。' }, max_tier_avatar: { title: '顶级收藏家', desc: '获得任意系列中最高等级的头像。' }, complete_the_world: { title: '世界征服', desc: '占领世界上所有250个国家。' }, nightmare_complete: { title: '噩梦幸存者', desc: '干得好，地下世界的征服者。' }, true_conqueror: { title: '唯一。', desc: '手持神圣高王、神圣高后和兽之印记。' }, never_enough: { title: '永不满足', desc: '手持神圣高王和宇宙盔甲。' }, level_150: { title: '觉醒之心', desc: '达到等级150。' }, level_200: { title: '阿特拉斯神话', desc: '达到等级200。' }, level_250: { title: '永恒君主', desc: '达到等级250。' }, level_300: { title: '超越面纱', desc: '达到等级300。' } },
  },

  he: {
    quizzes: { title: 'חידונים' },
    quiz: {
      millionaire: 'חידון המיליונר',
      flag: 'דגלים',
      shape: 'צורות',
      capitals: 'בירות',
      borders: 'גבולות',
      trail: 'מסלול',
      draw: 'יוצר מפות',
      gauntlet: 'האתגר',
      nightmare: 'הסיוט',
    },
    menu: { language: 'שפה', signOut: 'התנתקות', deleteAccount: 'מחיקת חשבון' },
    tabs: { home: 'בית', quizzes: 'חידונים', shop: 'חנות', leaderboard: 'טבלת מובילים', quests: 'משימות' },
    nav: {
      flagQuiz: 'חידון דגלים',
      shapeQuiz: 'חידון צורות',
      bordersQuiz: 'חידון גבולות',
      capitalsQuiz: 'חידון בירות',
      trailQuiz: 'חידון מסלול',
      millionaireQuiz: 'חידון המיליונר',
      nightmareMode: 'מצב סיוט',
      drawBorder: 'צייר את הגבול',
      results: 'תוצאות',
      setPassword: 'הגדר סיסמה חדשה',
      setPasswordMsg: 'הזן סיסמה חדשה לחשבונך.',
      newPassword: 'סיסמה חדשה',
      confirmPassword: 'אשר סיסמה חדשה',
      saving: 'שומר…',
      savePassword: 'שמור סיסמה',
      passwordMismatch: 'הסיסמאות חייבות להתאים ולא יכולות להיות ריקות.',
      passwordShort: 'הסיסמה חייבת להכיל לפחות 6 תווים.',
      passwordSuccess: 'הסיסמה עודכנה!',
      passwordFailed: 'עדכון הסיסמה נכשל.',
    },
    difficulty: { title: 'רמת קושי', easy: 'קל', medium: 'בינוני', hard: 'קשה' },
    quizCommon: { paused: 'מושהה', resume: 'המשך', quit: 'יציאה', letsGo: 'בואו נתחיל!', goBack: 'חזור', tapToContinue: 'הקש להמשך →', noQuestions: 'אין שאלות זמינות', offline: { title: 'אין חיבור', body: 'שדרג לכרטיס הכובש כדי לשחק ללא חיבור.', upgrade: 'שדרג' }, learn: 'למד' },
    infoModal: { capital: 'בירה', region: 'אזור', population: 'אוכלוסייה', area: 'שטח', neighbors: 'שכנים', islandNation: '🏝️ מדינת אי', gotIt: 'הבנתי!', na: 'לא זמין' },
    flagQuiz: { subtitle: 'זהה מדינות לפי הדגלים שלהן.', loading: 'מכין דגלים…', whichFlagOf: 'איזה דגל שייך ל%{country}?', whichCountry: 'לאיזו מדינה שייך הדגל הזה?' },
    shapeQuiz: { subtitle: 'זהה מדינות לפי הצורה שלהן.', loading: 'מכין צורות…', whichCountry: 'לאיזו מדינה שייכת הצורה הזו?', whichShapeOf: 'איזו צורה שייכת ל%{country}?' },
    bordersQuiz: { subtitle: 'זהה מדינות שגובלות זו בזו.', loading: 'מכין גבולות…', doesBorder: 'האם %{a} גובלת ב%{b}?', doesNotBorder: 'איזו מדינה אינה גובלת ב%{country}?', sharesBorder: 'איזו מדינה חולקת גבול עם %{country}?', yes: 'כן', no: 'לא' },
    capitalsQuiz: { subtitle: 'התאם מדינות לבירות שלהן.', loading: 'מכין בירות…', capitalOf: 'מהי הבירה של %{country}?', countryOf: 'באיזו מדינה %{capital} היא הבירה?' },
    trailQuiz: { subtitle: 'נווט דרך מדינות שכנות.', loading: 'מכין מסלול…', question: 'איזו מדינה באה הבאה במסלול?', whatCountry: 'איזו מדינה זו?', whatCapital: 'מהי הבירה של מדינה זו?', whatFlag: 'מהו הדגל של מדינה זו?' },
    millionaireQuiz: { loading: 'מכין שאלות…', lifeline50: '50/50', lifelineSkip: 'החלף', lifelineAudience: 'קהל', walkTitle: 'אתה בוער!', walkBody: 'לצאת עם %{amount} זהב?', walk: 'צא', keepGoing: 'המשך', winTitle: 'ג\'קפוט!', winBody: 'זכית ב%{amount} זהב!', secondChanceTitle: 'הזדמנות שנייה?', secondChanceBody: 'להשתמש בכרטיס לניסיון נוסף?', useTicket: 'השתמש בכרטיס', noThanks: 'לא תודה', pushForward: 'קדימה!', takeGold: 'קח את ה%{amount} זהב שלי', readySubtitle: '15 שאלות לג\'קפוט, ודא שאתה מוכן', loadingChallenge: 'מכין את האתגר שלך…', prizeNow: 'עכשיו', prizeNext: 'הבא', claimGold: 'קבל את הזהב', conquerBody: 'כבשת את כל 15 השאלות!', walkNoXp: "לקיחת הזהב מסיימת את הריצה בלי XP. XP ניתן רק על 15/15 מושלם.", checkpointBody: 'אתה קרוב מאוד לרמה הבאה. עוד תשובה נכונה אחת יכולה לשנות הכל.', secondChanceWatchBody: 'צפה בפרסומת כדי להחליף שאלה זו ולהמשיך.', watchAd: 'צפה בפרסומת', loadingAd: 'טוען פרסומת…', powerUpLocked: 'שיפור נעול', powerUpLockedBody: 'יש לרכוש שיפור זה בחנות השיפורים.' },
    nightmareQuiz: { penaltyRoll: 'הטל קובייה לעונש', penaltyTaken: '%{pct}% מהזהב שלך נלקחו.', loading: 'מכין סיוט…', curseDrawn: 'קללה הופעלה', blind: 'עיוור', blindDesc: 'השאלה מוסתרת מאחורי ערפל שמתפוגג לאט.', shuffle: 'ערבוב', shuffleDesc: 'האפשרויות מתערבבות כל 3 שניות.', rush: 'מהירות', rushDesc: 'הזמן לשאלה זו מחצי.', phantom: 'רוח', phantomDesc: 'תשובה נכונה אחת מוסתרת.', winTitle: 'חותם החיה שלך', winBody: 'כבשת את הסיוט.', readySubtitle: 'אתה נגד אדון האופל', loadingChallenge: 'מעורר את הסיוט…', blindReveal: 'דרך הערפל...', shuffleReveal: 'שים לב היכן אתה לוחץ.', rushReveal: '5 שניות. השעון מתחיל עכשיו.', phantomReveal: 'סמוך על הרוח.', winKing: 'אתה המלך החדש של העולם התחתון', takeOwed: 'קח את המגיע לך' },
    gauntlet: { inARow: 'תשובות נכונות ברצף', welcomeTo: 'ברוכים הבאים ל', round: 'סיבוב %{n}', bossRound: 'סיבוב בוס  x2', shieldAbsorbed: 'מגן נבלע', shieldAcquired: 'מגן התקבל', whichFlag: 'לאיזו מדינה שייך הדגל הזה?', whichCapital: 'מהי הבירה של %{country}?', whichCountryCapital: 'לאיזו מדינה שייכת הבירה הזו?', sharesBorder: 'איזו מדינה חולקת גבול עם %{country}?', whichShape: 'לאיזו מדינה שייכת הצורה הזו?', t2FlagCapital: 'מהי הבירה של דגל זה?', t2FlagBorder: 'איזו מדינה גובלת במדינה של דגל זה?', t2FlagShape: 'איזו צורה שייכת לדגל זה?', t2ShapeCapital: 'מהי הבירה של צורה זו?', t2ShapeBorder: 'איזו מדינה גובלת במדינה של צורה זו?', t2ShapeFlag: 'איזה דגל שייך לצורה זו?', t2CapitalFlag: 'איזה דגל שייך לבירה זו?', t2CapitalShape: 'איזו צורה שייכת לבירה זו?', t2CapitalBorder: 'איזו מדינה גובלת במדינה של בירה זו?', tiers: { eternity: 'נצח', oblivion: 'שכחה', inferno: 'גיהינום', hell: 'גיהינום', void: 'ריק', abyss: 'תהום', peril: 'סכנה', danger: 'סכנה' }, loading: 'כניסה לאתגר...', title: 'האתגר', finalPhase: 'שלב סופי', nextPhase: 'שלב הבא %{progress}/%{step}', correctLeft: 'עוד %{n} להתקדמות', readySubtitle: 'המסע שלך רק מתחיל', keepGoing: 'המשך', tierDescPeril: 'החום עולה...', tierDescAbyss: 'הלא נודע העמוק...', tierDescVoid: 'כיבוש אינסופי', tierDescHell: 'גיהינום - נולד מחדש', tierDescInferno: 'כניעה', tierDescOblivion: 'לא נשאר כלום', tierDescEternity: 'מעבר לכל', milestone5: 'רק מתחילים', milestone10: 'שתי ספרות', milestone15: 'ממוקד', milestone20: 'לתהום', milestone25: 'רבע מאה', milestone30: 'הריק נפתח', milestone40: 'ברוך הבא לגיהינום', milestone50: 'באמצע הדרך', milestone60: 'אין חזרה', milestone70: 'הגעת לשכחה', milestone75: 'אגדי', milestone100: 'בלתי ניתן לעצירה' },
    drawQuiz: { submit: 'שלח', nextRound: 'סיבוב הבא', done: 'סיים', round: 'סיבוב %{current} / %{total}', drawBorderBetween: 'צייר את הגבול בין %{a} ל%{b}', loading: 'בונה זוגות גבולות…', error: 'לא ניתן לבנות מספיק זוגות. נסה שוב מאוחר יותר.', title: 'יוצר מפות', subtitle: 'צייר את גבולות העולם בצורה מדויקת ככל האפשר', borderParts: 'לגבול הזה יש %{n} חלקים: צייר את כולם', drawPrompt: 'צייר את הגבול ביניהן:', revealPrompt: 'הנה הגבול האמיתי:', actualBorder: 'גבול אמיתי', yourStroke: 'הקו שלך', clear: 'נקה', seeResults: 'ראה תוצאות', next: 'הבא →', ratingPerfect: 'מושלם!', ratingGreat: 'מצוין!', ratingGood: 'טוב', ratingClose: 'קרוב', ratingMiss: 'החטאה', rating: { gold: 'זהב', silver: 'כסף', bronze: 'ארד', miss: 'החטאה' } },
    results: { score: 'ניקוד', totalTime: 'זמן כולל', xpEarned: 'XP שנצבר', boost: 'הגברה', x2Applied: 'x2 הופעל', level: 'רמה %{n}', levelUpBonus: 'בונוס עלייה ברמה +%{bonus}', gold: 'זהב', balance: 'יתרה', penalty: 'קנס', reward: 'פרס', playAgain: 'שחק שוב', backToQuizzes: 'חזרה לחידונים', shareResult: 'שתף תוצאה', shareText: 'זה הניקוד שלי ב%{quiz}... הורד את Geo Conquest!', shareHeadline: "זה הניקוד שלי בחידון,\nחושב שתוכל לעשות טוב יותר?", shareDownload: 'הורד את Geo Conquest', levelUpTitle: 'עלייה ברמה — רמה %{n} (+%{bonus})', remarks: { wellPlayed: 'שיחק יפה!', almostThere: 'כמעט!', pumpNumbers: 'צריך לשפר את המספרים', solidEffort: 'מאמץ טוב', oof: 'אוף...', wellPlayedGauntlet: 'שיחק יפה..', payUp: 'שלם וצא', flawless: 'ניצחון מושלם!', notGoodEnough: 'לא מספיק טוב', wastedTicket: 'אין מצב שבזבזת כרטיס על זה...' } },
    maps: { outOfMaps: 'אין מפות!', readyToConquer: 'מוכן לכבוש!', refillRate: 'מפות מתמלאות ב-1 כל 60 דקות.', becomeConqueror: 'הפוך לכובש', unlimitedMaps: 'מפות ללא הגבלה — ללא המתנה', watchAd: 'צפה בפרסומת', comeBackTomorrow: 'חזור מחר', getMap: 'קבל מפה 1 · %{left} נותרו היום', wait: 'המתן', noTickets: 'אין כרטיסים', playAgainPrompt: 'לשחק שוב?' },
    achievements: { title: 'משימות', progress: '%{claimed} / %{total} נדרשו', conquerorPass: 'כרטיס הכובש — פתח הכל', locked: '???', claim: 'קבל', rewards: 'פרסים', error: 'שגיאה' },
    home: { empire: 'האימפריה שלך', worldProgress: 'התקדמות לשליטה עולמית', countries: 'מדינות ▸', invite: 'הזמן חבר — שניכם מקבלים 1,500 זהב', dailyReward: 'פרס יומי', claim: 'קבל', streak: 'רצף של %{n} ימים', deleteAccount: 'מחק חשבון', deleteBody: 'פעולה זו תמחק את חשבונך ואת כל הנתונים שלך לצמיתות. לא ניתן לבטל פעולה זו.', deleteForever: 'מחק לצמיתות', earthArea: '%{pct}% משטח היבשה של כדור הארץ', questsDone: 'משימות שהושלמו', avatarsOwned: 'דמויות שנרכשו', quizzesDone: 'חידונים שנעשו', topExplorers: 'גולשים מובילים', loadingRankings: 'טוען דירוגים...', you: ' (אתה)', level: 'רמה %{n}', becomeConqueror: 'הפוך לכובש', manageSubscription: 'נהל מנוי', closeGoldShop: '✕ סגור', ownedCountries: 'מדינות בבעלותך (%{n})', noCountries: 'אין מדינות עדיין. הרוויח זהב ובקר בחנות!', welcomeTitle: 'ברוך הבא, חוקר!', welcomeSubtitle: 'הגיע הזמן לבנות את האימפריה שלך.', welcomeStep1: 'הרוויח זהב בפתרון חידונים. ככל שתציין טוב יותר, כך תרוויח יותר.', welcomeStep2: 'השתמש בזהב בחנות לקנות מדינות, דמויות ושדרוגים.', welcomeStep3: 'השלם משימות כדי לפתוח פרסים בלעדיים ודמויות נדירות.', welcomeStep4: 'התחרה בגולשים מכל העולם באתגרים יומיים.', letsConquer: 'בואו לכבוש!', updateTitle: 'v%{version} זמין!', updateBody: 'אתה בגרסה v%{current}. עדכן לקבל את התכונות והתיקונים האחרונים.', updateNow: 'עדכן עכשיו', later: 'מאוחר יותר' },
    login: { tagline: 'כבוש את העולם, חידון אחד בכל פעם', email: 'אימייל', password: 'סיסמה', signIn: 'התחבר', forgotPassword: 'שכחת סיסמה?', noAccount: 'אין לך חשבון? הירשם', signingIn: 'מתחבר…', resetSent: 'אימייל לאיפוס נשלח!', error: 'שגיאה', or: 'או', continueWithGoogle: 'המשך עם Google', connecting: 'מתחבר…', forgotPasswordTitle: 'איפוס סיסמה', forgotPasswordBody: 'הכנס את האימייל שלך ונשלח לך קישור לאיפוס.', emailSentTitle: 'אימייל נשלח', emailSentBody: 'בדוק את תיבת הדואר שלך לקישור לאיפוס סיסמה.', done: 'סיום', sending: 'שולח…', sendResetLink: 'שלח קישור לאיפוס', cancel: 'בטל', fillFields: 'אנא מלא את כל השדות', enterEmail: 'אנא הכנס את כתובת האימייל שלך.', signInFailed: 'הכניסה נכשלה', googleFailed: 'כניסה עם Google נכשלה', appleFailed: 'כניסה עם Apple נכשלה' },
    signup: { title: 'התחל את הכיבוש שלך', email: 'אימייל', password: 'סיסמה', signUp: 'הירשם', haveAccount: 'יש לך חשבון? התחבר', signingUp: 'יוצר חשבון…', error: 'שגיאה', or: 'או', continueWithGoogle: 'המשך עם Google', connecting: 'מתחבר…', passwordMin: 'סיסמה (לפחות 6 תווים)', fillFields: 'אנא מלא את כל השדות', passwordTooShort: 'הסיסמה חייבת להכיל לפחות 6 תווים', googleFailed: 'כניסה עם Google נכשלה', appleFailed: 'כניסה עם Apple נכשלה' },
    onboarding: { chooseName: 'בחר את שמך', chooseAvatar: 'בחר את האווטאר שלך', chooseFlag: 'בחר את הדגל שלך', referral: 'יש לך קוד הפניה?', usernamePlaceholder: 'שם משתמש', referralPlaceholder: 'קוד הפניה (אופציונלי)', next: 'הבא →', finish: 'התחל לכבוש!', usernameTaken: 'שם המשתמש הזה כבר נלקח', usernameShort: 'שם המשתמש חייב להכיל לפחות 3 תווים', referralAccepted: 'הפניה התקבלה! שניכם מקבלים 1,500 זהב', referralInvalid: 'קוד הפניה לא תקין', error: 'שגיאה', usernameSubtitle: 'בחר שם משתמש ייחודי עבור טבלת הדירוג', enterUsername: 'הכנס את שם המשתמש שלך', usernameHint: '3–20 תווים, אותיות, מספרים, קווים תחתיים', checking: 'בודק…', avatarSubtitle: 'זה יייצג אותך במשחק', avatarHint: 'לא מרוצה? פתח 50+ דמויות נוספות בחנות האווטאר בכל עת.', back: '← חזרה', flagSubtitle: 'בחר את דגל המדינה שלך', searchCountry: 'חפש מדינה…', referralSubtitle: 'אם חבר הזמין אותך, הכנס את שם המשתמש שלו למטה.', verify: 'אמת', creating: 'יוצר…', imReady: 'אני מוכן', ownUsername: 'אינך יכול להשתמש בשם המשתמש שלך כקוד הפניה.', referralNotFound: 'קוד הפניה לא נמצא. אנא בדוק ונסה שוב.' },
    shop: { countries: 'מדינות', avatars: 'אווטאר', flags: 'דגלים', upgrades: 'שדרוגים', buy: 'קנה', owned: 'נרכש', equipped: 'מצויד', equip: 'צייד', notEnoughGold: 'אין מספיק זהב', purchaseSuccess: 'הרכישה הצליחה!', error: 'שגיאה', conquererPass: 'כרטיס הכובש — פתח הכל', needMoreGold: 'צריך עוד זהב?', buyGold: 'קנה זהב →', bulkBuy: 'רכישה בכמות', bulkBuyDesc: 'כבוש %{count} מדינות ב-%{cost} זהב', goldRemaining: '%{n} זהב נותר', buyAll: 'קנה הכל', loadingCountries: 'טוען מדינות…', searchCountries: 'חפש מדינות…', ownedCheck: 'נרכש ✓', ownedMinus: '- נרכש', locked: 'נעול', conquered: 'נכבש!', countriesAdded: '%{n} מדינות נוספו לאימפריה שלך.', avatarUnlockedTitle: 'אווטאר נפתח!', flagUnlockedTitle: 'דגל נפתח!', switchToOwned: 'עבור לכרטיסיית נרכש כדי לצייד אותו.', avatarEquippedTitle: 'אווטאר צויד!', avatarEquippedBody: 'האווטאר שלך יופיע בטבלת הדירוג.', mustOwnFirst: 'עליך לרכוש את %{name} תחילה.', easterEggTitle: '🎉 נמצא ביצת פסחא!', easterEggBody: 'כל הכבוד! הנה 5 כרטיסים חינם.', ticketPackAddedTitle: 'חבילת כרטיסים נוספה', ticketsAddedBody: '5 כרטיסים נוספו למלאי שלך.', ticketAddedTitle: 'כרטיס נוסף', ticketAddedBody: 'נוסף למלאי שלך.', thanksForWatchingTitle: 'תודה שצפית!', ticketWatchBody: 'כרטיס 1 נוסף למלאי שלך.', upgradesSubtitle: 'הרחב את המשלחות שלך כדי להרוויח מכפילים עצומים.', capitalsQuizUpgrade: 'חידון בירות', bordersQuizUpgrade: 'חידון גבולות', level2Expedition: 'משלחת רמה 2', level2Desc: 'שחק עד 20 סיבובים לכל חידון', level3Expedition: 'משלחת רמה 3', level3Desc: 'שחק עד 30 סיבובים לכל חידון', millionaireSwap: 'החלפת מיליונר', millionaireSwapDesc: 'החלף שאלה בחידון המיליונר', darkScroll: 'מגילה חשוכה', darkScrollDesc: 'פותחת את חידון הסיוט', infiniteMaps: 'מפות ללא הגבלה', infiniteMapsDesc: 'אל תחכה לעולם למפות', speedDetectiveQuest: 'השלם את משימת בלש המהיר', groundInvasionQuest: 'השלם את משימת פלישה יבשתית', acquireTickets: 'קבל כרטיסי מיליונר', millionaireTicket: 'כרטיס מיליונר', oneTicket: 'כרטיס 1', ticketPack: 'חבילת כרטיסים', ticketsCount: '5 כרטיסי מיליונר', watchAnAd: 'צפה בפרסומת', oneAdTicket: 'פרסומת 1 = כרטיס 1', bulkBuyTitle: 'רכישה בכמות', purchaseFailed: 'הרכישה נכשלה', purchaseFailedBody: 'משהו השתבש.', conqueredTitle: 'נכבש!', previousTier: 'רמה קודמת', featuredToday: 'מוצג היום', todayOff: '20% הנחה היום', adUnavailable: 'פרסומת לא זמינה', free: 'חינם', cancel: 'ביטול', claim: 'קבל!', tapToClose: 'הקש בכל מקום לסגירה' },
    goldShop: { title: 'חנות זהב', subtitle: 'הגבר את הכיבוש שלך', mostPopular: 'הכי פופולרי', bestValue: 'הכי משתלם', confirmTitle: 'אשר רכישה', youReceive: 'אתה מקבל', price: 'מחיר', buy: 'קנה', cancel: 'בטל', goldAdded: '%{amount} זהב נוסף!', goldAddedBody: 'יתרת הזהב שלך עודכנה.', pending: 'רכישה ממתינה', pendingBody: 'הרכישה שלך מעובדת.', error: 'שגיאה', devWarning: 'מצב פיתוח — ללא רכישה אמיתית', purchaseSuccessTitle: 'רכישה הצליחה!', goldAddedTitle: '%{amount} זהב נוסף', goldAddedSubtitle: 'יתרתך עודכנה.', purchaseFailedTitle: 'הרכישה נכשלה', purchaseFailed: 'אנא נסה שוב.', iapTitle: 'רכישות מתוך האפליקציה', tempUnavailableTitle: 'לא זמין זמנית', tempUnavailableBody: 'חבילת הזהב הזו אינה זמינה כרגע. אנא נסה שוב מאוחר יותר.', gold: 'זהב', devModeWarning: '⚠️ מצב פיתוח. בנה עם EAS לרכישות אמיתיות.', previewMode: 'תצוגה מקדימה — בנה עם EAS לרכישה', pendingDelivery: 'תשלום התגלה אך הזהב לא אושר עדיין. פתח מחדש את חנות הזהב.' },
    crateShop: { title: 'ארגזים מסתוריים', legendary: 'ארגז אגדי', legendaryDesc: 'אווטאר SVG ודגלי סיעה. סיכוי להשיג פריטים אגדיים!', dropRates: 'שיעורי נפילה', common: 'רגיל', rare: 'נדיר', epic: 'אפי', legendaryRarity: 'אגדי', notEnoughGold: 'אין מספיק זהב לפתיחת הארגז הזה.', open: 'פתח ארגז', error: 'שגיאה' },
    premium: { heroTitle: 'הפוך ל\nכובש עולמי', heroSubtitle: 'העולם לא יכבוש את עצמו.', heroSub: 'שלוט בגאוגרפיה. שלוט בדירוג.\nכבוש את העולם ללא מגבלות.', joinExplorers: '1,200 חוקרים פרמיום', hookHighlight: 'לכובשים יש פי 3 יותר שטחים', hookSuffix: 'ועולים בדירוג פי 5 יותר מהר מחברים חינמיים.', sectionEverything: 'הכל בכובש', sectionFreeVsPro: 'חינם לעומת כובש', featureHeader: 'תכונה', freeHeader: 'חינם', sectionChoosePlan: 'בחר את התוכנית שלך', once: 'פעם אחת', lifetimeBreakdown: 'תשלום חד פעמי · גישה לכל החיים', monthlyPer: '/חודש', cancelAnytime: 'ביטול בכל עת', securePayment: 'מעובד בבטחה דרך App Store / Google Play', trustSecure: 'תשלום מאובטח', trustLifetime: 'גישה לכל החיים', trustInstant: 'גישה מיידית', sectionTestimonials: 'מה הכובשים אומרים', ratingLabel: '4.9/5 מ-2,000+ מפקדים', urgencyBanner: 'תוכנית חודשית — 50% הנחה לחודש הראשון — פג בעוד ', mostPopular: 'הכי פופולרי', flagOnly: 'דגל בלבד', allQuizzes: 'כל החידונים', feature1Title: 'פרס יומי משולש', feature1Desc: 'קבל פי 3 זהב ופי 3 כרטיסים מהפרסים היומיים.', feature2Title: 'פרסי חידון כפולים', feature2Desc: 'כפל זהב ו-XP מכל חידון שהושלם.', feature3Title: 'שחק לא מקוון', feature3Desc: 'חידוני בירות, גבולות וצורות עובדים ללא חיבור.', feature4Title: 'אווטאר ייחודי', feature4Desc: 'אווטאר כובש בלעדי שאינו זמין בשום מקום אחר.', feature5Title: 'משימות ייחודיות', feature5Desc: 'גישה לתוכן בלעדי לכובשים בלבד.', feature6Title: 'תג כובש', feature6Desc: 'תג כתר בלעדי בטבלת הדירוג העולמית.', compare1: 'מכפיל זהב יומי', compare2: 'מכפיל כרטיסים יומי', compare3: 'תג דירוג', compare4: 'אווטאר ייחודי', compare5: 'משימות ייחודיות', compare6: 'זהב ו-XP בחידון', compare7: 'גישה מוקדמת', compare8: 'שחק לא מקוון', faq1q: 'איך עובדת תוכנית לכל החיים?', faq1a: 'זהו תשלום חד פעמי — ללא מנוי. אתה מקבל גישה קבועה בנוסף ל-10 כרטיסים ו-3 תיבות מית׳יק.', faq2q: 'האם אני יכול לבטל את התוכנית החודשית?', faq2a: 'כן. בטל בלחיצה אחת מהגדרות App Store / Google Play.', faq3q: 'האם הפריטים שלי נשארים אם אני מבטל?', faq3a: 'כן! כל מדינה, אווטאר ודגל שנרכשו הם שלך לצמיתות.', faq4q: 'אילו אמצעי תשלום מתקבלים?', faq4a: 'כל התשלומים מעובדים דרך App Store או Google Play Billing.', lifetime: 'לכל החיים', monthly: 'חודשי', bestDeal: 'עסקה הכי טובה', getLifetime: 'גישה לכל החיים', getMonthly: 'התחל חודשי', restore: 'שחזר רכישה', restoring: 'משחזר…', terms: 'תנאים', privacy: 'פרטיות', faq: 'שאלות נפוצות', welcomeTitle: 'ברוך הבא, כובש!', welcomeBody: 'יש לך עכשיו גישה ללא הגבלה. בואו נלך!', failedTitle: 'הרכישה נכשלה', failedBody: 'משהו השתבש. אנא נסה שוב.', restoredTitle: 'שוחזר!', restoredBody: 'הרכישה שלך שוחזרה.', nothingTitle: 'אין מה לשחזר', nothingBody: 'לא נמצאה רכישה קודמת.', ok: 'אישור' },
    leaderboard: { title: 'טבלת מובילים', mostXP: 'הכי הרבה XP', mostQuizzes: 'הכי הרבה חידונים', mostGold: 'הכי הרבה זהב', mostCorrect: 'הכי הרבה תשובות נכונות', highestAccuracy: 'דיוק גבוה ביותר', loading: 'טוען…', error: 'שגיאה', rank: '#%{n}', daily: 'יומי', allTime: 'כל הזמנים', searchPlayers: 'חפש שחקנים…', explorers: '%{n} חוקרים', competingToday: '%{n} מתחרים היום', resetsIn: 'מתאפס בעוד', updatesIn: 'מתעדכן בעוד', todaysChallenge: 'האתגר היומי:', rewards: 'פרסים', noPlayersFound: 'לא נמצאו שחקנים עבור "%{query}"', noExplorers: 'אין חוקרים עדיין. היה הראשון!', levelShort: 'רמה %{n}', you: ' (אתה)', awesome: 'מדהים!', dailyChallengeRewards: 'פרסי האתגר היומי', explorerProfile: 'פרופיל חוקר', loadingProfile: 'טוען פרופיל…', memberSince: 'חבר מאז %{date}', worldDomination: 'שליטה עולמית', conquestLabel: '%{pct}% מהיבשה · %{area}M km²', empireMap: 'מפת האימפריה', questsCount: 'משימות (%{claimed} / %{total})', inventory: 'מלאי', avatarsCount: 'דמויות (%{n})', flagsCount: 'דגלים (%{n})', tapToClose: 'הקש בכל מקום לסגירה', paidOut: 'ישולם כאשר הספירה מגיעה לאפס · 3 המובילים באתגר היומי', metricXP: 'XP', metricQuizzes: 'חידונים', metricGold: 'זהב', metricCorrect: 'נכונות', metricAccuracy: 'דיוק', catXP: 'XP', catLand: 'יבשה', catQuizzes: 'חידונים', catAvatars: 'דמויות' },
    worldMap: { title: 'מפת עולם', subtitle: '%{n} מדינות לכיבוש', loading: 'טוען מדינות…', purchaseTitle: 'לרכוש את %{country}?', purchaseBody: 'לכבוש את %{country} ב%{cost} זהב?', confirm: 'אשר', cancel: 'בטל', success: '%{country} נכבשה!', successTitle: 'כובש!', notEnoughGold: 'אין מספיק זהב', notEnoughGoldBody: 'אתה צריך %{cost} זהב כדי לקנות את %{country}.', alreadyOwned: 'כבר יש לך את המדינה הזו', error: 'שגיאה' },
    quizMenu: { howItWorks: 'איך זה עובד', mapsLeft: '%{n} מפות נותרו', trailLocked: 'המסלול נעול', trailLockedBody: 'השלם עוד חידונים כדי לפתוח את המסלול.', gauntletLocked: 'האתגר נעול', gauntletLockedBody: 'הגע לרמה גבוהה יותר כדי לפתוח.', acquireTickets: 'השג כרטיסים', acquireTicketsBody: 'זכה בכרטיסים על ידי השלמת משימות.', tickets: '%{n} כרטיסים', goldSuffix: 'זהב', quizLocked: 'חידון נעול', unlockCapitals: 'פתח את חידון הבירות בחנות.', unlockBorders: 'פתח את חידון הגבולות בחנות.', displayInShop: 'הצג בחנות', gotIt: 'הבנתי', noTicketsBody: 'אתה צריך לפחות כרטיס 1 כדי לשחק בחידון המיליונר.\n\nזכה בכרטיסים מפרסים יומיים או קנה אותם בחנות → פריטים.', watch: 'צפה', nextMap: 'מפה הבאה בעוד %{min}ד', mapsRemaining: '%{n} / %{max} מפות נותרו. 1 לחידון.' },
    common: { error: 'שגיאה', cancel: 'בטל', ok: 'אישור', loading: 'טוען…', retry: 'נסה שוב' },
    questData: { level_10: { title: 'עלייה ראשונה', desc: 'הגע לרמה 10.' }, level_25: { title: 'חוקר מנוסה', desc: 'הגע לרמה 25.' }, level_30: { title: 'טקטיקן ותיק', desc: 'הגע לרמה 30.' }, level_50: { title: 'כובש עילי', desc: 'הגע לרמה 50.' }, level_80: { title: 'מפקד אגדי', desc: 'הגע לרמה 80.' }, level_100: { title: 'אל הגאוגרפיה', desc: 'הגע לרמה 100.' }, first_blood: { title: 'הכיבוש הראשון', desc: 'תבע את המדינה הראשונה שלך במפה.' }, empire_5: { title: 'אימפריה צומחת', desc: 'תבע 5 מדינות שונות.' }, empire_10: { title: 'שאיפות אימפריאליות', desc: 'תבע 10 מדינות שונות.' }, empire_25: { title: 'מעצמה עולמית', desc: 'תבע 25 מדינות שונות.' }, empire_50: { title: 'הגמון גלובלי', desc: 'תבע 50 מדינות שונות.' }, streak_20: { title: 'מכור ל-GeoConquest', desc: 'התחבר 20 ימים ברצף.' }, area_1m: { title: 'שטחים עצומים', desc: 'שלוט על מעל 1M קמ"ר.' }, area_10m: { title: 'פריסה יבשתית', desc: 'שלוט על מעל 10M קמ"ר.' }, area_100m: { title: 'שליט כדור הארץ', desc: 'שלוט על מעל 100M קמ"ר.' }, conquer_africa: { title: 'ריבון אפריקה', desc: 'בעל כל מדינה ביבשת אפריקה.' }, conquer_europe: { title: 'קיסר אירופה', desc: 'בעל כל מדינה באירופה.' }, conquer_asia: { title: 'סולטאן אסיה', desc: 'בעל כל מדינה באסיה.' }, conquer_oceania: { title: 'אדון הפסיפיק', desc: 'בעל כל מדינה באוקיאניה.' }, conquer_americas: { title: 'מפקד האמריקות', desc: 'בעל כל מדינה באמריקות.' }, flag_mastery_30s: { title: 'בלש מהיר', desc: 'סיים את חידון הדגלים עם דיוק >90% תוך 30 שניות.' }, ground_invasion: { title: 'פלישה קרקעית', desc: 'סיים את חידון הבירות עם דיוק >90% תוך 30 שניות.' }, quiz_10: { title: 'טירון חידונים', desc: 'השלם 10 חידונים מכל סוג.' }, quiz_50: { title: 'ותיק חידונים', desc: 'השלם 50 חידונים מכל סוג.' }, excellence_20: { title: 'חוקר העולם', desc: 'קבל 85% ומעלה ב-20 חידונים שונים.' }, trail_blazer_50: { title: 'פורץ דרך', desc: 'ענה נכון על 30 שאלות בריצה אחת של חידון המסלול.' }, gauntlet_ascendant: { title: 'עולה', desc: 'הגע לרמה 100 בגאונטלט.' }, perfect_accuracy_15: { title: 'דיוק', desc: 'השג 100% דיוק ב-15 חידונים שונים.' }, daily_champion_5: { title: 'אלוף היום', desc: 'סיים במקום הראשון באתגר היומי 5 פעמים.' }, avatar_collector_10: { title: 'ציד אווטארים', desc: 'אסוף 10 אווטארים שונים.' }, max_tier_avatar: { title: 'אוסף שיא', desc: 'קבל את האווטאר ברמה הגבוהה ביותר בכל אוסף.' }, complete_the_world: { title: 'שליטה עולמית', desc: 'בעל את כל 250 המדינות בעולם.' }, nightmare_complete: { title: 'שרדת את הסיוט', desc: 'כל הכבוד, כובש העולם התחתון.' }, true_conqueror: { title: 'יש רק אחד.', desc: 'הפעל את המלך האלוהי, המלכה האלוהית וסימן החיה.' }, never_enough: { title: 'אף פעם לא מספיק', desc: 'הפעל את המלך האלוהי ושריון הקוסמוס.' }, level_150: { title: 'מוח מועלה', desc: 'הגע לרמה 150.' }, level_200: { title: 'מיתוס האטלס', desc: 'הגע לרמה 200.' }, level_250: { title: 'ריבון נצחי', desc: 'הגע לרמה 250.' }, level_300: { title: 'מעבר לפרגוד', desc: 'הגע לרמה 300.' } },
  },

  ar: {
    quizzes: { title: 'اختبارات' },
    quiz: { millionaire: 'اختبار المليونير', flag: 'الأعلام', shape: 'الأشكال', capitals: 'العواصم', borders: 'الحدود', trail: 'المسار', draw: 'صانع الخرائط', gauntlet: 'الاختبار الكبير', nightmare: 'الكابوس' },
    menu: { language: 'اللغة', signOut: 'تسجيل الخروج', deleteAccount: 'حذف الحساب' },
    tabs: { home: 'الرئيسية', quizzes: 'اختبارات', shop: 'المتجر', leaderboard: 'المتصدرون', quests: 'المهام' },
    nav: { flagQuiz: 'اختبار الأعلام', shapeQuiz: 'اختبار الأشكال', bordersQuiz: 'اختبار الحدود', capitalsQuiz: 'اختبار العواصم', trailQuiz: 'اختبار المسار', millionaireQuiz: 'اختبار المليونير', nightmareMode: 'وضع الكابوس', drawBorder: 'ارسم الحدود', results: 'النتائج', setPassword: 'تعيين كلمة مرور جديدة', setPasswordMsg: 'أدخل كلمة مرور جديدة لحسابك.', newPassword: 'كلمة المرور الجديدة', confirmPassword: 'تأكيد كلمة المرور الجديدة', saving: 'جارٍ الحفظ…', savePassword: 'حفظ كلمة المرور', passwordMismatch: 'يجب أن تتطابق كلمتا المرور ولا تكونا فارغتين.', passwordShort: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.', passwordSuccess: 'تم تحديث كلمة مرورك!', passwordFailed: 'فشل تحديث كلمة المرور.' },
    difficulty: { title: 'الصعوبة', easy: 'سهل', medium: 'متوسط', hard: 'صعب' },
    quizCommon: { paused: 'متوقف', resume: 'استئناف', quit: 'إنهاء', letsGo: 'هيا نبدأ', goBack: 'رجوع', tapToContinue: 'انقر في أي مكان للمتابعة ←', noQuestions: 'لا توجد أسئلة متاحة', offline: { title: 'أنت غير متصل', body: 'قم بالترقية إلى تصريح الفاتح للعب دون اتصال.', upgrade: 'ترقية' }, learn: 'تعلّم' },
    infoModal: { capital: 'العاصمة', region: 'المنطقة', population: 'عدد السكان', area: 'المساحة', neighbors: 'الدول المجاورة', islandNation: '🏝️ دولة جزيرة', gotIt: 'حسناً!', na: 'غير متاح' },
    flagQuiz: { subtitle: 'حدد الدول من خلال أعلامها.', loading: 'جارٍ تحضير الأعلام…', whichFlagOf: 'أي علم ينتمي إلى %{country}؟', whichCountry: 'لأي دولة ينتمي هذا العلم؟' },
    shapeQuiz: { subtitle: 'حدد الدول من خلال أشكالها.', loading: 'جارٍ تحضير الأشكال…', whichCountry: 'أي دولة لها هذا الشكل؟', whichShapeOf: 'أي شكل ينتمي إلى %{country}؟' },
    bordersQuiz: { subtitle: 'حدد الدول التي تتشارك الحدود.', loading: 'جارٍ تحضير الحدود…', doesBorder: 'هل تتشارك %{a} الحدود مع %{b}؟', doesNotBorder: 'أي دولة لا تتشارك الحدود مع %{country}؟', sharesBorder: 'أي دولة تتشارك الحدود مع %{country}؟', yes: 'نعم', no: 'لا' },
    capitalsQuiz: { subtitle: 'طابق الدول مع عواصمها.', loading: 'جارٍ تحضير العواصم…', capitalOf: 'ما عاصمة %{country}؟', countryOf: 'أي دولة عاصمتها %{capital}؟' },
    trailQuiz: { subtitle: 'تنقّل عبر مسار من الدول المتجاورة.', loading: 'جارٍ تحضير المسار…', question: 'أي دولة تأتي بعد ذلك في المسار؟', whatCountry: 'ما هذه الدولة؟', whatCapital: 'ما عاصمة هذه الدولة؟', whatFlag: 'ما علم هذه الدولة؟' },
    millionaireQuiz: { loading: 'جارٍ تحضير الأسئلة…', lifeline50: '50/50', lifelineSkip: 'استبدال', lifelineAudience: 'مساعدة الجمهور', walkTitle: 'رائع!', walkBody: 'هل تأخذ %{amount} ذهب وتمضي؟', walk: 'اخرج بالجائزة', keepGoing: 'تابع', winTitle: 'الجائزة الكبرى!', winBody: 'ربحت %{amount} ذهب!', secondChanceTitle: 'فرصة ثانية؟', secondChanceBody: 'استخدم تذكرة لمحاولة أخرى؟', useTicket: 'استخدم تذكرة', noThanks: 'لا شكراً', pushForward: 'تقدم!', takeGold: 'خذ %{amount} ذهباً', readySubtitle: '15 سؤالاً للفوز بالجائزة الكبرى، تأكد من جاهزيتك', loadingChallenge: 'جارٍ تحضير التحدي…', prizeNow: 'الآن', prizeNext: 'التالي', claimGold: 'احصل على ذهبك', conquerBody: 'لقد أجبت على جميع الأسئلة الـ15!', walkNoXp: "أخذ الذهب ينهي الجولة دون خبرة. تُمنح الخبرة فقط عند الإجابة الصحيحة على 15/15.", checkpointBody: 'أنت قريب جداً من المستوى التالي. إجابة صحيحة واحدة قد تغير كل شيء.', secondChanceWatchBody: 'شاهد إعلاناً لاستبدال هذا السؤال والمتابعة.', watchAd: 'شاهد إعلاناً', loadingAd: 'جارٍ تحميل الإعلان…', powerUpLocked: 'القوة مقفلة', powerUpLockedBody: 'يجب شراء هذه القوة من متجر الترقيات.' },
    nightmareQuiz: { penaltyRoll: 'ارمِ النرد لعقوبتك', penaltyTaken: 'تم أخذ %{pct}% من ذهبك.', loading: 'جارٍ تحضير الكابوس…', curseDrawn: 'اللعنة سُحبت', blind: 'أعمى', blindDesc: 'السؤال مخفي خلف ضباب يتلاشى ببطء.', shuffle: 'خلط', shuffleDesc: 'تُخلط خيارات الإجابة كل 3 ثوانٍ.', rush: 'سريع', rushDesc: 'المؤقت مُقسَّم إلى النصف لهذا السؤال.', phantom: 'الشبح', phantomDesc: 'إجابة صحيحة واحدة مخفية.', winTitle: 'علامة الوحش لك', winBody: 'لقد تغلبت على الكابوس.', readySubtitle: 'أنت ضد سيّد الظلام', loadingChallenge: 'إيقاظ الكابوس…', blindReveal: 'عبر الضباب...', shuffleReveal: 'انتبه أين تنقر.', rushReveal: '5 ثوانٍ. الساعة تبدأ الآن.', phantomReveal: 'ثق بالشبح.', winKing: 'أنت الملك الجديد للعالم السفلي', takeOwed: 'خذ ما هو لك' },
    gauntlet: { inARow: 'إجابات صحيحة متتالية', welcomeTo: 'مرحباً بك في', round: 'الجولة %{n}', bossRound: 'جولة الرئيس ×2', shieldAbsorbed: 'الدرع امتصّ الضربة', shieldAcquired: 'تم الحصول على الدرع', whichFlag: 'أي دولة لها هذا العلم؟', whichCapital: 'ما عاصمة %{country}؟', whichCountryCapital: 'أي دولة عاصمتها هذه؟', sharesBorder: 'أي دولة تتشارك الحدود مع %{country}؟', whichShape: 'أي دولة لها هذا الشكل؟', t2FlagCapital: 'أي عاصمة تنتمي لهذا العلم؟', t2FlagBorder: 'أي دولة تحد دولة هذا العلم؟', t2FlagShape: 'أي شكل ينتمي لهذا العلم؟', t2ShapeCapital: 'أي عاصمة تنتمي لهذا الشكل؟', t2ShapeBorder: 'أي دولة تحد دولة هذا الشكل؟', t2ShapeFlag: 'أي علم ينتمي لهذا الشكل؟', t2CapitalFlag: 'أي علم ينتمي لهذه العاصمة؟', t2CapitalShape: 'أي شكل ينتمي لهذه العاصمة؟', t2CapitalBorder: 'أي دولة تحد دولة هذه العاصمة؟', tiers: { eternity: 'الأبدية', oblivion: 'الفناء', inferno: 'الجحيم الملتهب', hell: 'الجحيم', void: 'الفراغ', abyss: 'الهاوية', peril: 'الخطر', danger: 'التهديد' }, loading: 'الدخول إلى الاختبار الكبير...', title: 'الاختبار الكبير', finalPhase: 'المرحلة الأخيرة', nextPhase: 'المرحلة التالية %{progress}/%{step}', correctLeft: '%{n} أخرى للتقدم', readySubtitle: 'رحلتك لم تبدأ بعد', keepGoing: 'استمر', tierDescPeril: 'الحرارة ترتفع...', tierDescAbyss: 'المجهول العميق...', tierDescVoid: 'فتح لا نهاية له', tierDescHell: 'الجحيم - ولادة جديدة', tierDescInferno: 'الإخضاع', tierDescOblivion: 'لا شيء يبقى', tierDescEternity: 'ما وراء الحدود', milestone5: 'بداية فقط', milestone10: 'رقمان', milestone15: 'مقيّد', milestone20: 'في أعماق الهاوية', milestone25: 'ربع قرن', milestone30: 'الفراغ يفتح', milestone40: 'مرحباً في الجحيم', milestone50: 'في منتصف الطريق إلى الجحيم الملتهب', milestone60: 'لا عودة', milestone70: 'الفناء وصل', milestone75: 'أسطوري', milestone100: 'لا يُوقف' },
    drawQuiz: { submit: 'إرسال', nextRound: 'الجولة التالية', done: 'تم', round: 'الجولة %{current} / %{total}', drawBorderBetween: 'ارسم الحدود بين %{a} و%{b}', loading: 'بناء أزواج الحدود…', error: 'تعذّر بناء أزواج كافية. حاول لاحقاً.', title: 'صانع الخرائط', subtitle: 'ارسم حدود العالم بأكبر قدر ممكن من الدقة', borderParts: 'لهذه الحدود %{n} أجزاء: ارسم كل جزء', drawPrompt: 'ارسم الحدود بينهما:', revealPrompt: 'هذه هي الحدود الفعلية:', actualBorder: 'الحدود الفعلية', yourStroke: 'رسمك', clear: 'مسح', seeResults: 'عرض النتائج', next: 'التالي →', ratingPerfect: 'مثالي!', ratingGreat: 'رائع!', ratingGood: 'جيد', ratingClose: 'قريب', ratingMiss: 'فاته', rating: { gold: 'ذهب', silver: 'فضة', bronze: 'برونز', miss: 'فشل' } },
    results: { score: 'النتيجة', totalTime: 'الوقت الكلي', xpEarned: 'XP مكتسب', boost: 'تعزيز', x2Applied: 'تطبيق ×2', level: 'المستوى %{n}', levelUpBonus: 'مكافأة ترقية المستوى +%{bonus}', gold: 'ذهب', balance: 'الرصيد', penalty: 'غرامة', reward: 'مكافأة', playAgain: 'العب مجدداً', backToQuizzes: 'العودة للاختبارات', shareResult: 'مشاركة النتيجة', shareText: 'هذه نتيجتي في %{quiz}... حمّل Geo Conquest!', shareHeadline: 'هذه نتيجتي في الاختبار،\nهل تعتقد أنك ستتفوق عليها؟', shareDownload: 'حمّل Geo Conquest', levelUpTitle: 'ارتفاع المستوى — المستوى %{n} (+%{bonus})', remarks: { wellPlayed: 'أحسنت!', almostThere: 'كدت تصل!', pumpNumbers: 'ارفع مستواك', solidEffort: 'مجهود جيد', oof: 'أوف...', wellPlayedGauntlet: 'أحسنت..', payUp: 'ادفع واخرج', flawless: 'انتصار مثالي!', notGoodEnough: 'ليس بالمستوى المطلوب', wastedTicket: 'لا يُصدَّق أنك أضعت تذكرة لهذا..' } },
    maps: { outOfMaps: 'نفدت الخرائط!', readyToConquer: 'مستعد للفتح!', refillRate: 'تُعبَّأ الخرائط بمعدل 1 كل 60 دقيقة.', becomeConqueror: 'كن فاتحاً', unlimitedMaps: 'خرائط غير محدودة — لا انتظار بعد الآن', watchAd: 'شاهد إعلاناً', comeBackTomorrow: 'عد غداً', getMap: 'احصل على خريطة · تبقى %{left} اليوم', wait: 'انتظر', noTickets: 'لا توجد تذاكر', playAgainPrompt: 'العب مجدداً؟' },
    achievements: { title: 'المهام', progress: 'تم المطالبة بـ %{claimed} / %{total}', conquerorPass: 'تصريح الفاتح — افتح كل شيء', locked: '???', claim: 'اطلب', rewards: 'المكافآت', error: 'خطأ' },
    home: { empire: 'إمبراطوريتك', worldProgress: 'تقدم الهيمنة العالمية', countries: 'الدول ▸', invite: 'ادعُ صديقاً — كلاكما يحصل على 1500 ذهب', dailyReward: 'المكافأة اليومية', claim: 'اطلب', streak: 'سلسلة %{n} يوم', deleteAccount: 'حذف الحساب', deleteBody: 'سيؤدي هذا إلى حذف حسابك وجميع بياناتك نهائياً. لا يمكن التراجع عن هذا.', deleteForever: 'حذف نهائي', earthArea: '%{pct}٪ من مساحة الأرض', questsDone: 'المهام المنجزة', avatarsOwned: 'الصور الرمزية المملوكة', quizzesDone: 'الاختبارات المنجزة', topExplorers: 'أفضل المستكشفين', loadingRankings: 'جارٍ تحميل الترتيب...', you: ' (أنت)', level: 'المستوى %{n}', becomeConqueror: 'كن فاتحاً', manageSubscription: 'إدارة الاشتراك', closeGoldShop: '✕ إغلاق', ownedCountries: 'الدول المملوكة (%{n})', noCountries: 'لا دول مملوكة بعد. اكسب ذهباً وزر المتجر!', welcomeTitle: 'مرحباً، مستكشف!', welcomeSubtitle: 'حان وقت بناء إمبراطوريتك.', welcomeStep1: 'اكسب ذهباً عبر الاختبارات. كلما أحسنت، زادت أرباحك.', welcomeStep2: 'أنفق الذهب في المتجر لشراء الدول والصور الرمزية وترقيات اللعب.', welcomeStep3: 'أنجز المهام للحصول على مكافآت حصرية وصور رمزية نادرة.', welcomeStep4: 'تنافس في تحديات يومية مع المستكشفين من حول العالم.', letsConquer: 'هيا نفتح!', updateTitle: 'الإصدار %{version} متاح!', updateBody: 'أنت على %{current}. حدّث للحصول على آخر الميزات والإصلاحات.', updateNow: 'حدّث الآن', later: 'لاحقاً' },
    login: { tagline: 'افتح العالم، اختباراً في كل مرة', email: 'البريد الإلكتروني', password: 'كلمة المرور', signIn: 'تسجيل الدخول', forgotPassword: 'نسيت كلمة المرور؟', noAccount: 'ليس لديك حساب؟ سجّل الآن', signingIn: 'جارٍ تسجيل الدخول…', resetSent: 'تم إرسال رسالة إعادة تعيين كلمة المرور!', error: 'خطأ', or: 'أو', continueWithGoogle: 'المتابعة مع Google', connecting: 'جارٍ الاتصال…', forgotPasswordTitle: 'إعادة تعيين كلمة المرور', forgotPasswordBody: 'أدخل بريدك الإلكتروني وسنرسل لك رابط الإعادة.', emailSentTitle: 'تم إرسال البريد', emailSentBody: 'تحقق من بريدك للحصول على رابط إعادة التعيين.', done: 'تم', sending: 'جارٍ الإرسال…', sendResetLink: 'إرسال رابط الإعادة', cancel: 'إلغاء', fillFields: 'يرجى تعبئة جميع الحقول', enterEmail: 'يرجى إدخال عنوان بريدك الإلكتروني.', signInFailed: 'فشل تسجيل الدخول', googleFailed: 'فشل تسجيل الدخول بـ Google', appleFailed: 'فشل تسجيل الدخول بـ Apple' },
    signup: { title: 'ابدأ فتحك', email: 'البريد الإلكتروني', password: 'كلمة المرور', signUp: 'إنشاء حساب', haveAccount: 'لديك حساب بالفعل؟ سجّل الدخول', signingUp: 'جارٍ إنشاء الحساب…', error: 'خطأ', or: 'أو', continueWithGoogle: 'المتابعة مع Google', connecting: 'جارٍ الاتصال…', passwordMin: 'كلمة المرور (6 أحرف كحد أدنى)', fillFields: 'يرجى تعبئة جميع الحقول', passwordTooShort: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل', googleFailed: 'فشل تسجيل الدخول بـ Google', appleFailed: 'فشل تسجيل الدخول بـ Apple' },
    onboarding: { chooseName: 'اختر اسمك', chooseAvatar: 'اختر صورتك الرمزية', chooseFlag: 'اختر علمك', referral: 'لديك رمز إحالة؟', usernamePlaceholder: 'اسم المستخدم', referralPlaceholder: 'رمز الإحالة (اختياري)', next: 'التالي →', finish: 'ابدأ الفتح!', usernameTaken: 'اسم المستخدم هذا محجوز بالفعل', usernameShort: 'يجب أن يتكون اسم المستخدم من 3 أحرف على الأقل', referralAccepted: 'تم قبول الإحالة! كلاكما يحصل على 1500 ذهب', referralInvalid: 'رمز الإحالة غير صالح', error: 'خطأ', usernameSubtitle: 'اختر اسم مستخدم فريداً للمتصدرين', enterUsername: 'أدخل اسم المستخدم', usernameHint: '3-20 حرفاً، حروف وأرقام وشرطات سفلية', checking: 'جارٍ التحقق…', avatarSubtitle: 'ستمثلك هذه الصورة في اللعبة', avatarHint: 'لا تعجبك؟ افتح أكثر من 50 شخصية في متجر الصور الرمزية في أي وقت.', back: '→ رجوع', flagSubtitle: 'اختر علم بلدك ليرفرف بجانب صورتك الرمزية', searchCountry: 'ابحث عن دولة…', referralSubtitle: 'إذا دعاك صديق إلى الفتح، أدخل اسم مستخدمه أدناه.', verify: 'تحقق', creating: 'جارٍ الإنشاء…', imReady: 'أنا مستعد', ownUsername: 'لا يمكنك استخدام اسم مستخدمك الخاص كرمز إحالة.', referralNotFound: 'رمز الإحالة غير موجود. يرجى التحقق والمحاولة مجدداً.' },
    goldShop: { title: 'متجر الذهب', subtitle: 'عزّز فتحك', mostPopular: 'الأكثر شعبية', bestValue: 'أفضل قيمة', confirmTitle: 'تأكيد الشراء', youReceive: 'ستحصل على', price: 'السعر', buy: 'شراء', cancel: 'إلغاء', goldAdded: 'تمت إضافة %{amount} ذهب!', goldAddedBody: 'تم تحديث رصيد الذهب الخاص بك.', pending: 'الشراء معلّق', pendingBody: 'جارٍ معالجة عملية الشراء.', error: 'خطأ', devWarning: 'وضع التطوير — لا شراء حقيقي', purchaseSuccessTitle: 'تمت عملية الشراء بنجاح', goldAddedTitle: 'تمت إضافة %{amount} ذهب', goldAddedSubtitle: 'تم تحديث رصيدك.', purchaseFailedTitle: 'فشلت عملية الشراء', purchaseFailed: 'يرجى المحاولة مجدداً.', iapTitle: 'المشتريات داخل التطبيق', tempUnavailableTitle: 'غير متاح مؤقتاً', tempUnavailableBody: 'هذا الحزمة من الذهب غير متاحة من المتجر الآن. حاول مجدداً بعد قليل.', gold: 'ذهب', devModeWarning: '⚠️ يعمل في وضع التطوير. ابنِ باستخدام EAS لعمليات شراء حقيقية.', previewMode: 'معاينة — ابنِ باستخدام EAS للشراء', pendingDelivery: 'تم رصد دفعتك، لكن لم يمكن تأكيد الذهب بعد. أعد فتح متجر الذهب وسنعيد المحاولة.' },
    crateShop: { title: 'الصناديق الغامضة', legendary: 'الصندوق الأسطوري', legendaryDesc: 'صور رمزية SVG وأعلام فصائل. فرصة للحصول على مقتنيات أسطورية!', dropRates: 'نسب السقوط', common: 'شائع', rare: 'نادر', epic: 'ملحمي', legendaryRarity: 'أسطوري', notEnoughGold: 'لا يوجد ذهب كافٍ لفتح هذا الصندوق.', open: 'فتح الصندوق', error: 'خطأ' },
    shop: { countries: 'الدول', avatars: 'الصور الرمزية', flags: 'الأعلام', upgrades: 'الترقيات', buy: 'شراء', owned: 'مملوك', equipped: 'مجهّز', equip: 'تجهيز', notEnoughGold: 'لا يوجد ذهب كافٍ', purchaseSuccess: 'تمت عملية الشراء بنجاح!', error: 'خطأ', conquererPass: 'تصريح الفاتح — افتح كل شيء', needMoreGold: 'تحتاج مزيداً من الذهب؟', buyGold: 'اشترِ ذهباً →', bulkBuy: 'شراء بالجملة', bulkBuyDesc: 'افتح %{count} دولة مقابل %{cost} ذهب', goldRemaining: 'تبقى %{n} ذهب', buyAll: 'شراء الكل', loadingCountries: 'جارٍ تحميل الدول…', searchCountries: 'ابحث عن الدول…', ownedCheck: 'مملوك ✓', ownedMinus: '- مملوك', locked: 'مقفل', conquered: 'مفتوح!', countriesAdded: 'تمت إضافة %{n} دولة إلى إمبراطوريتك.', avatarUnlockedTitle: 'تم فتح الصورة الرمزية!', flagUnlockedTitle: 'تم فتح العلم!', switchToOwned: 'انتقل إلى تبويب المملوكة لتجهيزه.', avatarEquippedTitle: 'تم تجهيز الصورة الرمزية!', avatarEquippedBody: 'صورتك الرمزية مرئية للجميع على لوحة المتصدرين.', mustOwnFirst: 'يجب امتلاك %{name} أولاً.', easterEggTitle: '🎉 تم اكتشاف بيضة عيد الفصح!', easterEggBody: 'أحسنت على اكتشاف بيضة عيد الفصح! هنا 5 تذاكر مجانية.', ticketPackAddedTitle: 'تمت إضافة حزمة التذاكر', ticketsAddedBody: 'تمت إضافة 5 تذاكر إلى مخزونك.', ticketAddedTitle: 'تمت إضافة تذكرة', ticketAddedBody: 'تمت الإضافة إلى مخزونك.', thanksForWatchingTitle: 'شكراً على المشاهدة!', ticketWatchBody: 'تمت إضافة تذكرة واحدة إلى مخزونك.', upgradesSubtitle: 'وسّع رحلاتك على الخريطة لكسب مضاعفات سلسلة ضخمة.', capitalsQuizUpgrade: 'اختبار العواصم', bordersQuizUpgrade: 'اختبار الحدود', level2Expedition: 'رحلة المستوى 2', level2Desc: 'العب حتى 20 دوراً لكل اختبار', level3Expedition: 'رحلة المستوى 3', level3Desc: 'العب حتى 30 دوراً لكل اختبار', millionaireSwap: 'تبديل المليونير', millionaireSwapDesc: 'استبدل سؤالاً في اختبار المليونير', darkScroll: 'طومار الظلام', darkScrollDesc: 'يفتح اختبار الكابوس', infiniteMaps: 'خرائط لا نهائية', infiniteMapsDesc: 'لا انتظار للخرائط مجدداً', speedDetectiveQuest: 'تسليم مهمة المحقق السريع', groundInvasionQuest: 'تسليم مهمة الغزو البري', acquireTickets: 'احصل على تذاكر المليونير', millionaireTicket: 'تذكرة المليونير', oneTicket: 'تذكرة واحدة', ticketPack: 'حزمة التذاكر', ticketsCount: '5 تذاكر مليونير', watchAnAd: 'شاهد إعلاناً', oneAdTicket: 'تذكرة واحدة مقابل إعلان', bulkBuyTitle: 'شراء بالجملة', purchaseFailed: 'فشلت عملية الشراء', purchaseFailedBody: 'حدث خطأ ما.', conqueredTitle: 'مفتوح!', previousTier: 'المستوى السابق', featuredToday: 'مميز اليوم', todayOff: 'خصم 20% اليوم فقط', adUnavailable: 'الإعلان غير متاح', free: 'مجاني', cancel: 'إلغاء', claim: 'احصل!', tapToClose: 'انقر في أي مكان للإغلاق' },
    premium: { heroTitle: 'كن\nفاتح العالم', heroSubtitle: 'العالم لن يفتح نفسه.', heroSub: 'أتقن الجغرافيا. سيطر على المتصدرين.\nافتح العالم بلا حدود.', joinExplorers: 'انضم إلى 1200 مستكشف مميز', hookHighlight: 'يمتلك المستكشفون من مستوى الفاتح أراضي أكثر بـ3×', hookSuffix: 'ويتصاعدون في المتصدرين 5× أسرع من اللاعبين المجانيين.', sectionEverything: 'كل شيء في الفاتح', sectionFreeVsPro: 'مجاني مقابل الفاتح', featureHeader: 'الميزة', freeHeader: 'مجاني', sectionChoosePlan: 'اختر خطتك', once: 'مرة واحدة', lifetimeBreakdown: 'دفعة واحدة · وصول مدى الحياة', monthlyPer: '/شهر', cancelAnytime: 'إلغاء في أي وقت', securePayment: 'تتم المعالجة بشكل آمن عبر App Store / Google Play', trustSecure: 'دفع آمن', trustLifetime: 'وصول مدى الحياة', trustInstant: 'وصول فوري', sectionTestimonials: 'ماذا يقول الفاتحون', ratingLabel: '4.9 / 5 من أكثر من 2000 قائد', urgencyBanner: 'الخطة الشهرية — الشهر الأول بخصم 50% — تنتهي في ', mostPopular: 'الأكثر شعبية', flagOnly: 'العلم فقط', allQuizzes: 'جميع الاختبارات', feature1Title: 'مكافآت يومية ثلاثية', feature1Desc: 'اكسب 3× ذهباً و3× تذاكر من المكافآت اليومية.', feature2Title: 'مكافآت اختبار 2×', feature2Desc: 'ضاعف الذهب وXP من كل اختبار تكمله.', feature3Title: 'العب دون اتصال', feature3Desc: 'اختبارات العواصم والحدود والأشكال تعمل بدون إنترنت.', feature4Title: 'صور رمزية فريدة', feature4Desc: 'صور رمزية حصرية للفاتحين غير متاحة في أي مكان آخر.', feature5Title: 'مهام فريدة', feature5Desc: 'الوصول إلى محتوى مهام حصري ومكافآت للفاتحين فقط.', feature6Title: 'شارة الفاتح', feature6Desc: 'شارة تاج حصرية تُعرض على لوحة المتصدرين العالمية.', compare1: 'مضاعف ذهب تسجيل الدخول اليومي', compare2: 'مضاعف تذاكر تسجيل الدخول اليومي', compare3: 'شارة المتصدرين', compare4: 'صور رمزية فريدة', compare5: 'مهام فريدة', compare6: 'ذهب وXP الاختبار', compare7: 'الوصول المبكر للميزات', compare8: 'العب دون اتصال', faq1q: 'كيف تعمل خطة مدى الحياة؟', faq1a: 'إنها دفعة واحدة — لا اشتراك، لا تجديدات. تحصل على وصول دائم للفاتح بالإضافة إلى 100000 ذهب و30 تذكرة تُضاف فوراً.', faq2q: 'هل يمكنني إلغاء خطتي الشهرية؟', faq2a: 'نعم. ألغِ بنقرة واحدة من إعدادات اشتراك App Store / Google Play في أي وقت. تحتفظ بالوصول للفاتح حتى نهاية دورة الفوترة.', faq3q: 'هل أحتفظ بعناصري إذا ألغيت؟', faq3a: 'نعم! كل دولة وصورة رمزية وعلم اشتريتهم يبقى لك بشكل دائم بغض النظر عن حالة الاشتراك.', faq4q: 'ما طرق الدفع المقبولة؟', faq4a: 'تُعالج جميع المدفوعات بشكل آمن عبر App Store أو Google Play Billing — لا نحتفظ أبداً بتفاصيل البطاقة مباشرة.', lifetime: 'مدى الحياة', monthly: 'شهري', bestDeal: 'أفضل صفقة', getLifetime: 'احصل على وصول مدى الحياة', getMonthly: 'ابدأ الخطة الشهرية', restore: 'استعادة الشراء', restoring: 'جارٍ الاستعادة…', terms: 'الشروط', privacy: 'الخصوصية', faq: 'الأسئلة الشائعة', welcomeTitle: 'مرحباً، فاتح!', welcomeBody: 'لديك الآن وصول غير محدود. هيا!', failedTitle: 'فشلت عملية الشراء', failedBody: 'حدث خطأ ما. يرجى المحاولة مجدداً.', restoredTitle: 'تمت الاستعادة!', restoredBody: 'تمت استعادة عملية الشراء.', nothingTitle: 'لا شيء للاستعادة', nothingBody: 'لم يُعثر على شراء سابق.', ok: 'حسناً' },
    leaderboard: { title: 'المتصدرون', mostXP: 'أعلى XP مكتسب', mostQuizzes: 'أكثر الاختبارات إنجازاً', mostGold: 'أكثر ذهب مكتسب', mostCorrect: 'أكثر إجابات صحيحة', highestAccuracy: 'أعلى دقة', loading: 'جارٍ التحميل…', error: 'خطأ', rank: '#%{n}', daily: 'يومي', weekly: 'أسبوعي', allTime: 'كل الأوقات', searchPlayers: 'ابحث عن لاعبين…', explorers: '%{n} مستكشف', competingToday: '%{n} يتنافسون اليوم', competingThisWeek: '%{n} يتنافسون هذا الأسبوع', thisWeeksChallenge: 'تحدي هذا الأسبوع:', weeklyChallengeRewards: 'مكافآت التحدي الأسبوعي', resetsIn: 'تُعاد في', updatesIn: 'تُحدَّث في', todaysChallenge: 'تحدي اليوم:', rewards: 'المكافآت', noPlayersFound: 'لم يُعثر على لاعبين لـ"%{query}"', noExplorers: 'لا مستكشفين بعد. كن الأول!', levelShort: 'م %{n}', you: ' (أنت)', awesome: 'رائع!', dailyChallengeRewards: 'مكافآت التحدي اليومي', explorerProfile: 'ملف المستكشف', loadingProfile: 'جارٍ تحميل الملف…', memberSince: 'عضو منذ %{date}', worldDomination: 'الهيمنة العالمية', conquestLabel: '%{pct}% من أراضي الأرض · %{area}M كم²', empireMap: 'خريطة الإمبراطورية', questsCount: 'المهام (%{claimed} / %{total})', inventory: 'المخزون', avatarsCount: 'الصور الرمزية (%{n})', flagsCount: 'الأعلام (%{n})', tapToClose: 'انقر في أي مكان للإغلاق', paidOut: 'تُدفع عندما يصل العد التنازلي إلى الصفر · أفضل 3 بتحدي اليوم', metricXP: 'XP', metricQuizzes: 'اختبارات', metricGold: 'ذهب', metricCorrect: 'صحيح', metricAccuracy: 'دقة', catXP: 'XP', catLand: 'أراضٍ', catQuizzes: 'اختبارات', catAvatars: 'صور رمزية' },
    mythicChest: { header: 'الصندوق الأسطوري', eyebrow: 'أعلى مستوى من الكنوز', title: 'مكافأة جديرة بالأساطير', subtitle: 'كل فتح يمنحك غبار أسطورياً. عشر غبارات تتيح لك اختيار أي مكافأة.', rewardUnlocked: 'تم فتح مكافأة أسطورية', rewardAppliedXp: 'مطبّق فوراً · دون مكافأة ترقية المستوى', rewardPotionStored: '+200% لـ10 اختبارات · مخزون في جرعاتك', rewardAdded: 'تمت الإضافة إلى حسابك فوراً', dustAward: '+1 غبار أسطوري', chestsAvailable: 'الصناديق المتاحة', monthlyOpened: 'صناديق الفاتح الشهرية المفتوحة', dust: 'الغبار الأسطوري', opening: 'جارٍ الفتح…', rewardClaimed: 'تم المطالبة بالمكافأة', openAnother: 'افتح آخر', openChest: 'فتح الصندوق الأسطوري', noChests: 'لا صناديق متاحة', openGuaranteed: '✦ فتح اختيار مضمون', hideRates: 'إخفاء نسب السقوط', viewRates: 'عرض نسب السقوط', dropRatesTitle: 'نسب سقوط الأسطوري', dustGuaranteed: '+1 غبار أسطوري مضمون مع كل صندوق', devPreview: 'معاينة المطور · لا توجد مكافآت ممنوحة', chooseReward: 'اختر أي مكافأة أسطورية', consumeDust: 'سيُستهلك 10 غبار أسطوري.', uniqueAvatars: 'صور رمزية فريدة', accessibility: { rewardReceived: 'تم استلام %{reward}.' }, rewards: { gold: '%{amount} ذهب', xp: '%{amount} XP', xpPotion: 'جرعة XP أسطورية', goldPotion: 'جرعة ذهب أسطورية', avatar: 'صورة رمزية أسطورية' }, dropRates: { gold_25000: '25,000 ذهب', gold_75000: '75,000 ذهب', gold_150000: '150,000 ذهب', xp: '20,000 XP', xp_potion: 'جرعة XP أسطورية · 10 اختبارات', gold_potion: 'جرعة ذهب أسطورية · 10 اختبارات', avatar: 'صورة رمزية أسطورية فريدة' }, avatars: { png_worldbreaker_empress: 'إمبراطورة كسر العالم', png_storm_navigator: 'مبحر العاصفة', png_mapless_heroine: 'البطلة بلا خريطة', png_mapless_hero: 'البطل بلا خريطة', png_longitude_ronin: 'رونين خط الطول', png_meridian_oracle: 'عراف خط الزوال', png_border_phantom: 'شبح الحدود', png_cosmic_pigeon: 'الحمامة الكونية', png_globe_eater: 'آكل الكرة الأرضية', png_conquest_frog: 'ضفدع الفتح' } },
    worldMap: { title: 'خريطة العالم', subtitle: '%{n} دولة لفتحها', loading: 'جارٍ تحميل الدول…', purchaseTitle: 'شراء %{country}؟', purchaseBody: 'افتح %{country} مقابل %{cost} ذهب؟', confirm: 'تأكيد', cancel: 'إلغاء', success: 'تم فتح %{country}!', successTitle: 'مفتوح!', notEnoughGold: 'لا يوجد ذهب كافٍ', notEnoughGoldBody: 'تحتاج %{cost} ذهب لشراء %{country}.', alreadyOwned: 'أنت تمتلك هذه الدولة بالفعل!', error: 'خطأ' },
    quizMenu: { howItWorks: 'كيف يعمل', mapsLeft: 'تبقى %{n} خرائط', trailLocked: 'اختبار المسار مقفل', trailLockedBody: 'أكمل مزيداً من الاختبارات لفتح اختبار المسار.', gauntletLocked: 'الاختبار الكبير مقفل', gauntletLockedBody: 'ارتقِ لمستوى أعلى لفتح الاختبار الكبير.', acquireTickets: 'احصل على تذاكر المليونير', acquireTicketsBody: 'اكسب تذاكر عبر إنجاز المهام.', tickets: '%{n} تذاكر', goldSuffix: 'ذهب', quizLocked: 'الاختبار مقفل', unlockCapitals: 'افتح اختبار العواصم في المتجر.', unlockBorders: 'افتح اختبار الحدود في المتجر.', displayInShop: 'عرض في المتجر', gotIt: 'حسناً', noTicketsBody: 'تحتاج تذكرة واحدة على الأقل للعب اختبار المليونير.\n\nاكسب تذاكر من المكافآت اليومية أو اشترِها من المتجر → العناصر.', watch: 'شاهد', nextMap: 'الخريطة التالية في %{min} دقيقة', mapsRemaining: 'تبقى %{n} / %{max} خرائط. 1 لكل اختبار.' },
    common: { error: 'خطأ', cancel: 'إلغاء', ok: 'حسناً', loading: 'جارٍ التحميل…', retry: 'إعادة المحاولة' },
    questData: { level_10: { title: 'الصعود الأول', desc: 'ابلغ المستوى 10.' }, level_25: { title: 'مستكشف محنّك', desc: 'ابلغ المستوى 25.' }, level_30: { title: 'تكتيكي متمرس', desc: 'ابلغ المستوى 30.' }, level_50: { title: 'فاتح نخبة', desc: 'ابلغ المستوى 50.' }, level_80: { title: 'قائد أسطوري', desc: 'ابلغ المستوى 80.' }, level_100: { title: 'إله الجغرافيا', desc: 'ابلغ المستوى 100.' }, first_blood: { title: 'أول فتح', desc: 'أضف أول دولة على الخريطة.' }, empire_5: { title: 'إمبراطورية ناشئة', desc: 'أضف 5 دول مختلفة.' }, empire_10: { title: 'طموحات إمبراطورية', desc: 'أضف 10 دول مختلفة.' }, empire_25: { title: 'قوة عالمية', desc: 'أضف 25 دولة مختلفة.' }, empire_50: { title: 'مهيمن عالمي', desc: 'أضف 50 دولة مختلفة.' }, streak_20: { title: 'مدمن GeoConquest', desc: 'سجّل الدخول 20 يوماً متتالياً.' }, area_1m: { title: 'أراضٍ واسعة', desc: 'تحكّم في أكثر من 1M كم مربع.' }, area_10m: { title: 'امتداد قاري', desc: 'تحكّم في أكثر من 10M كم مربع.' }, area_100m: { title: 'سيد الأرض', desc: 'تحكّم في أكثر من 100M كم مربع.' }, conquer_africa: { title: 'سيد إفريقيا', desc: 'امتلك كل دولة في القارة الإفريقية.' }, conquer_europe: { title: 'إمبراطور أوروبا', desc: 'امتلك كل دولة في أوروبا.' }, conquer_asia: { title: 'سلطان آسيا', desc: 'امتلك كل دولة في آسيا.' }, conquer_oceania: { title: 'سيد المحيط الهادئ', desc: 'امتلك كل دولة في أوقيانوسيا.' }, conquer_americas: { title: 'قائد الأمريكتين', desc: 'امتلك كل دولة في الأمريكتين.' }, flag_mastery_30s: { title: 'المحقق السريع', desc: 'أنجز اختبار الأعلام بدقة تجاوز 90% خلال أقل من 30 ثانية.' }, ground_invasion: { title: 'الغزو البري', desc: 'أنجز اختبار العواصم بدقة تجاوز 90% خلال أقل من 30 ثانية.' }, quiz_10: { title: 'مبتدئ الاختبارات', desc: 'أكمل 10 اختبارات من أي نوع.' }, quiz_50: { title: 'محترف الاختبارات', desc: 'أكمل 50 اختباراً من أي نوع.' }, excellence_20: { title: 'عالم العالم', desc: 'احصل على 85% أو أكثر في 20 اختباراً مختلفاً.' }, trail_blazer_50: { title: 'رائد المسار', desc: 'أجب على 30 سؤالاً صحيحاً في جولة واحدة من اختبار المسار.' }, gauntlet_ascendant: { title: 'الصاعد', desc: 'ابلغ المستوى 100 في الاختبار الكبير.' }, perfect_accuracy_15: { title: 'دقة مثالية', desc: 'حقق دقة 100% في 15 اختباراً مختلفاً.' }, game_master: { title: 'سيد اللعبة', desc: 'أكمل اختبار المليونير بشكل مثالي دون استخدام 50/50 أو مساعدة الجمهور أو الاستبدال.' }, daily_champion_5: { title: 'بطل اليوم', desc: 'احتل المركز الأول في التحدي اليومي 5 مرات.' }, avatar_collector_10: { title: 'صائد الصور الرمزية', desc: 'اجمع 10 صور رمزية مختلفة.' }, max_tier_avatar: { title: 'جامع القمة', desc: 'احصل على أعلى مستوى صورة رمزية في أي مجموعة.' }, complete_the_world: { title: 'الهيمنة العالمية', desc: 'امتلك جميع الدول الـ250 في العالم.' }, nightmare_complete: { title: 'نجا من الكابوس', desc: 'أحسنت، فاتح العالم السفلي.' }, true_conqueror: { title: 'لا يوجد سواه.', desc: 'احمل الملك الإلهي الأعلى والملكة الإلهية العليا وعلامة الوحش.' }, never_enough: { title: 'لا يكفي أبداً', desc: 'احمل الملك الإلهي الأعلى والدرع الكوني.' }, level_150: { title: 'العقل الصاعد', desc: 'ابلغ المستوى 150.' }, level_200: { title: 'أسطورة الأطلس', desc: 'ابلغ المستوى 200.' }, level_250: { title: 'السيد الأبدي', desc: 'ابلغ المستوى 250.' }, level_300: { title: 'ما وراء الحجاب', desc: 'ابلغ المستوى 300.' } },
  },
};

// Keep the weekly leaderboard labels localized for every supported language.
Object.assign((translations.es as any).leaderboard, { weekly: 'Semanal', competingThisWeek: '%{n} compitiendo esta semana', thisWeeksChallenge: 'Desafío de esta semana:', weeklyChallengeRewards: 'Recompensas del desafío semanal' });
Object.assign((translations.fr as any).leaderboard, { weekly: 'Hebdomadaire', competingThisWeek: '%{n} en compétition cette semaine', thisWeeksChallenge: 'Défi de cette semaine :', weeklyChallengeRewards: 'Récompenses du défi hebdomadaire' });
Object.assign((translations.hi as any).leaderboard, { weekly: 'साप्ताहिक', competingThisWeek: 'इस सप्ताह %{n} प्रतिस्पर्धी', thisWeeksChallenge: 'इस सप्ताह की चुनौती:', weeklyChallengeRewards: 'साप्ताहिक चुनौती पुरस्कार' });
Object.assign((translations['zh-Hans'] as any).leaderboard, { weekly: '每周', competingThisWeek: '本周有 %{n} 名参赛者', thisWeeksChallenge: '本周挑战：', weeklyChallengeRewards: '每周挑战奖励' });
Object.assign((translations.he as any).leaderboard, { weekly: 'שבועי', competingThisWeek: '%{n} מתחרים השבוע', thisWeeksChallenge: 'אתגר השבוע:', weeklyChallengeRewards: 'פרסי האתגר השבועי' });
Object.assign((translations.ar as any).leaderboard, { weekly: 'أسبوعي', competingThisWeek: '%{n} يتنافسون هذا الأسبوع', thisWeeksChallenge: 'تحدي هذا الأسبوع:', weeklyChallengeRewards: 'مكافآت التحدي الأسبوعي' });

// Mythic Chest copy is supplied for every supported locale; nested reward/avatar
// labels fall back to English when a locale does not provide a specific name.
const ensureLocaleSection = (locale: string, section: string) => {
  const catalog = translations[locale] as any;
  catalog[section] = catalog[section] ?? {};
  return catalog[section];
};

ensureLocaleSection('es', 'mythicChest');
ensureLocaleSection('fr', 'mythicChest');
ensureLocaleSection('hi', 'mythicChest');
ensureLocaleSection('zh-Hans', 'mythicChest');
ensureLocaleSection('he', 'mythicChest');
ensureLocaleSection('ar', 'mythicChest');

Object.assign((translations.es as any).mythicChest, { header: 'COFRE MÍTICO', eyebrow: 'EL NIVEL MÁS ALTO DEL TESORO', title: 'Una recompensa digna de leyendas', subtitle: 'Cada apertura otorga Polvo Mítico. Con diez puedes elegir cualquier recompensa.', rewardUnlocked: 'RECOMPENSA MÍTICA DESBLOQUEADA', chestsAvailable: 'COFRES DISPONIBLES', monthlyOpened: 'Cofres mensuales de Conquistador abiertos', dust: 'POLVO MÍTICO', opening: 'ABRIENDO…', rewardClaimed: 'RECOMPENSA OBTENIDA', openAnother: 'Abrir otro', openChest: 'ABRIR COFRE MÍTICO', noChests: 'NO HAY COFRES DISPONIBLES', dropRatesTitle: 'PROBABILIDADES DEL COFRE MÍTICO', chooseReward: 'Elige cualquier recompensa mítica', consumeDust: 'Se consumirán 10 Polvos Míticos.', uniqueAvatars: 'AVATARES ÚNICOS' });
Object.assign((translations.fr as any).mythicChest, { header: 'COFFRE MYTHIQUE', eyebrow: 'LE PLUS HAUT NIVEAU DU TRÉSOR', title: 'Une récompense digne des légendes', subtitle: "Chaque ouverture offre de la Poussière Mythique. Dix permettent de choisir une récompense.", rewardUnlocked: 'RÉCOMPENSE MYTHIQUE DÉBLOQUÉE', chestsAvailable: 'COFFRES DISPONIBLES', monthlyOpened: 'Coffres mensuels de Conquérant ouverts', dust: 'POUSSIÈRE MYTHIQUE', opening: 'OUVERTURE…', rewardClaimed: 'RÉCOMPENSE OBTENUE', openAnother: 'En ouvrir un autre', openChest: 'OUVRIR LE COFFRE MYTHIQUE', noChests: 'AUCUN COFFRE DISPONIBLE', dropRatesTitle: 'TAUX DU COFFRE MYTHIQUE', chooseReward: 'Choisissez une récompense mythique', consumeDust: '10 poussières mythiques seront consommées.', uniqueAvatars: 'AVATARS UNIQUES' });
Object.assign((translations.hi as any).mythicChest, { header: 'मिथिक चेस्ट', eyebrow: 'खजाने का सर्वोच्च स्तर', title: 'किंवदंतियों के योग्य इनाम', subtitle: 'हर बार खोलने पर मिथिक डस्ट मिलती है। दस डस्ट से कोई भी इनाम चुनें।', rewardUnlocked: 'मिथिक इनाम अनलॉक हुआ', chestsAvailable: 'उपलब्ध चेस्ट', monthlyOpened: 'खोले गए मासिक कॉन्करर चेस्ट', dust: 'मिथिक डस्ट', opening: 'खोला जा रहा है…', rewardClaimed: 'इनाम प्राप्त', openAnother: 'एक और खोलें', openChest: 'मिथिक चेस्ट खोलें', noChests: 'कोई चेस्ट उपलब्ध नहीं', dropRatesTitle: 'मिथिक ड्रॉप रेट', chooseReward: 'कोई भी मिथिक इनाम चुनें', consumeDust: '10 मिथिक डस्ट खर्च होगी।', uniqueAvatars: 'विशिष्ट अवतार' });
Object.assign((translations['zh-Hans'] as any).mythicChest, { header: '神话宝箱', eyebrow: '宝藏的最高等级', title: '配得上传说的奖励', subtitle: '每次开启都会获得神话尘埃。集齐十个即可任选奖励。', rewardUnlocked: '神话奖励已解锁', chestsAvailable: '可用宝箱', monthlyOpened: '已开启的征服者月度宝箱', dust: '神话尘埃', opening: '开启中…', rewardClaimed: '奖励已领取', openAnother: '再开一个', openChest: '开启神话宝箱', noChests: '暂无宝箱', dropRatesTitle: '神话宝箱掉落率', chooseReward: '选择任意神话奖励', consumeDust: '将消耗10个神话尘埃。', uniqueAvatars: '独特头像' });
Object.assign((translations.he as any).mythicChest, {
  header: 'תיבת מית׳יק',
  eyebrow: 'דרגת האוצר הגבוהה ביותר',
  title: 'פרס הראוי לאגדות',
  subtitle: 'כל פתיחה מעניקה אבקת מית׳יק. עם עשר אבקות אפשר לבחור כל פרס.',
  rewardUnlocked: 'פרס מית׳יק נפתח',
  rewardAppliedXp: 'מתווסף מיידית · ללא בונוס זהב מעליית רמה',
  rewardPotionStored: '+200% ל-10 חידונים · נשמר בשיקויים שלך',
  rewardAdded: 'נוסף לחשבונך מיידית',
  dustAward: '+1 אבקת מית׳יק',
  chestsAvailable: 'תיבות זמינות',
  monthlyOpened: 'תיבות כובש חודשיות שנפתחו',
  dust: 'אבקת מית׳יק',
  opening: 'נפתח…',
  rewardClaimed: 'הפרס התקבל',
  openAnother: 'פתח עוד אחד', openChest: 'פתח תיבת מית׳יק',
  noChests: 'אין תיבות זמינות',
  openGuaranteed: '✦ פתח בחירה מובטחת',
  hideRates: 'הסתר סיכויי זכייה',
  viewRates: 'הצג סיכויי זכייה',
  dropRatesTitle: 'סיכויי זכייה מתיבת מית׳יק',
  dustGuaranteed: '+1 אבקת מית׳יק מובטחת בכל תיבה',
  devPreview: 'תצוגת מפתח לתיבה · לא ניתנים פרסים',
  previewRewards: 'תצוגת פרסים',
  hidePreview: 'הסתר תצוגת מפתח',
  chooseReward: 'בחר כל פרס מית׳יק',
  consumeDust: '10 אבקות מית׳יק ייצרכו.',
  uniqueAvatars: 'אווטארים ייחודיים',
  errors: { open: 'לא ניתן לפתוח את תיבת המית׳יק. נסה שוב.', choice: 'לא ניתן לבחור את פרס המית׳יק. נסה שוב.' },
  accessibility: { rewardReceived: '%{reward} התקבל.' },
  rewards: { gold: '%{amount} זהב', xp: '%{amount} XP', xpPotion: 'שיקוי XP מית׳יק', goldPotion: 'שיקוי זהב מית׳יק', avatar: 'אווטאר מית׳יק' },
  dropRates: {
    gold_25000: '25,000 זהב',
    gold_75000: '75,000 זהב',
    gold_150000: '150,000 זהב',
    xp: '20,000 XP',
    xp_potion: 'שיקוי XP מית׳יק · 10 חידונים',
    gold_potion: 'שיקוי זהב מית׳יק · 10 חידונים',
    avatar: 'אווטאר מית׳יק ייחודי',
  },
});
Object.assign((translations.es as any).questData, { game_master: { title: 'Maestro del Juego', desc: 'Completa un Cuestionario Millonario a la perfección sin usar 50/50, Público ni Cambiar.' } });
Object.assign((translations.fr as any).questData, { game_master: { title: 'Maître du jeu', desc: 'Terminez parfaitement un Quiz Millionnaire sans utiliser 50/50, Public ou Changer.' } });
Object.assign((translations.hi as any).questData, { game_master: { title: 'गेम मास्टर', desc: '50/50, दर्शक या बदलें का उपयोग किए बिना करोड़पति क्विज़ पूरा करें।' } });
Object.assign((translations['zh-Hans'] as any).questData, { game_master: { title: '游戏大师', desc: '不使用50/50、观众或换题，完美完成百万富翁测验。' } });
Object.assign((translations.he as any).questData, { game_master: { title: 'מאסטר המשחק', desc: 'השלם חידון מיליונר בצורה מושלמת בלי להשתמש ב־50/50, קהל או החלפה.' } });
// quizCommon extras for all non-English locales
Object.assign((translations.es as any).quizCommon, { stay: 'Quedarse', leaveQuiz: '¿Salir del quiz?', progressLost: 'Se perderá tu progreso.' });
Object.assign((translations.fr as any).quizCommon, { stay: 'Rester', leaveQuiz: 'Quitter le quiz ?', progressLost: 'Votre progression sera perdue.' });
Object.assign((translations.hi as any).quizCommon, { stay: 'रुकें', leaveQuiz: 'क्विज़ छोड़ें?', progressLost: 'आपकी प्रगति खो जाएगी।' });
Object.assign((translations['zh-Hans'] as any).quizCommon, { stay: '留下', leaveQuiz: '退出测验？', progressLost: '你的进度将会丢失。' });
Object.assign((translations.he as any).quizCommon, { stay: 'הישאר', leaveQuiz: 'עזוב את החידון?', progressLost: 'ההתקדמות שלך תאבד.' });
Object.assign((translations.ar as any).quizCommon, { stay: 'ابقَ', leaveQuiz: 'مغادرة الاختبار؟', progressLost: 'ستُفقد تقدمك.' });

// gauntlet.leaveTitle and nightmareQuiz.leaveTitle for all locales
Object.assign((translations.es as any).gauntlet, { leaveTitle: '¿Salir del Desafío?' });
Object.assign((translations.fr as any).gauntlet, { leaveTitle: 'Quitter le Défi ?' });
Object.assign((translations.hi as any).gauntlet, { leaveTitle: 'गॉन्टलेट छोड़ें?' });
Object.assign((translations['zh-Hans'] as any).gauntlet, { leaveTitle: '退出决斗？' });
Object.assign((translations.he as any).gauntlet, { leaveTitle: 'לעזוב את הגאונטלט?' });
Object.assign((translations.ar as any).gauntlet, { leaveTitle: 'مغادرة الاختبار الكبير؟' });
Object.assign((translations.es as any).nightmareQuiz, { leaveTitle: '¿Salir de Pesadilla?' });
Object.assign((translations.fr as any).nightmareQuiz, { leaveTitle: 'Quitter le Cauchemar ?' });
Object.assign((translations.hi as any).nightmareQuiz, { leaveTitle: 'नाइटमेयर छोड़ें?' });
Object.assign((translations['zh-Hans'] as any).nightmareQuiz, { leaveTitle: '退出噩梦？' });
Object.assign((translations.he as any).nightmareQuiz, { leaveTitle: 'לעזוב את הסיוט?' });
Object.assign((translations.ar as any).nightmareQuiz, { leaveTitle: 'مغادرة الكابوس؟' });

// shop extras
Object.assign((translations.es as any).shop, { premiumTreasure: 'TESORO PREMIUM', mythicChestSubtitle: 'Avatares únicos y recompensas raras', mythicAvatarSubtitle: 'Avatares únicos con bonificaciones ocultas', mythicAvatarEmpty: 'Abre Cofres Míticos para descubrir avatares con bonificaciones únicas.' });
Object.assign((translations.fr as any).shop, { premiumTreasure: 'TRÉSOR PREMIUM', mythicChestSubtitle: 'Avatars uniques et récompenses rares', mythicAvatarSubtitle: 'Avatars uniques avec bonus cachés', mythicAvatarEmpty: 'Ouvrez des Coffres Mythiques pour découvrir des avatars avec des bonus uniques.' });
Object.assign((translations.hi as any).shop, { premiumTreasure: 'प्रीमियम खजाना', mythicChestSubtitle: 'अनोखे अवतार और दुर्लभ पुरस्कार', mythicAvatarSubtitle: 'छुपे बोनस वाले अनोखे अवतार', mythicAvatarEmpty: 'अनोखे बोनस वाले अवतार खोजने के लिए मिथिक चेस्ट खोलें।' });
Object.assign((translations['zh-Hans'] as any).shop, { premiumTreasure: '顶级宝藏', mythicChestSubtitle: '独特头像与稀有奖励', mythicAvatarSubtitle: '带有隐藏加成的独特头像', mythicAvatarEmpty: '开启神话宝箱以发现具有独特加成的头像。' });
Object.assign((translations.he as any).shop, { premiumTreasure: 'אוצר פרמיום', mythicChestSubtitle: 'אווטארים ייחודיים ופרסים נדירים', mythicAvatarTitle: '✦ אווטארים מית׳יק', mythicAvatarSubtitle: 'אווטארים ייחודיים עם בונוסים מוסתרים', mythicAvatarEmpty: 'פתח תיבות מית׳יק כדי לגלות אווטארים עם בונוסים ייחודיים.', mythicAvatarBonusHint: '? בונוס', mythicAvatarBonusBadge: '✦ בונוס מית׳יק ייחודי', mythicBonusGold: '+10% זהב שנצבר', mythicBonusXp: '+10% XP שנצבר' });
Object.assign((translations.ar as any).shop, { premiumTreasure: 'كنز بريميوم', mythicChestSubtitle: 'صور رمزية فريدة ومكافآت نادرة', mythicAvatarSubtitle: 'صور رمزية فريدة مع مزايا خفية', mythicAvatarEmpty: 'افتح صناديق أسطورية لاكتشاف صور رمزية مع مزايا فريدة.' });

// results extras
Object.assign((translations.es as any).results, { doubleRewardsTitle: '¿Doble recompensa próximo quiz?', doubleRewardsBody: 'Mira un anuncio para obtener x2 Oro + x2 XP en tu próximo quiz.', watchAdBtn: 'Ver anuncio', notNow: 'Ahora no', boostReady: 'Potenciador listo', boostReadyMsg: 'Las recompensas de tu próximo quiz serán dobles.', adUnavailableTitle: 'Anuncio no disponible', noTicketsPlayMsg: 'Necesitas al menos 1 ticket para volver a jugar.\n\nGana tickets con recompensas diarias o cómpralos en Tienda → Objetos.', ticketCostMsg: 'Costará 1 ticket. Tienes %{n} ticket%{s}.', play: 'Jugar', cancelBtn: 'Cancelar', go: 'Ir', watch: 'Ver' });
Object.assign((translations.fr as any).results, { doubleRewardsTitle: 'Double récompense au prochain quiz ?', doubleRewardsBody: 'Regardez une pub pour x2 Or + x2 XP à votre prochain quiz.', watchAdBtn: 'Voir la pub', notNow: 'Pas maintenant', boostReady: 'Bonus prêt', boostReadyMsg: 'Les récompenses de votre prochain quiz seront doublées.', adUnavailableTitle: 'Pub non disponible', noTicketsPlayMsg: 'Vous avez besoin d\'au moins 1 ticket pour rejouer.\n\nGagnez des tickets via les récompenses quotidiennes ou achetez-les en Boutique → Objets.', ticketCostMsg: 'Coûtera 1 ticket. Vous avez %{n} ticket%{s}.', play: 'Jouer', cancelBtn: 'Annuler', go: 'Aller', watch: 'Regarder' });
Object.assign((translations.hi as any).results, { doubleRewardsTitle: 'अगले क्विज़ में दोगुनी पुरस्कार?', doubleRewardsBody: 'अगले क्विज़ में x2 गोल्ड + x2 XP के लिए एक विज्ञापन देखें।', watchAdBtn: 'विज्ञापन देखें', notNow: 'अभी नहीं', boostReady: 'बूस्ट तैयार', boostReadyMsg: 'आपके अगले क्विज़ की पुरस्कारें दोगुनी होंगी।', adUnavailableTitle: 'विज्ञापन उपलब्ध नहीं', noTicketsPlayMsg: 'दोबारा खेलने के लिए कम से कम 1 टिकट चाहिए।\n\nदैनिक पुरस्कारों से टिकट कमाएं या Shop → Items से खरीदें।', ticketCostMsg: '1 टिकट लगेगा। आपके पास %{n} टिकट%{s} हैं।', play: 'खेलें', cancelBtn: 'रद्द करें', go: 'जाएं', watch: 'देखें' });
Object.assign((translations['zh-Hans'] as any).results, { doubleRewardsTitle: '下一题测验双倍奖励？', doubleRewardsBody: '观看广告，下次测验获得 x2 金币 + x2 XP。', watchAdBtn: '看广告', notNow: '暂不', boostReady: '加速已就绪', boostReadyMsg: '你的下次测验奖励将翻倍。', adUnavailableTitle: '广告不可用', noTicketsPlayMsg: '再次游玩至少需要 1 张券。\n\n从每日奖励获取券或在商店 → 物品中购买。', ticketCostMsg: '将花费 1 张券。你有 %{n} 张券。', play: '游玩', cancelBtn: '取消', go: '前往', watch: '观看' });
Object.assign((translations.he as any).results, { doubleRewardsTitle: 'פרסים כפולים בחידון הבא?', doubleRewardsBody: 'צפה במודעה עכשיו לקבלת x2 זהב + x2 XP בחידון הבא.', watchAdBtn: 'צפה במודעה', notNow: 'לא עכשיו', boostReady: 'בוסט מוכן', boostReadyMsg: 'פרסי החידון הבא שלך יוכפלו.', adUnavailableTitle: 'מודעה לא זמינה', noTicketsPlayMsg: 'אתה צריך לפחות כרטיס 1 כדי לשחק שוב.\n\nהרווח כרטיסים מפרסים יומיים או קנה בחנות → פריטים.', ticketCostMsg: 'עלות: 1 כרטיס. יש לך %{n} כרטיס%{s}.', play: 'שחק', cancelBtn: 'ביטול', go: 'לך', watch: 'צפה' });
Object.assign((translations.ar as any).results, { doubleRewardsTitle: 'مكافآت مضاعفة في الاختبار التالي؟', doubleRewardsBody: 'شاهد إعلاناً الآن للحصول على x2 ذهب + x2 XP في اختبارك التالي.', watchAdBtn: 'شاهد الإعلان', notNow: 'ليس الآن', boostReady: 'التعزيز جاهز', boostReadyMsg: 'ستُضاعف مكافآت اختبارك التالي.', adUnavailableTitle: 'الإعلان غير متاح', noTicketsPlayMsg: 'تحتاج تذكرة واحدة على الأقل للعب مجدداً.\n\nاكسب تذاكر من المكافآت اليومية أو اشترِها من المتجر → العناصر.', ticketCostMsg: 'سيُكلّف تذكرة واحدة. لديك %{n} تذكرة%{s}.', play: 'العب', cancelBtn: 'إلغاء', go: 'اذهب', watch: 'شاهد' });

// leaderboard rank strings
Object.assign((translations.es as any).leaderboard, { toppedYesterday: '¡Encabezaste el marcador de ayer!', finishedYesterday: '¡Terminaste #%{rank} en el marcador de ayer!', rankPlace: '¡Puesto #%{rank}!' });
Object.assign((translations.fr as any).leaderboard, { toppedYesterday: 'Vous avez dominé le classement d\'hier !', finishedYesterday: 'Vous avez terminé #%{rank} au classement d\'hier !', rankPlace: 'Place #%{rank} !' });
Object.assign((translations.hi as any).leaderboard, { toppedYesterday: 'आपने कल का लीडरबोर्ड टॉप किया!', finishedYesterday: 'आप कल के लीडरबोर्ड पर #%{rank} रहे!', rankPlace: '#%{rank} स्थान!' });
Object.assign((translations['zh-Hans'] as any).leaderboard, { toppedYesterday: '你昨天登顶排行榜！', finishedYesterday: '你昨天在排行榜上排名第 #%{rank}！', rankPlace: '第 #%{rank} 名！' });
Object.assign((translations.he as any).leaderboard, { toppedYesterday: 'הובלת את הלוח של אתמול!', finishedYesterday: 'סיימת במקום #%{rank} בלוח של אתמול!', rankPlace: 'מקום #%{rank}!' });
Object.assign((translations.ar as any).leaderboard, { toppedYesterday: 'تصدّرت لوحة المتصدرين الأمس!', finishedYesterday: 'أنهيت في المرتبة #%{rank} على لوحة المتصدرين الأمس!', rankPlace: 'المرتبة #%{rank}!' });

// quizMenu extras
Object.assign((translations.es as any).quizMenu, { endgame: 'FIN DEL JUEGO', acquireTicketsModalTitle: 'Conseguir Tickets de Millonario', oneTicketLabel: '1 Ticket', fiveTicketsLabel: '5 Tickets', adTicketLabel: '1 Anuncio = 1 Ticket', watchBtn: 'Ver', cancelBtn: 'Cancelar', byAccuracy: 'según precisión' });
Object.assign((translations.fr as any).quizMenu, { endgame: 'FIN DE JEU', acquireTicketsModalTitle: 'Acquérir des Tickets Millionnaire', oneTicketLabel: '1 Ticket', fiveTicketsLabel: '5 Tickets', adTicketLabel: '1 Pub = 1 Ticket', watchBtn: 'Regarder', cancelBtn: 'Annuler', byAccuracy: 'selon précision' });
Object.assign((translations.hi as any).quizMenu, { endgame: 'एंडगेम', acquireTicketsModalTitle: 'मिलियनेयर टिकट प्राप्त करें', oneTicketLabel: '1 टिकट', fiveTicketsLabel: '5 टिकट', adTicketLabel: '1 विज्ञापन = 1 टिकट', watchBtn: 'देखें', cancelBtn: 'रद्द करें', byAccuracy: 'सटीकता के अनुसार' });
Object.assign((translations['zh-Hans'] as any).quizMenu, { endgame: '终局', acquireTicketsModalTitle: '获取百万富翁券', oneTicketLabel: '1 张券', fiveTicketsLabel: '5 张券', adTicketLabel: '1 广告 = 1 张券', watchBtn: '观看', cancelBtn: '取消', byAccuracy: '按准确度' });
Object.assign((translations.he as any).quizMenu, { endgame: 'סיום המשחק', acquireTicketsModalTitle: 'רכישת כרטיסי מיליונר', oneTicketLabel: 'כרטיס 1', fiveTicketsLabel: '5 כרטיסים', adTicketLabel: 'מודעה 1 = כרטיס 1', watchBtn: 'צפה', cancelBtn: 'ביטול', perCorrect: 'על כל תשובה נכונה', byAccuracy: 'לפי דיוק', maxPrize: 'הפרס הגדול', repeatReward: 'פרס חוזר', oneTimeReward: 'פרס חד פעמי' });
Object.assign((translations.ar as any).quizMenu, { endgame: 'نهاية اللعبة', acquireTicketsModalTitle: 'الحصول على تذاكر المليونير', oneTicketLabel: 'تذكرة واحدة', fiveTicketsLabel: '5 تذاكر', adTicketLabel: 'إعلان 1 = تذكرة 1', watchBtn: 'شاهد', cancelBtn: 'إلغاء', byAccuracy: 'حسب الدقة' });

// dailyChest section for all locales
const _dcEs = { hubTitle: 'Cofre diario', tapToRetry: 'Reintentar', loading: 'Cargando…', readyToOpen: 'Listo para abrir', claimedToday: 'Reclamado hoy', potions: 'Pociones', active: 'ACTIVO', eyebrow: 'TESORO DIARIO', yoursToKeep: 'Tuyo para siempre.', chestUpgraded: 'COFRE MEJORADO', maxTier: 'Nivel máximo alcanzado', daysToUpgrade: '%{n} día%{day} más para %{tier}', rules: 'Falta un día: baja un nivel. Reinicio: 00:00 UTC.', letsPlay: '¡A jugar!', opening: 'Abriendo…', openChest: 'Abrir cofre', comeBackTomorrow: 'Vuelve mañana', retry: 'Reintentar', viewOdds: 'Recompensas y probabilidades', hideOdds: 'Ocultar recompensas', oneRewardPerChest: 'Exactamente una recompensa por cofre', randomAvatar: 'Avatar aleatorio', goldAmount: '%{n} oro', ticketsAmount: '%{n} billetes', potionWithDuration: '1 %{name} · %{n} quizzes', conquerorNote: 'Conquistador ×3 incluido en cantidades de oro y billetes.', potionNote: 'Las pociones añaden 50% de ganancias base. Actívalas desde Pociones.', avatarCollectionTitle: 'Colección de avatares · %{n} restantes', avatarUnlockNote: 'Avatares sin poseer tienen igual probabilidad. Si todos están obtenidos, recibes %{n} oro.', yourPotions: 'TUS POCIONES', pickYourBoost: 'Elige tu impulso.', potionStackNote: 'Activa una poción antes de jugar. Cada quiz completado usa una carga.', emptyPotions: 'Aún no tienes pociones.', use: 'Usar', activateLabel: 'Activo', potionActiveStatus: '%{name} activo · +%{boost}% · %{n} quizzes restantes', rewardPotion: '+%{boost}% por %{n} quizzes. Guardado en Pociones.', rewardAvatar: '¡Desbloqueado! Equípalo en Tienda → Poseídos.', rewardDuplicate: 'Colección completa — oro entregado.', rewardBalance: 'Añadido a tu balance.' };
const _dcFr = { hubTitle: 'Coffre quotidien', tapToRetry: 'Appuyer pour réessayer', loading: 'Chargement…', readyToOpen: 'Prêt à ouvrir', claimedToday: 'Réclamé aujourd\'hui', potions: 'Potions', active: 'ACTIF', eyebrow: 'TRÉSOR QUOTIDIEN', yoursToKeep: 'À vous pour toujours.', chestUpgraded: 'COFFRE AMÉLIORÉ', maxTier: 'Niveau maximal atteint', daysToUpgrade: '%{n} jour%{day} de plus pour %{tier}', rules: 'Manquer un jour : perdre un niveau. Réinitialisation : 00:00 UTC.', letsPlay: 'Jouons !', opening: 'Ouverture…', openChest: 'Ouvrir le coffre', comeBackTomorrow: 'Revenez demain', retry: 'Réessayer', viewOdds: 'Récompenses et taux de drop', hideOdds: 'Masquer les récompenses', oneRewardPerChest: 'Exactement une récompense par coffre', randomAvatar: 'Avatar aléatoire', goldAmount: '%{n} or', ticketsAmount: '%{n} billets', potionWithDuration: '1 %{name} · %{n} quiz', conquerorNote: 'Conquérant ×3 inclus dans les montants d\'or et de billets.', potionNote: 'Les potions ajoutent 50% des gains de base. Activez-les depuis Potions.', avatarCollectionTitle: 'Collection d\'avatars · %{n} restants', avatarUnlockNote: 'Avatars non possédés ont des chances égales. Si tous possédés, recevez %{n} or.', yourPotions: 'VOS POTIONS', pickYourBoost: 'Choisissez votre bonus.', potionStackNote: 'Activez une potion avant un quiz. Chaque quiz terminé utilise une charge.', emptyPotions: 'Aucune potion pour le moment.', use: 'Utiliser', activateLabel: 'Actif', potionActiveStatus: '%{name} actif · +%{boost}% · %{n} quiz restants', rewardPotion: '+%{boost}% pour %{n} quiz. Enregistré dans Potions.', rewardAvatar: 'Débloqué ! Équipez-le dans Boutique → Possédés.', rewardDuplicate: 'Collection complète — or attribué.', rewardBalance: 'Ajouté à votre solde.' };
const _dcHi = { hubTitle: 'दैनिक संदूक', tapToRetry: 'पुनः प्रयास करें', loading: 'लोड हो रहा है…', readyToOpen: 'खोलने के लिए तैयार', claimedToday: 'आज लिया गया', potions: 'पोशन', active: 'सक्रिय', eyebrow: 'दैनिक खजाना', yoursToKeep: 'आपका है।', chestUpgraded: 'संदूक अपग्रेड', maxTier: 'अधिकतम स्तर पर पहुंचे', daysToUpgrade: '%{n} और दिन %{tier} के लिए', rules: 'एक दिन चूके: एक स्तर नीचे। रीसेट: 00:00 UTC।', letsPlay: 'खेलते हैं!', opening: 'खुल रहा है…', openChest: 'संदूक खोलें', comeBackTomorrow: 'कल वापस आएं', retry: 'पुनः प्रयास', viewOdds: 'पुरस्कार और दरें', hideOdds: 'पुरस्कार छुपाएं', oneRewardPerChest: 'प्रति संदूक एक पुरस्कार', randomAvatar: 'यादृच्छिक अवतार', goldAmount: '%{n} सोना', ticketsAmount: '%{n} टिकट', potionWithDuration: '1 %{name} · %{n} क्विज़', conquerorNote: 'कॉन्करर ×3 सोने और टिकटों में शामिल है।', potionNote: 'पोशन आधार कमाई में 50% जोड़ते हैं। पोशन से सक्रिय करें।', avatarCollectionTitle: 'अवतार संग्रह · %{n} बचे', avatarUnlockNote: 'बिना प्राप्त अवतारों को समान मौका। सभी प्राप्त होने पर %{n} सोना मिलेगा।', yourPotions: 'आपके पोशन', pickYourBoost: 'अपना बूस्ट चुनें।', potionStackNote: 'क्विज़ से पहले पोशन सक्रिय करें। हर पूरा क्विज़ एक चार्ज इस्तेमाल करता है।', emptyPotions: 'अभी कोई पोशन नहीं।', use: 'उपयोग', activateLabel: 'सक्रिय', potionActiveStatus: '%{name} सक्रिय · +%{boost}% · %{n} क्विज़ बचे', rewardPotion: '+%{boost}% %{n} क्विज़ के लिए। पोशन में सहेजा।', rewardAvatar: 'अनलॉक! Shop → Owned में लगाएं।', rewardDuplicate: 'संग्रह पूर्ण — सोना दिया गया।', rewardBalance: 'आपके बैलेंस में जोड़ा गया।' };
const _dcZh = { hubTitle: '每日宝箱', tapToRetry: '点击重试', loading: '加载中…', readyToOpen: '可以开启', claimedToday: '今日已领取', potions: '药水', active: '激活中', eyebrow: '每日宝藏', yoursToKeep: '归你所有。', chestUpgraded: '宝箱已升级', maxTier: '已达到最高宝箱等级', daysToUpgrade: '再 %{n} 天到 %{tier}', rules: '缺席一天：降一级。重置时间：00:00 UTC。', letsPlay: '开始游戏！', opening: '开启中…', openChest: '开启宝箱', comeBackTomorrow: '明天再来', retry: '重试', viewOdds: '奖励与掉落率', hideOdds: '隐藏奖励与掉落率', oneRewardPerChest: '每个宝箱恰好一个奖励', randomAvatar: '随机头像', goldAmount: '%{n} 金币', ticketsAmount: '%{n} 券', potionWithDuration: '1 %{name} · %{n} 次测验', conquerorNote: '征服者 ×3 已含在金币和券数量中。', potionNote: '药水增加基础收益50%。从药水处激活。', avatarCollectionTitle: '头像收集 · 剩余 %{n}', avatarUnlockNote: '未拥有的头像机会均等。全部拥有后获得 %{n} 金币。', yourPotions: '我的药水', pickYourBoost: '选择你的加成。', potionStackNote: '测验前激活药水。每完成一次测验消耗一次。', emptyPotions: '暂无药水。', use: '使用', activateLabel: '使用中', potionActiveStatus: '%{name} 激活中 · +%{boost}% · 剩余 %{n} 次测验', rewardPotion: '+%{boost}% 共 %{n} 次测验。已存入药水。', rewardAvatar: '已解锁！在商店→已拥有中装备。', rewardDuplicate: '头像收集完成 — 改为赠送金币。', rewardBalance: '已添加到你的余额。' };
const _dcHe = { hubTitle: 'תיבה יומית', tapToRetry: 'לחץ לניסיון חוזר', loading: 'טוען…', readyToOpen: 'מוכנה לפתיחה', claimedToday: 'נתבעה היום', potions: 'שיקויים', active: 'פעיל', eyebrow: 'אוצר יומי', yoursToKeep: 'שלך לתמיד.', revealedSubtitle: 'תיבה אחת. פרס חדש אחד.', previewSubtitle: 'תצוגת מפתח · לא ניתנים פרסים.', availableSubtitle: 'אוצר קטן להרפתקה של היום.', nextSubtitle: 'האוצר הבא שלך יגיע ב-00:00 UTC.', chestUpgraded: 'תיבה שודרגה', maxTier: 'הגעת לדרגת התיבה המקסימלית', daysToUpgrade: 'עוד %{n} ימים ל%{tier}', rules: 'פספסת יום: דרגה אחת למטה. איפוס: 00:00 UTC.', letsPlay: 'בואו נשחק!', opening: 'נפתח…', openChest: 'פתח תיבה', comeBackTomorrow: 'חזור מחר', retry: 'נסה שוב', viewOdds: 'הצג פרסים ואחוזים', hideOdds: 'הסתר פרסים ואחוזים', oneRewardPerChest: 'פרס אחד בדיוק לתיבה', randomAvatar: 'אווטאר אקראי', goldAmount: '%{n} זהב', ticketsAmount: '%{n} כרטיסים', potionWithDuration: '1 %{name} · %{n} חידונים', conquerorNote: 'כובש ×3 כלול בכמויות הזהב והכרטיסים.', potionNote: 'שיקויים מוסיפים 50% מרווחי הבסיס. הפעל אותם מתוך השיקויים.', avatarCollectionTitle: 'אוסף אווטארים · נותרו %{n}', avatarUnlockNote: 'לאווטארים שאינם ברשותך יש סיכויים שווים. כאשר כולם ברשותך, מקבלים %{n} זהב.', yourPotions: 'השיקויים שלך', pickYourBoost: 'בחר את הבוסט שלך.', potionStackNote: 'הפעל שיקוי לפני חידון. כל חידון שהושלם משתמש בטעינה אחת.', emptyPotions: 'אין עדיין שיקויים.', use: 'השתמש', activateLabel: 'פעיל', potionActiveStatus: '%{name} פעיל · +%{boost}% · נותרו %{n} חידונים', rewardPotion: '+%{boost}% ל%{n} חידונים. נשמר בשיקויים.', rewardAvatar: 'נפתח! צייד בחנות ← ברשותי.', rewardDuplicate: 'האוסף הושלם — ניתן זהב במקום.', rewardBalance: 'נוסף לחשבונך.', chestLabel: 'תיבת %{tier}', previewChest: 'תצוגת תיבה', quizCount: '%{n} חידונים', tiers: { Wooden: 'עץ', Bronze: 'ברונזה', Silver: 'כסף', Gold: 'זהב', Royal: 'מלכותית', Legendary: 'אגדית' }, rewardNames: { gold: 'זהב', tickets: 'כרטיסים', xp_potion: 'שיקוי XP', gold_potion: 'שיקוי זהב', avatar: 'אווטאר חדש' } };
const _dcAr = { hubTitle: 'الصندوق اليومي', tapToRetry: 'انقر لإعادة المحاولة', loading: 'جارٍ التحميل…', readyToOpen: 'جاهز للفتح', claimedToday: 'تم المطالبة اليوم', potions: 'الجرعات', active: 'نشطة', eyebrow: 'الكنز اليومي', yoursToKeep: 'لك إلى الأبد.', chestUpgraded: 'تمت ترقية الصندوق', maxTier: 'وصلت إلى الحد الأقصى', daysToUpgrade: '%{n} يوم%{day} أخرى إلى %{tier}', rules: 'فاتك يوم: انخفض مستوى. الإعادة: 00:00 UTC.', letsPlay: 'هيا نلعب!', opening: 'جارٍ الفتح…', openChest: 'افتح الصندوق', comeBackTomorrow: 'عد غداً', retry: 'أعد المحاولة', viewOdds: 'المكافآت ونسب السقوط', hideOdds: 'إخفاء المكافآت والنسب', oneRewardPerChest: 'مكافأة واحدة بالضبط لكل صندوق', randomAvatar: 'صورة رمزية عشوائية', goldAmount: '%{n} ذهب', ticketsAmount: '%{n} تذاكر', potionWithDuration: '1 %{name} · %{n} اختبارات', conquerorNote: 'الفاتح ×3 مدرج في كميات الذهب والتذاكر.', potionNote: 'الجرعات تضيف 50% من الأرباح الأساسية. فعّلها من الجرعات.', avatarCollectionTitle: 'مجموعة الصور الرمزية · %{n} متبقية', avatarUnlockNote: 'الصور الرمزية غير المملوكة لها فرص متساوية. عند امتلاك الجميع، تحصل على %{n} ذهب.', yourPotions: 'جرعاتك', pickYourBoost: 'اختر تعزيزك.', potionStackNote: 'فعّل جرعة قبل الاختبار. كل اختبار مكتمل يستخدم شحنة واحدة.', emptyPotions: 'لا توجد جرعات بعد.', use: 'استخدم', activateLabel: 'نشطة', potionActiveStatus: '%{name} نشطة · +%{boost}% · %{n} اختبارات متبقية', rewardPotion: '+%{boost}% لـ%{n} اختبار مكتمل. محفوظ في الجرعات.', rewardAvatar: 'تم الفتح! جهّزه من المتجر → المملوكة.', rewardDuplicate: 'المجموعة مكتملة — تم منح ذهب عوضاً.', rewardBalance: 'تمت الإضافة إلى رصيدك.' };
const _ensureSection = (locale: string, section: string, data: object) => { const c = translations[locale] as any; c[section] = c[section] ?? {}; Object.assign(c[section], data); };
_ensureSection('es', 'dailyChest', _dcEs);
_ensureSection('fr', 'dailyChest', _dcFr);
_ensureSection('hi', 'dailyChest', _dcHi);
_ensureSection('zh-Hans', 'dailyChest', _dcZh);
_ensureSection('he', 'dailyChest', _dcHe);
_ensureSection('ar', 'dailyChest', _dcAr);

Object.assign((translations.ar as any).mythicChest, { header: 'الصندوق الأسطوري', eyebrow: 'أعلى مستوى من الكنوز', title: 'مكافأة جديرة بالأساطير', subtitle: 'كل فتح يمنحك غبار أسطورياً. عشر غبارات تتيح لك اختيار أي مكافأة.', rewardUnlocked: 'تم فتح مكافأة أسطورية', chestsAvailable: 'الصناديق المتاحة', monthlyOpened: 'صناديق الفاتح الشهرية المفتوحة', dust: 'الغبار الأسطوري', opening: 'جارٍ الفتح…', rewardClaimed: 'تم المطالبة بالمكافأة', openAnother: 'افتح آخر', openChest: 'فتح الصندوق الأسطوري', noChests: 'لا صناديق متاحة', dropRatesTitle: 'نسب سقوط الأسطوري', chooseReward: 'اختر أي مكافأة أسطورية', consumeDust: 'سيُستهلك 10 غبار أسطوري.', uniqueAvatars: 'صور رمزية فريدة' });

Object.assign((translations.es as any).nav, { nightmareQuiz: 'La Pesadilla' });
Object.assign((translations.fr as any).nav, { nightmareQuiz: 'Le Cauchemar' });
Object.assign((translations.hi as any).nav, { nightmareQuiz: 'दुःस्वप्न' });
Object.assign((translations['zh-Hans'] as any).nav, { nightmareQuiz: '噩梦' });
Object.assign((translations.he as any).nav, { nightmareQuiz: 'הסיוט' });
Object.assign((translations.ar as any).nav, { nightmareQuiz: 'الكابوس' });

Object.assign((translations.es as any).mythicChest, { hidePreview: 'Ocultar vista previa de desarrollador', previewRewards: 'Vista previa de recompensas', errors: { open: 'No se pudo abrir el cofre mítico. Inténtalo de nuevo.', choice: 'No se pudo elegir la recompensa mítica. Inténtalo de nuevo.' } });
Object.assign((translations.fr as any).mythicChest, { hidePreview: 'Masquer l’aperçu développeur', previewRewards: 'Aperçu des récompenses', errors: { open: 'Impossible d’ouvrir le coffre mythique. Veuillez réessayer.', choice: 'Impossible de choisir la récompense mythique. Veuillez réessayer.' } });
Object.assign((translations.hi as any).mythicChest, { hidePreview: 'डेवलपर पूर्वावलोकन छिपाएँ', previewRewards: 'इनाम पूर्वावलोकन', errors: { open: 'मिथिक चेस्ट नहीं खुल सका। कृपया फिर कोशिश करें।', choice: 'मिथिक इनाम नहीं चुना जा सका। कृपया फिर कोशिश करें।' } });
Object.assign((translations['zh-Hans'] as any).mythicChest, { hidePreview: '隐藏开发者预览', previewRewards: '预览奖励', errors: { open: '无法开启神话宝箱。请重试。', choice: '无法选择神话奖励。请重试。' } });
Object.assign((translations.ar as any).mythicChest, { hidePreview: 'إخفاء معاينة المطور', previewRewards: 'معاينة المكافآت', errors: { open: 'تعذر فتح الصندوق الأسطوري. حاول مرة أخرى.', choice: 'تعذر اختيار المكافأة الأسطورية. حاول مرة أخرى.' } });

Object.assign((translations.es as any).dailyChest, { revealedSubtitle: 'Un cofre. Una recompensa nueva.', previewSubtitle: 'Vista de desarrollador · no se otorgan recompensas.', availableSubtitle: 'Un pequeño tesoro para la aventura de hoy.', nextSubtitle: 'Tu próximo tesoro llega a las 00:00 UTC.', chestLabel: 'Cofre %{tier}', previewChest: 'Vista previa del cofre', quizCount: '%{n} cuestionarios', tiers: { Wooden: 'Madera', Bronze: 'Bronce', Silver: 'Plata', Gold: 'Oro', Royal: 'Real', Legendary: 'Legendario' }, rewardNames: { gold: 'Oro', tickets: 'Boletos', xp_potion: 'Poción de XP', gold_potion: 'Poción de oro', avatar: 'Avatar nuevo' } });
Object.assign((translations.fr as any).dailyChest, { revealedSubtitle: 'Un coffre. Une nouvelle récompense.', previewSubtitle: 'Aperçu développeur · aucune récompense accordée.', availableSubtitle: 'Un petit trésor pour l’aventure du jour.', nextSubtitle: 'Votre prochain trésor arrive à 00:00 UTC.', chestLabel: 'Coffre %{tier}', previewChest: 'Aperçu du coffre', quizCount: '%{n} quiz', tiers: { Wooden: 'Bois', Bronze: 'Bronze', Silver: 'Argent', Gold: 'Or', Royal: 'Royal', Legendary: 'Légendaire' }, rewardNames: { gold: 'Or', tickets: 'Tickets', xp_potion: 'Potion XP', gold_potion: 'Potion d’or', avatar: 'Nouvel avatar' } });
Object.assign((translations.hi as any).dailyChest, { revealedSubtitle: 'एक संदूक। एक नया इनाम।', previewSubtitle: 'डेवलपर पूर्वावलोकन · कोई इनाम नहीं दिया जाएगा।', availableSubtitle: 'आज की यात्रा के लिए छोटा खजाना।', nextSubtitle: 'आपका अगला खजाना 00:00 UTC पर आएगा।', chestLabel: '%{tier} संदूक', previewChest: 'संदूक पूर्वावलोकन', quizCount: '%{n} क्विज़', tiers: { Wooden: 'लकड़ी', Bronze: 'कांस्य', Silver: 'चांदी', Gold: 'सोना', Royal: 'रॉयल', Legendary: 'लेजेंडरी' }, rewardNames: { gold: 'सोना', tickets: 'टिकट', xp_potion: 'XP पोशन', gold_potion: 'गोल्ड पोशन', avatar: 'नया अवतार' } });
Object.assign((translations['zh-Hans'] as any).dailyChest, { revealedSubtitle: '一个宝箱。一个新奖励。', previewSubtitle: '开发者预览 · 不会发放奖励。', availableSubtitle: '今日冒险的小宝藏。', nextSubtitle: '你的下一个宝藏将在 00:00 UTC 到来。', chestLabel: '%{tier}宝箱', previewChest: '宝箱预览', quizCount: '%{n} 次测验', tiers: { Wooden: '木质', Bronze: '青铜', Silver: '白银', Gold: '黄金', Royal: '皇家', Legendary: '传奇' }, rewardNames: { gold: '金币', tickets: '票券', xp_potion: 'XP 药水', gold_potion: '金币药水', avatar: '新头像' } });
Object.assign((translations.ar as any).dailyChest, { revealedSubtitle: 'صندوق واحد. مكافأة جديدة واحدة.', previewSubtitle: 'معاينة المطور · لا تُمنح مكافآت.', availableSubtitle: 'كنز صغير لمغامرة اليوم.', nextSubtitle: 'سيصل كنزك التالي في 00:00 UTC.', chestLabel: 'صندوق %{tier}', previewChest: 'معاينة الصندوق', quizCount: '%{n} اختبارات', tiers: { Wooden: 'خشبي', Bronze: 'برونزي', Silver: 'فضي', Gold: 'ذهبي', Royal: 'ملكي', Legendary: 'أسطوري' }, rewardNames: { gold: 'ذهب', tickets: 'تذاكر', xp_potion: 'جرعة XP', gold_potion: 'جرعة ذهب', avatar: 'صورة رمزية جديدة' } });

Object.assign((translations.es as any).quizMenu, { perCorrect: 'por acierto', maxPrize: 'premio máximo', repeatReward: 'recompensa repetible', oneTimeReward: 'recompensa única' });
Object.assign((translations.fr as any).quizMenu, { perCorrect: 'par bonne réponse', maxPrize: 'prix maximum', repeatReward: 'récompense répétable', oneTimeReward: 'récompense unique' });
Object.assign((translations.hi as any).quizMenu, { perCorrect: 'प्रति सही उत्तर', maxPrize: 'अधिकतम इनाम', repeatReward: 'दोहराया इनाम', oneTimeReward: 'एक बार का इनाम' });
Object.assign((translations['zh-Hans'] as any).quizMenu, { perCorrect: '每答对一题', maxPrize: '最高奖励', repeatReward: '重复奖励', oneTimeReward: '一次性奖励' });
Object.assign((translations.ar as any).quizMenu, { perCorrect: 'لكل إجابة صحيحة', maxPrize: 'الجائزة الكبرى', repeatReward: 'مكافأة متكررة', oneTimeReward: 'مكافأة لمرة واحدة' });

Object.assign((translations.es as any).shop, { mythicAvatarTitle: 'Avatares míticos', mythicAvatarBonusHint: 'Los avatares míticos tienen bonificaciones únicas.', mythicAvatarBonusBadge: 'Bonificación mítica', mythicBonusGold: '+5% de oro en cuestionarios', mythicBonusXp: '+5% de XP en cuestionarios' });
Object.assign((translations.fr as any).shop, { mythicAvatarTitle: 'Avatars mythiques', mythicAvatarBonusHint: 'Les avatars mythiques ont des bonus uniques.', mythicAvatarBonusBadge: 'Bonus mythique', mythicBonusGold: '+5% d’or dans les quiz', mythicBonusXp: '+5% d’XP dans les quiz' });
Object.assign((translations.hi as any).shop, { mythicAvatarTitle: 'मिथिक अवतार', mythicAvatarBonusHint: 'मिथिक अवतारों में खास बोनस होते हैं।', mythicAvatarBonusBadge: 'मिथिक बोनस', mythicBonusGold: 'क्विज़ में +5% सोना', mythicBonusXp: 'क्विज़ में +5% XP' });
Object.assign((translations['zh-Hans'] as any).shop, { mythicAvatarTitle: '神话头像', mythicAvatarBonusHint: '神话头像拥有独特加成。', mythicAvatarBonusBadge: '神话加成', mythicBonusGold: '测验金币 +5%', mythicBonusXp: '测验 XP +5%' });
Object.assign((translations.ar as any).shop, { mythicAvatarTitle: 'صور رمزية أسطورية', mythicAvatarBonusHint: 'للصور الرمزية الأسطورية مكافآت فريدة.', mythicAvatarBonusBadge: 'مكافأة أسطورية', mythicBonusGold: '+5% ذهب في الاختبارات', mythicBonusXp: '+5% XP في الاختبارات' });

const _mythicEs = { rewardAppliedXp: 'Aplicado al instante · sin bonificación de oro por subir de nivel', rewardPotionStored: '+200% durante 10 cuestionarios · guardado en tus Pociones', rewardAdded: 'Añadido a tu cuenta al instante', dustAward: '+1 Polvo mítico', openGuaranteed: '✦ ABRIR ELECCIÓN GARANTIZADA', hideRates: 'OCULTAR TASAS', viewRates: 'VER TASAS', dustGuaranteed: '+1 Polvo mítico garantizado con cada cofre', devPreview: 'Vista de desarrollador del cofre · no se otorgan recompensas', accessibility: { rewardReceived: '%{reward} recibido.' }, rewards: { gold: '%{amount} oro', xp: '%{amount} XP', xpPotion: 'Poción de XP mítica', goldPotion: 'Poción de oro mítica', avatar: 'Avatar mítico' }, dropRates: { gold_25000: '25,000 oro', gold_75000: '75,000 oro', gold_150000: '150,000 oro', xp: '20,000 XP', xp_potion: 'Poción de XP mítica · 10 cuestionarios', gold_potion: 'Poción de oro mítica · 10 cuestionarios', avatar: 'Avatar mítico único' }, avatars: { png_worldbreaker_empress: 'Emperatriz rompe-mundos', png_storm_navigator: 'Navegante de tormentas', png_mapless_heroine: 'Heroína sin mapa', png_mapless_hero: 'Héroe sin mapa', png_longitude_ronin: 'Ronin de longitud', png_meridian_oracle: 'Oráculo del meridiano', png_border_phantom: 'Fantasma de fronteras', png_cosmic_pigeon: 'Paloma cósmica', png_globe_eater: 'Devorador de mundos', png_conquest_frog: 'Rana conquistadora' } };
const _mythicFr = { rewardAppliedXp: 'Appliqué instantanément · aucun bonus d’or de niveau', rewardPotionStored: '+200% pour 10 quiz · stocké dans vos Potions', rewardAdded: 'Ajouté instantanément à votre compte', dustAward: '+1 Poussière mythique', openGuaranteed: '✦ OUVRIR UN CHOIX GARANTI', hideRates: 'MASQUER LES TAUX', viewRates: 'VOIR LES TAUX', dustGuaranteed: '+1 Poussière mythique garantie avec chaque coffre', devPreview: 'Aperçu développeur du coffre · aucune récompense accordée', accessibility: { rewardReceived: '%{reward} reçu.' }, rewards: { gold: '%{amount} or', xp: '%{amount} XP', xpPotion: 'Potion XP mythique', goldPotion: 'Potion d’or mythique', avatar: 'Avatar mythique' }, dropRates: { gold_25000: '25,000 or', gold_75000: '75,000 or', gold_150000: '150,000 or', xp: '20,000 XP', xp_potion: 'Potion XP mythique · 10 quiz', gold_potion: 'Potion d’or mythique · 10 quiz', avatar: 'Avatar mythique unique' }, avatars: { png_worldbreaker_empress: 'Impératrice brise-monde', png_storm_navigator: 'Navigateur des tempêtes', png_mapless_heroine: 'Héroïne sans carte', png_mapless_hero: 'Héros sans carte', png_longitude_ronin: 'Ronin de longitude', png_meridian_oracle: 'Oracle du méridien', png_border_phantom: 'Fantôme des frontières', png_cosmic_pigeon: 'Pigeon cosmique', png_globe_eater: 'Dévoreur de globe', png_conquest_frog: 'Grenouille conquérante' } };
const _mythicHi = { rewardAppliedXp: 'तुरंत लागू · लेवल-अप गोल्ड बोनस नहीं', rewardPotionStored: '+200% 10 क्विज़ के लिए · आपके पोशन में सहेजा', rewardAdded: 'तुरंत आपके खाते में जोड़ा गया', dustAward: '+1 मिथिक डस्ट', openGuaranteed: '✦ गारंटीड चयन खोलें', hideRates: 'ड्रॉप रेट छिपाएँ', viewRates: 'ड्रॉप रेट देखें', dustGuaranteed: 'हर चेस्ट में +1 मिथिक डस्ट गारंटीड है', devPreview: 'डेवलपर चेस्ट पूर्वावलोकन · कोई इनाम नहीं दिया जाएगा', accessibility: { rewardReceived: '%{reward} मिला।' }, rewards: { gold: '%{amount} सोना', xp: '%{amount} XP', xpPotion: 'मिथिक XP पोशन', goldPotion: 'मिथिक गोल्ड पोशन', avatar: 'मिथिक अवतार' }, dropRates: { gold_25000: '25,000 सोना', gold_75000: '75,000 सोना', gold_150000: '150,000 सोना', xp: '20,000 XP', xp_potion: 'मिथिक XP पोशन · 10 क्विज़', gold_potion: 'मिथिक गोल्ड पोशन · 10 क्विज़', avatar: 'विशिष्ट मिथिक अवतार' }, avatars: { png_worldbreaker_empress: 'विश्वभंजक सम्राज्ञी', png_storm_navigator: 'तूफ़ान नाविक', png_mapless_heroine: 'नक्शाविहीन नायिका', png_mapless_hero: 'नक्शाविहीन नायक', png_longitude_ronin: 'देशांतर रोनिन', png_meridian_oracle: 'मेरिडियन ओरेकल', png_border_phantom: 'सीमा प्रेत', png_cosmic_pigeon: 'ब्रह्मांडीय कबूतर', png_globe_eater: 'ग्लोब भक्षक', png_conquest_frog: 'विजय मेंढक' } };
const _mythicZh = { rewardAppliedXp: '立即生效 · 不触发升级金币奖励', rewardPotionStored: '+200%，持续 10 次测验 · 已存入药水', rewardAdded: '已立即添加到你的账户', dustAward: '+1 神话尘埃', openGuaranteed: '✦ 开启保底选择', hideRates: '隐藏掉落率', viewRates: '查看掉落率', dustGuaranteed: '每个宝箱保证 +1 神话尘埃', devPreview: '开发者宝箱预览 · 不会发放奖励', accessibility: { rewardReceived: '已获得 %{reward}。' }, rewards: { gold: '%{amount} 金币', xp: '%{amount} XP', xpPotion: '神话 XP 药水', goldPotion: '神话金币药水', avatar: '神话头像' }, dropRates: { gold_25000: '25,000 金币', gold_75000: '75,000 金币', gold_150000: '150,000 金币', xp: '20,000 XP', xp_potion: '神话 XP 药水 · 10 次测验', gold_potion: '神话金币药水 · 10 次测验', avatar: '独特神话头像' }, avatars: { png_worldbreaker_empress: '破界女帝', png_storm_navigator: '风暴航海家', png_mapless_heroine: '无图女英雄', png_mapless_hero: '无图英雄', png_longitude_ronin: '经度浪人', png_meridian_oracle: '子午线神谕', png_border_phantom: '边境幽影', png_cosmic_pigeon: '宇宙鸽', png_globe_eater: '吞球者', png_conquest_frog: '征服青蛙' } };
const _mythicHeAvatars = { avatars: { png_worldbreaker_empress: 'קיסרית שוברת עולמות', png_storm_navigator: 'נווט הסערה', png_mapless_heroine: 'גיבורה ללא מפה', png_mapless_hero: 'גיבור ללא מפה', png_longitude_ronin: 'רונין קו האורך', png_meridian_oracle: 'אורקל קו האורך', png_border_phantom: 'פנטום הגבולות', png_cosmic_pigeon: 'היונה הקוסמית', png_globe_eater: 'אוכל הגלובוס', png_conquest_frog: 'צפרדע הכיבוש' } };
Object.assign((translations.es as any).mythicChest, _mythicEs);
Object.assign((translations.fr as any).mythicChest, _mythicFr);
Object.assign((translations.hi as any).mythicChest, _mythicHi);
Object.assign((translations['zh-Hans'] as any).mythicChest, _mythicZh);
Object.assign((translations.he as any).mythicChest, _mythicHeAvatars);

Object.assign((translations.en as any).dailyChest, { developerPreview: 'Developer chest preview', devPreviewNoRewards: 'DEV PREVIEW · NO REWARDS GRANTED', previewTier: 'Chest tier', previewProgress: 'Streak progress', previewOutcome: 'Reward outcome', previewState: 'Chest state', activePotions: 'Active', activePotionsBody: '', noActivePotions: 'None active.', storedPotions: 'Stored', buyRegularPotions: 'Buy potions', mythic: 'Mythic', regular: 'Regular', potionUsesLeft: '+%{boost}% · %{n} uses left', accessibility: { openDailyChest: 'Daily chest', openPreview: 'Open developer chest preview', closeDailyChest: 'Close daily chest', hiddenAvatar: 'Hidden avatar', closePotions: 'Close potions', activatePotion: 'Activate %{name} for %{n} quizzes' } });
Object.assign((translations.es as any).dailyChest, { developerPreview: 'Vista previa del cofre', devPreviewNoRewards: 'VISTA DEV · SIN RECOMPENSAS', previewTier: 'Nivel del cofre', previewProgress: 'Progreso de racha', previewOutcome: 'Resultado de recompensa', previewState: 'Estado del cofre', activePotions: 'Activas', activePotionsBody: '', noActivePotions: 'Ninguna activa.', storedPotions: 'Guardadas', buyRegularPotions: 'Comprar pociones', mythic: 'Mítica', regular: 'Normal', potionUsesLeft: '+%{boost}% · quedan %{n} usos', accessibility: { openDailyChest: 'Cofre diario', openPreview: 'Abrir vista previa de desarrollador', closeDailyChest: 'Cerrar cofre diario', hiddenAvatar: 'Avatar oculto', closePotions: 'Cerrar pociones', activatePotion: 'Activar %{name} durante %{n} cuestionarios' } });
Object.assign((translations.fr as any).dailyChest, { developerPreview: 'Aperçu du coffre développeur', devPreviewNoRewards: 'APERÇU DEV · AUCUNE RÉCOMPENSE', previewTier: 'Niveau du coffre', previewProgress: 'Progression de série', previewOutcome: 'Résultat de récompense', previewState: 'État du coffre', activePotions: 'Actives', activePotionsBody: '', noActivePotions: 'Aucune active.', storedPotions: 'Stockées', buyRegularPotions: 'Acheter des potions', mythic: 'Mythique', regular: 'Normal', potionUsesLeft: '+%{boost}% · %{n} utilisations restantes', accessibility: { openDailyChest: 'Coffre quotidien', openPreview: 'Ouvrir l’aperçu développeur', closeDailyChest: 'Fermer le coffre quotidien', hiddenAvatar: 'Avatar caché', closePotions: 'Fermer les potions', activatePotion: 'Activer %{name} pour %{n} quiz' } });
Object.assign((translations.hi as any).dailyChest, { developerPreview: 'डेवलपर चेस्ट पूर्वावलोकन', devPreviewNoRewards: 'DEV पूर्वावलोकन · कोई इनाम नहीं', previewTier: 'चेस्ट स्तर', previewProgress: 'स्ट्रीक प्रगति', previewOutcome: 'इनाम परिणाम', previewState: 'चेस्ट स्थिति', activePotions: 'सक्रिय', activePotionsBody: '', noActivePotions: 'कोई सक्रिय नहीं।', storedPotions: 'सहेजे गए', buyRegularPotions: 'पोशन खरीदें', mythic: 'मिथिक', regular: 'नियमित', potionUsesLeft: '+%{boost}% · %{n} उपयोग बचे', accessibility: { openDailyChest: 'दैनिक चेस्ट', openPreview: 'डेवलपर पूर्वावलोकन खोलें', closeDailyChest: 'दैनिक चेस्ट बंद करें', hiddenAvatar: 'छिपा अवतार', closePotions: 'पोशन बंद करें', activatePotion: '%{name} को %{n} क्विज़ के लिए सक्रिय करें' } });
Object.assign((translations['zh-Hans'] as any).dailyChest, { developerPreview: '开发者宝箱预览', devPreviewNoRewards: '开发者预览 · 不发放奖励', previewTier: '宝箱等级', previewProgress: '连续进度', previewOutcome: '奖励结果', previewState: '宝箱状态', activePotions: '已激活', activePotionsBody: '', noActivePotions: '暂无激活。', storedPotions: '储存', buyRegularPotions: '购买药水', mythic: '神话', regular: '普通', potionUsesLeft: '+%{boost}% · 剩余 %{n} 次使用', accessibility: { openDailyChest: '每日宝箱', openPreview: '打开开发者预览', closeDailyChest: '关闭每日宝箱', hiddenAvatar: '隐藏头像', closePotions: '关闭药水', activatePotion: '激活 %{name}，持续 %{n} 次测验' } });
Object.assign((translations.he as any).dailyChest, { developerPreview: 'תצוגת מפתח לתיבה', devPreviewNoRewards: 'תצוגת מפתח · לא ניתנים פרסים', previewTier: 'דרגת תיבה', previewProgress: 'התקדמות רצף', previewOutcome: 'תוצאת פרס', previewState: 'מצב תיבה', activePotions: 'פעילים', activePotionsBody: '', noActivePotions: 'אין פעילים.', storedPotions: 'שמורים', buyRegularPotions: 'קנה שיקויים', mythic: 'מית׳יק', regular: 'רגיל', potionUsesLeft: '+%{boost}% · נותרו %{n} שימושים', accessibility: { openDailyChest: 'תיבה יומית', openPreview: 'פתח תצוגת מפתח', closeDailyChest: 'סגור תיבה יומית', hiddenAvatar: 'אווטאר מוסתר', closePotions: 'סגור שיקויים', activatePotion: 'הפעל %{name} ל-%{n} חידונים' } });
Object.assign((translations.ar as any).dailyChest, { developerPreview: 'معاينة صندوق المطور', devPreviewNoRewards: 'معاينة المطور · لا مكافآت', previewTier: 'مستوى الصندوق', previewProgress: 'تقدم السلسلة', previewOutcome: 'نتيجة المكافأة', previewState: 'حالة الصندوق', activePotions: 'نشطة', activePotionsBody: '', noActivePotions: 'لا شيء نشط.', storedPotions: 'مخزنة', buyRegularPotions: 'شراء جرعات', mythic: 'أسطورية', regular: 'عادية', potionUsesLeft: '+%{boost}% · %{n} استخدامات متبقية', accessibility: { openDailyChest: 'الصندوق اليومي', openPreview: 'فتح معاينة المطور', closeDailyChest: 'إغلاق الصندوق اليومي', hiddenAvatar: 'صورة رمزية مخفية', closePotions: 'إغلاق الجرعات', activatePotion: 'تفعيل %{name} لمدة %{n} اختبارات' } });

Object.assign((translations.en as any).mythicChest, { benefitsLabel: 'Mythic Chest benefits', benefitAvatars: 'EXCLUSIVE\nAVATARS', benefitDust: '+1 DUST\nEVERY CHEST', benefitChoice: '10 DUST =\nYOUR CHOICE', purchaseAccessibility: 'Buy one Mythic Chest for $1.99', purchasePreviewTitle: 'Purchase Preview', purchaseUnavailableTitle: 'Purchases Unavailable', purchasePreviewBody: '1 Mythic Chest · $1.99. This is a preview; no payment will be taken.', purchaseUnavailableBody: 'Mythic Chest purchases are not available yet. Please check back soon.', purchaseEyebrow: 'PREMIUM TREASURE', purchaseTitle: 'One reveal. One exclusive reward.', purchaseSub: 'Always includes +1 Mythic Dust.', oneTime: 'one-time', purchaseCta: 'Get a Mythic Chest', purchaseProcessing: 'Processing…', purchaseSuccessTitle: 'Mythic Chest Added', purchaseSuccessBody: '1 Mythic Chest was added to your account.', purchaseFailed: 'Purchase failed. Please try again.', purchaseGrantFailed: 'Purchase completed, but the chest could not be added. Please contact support.', purchaseMissingTransaction: 'Purchase transaction was missing. Please try again.', aboutDust: 'About Mythic Dust' });
Object.assign((translations.es as any).mythicChest, { benefitsLabel: 'Beneficios del cofre mítico', benefitAvatars: 'AVATARES\nEXCLUSIVOS', benefitDust: '+1 POLVO\nCADA COFRE', benefitChoice: '10 POLVOS =\nTU ELECCIÓN', purchaseAccessibility: 'Comprar un cofre mítico por $1.99', purchasePreviewTitle: 'Vista previa de compra', purchaseUnavailableTitle: 'Compras no disponibles', purchasePreviewBody: '1 cofre mítico · $1.99. Es una vista previa; no se cobrará nada.', purchaseUnavailableBody: 'Las compras de cofres míticos aún no están disponibles. Vuelve pronto.', purchaseEyebrow: 'TESORO PREMIUM', purchaseTitle: 'Una revelación. Una recompensa exclusiva.', purchaseSub: 'Siempre incluye +1 polvo mítico.', oneTime: 'una vez', purchaseCta: 'Obtener un cofre mítico', aboutDust: 'Acerca del polvo mítico' });
Object.assign((translations.fr as any).mythicChest, { benefitsLabel: 'Avantages du coffre mythique', benefitAvatars: 'AVATARS\nEXCLUSIFS', benefitDust: '+1 POUSSIÈRE\nCHAQUE COFFRE', benefitChoice: '10 POUSSIÈRES =\nVOTRE CHOIX', purchaseAccessibility: 'Acheter un coffre mythique pour 1,99 $', purchasePreviewTitle: 'Aperçu d’achat', purchaseUnavailableTitle: 'Achats indisponibles', purchasePreviewBody: '1 coffre mythique · 1,99 $. Ceci est un aperçu ; aucun paiement ne sera effectué.', purchaseUnavailableBody: 'Les achats de coffres mythiques ne sont pas encore disponibles. Revenez bientôt.', purchaseEyebrow: 'TRÉSOR PREMIUM', purchaseTitle: 'Une révélation. Une récompense exclusive.', purchaseSub: 'Inclut toujours +1 poussière mythique.', oneTime: 'unique', purchaseCta: 'Obtenir un coffre mythique', aboutDust: 'À propos de la poussière mythique' });
Object.assign((translations.hi as any).mythicChest, { benefitsLabel: 'मिथिक चेस्ट लाभ', benefitAvatars: 'विशिष्ट\nअवतार', benefitDust: '+1 डस्ट\nहर चेस्ट', benefitChoice: '10 डस्ट =\nआपकी पसंद', purchaseAccessibility: '$1.99 में एक मिथिक चेस्ट खरीदें', purchasePreviewTitle: 'खरीद पूर्वावलोकन', purchaseUnavailableTitle: 'खरीद उपलब्ध नहीं', purchasePreviewBody: '1 मिथिक चेस्ट · $1.99। यह पूर्वावलोकन है; कोई भुगतान नहीं होगा।', purchaseUnavailableBody: 'मिथिक चेस्ट खरीद अभी उपलब्ध नहीं है। कृपया बाद में देखें।', purchaseEyebrow: 'प्रीमियम खजाना', purchaseTitle: 'एक खुलासा। एक विशिष्ट इनाम।', purchaseSub: 'हमेशा +1 मिथिक डस्ट शामिल।', oneTime: 'एक बार', purchaseCta: 'मिथिक चेस्ट पाएं', aboutDust: 'मिथिक डस्ट के बारे में' });
Object.assign((translations['zh-Hans'] as any).mythicChest, { benefitsLabel: '神话宝箱权益', benefitAvatars: '专属\n头像', benefitDust: '每个宝箱\n+1 尘埃', benefitChoice: '10 尘埃 =\n任选奖励', purchaseAccessibility: '以 $1.99 购买一个神话宝箱', purchasePreviewTitle: '购买预览', purchaseUnavailableTitle: '购买不可用', purchasePreviewBody: '1 个神话宝箱 · $1.99。这只是预览，不会扣款。', purchaseUnavailableBody: '神话宝箱购买尚不可用。请稍后再来。', purchaseEyebrow: '高级宝藏', purchaseTitle: '一次揭晓。一份专属奖励。', purchaseSub: '始终包含 +1 神话尘埃。', oneTime: '一次性', purchaseCta: '获得神话宝箱', aboutDust: '关于神话尘埃' });
Object.assign((translations.he as any).mythicChest, { benefitsLabel: 'יתרונות תיבת מית׳יק', benefitAvatars: 'אווטארים\nבלעדיים', benefitDust: '+1 אבקה\nבכל תיבה', benefitChoice: '10 אבקות =\nבחירה שלך', purchaseAccessibility: 'קנה תיבת מית׳יק אחת ב-$1.99', purchasePreviewTitle: 'תצוגת רכישה', purchaseUnavailableTitle: 'רכישות לא זמינות', purchasePreviewBody: 'תיבת מית׳יק אחת · $1.99. זו תצוגה בלבד; לא יתבצע תשלום.', purchaseUnavailableBody: 'רכישת תיבות מית׳יק עדיין לא זמינה. חזור בקרוב.', purchaseEyebrow: 'אוצר פרימיום', purchaseTitle: 'חשיפה אחת. פרס בלעדי אחד.', purchaseSub: 'תמיד כולל +1 אבקת מית׳יק.', oneTime: 'חד פעמי', purchaseCta: 'קבל תיבת מית׳יק', aboutDust: 'על אבקת מית׳יק' });
Object.assign((translations.ar as any).mythicChest, { benefitsLabel: 'مزايا الصندوق الأسطوري', benefitAvatars: 'صور رمزية\nحصرية', benefitDust: '+1 غبار\nكل صندوق', benefitChoice: '10 غبار =\nاختيارك', purchaseAccessibility: 'شراء صندوق أسطوري واحد مقابل $1.99', purchasePreviewTitle: 'معاينة الشراء', purchaseUnavailableTitle: 'الشراء غير متاح', purchasePreviewBody: 'صندوق أسطوري واحد · $1.99. هذه معاينة؛ لن يتم الدفع.', purchaseUnavailableBody: 'شراء الصندوق الأسطوري غير متاح بعد. تحقق لاحقاً.', purchaseEyebrow: 'كنز مميز', purchaseTitle: 'كشف واحد. مكافأة حصرية واحدة.', purchaseSub: 'يتضمن دائماً +1 غبار أسطوري.', oneTime: 'مرة واحدة', purchaseCta: 'احصل على صندوق أسطوري', aboutDust: 'حول الغبار الأسطوري' });

for (const [loc, data] of Object.entries({
  en: { forceUpdate: { title: 'Update Required', body: 'Please update GeoConquest to continue playing.', button: 'Update on %{store}' }, questToast: { complete: 'Quest Complete!' }, alerts: { notEnoughGold: 'Not Enough Gold', notEnoughGoldGeneric: "You don't have enough gold to purchase this item.", notEnoughGoldNamed: "You don't have enough gold to purchase %{item}.", buyGold: 'Buy Gold' }, quizMenu: { ticketAdded: 'Ticket Added', ticketAddedBody: '1 ticket added to your inventory.', ticketPackAdded: 'Ticket Pack Added', ticketPackAddedBody: '5 tickets added to your inventory.', dailyLimitReached: 'Daily Limit Reached', adTicketLimitBody: 'You have claimed all 3 ad tickets today. Come back after midnight UTC.', adUnavailable: 'Ad Unavailable', adUnavailableBody: 'Could not load a rewarded ad right now. Please try again.', thanksForWatching: 'Thanks for Watching!', mapsAdded: 'Maps Added!', mapsAddedBody: '2 maps restored, up to your 5-map capacity.', howItWorks: 'How It Works', infoMapCost: 'Each quiz costs 1 map. Get 100% correct for a 30% chance to get your map back.', infoMillionaireTicket: 'The Millionaire Quiz costs 1 ticket instead of a map.', infoGold: 'Earn gold from quizzes, then spend it in the Shop to buy countries and expand your empire.', conquerorBanner: "Conqueror's Pass — Unlock Everything", goBig: 'Go Big or Go Home', regularQuizzes: 'The Basics', uniqueQuizzes: 'Advanced', legendaryQuizzes: 'Legendary Quizzes', drawLockedBody: 'Purchase the Draw the Border upgrade for 50,000 gold in Shop → Upgrades to unlock this quiz permanently.', reachLevelBody: 'Reach Level %{level} to unlock %{quiz}.\n\nCurrent level: %{current}', openPotions: 'Open potions', previewLocks: 'Preview all quiz locks' }, results: { referralReward: 'Referral Reward!', referralRewardBody: 'You and your friend both received %{gold} gold.', questUnlocked: 'Quest Unlocked!', claimQuestBody: '%{quest} — claim your reward in Quests!', mapReturned: 'Map Returned!', mapReturnedBody: 'Perfect score — your map was refunded!', potionBoostApplied: 'Potion boost applied', syncUnavailable: 'Quiz sync unavailable', syncMissingSchema: 'Quiz rewards need a database update. This quiz’s potion bonuses could not be confirmed.', syncFailed: 'Could not sync this quiz. Potion bonuses have not been confirmed.', boostUsed: 'x2 Boost Used', boostUsedBody: 'Gold and XP were doubled for this quiz.', potionsUsed: 'Potions used this quiz' }, shop: { adTicketLimitBody: 'You have claimed all 3 ad tickets today. Come back after midnight UTC.', drawUnlockedTitle: 'Draw the Border Unlocked', drawUnlockedBody: 'The quiz is now available in Play.', potionAddedPreview: 'Preview potion added', potionPurchased: 'Potion purchased', potionPurchaseBody: 'Activate it from the Potions pill in Quizzes.', potionShopBody: 'Adds 50% of base quiz earnings for 3 completed quizzes. Stored until activated; buy again to stack more uses. Price scales with your level. Current price: %{price} gold.', buyGoldPrice: 'Buy · %{price} gold', goldPotion: 'Gold Potion', xpPotion: 'XP Potion', potionCardDesc: '+50% · 3 quizzes · consumable', borderDrawOwnedBody: 'You own this upgrade. Draw country borders in the Draw the Border quiz.', borderDrawBuyBody: 'Permanently unlock the Draw the Border quiz for 50,000 gold. Trace country borders and earn rewards for accurate drawings.', borderDrawUnlockButton: 'Unlock · 50,000 gold', permanentQuizUnlock: 'Permanent quiz unlock' } },
  es: { forceUpdate: { title: 'Actualización requerida', body: 'Actualiza GeoConquest para seguir jugando.', button: 'Actualizar en %{store}' }, questToast: { complete: '¡Misión completada!' }, alerts: { notEnoughGold: 'Oro insuficiente', notEnoughGoldGeneric: 'No tienes suficiente oro para comprar este objeto.', notEnoughGoldNamed: 'No tienes suficiente oro para comprar %{item}.', buyGold: 'Comprar oro' } },
  fr: { forceUpdate: { title: 'Mise à jour requise', body: 'Veuillez mettre GeoConquest à jour pour continuer à jouer.', button: 'Mettre à jour sur %{store}' }, questToast: { complete: 'Quête terminée !' }, alerts: { notEnoughGold: 'Or insuffisant', notEnoughGoldGeneric: 'Vous n’avez pas assez d’or pour acheter cet objet.', notEnoughGoldNamed: 'Vous n’avez pas assez d’or pour acheter %{item}.', buyGold: 'Acheter de l’or' } },
  hi: { forceUpdate: { title: 'अपडेट आवश्यक', body: 'खेलना जारी रखने के लिए GeoConquest अपडेट करें।', button: '%{store} पर अपडेट करें' }, questToast: { complete: 'क्वेस्ट पूर्ण!' }, alerts: { notEnoughGold: 'पर्याप्त सोना नहीं', notEnoughGoldGeneric: 'इस आइटम को खरीदने के लिए आपके पास पर्याप्त सोना नहीं है।', notEnoughGoldNamed: '%{item} खरीदने के लिए आपके पास पर्याप्त सोना नहीं है।', buyGold: 'सोना खरीदें' } },
  'zh-Hans': { forceUpdate: { title: '需要更新', body: '请更新 GeoConquest 以继续游玩。', button: '在 %{store} 更新' }, questToast: { complete: '任务完成！' }, alerts: { notEnoughGold: '金币不足', notEnoughGoldGeneric: '你的金币不足，无法购买此物品。', notEnoughGoldNamed: '你的金币不足，无法购买 %{item}。', buyGold: '购买金币' } },
  he: { forceUpdate: { title: 'נדרש עדכון', body: 'עדכן את GeoConquest כדי להמשיך לשחק.', button: 'עדכן ב-%{store}' }, questToast: { complete: 'המשימה הושלמה!' }, alerts: { notEnoughGold: 'אין מספיק זהב', notEnoughGoldGeneric: 'אין לך מספיק זהב כדי לקנות פריט זה.', notEnoughGoldNamed: 'אין לך מספיק זהב כדי לקנות %{item}.', buyGold: 'קנה זהב' } },
  ar: { forceUpdate: { title: 'التحديث مطلوب', body: 'يرجى تحديث GeoConquest لمتابعة اللعب.', button: 'التحديث عبر %{store}' }, questToast: { complete: 'اكتملت المهمة!' }, alerts: { notEnoughGold: 'الذهب غير كافٍ', notEnoughGoldGeneric: 'ليس لديك ذهب كافٍ لشراء هذا العنصر.', notEnoughGoldNamed: 'ليس لديك ذهب كافٍ لشراء %{item}.', buyGold: 'شراء ذهب' } },
})) {
  const target = (translations as any)[loc];
  for (const [section, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && target[section] && typeof target[section] === 'object') {
      Object.assign(target[section], value);
    } else {
      target[section] = value;
    }
  }
}

const _fillMissing = (target: any, source: any) => {
  for (const [key, value] of Object.entries(source)) {
    if (target[key] === undefined) target[key] = value;
  }
};
Object.assign((translations.es as any).dailyChest, { nextChestTomorrow: 'Nuevo cofre %{tier} mañana' });
Object.assign((translations.fr as any).dailyChest, { nextChestTomorrow: 'Nouveau coffre %{tier} demain' });
Object.assign((translations.hi as any).dailyChest, { nextChestTomorrow: 'कल नया %{tier} संदूक' });
Object.assign((translations['zh-Hans'] as any).dailyChest, { nextChestTomorrow: '明天有新的%{tier}宝箱' });
Object.assign((translations.he as any).dailyChest, { nextChestTomorrow: 'תיבת %{tier} חדשה מחר' });
Object.assign((translations.ar as any).dailyChest, { nextChestTomorrow: 'صندوق %{tier} جديد غداً' });
for (const loc of ['es', 'fr', 'hi', 'zh-Hans', 'he', 'ar']) {
  _fillMissing((translations as any)[loc].mythicChest, (translations as any).en.mythicChest);
  _fillMissing((translations as any)[loc].quizMenu, (translations as any).en.quizMenu);
  _fillMissing((translations as any)[loc].results, (translations as any).en.results);
  _fillMissing((translations as any)[loc].shop, (translations as any).en.shop);
}

Object.assign((translations.en as any), {
  miscUi: {
    owned: 'Owned ✓',
    accuracy: 'accuracy',
  },
  crateShop: {
    ...((translations.en as any).crateShop ?? {}),
    subtitle: 'Open a crate for a random avatar or flag. Duplicates refund gold.',
    duplicateRefund: 'Already owned — refunded %{gold} gold',
    newItemUnlocked: 'New item unlocked!',
  },
  username: {
    title: 'Choose Your Name',
    subtitle: 'Pick a username that other explorers will see on the leaderboard',
    placeholder: 'Enter your username',
    hint: '3–20 characters, no spaces',
    setup: 'Setting up…',
    start: 'Start Exploring →',
    enter: 'Please enter a username',
    tooShort: 'Username must be at least 3 characters',
    tooLong: 'Username must be 20 characters or fewer',
    failed: 'Failed to set username',
  },
  goldShop: {
    ...((translations.en as any).goldShop ?? {}),
    iapUnavailableBody: 'In-app purchases are only available in production builds.\n\nTo test:\n1. Build with EAS: npx eas build\n2. Configure products in %{store}\n\nPackage: %{package}\nGold: %{gold}\nPrice: %{price}',
  },
  premium: {
    ...((translations.en as any).premium ?? {}),
    chestBenefitsTitle: 'Chest Benefits',
    chestBenefitsDesc: '1 Mythic Chest monthly, plus 3 with Lifetime. Daily chests level up every 2 days instead of 4.',
    dailyChestLevelUp: 'Daily chest level-up',
    permanentConquerorBody: 'You are now a permanent conqueror - the world is at your feet! Also you got:',
    monthlyActiveBody: 'Your monthly Conqueror subscription is active!',
    plansLoading: 'Plans Loading',
    plansLoadingBody: 'Subscription plans are not available right now. Please try again shortly.',
    purchaseIssue: 'Purchase Issue',
    purchaseIssueBody: 'Purchase completed but entitlement not found. Please restore purchases.',
    finalTitle: 'Ready to conquer the world?',
    finalSub: 'Join 1,200 Conquerors and claim your spot on the global leaderboard.',
    monthlyIntroOffer: 'First month 50% off, then regular monthly price.',
  },
});
for (const loc of ['es', 'fr', 'hi', 'zh-Hans', 'he', 'ar']) {
  for (const section of ['miscUi', 'username']) {
    (translations as any)[loc][section] = (translations as any)[loc][section] ?? {};
    _fillMissing((translations as any)[loc][section], (translations.en as any)[section]);
  }
  for (const section of ['crateShop', 'goldShop', 'premium']) {
    (translations as any)[loc][section] = (translations as any)[loc][section] ?? {};
    _fillMissing((translations as any)[loc][section], (translations.en as any)[section]);
  }
}

Object.assign((translations['es'] as any).quizMenu, { regularQuizzes: 'Lo básico', uniqueQuizzes: 'Avanzado' });
Object.assign((translations['fr'] as any).quizMenu, { regularQuizzes: 'Les bases', uniqueQuizzes: 'Avancé' });
Object.assign((translations['hi'] as any).quizMenu, { regularQuizzes: 'बुनियादी', uniqueQuizzes: 'एडवांस्ड' });
Object.assign((translations['zh-Hans'] as any).quizMenu, { regularQuizzes: '基础', uniqueQuizzes: '进阶' });
Object.assign((translations['he'] as any).quizMenu, { regularQuizzes: 'הבסיס', uniqueQuizzes: 'מתקדם' });
Object.assign((translations['ar'] as any).quizMenu, { regularQuizzes: 'الأساسيات', uniqueQuizzes: 'متقدم' });

Object.assign((translations['es'] as any).quizCommon, { sixOptions: '6 OPCIONES' });
Object.assign((translations['fr'] as any).quizCommon, { sixOptions: '6 CHOIX' });
Object.assign((translations['hi'] as any).quizCommon, { sixOptions: '6 विकल्प' });
Object.assign((translations['zh-Hans'] as any).quizCommon, { sixOptions: '6个选项' });
Object.assign((translations['he'] as any).quizCommon, { sixOptions: '6 אפשרויות' });
Object.assign((translations['ar'] as any).quizCommon, { sixOptions: '6 خيارات' });
Object.assign((translations['en'] as any).flagQuiz, { whichFlagOfShort: 'Which flag belongs to…' });
Object.assign((translations['en'] as any).shapeQuiz, { whichShapeOfShort: 'Which shape belongs to…' });
Object.assign((translations['es'] as any).flagQuiz, { whichFlagOfShort: '¿Qué bandera pertenece a…?' });
Object.assign((translations['es'] as any).shapeQuiz, { whichShapeOfShort: '¿Qué forma pertenece a…?' });
Object.assign((translations['fr'] as any).flagQuiz, { whichFlagOfShort: 'Quel drapeau appartient à…' });
Object.assign((translations['fr'] as any).shapeQuiz, { whichShapeOfShort: 'Quelle forme appartient à…' });
Object.assign((translations['hi'] as any).flagQuiz, { whichFlagOfShort: 'कौन सा झंडा इस देश का है…' });
Object.assign((translations['hi'] as any).shapeQuiz, { whichShapeOfShort: 'कौन सी आकृति इस देश की है…' });
Object.assign((translations['zh-Hans'] as any).flagQuiz, { whichFlagOfShort: '哪面国旗属于…' });
Object.assign((translations['zh-Hans'] as any).shapeQuiz, { whichShapeOfShort: '哪个轮廓属于…' });
Object.assign((translations['he'] as any).flagQuiz, { whichFlagOfShort: 'איזה דגל שייך ל…' });
Object.assign((translations['he'] as any).shapeQuiz, { whichShapeOfShort: 'איזו צורה שייכת ל…' });
Object.assign((translations['ar'] as any).flagQuiz, { whichFlagOfShort: 'أي علم يخص…' });
Object.assign((translations['ar'] as any).shapeQuiz, { whichShapeOfShort: 'أي شكل يخص…' });
// Compass Quiz
_ensureSection('en', 'compass', {"tile":"Compass","title":"Compass Quiz","subtitle":"Point the arrow toward the target country. The closer you aim, the bigger the reward (per round).","loading":"Preparing the map…","prompt":"Which way is %{target}?","fromLine":"Starting from %{from}","confirm":"Confirm","hint":"Drag on the dial to aim","offBy":"You were off by %{deg}°","bullseye":"Bullseye!","perfect":"Great shot!","close":"Close!","miss":"Too far off","noAnswer":"Time is up","next":"Next","finish":"Finish","lockedTitle":"Compass Quiz Locked","dirs":"N,E,S,W","tierBullseye":"Bullseye","tierGood":"Good","tierClose":"Close","tierMiss":"Off target"});
_ensureSection('es', 'compass', {"tile":"Brújula","title":"Quiz de Brújula","subtitle":"Apunta la flecha hacia el país objetivo. Cuanto más preciso, mayor la recompensa (por ronda).","loading":"Preparando el mapa…","prompt":"¿Hacia dónde está %{target}?","fromLine":"Desde %{from}","confirm":"Confirmar","hint":"Arrastra por el dial para apuntar","offBy":"Te desviaste %{deg}°","bullseye":"¡Diana!","perfect":"¡Gran tiro!","close":"¡Cerca!","miss":"Demasiado lejos","noAnswer":"Se acabó el tiempo","next":"Siguiente","finish":"Terminar","lockedTitle":"Quiz de Brújula bloqueado","dirs":"N,E,S,O","tierBullseye":"Diana","tierGood":"Bien","tierClose":"Cerca","tierMiss":"Fallo"});
_ensureSection('fr', 'compass', {"tile":"Boussole","title":"Quiz Boussole","subtitle":"Pointez la flèche vers le pays cible. Plus vous visez juste, plus la récompense est grande (par manche).","loading":"Préparation de la carte…","prompt":"Dans quelle direction se trouve %{target} ?","fromLine":"Depuis %{from}","confirm":"Valider","hint":"Faites glisser sur le cadran pour viser","offBy":"Écart de %{deg}°","bullseye":"En plein dans le mille !","perfect":"Beau tir !","close":"Proche !","miss":"Trop loin","noAnswer":"Temps écoulé","next":"Suivant","finish":"Terminer","lockedTitle":"Quiz Boussole verrouillé","dirs":"N,E,S,O","tierBullseye":"Mille","tierGood":"Bien","tierClose":"Proche","tierMiss":"Raté"});
_ensureSection('hi', 'compass', {"tile":"कम्पास","title":"कम्पास क्विज़","subtitle":"तीर को लक्ष्य देश की ओर घुमाएं। जितना सटीक निशाना, उतना बड़ा इनाम (हर राउंड)।","loading":"नक्शा तैयार हो रहा है…","prompt":"%{target} किस दिशा में है?","fromLine":"%{from} से","confirm":"पुष्टि करें","hint":"निशाना लगाने के लिए डायल पर खींचें","offBy":"आप %{deg}° दूर थे","bullseye":"बुल्सआई!","perfect":"शानदार निशाना!","close":"करीब!","miss":"बहुत दूर","noAnswer":"समय समाप्त","next":"अगला","finish":"समाप्त","lockedTitle":"कम्पास क्विज़ बंद है","dirs":"उ,पू,द,प","tierBullseye":"बुल्सआई","tierGood":"अच्छा","tierClose":"करीब","tierMiss":"चूक"});
_ensureSection('zh-Hans', 'compass', {"tile":"指南针","title":"指南针测验","subtitle":"将箭头指向目标国家。瞄得越准，每轮奖励越高。","loading":"正在准备地图…","prompt":"%{target}在哪个方向？","fromLine":"从%{from}出发","confirm":"确认","hint":"在表盘上拖动来瞄准","offBy":"你偏差了%{deg}°","bullseye":"正中靶心！","perfect":"好球！","close":"很接近！","miss":"偏差太大","noAnswer":"时间到","next":"下一题","finish":"完成","lockedTitle":"指南针测验已锁定","dirs":"北,东,南,西","tierBullseye":"靶心","tierGood":"不错","tierClose":"接近","tierMiss":"偏离"});
_ensureSection('he', 'compass', {"tile":"מצפן","title":"חידון מצפן","subtitle":"כוון את החץ אל המדינה המבוקשת. ככל שתכוון מדויק יותר, הפרס בכל סיבוב גדול יותר.","loading":"מכין את המפה…","prompt":"באיזה כיוון נמצאת %{target}?","fromLine":"נקודת המוצא: %{from}","confirm":"אישור","hint":"גרור על המצפן כדי לכוון","offBy":"טעית ב-%{deg}°","bullseye":"בול!","perfect":"כל הכבוד!","close":"קרוב!","miss":"רחוק מדי","noAnswer":"הזמן נגמר","next":"הבא","finish":"סיום","lockedTitle":"חידון המצפן נעול","dirs":"צ,מז,ד,מע","tierBullseye":"בול","tierGood":"טוב","tierClose":"קרוב","tierMiss":"החטאה"});
_ensureSection('ar', 'compass', {"tile":"البوصلة","title":"اختبار البوصلة","subtitle":"وجّه السهم نحو الدولة المطلوبة. كلما كان التصويب أدق زادت المكافأة في كل جولة.","loading":"جارٍ تجهيز الخريطة…","prompt":"في أي اتجاه تقع %{target}؟","fromLine":"من %{from}","confirm":"تأكيد","hint":"اسحب على القرص للتصويب","offBy":"انحرفت بمقدار %{deg}°","bullseye":"إصابة في المركز!","perfect":"تصويبة رائعة!","close":"قريب!","miss":"بعيد جداً","noAnswer":"انتهى الوقت","next":"التالي","finish":"إنهاء","lockedTitle":"اختبار البوصلة مقفل","dirs":"ش,ق,ج,غ","tierBullseye":"المركز","tierGood":"جيد","tierClose":"قريب","tierMiss":"خطأ"});
