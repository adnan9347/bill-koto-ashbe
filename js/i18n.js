/*
 * ==========================================================
 *  i18n.js — words and numbers in Bangla and English
 * ----------------------------------------------------------
 *  "i18n" is short for "internationalization".
 *
 *  Writing rule for this app: use the words people already
 *  know from their electricity bill and daily life. No jargon.
 *  If a technical word is printed on the bill (like "ডিমান্ড
 *  চার্জ"), keep it, but explain it in plain words next to it.
 *
 *  • t('key') returns the sentence in the current language.
 *    {placeholders} get filled in: t('tipHours', { name: 'AC' }).
 *  • fmtNum / fmtMoney / fmtUnits format numbers the local way:
 *      Bangla → ১,২৩৪.৫০ (Intl 'bn-BD')   English → 1,234.50 (Intl 'en-IN')
 *  • parseNum reads English OR Bangla digits typed by the user.
 * ==========================================================
 */

const dict = {
  en: {
    appName: 'Bill Koto Ashbe?',
    titleSuffix: 'Electricity bill estimator',
    metaDescription: 'Find out roughly how much your home electricity bill will be this month.',
    skipToContent: 'Skip to content',
    heroKicker: 'For homes in Bangladesh',
    heroTitle: 'How much will this month’s electricity bill be?',
    heroLead: 'Tell us which electric things you use and for how long. We’ll work out your bill — in a minute.',
    how1: 'Check the price per unit (already filled in)',
    how2: 'Tap the things you use at home',
    how3: 'See your bill and how to save',
    start: 'Let’s start',
    heroNote: 'Free. No sign-up. Nothing is saved.',
    progressLabel: 'Steps',
    stepOf: 'Step {n} of {total}',
    stepTariff: 'Price',
    stepAppliances: 'Your things',
    stepBudget: 'Budget',
    stepResult: 'Bill',
    langToEn: 'Switch to English',
    langToBn: 'Switch to Bangla',
    themeToDark: 'Switch to dark mode',
    themeToLight: 'Switch to light mode',
    back: 'Back',
    next: 'Next',
    mascotAlt: 'Bijli, the light bulb',
    moreSettings: 'More settings (change only if your bill is different)',

    // ---- Step 1: price ----
    tariffTitle: 'Price of electricity',
    tariffIntro: 'Your bill paper shows how much each unit costs. We filled in common prices — change them if your bill shows different numbers.',
    sampleNotice: 'These are example prices, not official ones. Your own bill paper is always right.',
    resetSample: 'Fill in example prices again',
    resetSampleDone: 'Example prices filled in.',
    whereOnBill: 'Where do I find this on my bill?',
    whereOnBillText: 'Look for the table with “units” and “rate” on your electricity bill. Copy those numbers here.',
    paperTitle: 'ELECTRICITY BILL',
    paperUnits: 'Units',
    paperRate: 'Rate ৳',
    modeLabel: 'How does your bill charge?',
    modeSlab: 'Price goes up in steps',
    modeSimple: 'Same price for every unit',
    stepsExplain: 'Using more electricity makes each unit costlier. For example, the first 75 units are cheap, the next units cost more.',
    stepFrom: 'From unit',
    stepTo: 'Up to unit',
    stepRate: 'Price per unit (৳)',
    stepToPlaceholder: 'and more',
    stepRowLabel: 'Step {n}',
    addStep: 'Add another step',
    removeStep: 'Remove step {n}',
    simpleRate: 'Price per unit (৳)',
    simpleHelp: 'Use this if your bill charges the same price for every unit.',
    chargesTitle: 'Fixed monthly charges',
    chargesIntro: 'These are added to every bill, even if you use little electricity.',
    demand: 'Demand charge (৳)',
    demandHelp: 'A fixed charge printed on your bill.',
    meterRent: 'Meter rent (৳)',
    meterRentHelp: 'Rent for the meter, every month.',
    vat: 'VAT (%)',
    vatHelp: 'Government tax, usually 5%.',
    methodLabel: 'How are steps charged?',
    methodProgressive: 'Each step at its own price',
    methodProgressiveHelp: 'First units at the first price, the next units at the next price, and so on. Most bills work like this.',
    methodWhole: 'All units at the last step’s price',
    methodWholeHelp: 'Every unit is charged at the price of the highest step you reach.',
    billingDays: 'Days in this bill',
    billingDaysHelp: 'Usually 30.',
    errNoSlab: 'Add at least one price step.',
    errNumber: 'Step {n}: please type a number in every box.',
    errRate: 'Step {n}: price can’t be below 0.',
    errToFrom: 'Step {n}: “Up to” must be bigger than “From”.',
    errFirst: 'Step 1 should start from 0 or 1.',
    errGap: 'Step {b} should start at {x}, right after step {a}.',
    errOverlap: 'Step {b} overlaps step {a} — it should start at {x}.',
    errOpenMiddle: 'Step {n}: only the last step can leave “Up to” empty.',
    errSimpleRate: 'Type the price per unit (0 or more).',
    errCharges: 'Charges and VAT must be numbers, 0 or more.',
    errDays: 'Days should be between 1 and 31.',
    fixToContinue: 'Please fix the red boxes first.',
    allGood: 'All good!',

    // ---- Step 2: appliances ----
    appliancesTitle: 'What do you use at home?',
    appliancesIntro: 'Tap each thing you use. Tap again to add another one.',
    tilesLabel: 'Add an electric item',
    addedCount: '{n} added',
    cat_fan: 'Fan',
    cat_led: 'LED bulb',
    cat_tube: 'Tube light',
    cat_ac: 'AC',
    cat_fridge: 'Fridge',
    cat_tv: 'TV',
    cat_iron: 'Iron',
    cat_pump: 'Water pump',
    cat_ricecooker: 'Rice cooker',
    cat_washer: 'Washing machine',
    cat_desktop: 'Computer',
    cat_laptop: 'Laptop',
    cat_router: 'Wi-Fi router',
    cat_geyser: 'Geyser',
    cat_microwave: 'Microwave',
    cat_other: 'Other',
    fieldName: 'Name',
    fieldQty: 'How many?',
    fieldSize: 'Which type?',
    fieldWatts: 'Watts (W)',
    fieldHours: 'Hours per day',
    fieldDays: 'Days per month',
    fieldDuty: 'Motor runs (% of time)',
    dutyHelp_fridge: 'A fridge motor switches on and off by itself, so it runs about half the time. Leave 50 if unsure.',
    dutyHelp_ac: 'An AC motor rests once the room is cool. Leave 70 if unsure.',
    decrease: 'One less',
    increase: 'One more',
    deleteAppliance: 'Remove {name}',
    perMonth: '/month',
    applianceMonthly: '≈ {kwh} units a month',
    emptyTitle: 'Nothing added yet',
    emptyText: 'Tap a fan, a bulb or anything you use from the list above.',
    liveUnits: 'Units',
    liveBill: 'Bill so far',
    unitShort: 'units',
    wattUnit: 'W',
    errNeedAppliance: 'Add at least one thing you use.',
    wattsHelpToggle: 'Don’t know the watts?',
    stickerCaption: 'Look for a sticker on the back or bottom of the item. The number with “W” is the watts.',
    stickerRated: 'Rated power',
    fieldModel: 'Or type the model number or size',
    modelPlaceholder: 'e.g. 1.5 ton, 32 inch, 1 HP or model no.',
    findWatts: 'Find watts',
    lookupSearching: 'Searching',
    lookupSlow: 'Searching the internet — this can take 10–20 seconds.',
    lookupResult: '≈ {w} W',
    lookupSource: 'From: {src}',
    lookupCapacity: 'Size: {c}',
    src_label: 'the watts you typed',
    src_size: 'the size you typed',
    src_ai: 'internet search (AI)',
    src_typical: 'a common value (exact model not found)',
    conf_low: 'not sure',
    conf_medium: 'fairly sure',
    conf_high: 'sure',
    lookupConfidence: 'Confidence: {c}',
    lookupNote: 'This is an estimate. The sticker on your item is the most accurate.',
    lookupNeedModel: 'Type a model number or a size first.',

    // size chips
    size_fan_ceiling: 'Ceiling fan',
    size_fan_table: 'Table / stand fan',
    size_fan_exhaust: 'Exhaust fan',
    size_tube_2ft: '2 ft tube',
    size_tube_4ft: '4 ft tube',
    size_tube_led: 'LED tube',
    size_ac_1: '1 ton',
    size_ac_15: '1.5 ton',
    size_ac_2: '2 ton',
    size_fridge_s: 'Small',
    size_fridge_m: 'Medium',
    size_fridge_l: 'Large / double door',
    size_tv_24: '24 inch',
    size_tv_32: '32 inch',
    size_tv_43: '43 inch',
    size_tv_55: '55 inch',
    size_tv_crt: 'Old box TV',
    size_iron_dry: 'Normal',
    size_iron_steam: 'Steam',
    size_pump_05: 'Half HP',
    size_pump_1: '1 HP',
    size_pump_15: '1.5 HP',
    size_rc_s: 'Small',
    size_rc_m: 'Medium',
    size_rc_l: 'Large',
    size_wm_semi: 'Twin tub',
    size_wm_top: 'Top load',
    size_wm_front: 'Front load',
    size_pc_office: 'Normal',
    size_pc_game: 'Gaming',
    size_router_only: 'Router only',
    size_router_onu: 'Router + ONU box',
    size_geyser_s: 'Small',
    size_geyser_l: 'Large',
    size_mw_s: 'Small',
    size_mw_l: 'Large',

    // ---- Step 3: budget ----
    budgetTitle: 'How much bill is OK for you each month?',
    budgetIntro: 'We’ll tell you if your bill stays within this amount.',
    budgetLabel: 'Amount you can pay (৳)',
    budgetPlaceholder: 'e.g. 2000',
    quickPick: 'Or tap one',
    errBudget: 'Type an amount above 0.',
    seeResult: 'Show my bill',

    // ---- Step 4: result ----
    resultTitle: 'Your bill this month',
    receiptTitle: 'Estimated bill',
    receiptDays: 'For {days} days',
    totalUnits: 'Units used',
    totalBill: 'Total bill',
    breakdownTitle: 'How we got this',
    rowStep: 'Step {n} ({from}–{to} units)',
    rowStepOpen: 'Step {n} (above {from} units)',
    rowEnergyWhole: 'All units at step {n} price',
    rowEnergySimple: 'Electricity used',
    rowEnergy: 'Electricity used',
    rowDemand: 'Demand charge',
    rowMeter: 'Meter rent',
    rowVat: 'VAT ({p}%)',
    rowTotal: 'Total',
    nextSlabTitle: 'Careful!',
    nextSlabWarn: 'Use just {u} more units and you’ll move to the next step — then each unit costs {r}.',
    chartTitle: 'Which item costs the most?',
    tipsTitle: 'Easy ways to save',
    tipSave: 'Save ≈ {amt} a month',
    tipsNone: 'You already use electricity carefully — nothing big to change!',
    tipHours: 'Run the {name} 2 hours less each day.',
    tipLed: 'Change tube lights to LED tubes — they use about half the electricity.',
    tipAcDuty: 'Keep the AC at 25–26°C, not very cold.',
    tipFridge: 'Keep the fridge a hand away from the wall and open the door less.',
    tipIron: 'Iron all clothes together, on half as many days.',
    tipPump: 'Fill the water tank fully each time — run the pump 5 fewer days.',
    tipGeyser: 'Turn on the geyser only 20 minutes before bathing.',
    tipFans: 'Turn off fans when you leave a room — 2 hours less a day.',
    mood_relief: 'Phew, you’re safe!',
    mood_worried: 'Getting a bit high…',
    mood_angry: 'What is this bill?!',
    moodReliefSub: '{amt} less than your {b} budget.',
    moodWorriedSub: '{amt} more than your {b} budget. Small changes can fix it.',
    moodAngrySub: '{amt} more than your {b} budget. See the tips below.',
    share: 'Share',
    edit: 'Change items',
    startOver: 'Start again',
    confirmReset: 'Clear everything and start again?',
    shareText: 'My electricity bill this month will be about {total} ({units} units). Budget: {budget}. {mood} — from "Bill Koto Ashbe?"',
    copied: 'Copied!',
    copyFailed: 'Couldn’t copy — please try again.',
    disclaimer: 'This is an estimate. Your real bill can be a little different.',
    downloadPdf: 'Download bill slip (PDF)',
    pdfMaking: 'Making PDF…',
    pdfDone: 'Bill slip downloaded.',
    pdfFailed: 'Couldn’t make the PDF here — choose “Save as PDF” in the print window.',
    slipTitle: 'Electricity bill estimate',
    slipDate: 'Made on {date}',
    slipBudget: 'Your budget',
    slipStatus: 'Status',
    slipUsageTitle: 'Electricity used by each item',
    colItem: 'Item',
    colQty: 'Qty',
    colWatts: 'Watts',
    colHours: 'Hours/day',
    colDays: 'Days',
    colUnits: 'Units',
    colCost: 'Cost',
    slipFooter: 'This is an estimate made with “Bill Koto Ashbe?”. Your real bill can be a little different. Prices used are from the app — check them against your bill paper.',
    resetDone: 'Starting fresh.',
  },

  bn: {
    appName: 'বিল কত আসবে?',
    titleSuffix: 'বিদ্যুৎ বিলের হিসাব',
    metaDescription: 'এই মাসে বাসার বিদ্যুৎ বিল কত আসতে পারে, সহজে জেনে নিন।',
    skipToContent: 'মূল অংশে যান',
    heroKicker: 'বাংলাদেশের বাসাবাড়ির জন্য',
    heroTitle: 'এই মাসে কারেন্ট বিল কত আসবে?',
    heroLead: 'বাসায় কী কী চলে আর কতক্ষণ চলে — শুধু এটুকু বলুন। এক মিনিটেই বিলের হিসাব পেয়ে যাবেন।',
    how1: 'প্রতি ইউনিটের দাম দেখে নিন (আগেই বসানো আছে)',
    how2: 'বাসায় যা যা চলে, সেগুলোতে চাপ দিন',
    how3: 'বিল কত আসবে আর কীভাবে কমাবেন, দেখুন',
    start: 'শুরু করি',
    heroNote: 'বিনা খরচে। কোনো নিবন্ধন নেই। কিছুই জমা থাকে না।',
    progressLabel: 'ধাপসমূহ',
    stepOf: 'ধাপ {n} / {total}',
    stepTariff: 'দাম',
    stepAppliances: 'যন্ত্রপাতি',
    stepBudget: 'বাজেট',
    stepResult: 'বিল',
    langToEn: 'ইংরেজিতে দেখুন',
    langToBn: 'বাংলায় দেখুন',
    themeToDark: 'রাতের রঙে দেখুন',
    themeToLight: 'দিনের রঙে দেখুন',
    back: 'পেছনে',
    next: 'পরের ধাপ',
    mascotAlt: 'বিজলি — আমাদের বাল্ব বন্ধু',
    moreSettings: 'আরও কিছু সেটিং (বিলের সঙ্গে না মিললে তবেই বদলান)',

    tariffTitle: 'বিদ্যুতের দাম',
    tariffIntro: 'আপনার বিলের কাগজে লেখা থাকে প্রতি ইউনিট কত টাকা। আমরা সাধারণ দামগুলো বসিয়ে রেখেছি — আপনার কাগজে অন্য দাম থাকলে বদলে দিন।',
    sampleNotice: 'এগুলো উদাহরণের দাম, সরকারি দাম নয়। আপনার বিলের কাগজের দামটাই ঠিক।',
    resetSample: 'উদাহরণের দাম আবার বসান',
    resetSampleDone: 'উদাহরণের দাম বসানো হলো।',
    whereOnBill: 'বিলের কাগজে এটা কোথায় পাব?',
    whereOnBillText: 'বিলের কাগজে “ইউনিট” আর “রেট” লেখা ঘরটা খুঁজুন। সেখানকার সংখ্যাগুলোই এখানে বসান।',
    paperTitle: 'বিদ্যুৎ বিল',
    paperUnits: 'ইউনিট',
    paperRate: 'রেট ৳',
    modeLabel: 'আপনার বিলে দাম কীভাবে ধরে?',
    modeSlab: 'ধাপে ধাপে দাম বাড়ে',
    modeSimple: 'সব ইউনিটের একই দাম',
    stepsExplain: 'বেশি কারেন্ট খরচ করলে প্রতি ইউনিটের দামও বাড়ে। যেমন প্রথম ৭৫ ইউনিট সস্তা, তার পরের ইউনিটগুলোর দাম বেশি।',
    stepFrom: 'কত ইউনিট থেকে',
    stepTo: 'কত ইউনিট পর্যন্ত',
    stepRate: 'প্রতি ইউনিট (৳)',
    stepToPlaceholder: 'এর বেশি',
    stepRowLabel: 'ধাপ {n}',
    addStep: 'আরেকটা ধাপ যোগ করুন',
    removeStep: 'ধাপ {n} মুছে ফেলুন',
    simpleRate: 'প্রতি ইউনিটের দাম (৳)',
    simpleHelp: 'আপনার বিলে সব ইউনিটের দাম একই হলে এটা বেছে নিন।',
    chargesTitle: 'প্রতি মাসের বাঁধা খরচ',
    chargesIntro: 'কারেন্ট কম খরচ করলেও এগুলো প্রতি বিলে যোগ হয়।',
    demand: 'ডিমান্ড চার্জ (৳)',
    demandHelp: 'বিলের কাগজে এই নামে লেখা একটা বাঁধা খরচ।',
    meterRent: 'মিটার ভাড়া (৳)',
    meterRentHelp: 'মিটারের জন্য প্রতি মাসের ভাড়া।',
    vat: 'ভ্যাট (%)',
    vatHelp: 'সরকারি কর, সাধারণত ৫%।',
    methodLabel: 'ধাপের দাম কীভাবে ধরা হয়?',
    methodProgressive: 'প্রতি ধাপ তার নিজের দামে',
    methodProgressiveHelp: 'প্রথম ইউনিটগুলো প্রথম দামে, পরের ইউনিটগুলো পরের দামে — এভাবে। বেশিরভাগ বিল এভাবেই হয়।',
    methodWhole: 'সব ইউনিট শেষ ধাপের দামে',
    methodWholeHelp: 'যে ধাপ পর্যন্ত পৌঁছাবেন, সব ইউনিট সেই ধাপের দামে ধরা হবে।',
    billingDays: 'বিল কত দিনের',
    billingDaysHelp: 'সাধারণত ৩০ দিন।',
    errNoSlab: 'অন্তত একটা দামের ধাপ যোগ করুন।',
    errNumber: 'ধাপ {n}: প্রতিটা ঘরে একটা সংখ্যা লিখুন।',
    errRate: 'ধাপ {n}: দাম ০-এর কম হতে পারে না।',
    errToFrom: 'ধাপ {n}: “কত ইউনিট পর্যন্ত” সংখ্যাটা “কত ইউনিট থেকে”-র চেয়ে বড় হতে হবে।',
    errFirst: 'ধাপ ১ শুরু হবে ০ বা ১ থেকে।',
    errGap: 'ধাপ {b} শুরু হওয়া উচিত {x} থেকে, ধাপ {a}-এর ঠিক পরে।',
    errOverlap: 'ধাপ {b} আর ধাপ {a} মিলে যাচ্ছে — ধাপ {b} শুরু হবে {x} থেকে।',
    errOpenMiddle: 'ধাপ {n}: শুধু শেষ ধাপের “পর্যন্ত” ঘর খালি রাখা যায়।',
    errSimpleRate: 'প্রতি ইউনিটের দাম লিখুন (০ বা তার বেশি)।',
    errCharges: 'চার্জ আর ভ্যাটের ঘরে ০ বা তার বেশি সংখ্যা লিখুন।',
    errDays: 'দিন হবে ১ থেকে ৩১-এর মধ্যে।',
    fixToContinue: 'আগে লাল ঘরগুলো ঠিক করুন।',
    allGood: 'সব ঠিক আছে!',

    appliancesTitle: 'বাসায় কী কী চলে?',
    appliancesIntro: 'যা যা চলে, সেগুলোতে চাপ দিন। একই জিনিস আরেকটা থাকলে আবার চাপ দিন।',
    tilesLabel: 'যন্ত্র যোগ করুন',
    addedCount: '{n}টা যোগ হয়েছে',
    cat_fan: 'ফ্যান',
    cat_led: 'এলইডি বাল্ব',
    cat_tube: 'টিউব লাইট',
    cat_ac: 'এসি',
    cat_fridge: 'ফ্রিজ',
    cat_tv: 'টিভি',
    cat_iron: 'ইস্ত্রি',
    cat_pump: 'পানির পাম্প',
    cat_ricecooker: 'রাইস কুকার',
    cat_washer: 'কাপড় ধোয়ার মেশিন',
    cat_desktop: 'কম্পিউটার',
    cat_laptop: 'ল্যাপটপ',
    cat_router: 'ওয়াইফাই রাউটার',
    cat_geyser: 'গিজার',
    cat_microwave: 'মাইক্রোওয়েভ',
    cat_other: 'অন্য কিছু',
    fieldName: 'নাম',
    fieldQty: 'কয়টা?',
    fieldSize: 'কোন ধরনের?',
    fieldWatts: 'ওয়াট (W)',
    fieldHours: 'দিনে কত ঘণ্টা চলে',
    fieldDays: 'মাসে কত দিন চলে',
    fieldDuty: 'মোটর কতক্ষণ চলে (%)',
    dutyHelp_fridge: 'ফ্রিজের মোটর নিজে নিজে চালু-বন্ধ হয়, তাই প্রায় অর্ধেক সময় চলে। না বুঝলে ৫০ রেখে দিন।',
    dutyHelp_ac: 'ঘর ঠান্ডা হলে এসির মোটর বিশ্রাম নেয়। না বুঝলে ৭০ রেখে দিন।',
    decrease: 'একটা কমান',
    increase: 'একটা বাড়ান',
    deleteAppliance: '{name} মুছে ফেলুন',
    perMonth: '/মাস',
    applianceMonthly: 'মাসে ≈ {kwh} ইউনিট',
    emptyTitle: 'এখনো কিছু যোগ করা হয়নি',
    emptyText: 'ওপরের তালিকা থেকে ফ্যান, বাল্ব বা বাসায় যা চলে তাতে চাপ দিন।',
    liveUnits: 'ইউনিট',
    liveBill: 'এখন পর্যন্ত বিল',
    unitShort: 'ইউনিট',
    wattUnit: 'ওয়াট',
    errNeedAppliance: 'অন্তত একটা যন্ত্র যোগ করুন।',
    wattsHelpToggle: 'ওয়াট জানেন না?',
    stickerCaption: 'যন্ত্রের পেছনে বা নিচে এমন একটা স্টিকার থাকে। সেখানে “W” লেখা সংখ্যাটাই ওয়াট।',
    stickerRated: 'Rated power',
    fieldModel: 'অথবা মডেল নম্বর বা সাইজ লিখুন',
    modelPlaceholder: 'যেমন: 1.5 ton, 32 inch, 1 HP বা মডেল নম্বর',
    findWatts: 'ওয়াট খুঁজুন',
    lookupSearching: 'খোঁজা হচ্ছে',
    lookupSlow: 'ইন্টারনেটে খোঁজা হচ্ছে — ১০–২০ সেকেন্ড লাগতে পারে।',
    lookupResult: '≈ {w} ওয়াট',
    lookupSource: 'কোথা থেকে: {src}',
    lookupCapacity: 'সাইজ: {c}',
    src_label: 'আপনার লেখা ওয়াট',
    src_size: 'আপনার লেখা সাইজ দেখে',
    src_ai: 'ইন্টারনেটে খুঁজে (এআই)',
    src_typical: 'সাধারণ মান (মডেলটা পাওয়া যায়নি)',
    conf_low: 'নিশ্চিত নয়',
    conf_medium: 'মোটামুটি নিশ্চিত',
    conf_high: 'নিশ্চিত',
    lookupConfidence: 'ভরসা: {c}',
    lookupNote: 'এটা আনুমানিক। যন্ত্রের গায়ের স্টিকারের সংখ্যাটাই সবচেয়ে ঠিক।',
    lookupNeedModel: 'আগে মডেল নম্বর বা সাইজ লিখুন।',

    size_fan_ceiling: 'সিলিং ফ্যান',
    size_fan_table: 'টেবিল / স্ট্যান্ড ফ্যান',
    size_fan_exhaust: 'একজস্ট ফ্যান',
    size_tube_2ft: '২ ফুট টিউব',
    size_tube_4ft: '৪ ফুট টিউব',
    size_tube_led: 'এলইডি টিউব',
    size_ac_1: '১ টন',
    size_ac_15: '১.৫ টন',
    size_ac_2: '২ টন',
    size_fridge_s: 'ছোট',
    size_fridge_m: 'মাঝারি',
    size_fridge_l: 'বড় / দুই দরজা',
    size_tv_24: '২৪ ইঞ্চি',
    size_tv_32: '৩২ ইঞ্চি',
    size_tv_43: '৪৩ ইঞ্চি',
    size_tv_55: '৫৫ ইঞ্চি',
    size_tv_crt: 'পুরোনো বক্স টিভি',
    size_iron_dry: 'সাধারণ',
    size_iron_steam: 'স্টিম',
    size_pump_05: 'আধা ঘোড়া (½ HP)',
    size_pump_1: '১ ঘোড়া (1 HP)',
    size_pump_15: 'দেড় ঘোড়া (1.5 HP)',
    size_rc_s: 'ছোট',
    size_rc_m: 'মাঝারি',
    size_rc_l: 'বড়',
    size_wm_semi: 'দুই টাব',
    size_wm_top: 'ওপরে ঢাকনা',
    size_wm_front: 'সামনে দরজা',
    size_pc_office: 'সাধারণ',
    size_pc_game: 'গেমিং',
    size_router_only: 'শুধু রাউটার',
    size_router_onu: 'রাউটার + ONU বক্স',
    size_geyser_s: 'ছোট',
    size_geyser_l: 'বড়',
    size_mw_s: 'ছোট',
    size_mw_l: 'বড়',

    budgetTitle: 'মাসে কত টাকা বিল এলে আপনার চলে?',
    budgetIntro: 'বিল এই টাকার মধ্যে থাকছে কি না, আমরা জানিয়ে দেব।',
    budgetLabel: 'যত টাকা দিতে পারবেন (৳)',
    budgetPlaceholder: 'যেমন: ২০০০',
    quickPick: 'অথবা একটায় চাপ দিন',
    errBudget: '০-এর বেশি একটা টাকার অঙ্ক লিখুন।',
    seeResult: 'বিল দেখান',

    resultTitle: 'এই মাসের বিল',
    receiptTitle: 'আনুমানিক বিল',
    receiptDays: '{days} দিনের হিসাব',
    totalUnits: 'খরচ হওয়া ইউনিট',
    totalBill: 'মোট বিল',
    breakdownTitle: 'হিসাবটা যেভাবে হলো',
    rowStep: 'ধাপ {n} ({from}–{to} ইউনিট)',
    rowStepOpen: 'ধাপ {n} ({from} ইউনিটের বেশি)',
    rowEnergyWhole: 'সব ইউনিট ধাপ {n}-এর দামে',
    rowEnergySimple: 'কারেন্ট খরচ',
    rowEnergy: 'কারেন্ট খরচ',
    rowDemand: 'ডিমান্ড চার্জ',
    rowMeter: 'মিটার ভাড়া',
    rowVat: 'ভ্যাট ({p}%)',
    rowTotal: 'মোট',
    nextSlabTitle: 'সাবধান!',
    nextSlabWarn: 'আর মাত্র {u} ইউনিট বেশি খরচ করলেই পরের ধাপে চলে যাবেন — তখন প্রতি ইউনিটের দাম হবে {r}।',
    chartTitle: 'কোন যন্ত্রে খরচ সবচেয়ে বেশি?',
    tipsTitle: 'খরচ কমানোর সহজ উপায়',
    tipSave: 'মাসে ≈ {amt} বাঁচবে',
    tipsNone: 'আপনি এমনিতেই হিসাব করে কারেন্ট চালান — বড় কিছু বদলানোর নেই!',
    tipHours: '{name} প্রতিদিন ২ ঘণ্টা কম চালান।',
    tipLed: 'টিউব লাইটের বদলে এলইডি টিউব লাগান — অর্ধেকের মতো কারেন্ট লাগে।',
    tipAcDuty: 'এসি খুব ঠান্ডায় না রেখে ২৫–২৬ ডিগ্রিতে চালান।',
    tipFridge: 'ফ্রিজ দেয়াল থেকে এক হাত দূরে রাখুন আর দরজা কম খুলুন।',
    tipIron: 'সব কাপড় একসাথে ইস্ত্রি করুন — অর্ধেক দিন চালালেই হবে।',
    tipPump: 'প্রতিবার ট্যাংক পুরো ভরে নিন — মাসে ৫ দিন কম পাম্প চালাতে হবে।',
    tipGeyser: 'গোসলের মাত্র ২০ মিনিট আগে গিজার চালু করুন।',
    tipFans: 'ঘর থেকে বের হলে ফ্যান বন্ধ করুন — দিনে ২ ঘণ্টা কম চলবে।',
    mood_relief: 'উফ, বাঁচলাম!',
    mood_worried: 'একটু বেশি হয়ে যাচ্ছে…',
    mood_angry: 'এটা কী বিল!!',
    moodReliefSub: 'আপনার {b} বাজেটের চেয়ে {amt} কম।',
    moodWorriedSub: 'আপনার {b} বাজেটের চেয়ে {amt} বেশি। একটু সামলে চললেই হবে।',
    moodAngrySub: 'আপনার {b} বাজেটের চেয়ে {amt} বেশি। নিচের উপায়গুলো দেখুন।',
    share: 'শেয়ার করুন',
    edit: 'যন্ত্রপাতি বদলান',
    startOver: 'আবার শুরু করুন',
    confirmReset: 'সব মুছে আবার শুরু করবেন?',
    shareText: 'এই মাসে আমার বিদ্যুৎ বিল আসবে প্রায় {total} ({units} ইউনিট)। বাজেট: {budget}। {mood} — "বিল কত আসবে?" দিয়ে হিসাব করা।',
    copied: 'কপি হয়ে গেছে!',
    copyFailed: 'কপি করা গেল না — আবার চেষ্টা করুন।',
    disclaimer: 'এটা আনুমানিক হিসাব। আসল বিল একটু কম-বেশি হতে পারে।',
    downloadPdf: 'বিলের স্লিপ ডাউনলোড (PDF)',
    pdfMaking: 'PDF তৈরি হচ্ছে…',
    pdfDone: 'বিলের স্লিপ ডাউনলোড হয়েছে।',
    pdfFailed: 'এখানে PDF বানানো গেল না — প্রিন্ট উইন্ডোতে “Save as PDF” বেছে নিন।',
    slipTitle: 'বিদ্যুৎ বিলের আনুমানিক হিসাব',
    slipDate: 'তৈরির তারিখ: {date}',
    slipBudget: 'আপনার বাজেট',
    slipStatus: 'অবস্থা',
    slipUsageTitle: 'কোন যন্ত্রে কত কারেন্ট খরচ',
    colItem: 'যন্ত্র',
    colQty: 'কয়টা',
    colWatts: 'ওয়াট',
    colHours: 'ঘণ্টা/দিন',
    colDays: 'দিন',
    colUnits: 'ইউনিট',
    colCost: 'খরচ',
    slipFooter: 'এটা “বিল কত আসবে?” দিয়ে করা আনুমানিক হিসাব। আসল বিল একটু কম-বেশি হতে পারে। দামগুলো আপনার বিলের কাগজের সঙ্গে মিলিয়ে নিন।',
    resetDone: 'নতুন করে শুরু হলো।',
  },
};

let current = 'en';

/** Bangla if the phone/browser language starts with "bn", otherwise English. */
export function detectLang() {
  const lang = (typeof navigator !== 'undefined' && navigator.language) || '';
  return lang.toLowerCase().startsWith('bn') ? 'bn' : 'en';
}

export function setLang(lang) {
  current = lang === 'bn' ? 'bn' : 'en';
}

export function getLang() {
  return current;
}

/** Translate a key, filling {placeholders} from `vars`. Falls back to English. */
export function t(key, vars) {
  let text = dict[current][key] ?? dict.en[key] ?? key;
  if (vars) text = text.replace(/\{(\w+)\}/g, (match, name) => (vars[name] ?? match));
  return text;
}

/* ---------------- Numbers ---------------- */

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/** "123" → "১২৩" in Bangla mode (unchanged in English mode). */
export function toLocalDigits(text) {
  const s = String(text);
  return current === 'bn' ? s.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]) : s;
}

/** "১২৩" → "123" — always, regardless of language. */
export function toAsciiDigits(text) {
  return String(text).replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}

// Creating Intl.NumberFormat objects is slow-ish, so we keep them in a cache.
const formatterCache = new Map();
function formatter(minDecimals, maxDecimals) {
  const key = `${current}|${minDecimals}|${maxDecimals}`;
  if (!formatterCache.has(key)) {
    formatterCache.set(key, new Intl.NumberFormat(current === 'bn' ? 'bn-BD' : 'en-IN', {
      minimumFractionDigits: minDecimals,
      maximumFractionDigits: maxDecimals,
    }));
  }
  return formatterCache.get(key);
}

/** Format a number for display. Rounding happens only here (full precision is kept elsewhere). */
export function fmtNum(value, maxDecimals = 2, minDecimals = 0) {
  let n = Number.isFinite(value) ? value : 0;
  if (Object.is(n, -0) || Math.abs(n) < 1e-9) n = 0;
  // toLocalDigits is a safety net for browsers whose Intl lacks Bangla digits.
  return toLocalDigits(formatter(minDecimals, maxDecimals).format(n));
}

/** ৳1,234.50 — money always shows 2 decimals. */
export const fmtMoney = (value) => `৳${fmtNum(value, 2, 2)}`;

/** ৳1,235 — whole taka for small labels and buttons. */
export const fmtMoneyWhole = (value) => `৳${fmtNum(value, 0, 0)}`;

/** Units (kWh) with at most 1 decimal. */
export const fmtUnits = (value) => fmtNum(value, 1, 0);

/**
 * Turn user input into a number.
 *  ""      → null  (empty field)
 *  "১২.৫"  → 12.5  (Bangla digits are fine)
 *  "1,200" → 1200  (commas, spaces, ৳ and % are ignored)
 *  "abc"   → NaN   (validation will complain)
 */
export function parseNum(raw) {
  if (raw === null || raw === undefined) return null;
  const s = toAsciiDigits(String(raw)).replace(/[,\s৳%]/g, '').replace(/٫/g, '.');
  if (s === '') return null;
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
  return parseFloat(s);
}

/** Number → text to put back into an <input> (local digits, no grouping commas). */
export function inputValue(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  return toLocalDigits(String(Math.round(value * 10000) / 10000));
}
