/**
 * Deterministic demo data for a fictional company. The same seed and the same
 * UTC day of `now` always produce deep-equal output; all dates are relative to
 * that day, so every analytics range has data.
 *
 * History runs for 365 days up to and including yesterday (UTC). Nothing is
 * dated today, so the output never depends on the time of day of `now`.
 */
import { addUtcDays, DAY_MS, isUtcWeekend, startOfUtcDay } from "./dates";
import type { Cents } from "./money";
import { createRng, referenceFor, type Rng } from "./prng";
import { buildTransferLegs } from "./transfers";
import type { Account, ExternalTransaction, Transaction, TransactionStatus } from "./types";

export const SEED_COMPANY = {
  name: "Quillfeather Systems, Inc.",
  shortName: "Quillfeather",
  profile:
    "A 15-person B2B SaaS company selling scheduling and dispatch software to independent trade contractors. Venture-backed, growing revenue, still burning cash.",
} as const;

export const DEFAULT_SEED = "oak-demo";

const HISTORY_DAYS = 365;
const PENDING_DAYS = 3;

const OPERATING = "acc_operating";
const PAYROLL = "acc_payroll";
const RESERVE = "acc_reserve";

// Operating cash band kept by the weekly sweep against Reserve.
const SWEEP_LOW: Cents = 230_000_00;
const SWEEP_HIGH: Cents = 640_000_00;
const SWEEP_TARGET: Cents = 420_000_00;
const SWEEP_STEP: Cents = 5_000_00;
const RESERVE_APY_BASIS_POINTS = 360;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// Mild seasonality for revenue, January to December.
const SEASONALITY = [0.92, 0.95, 1.02, 1.0, 1.04, 1.06, 0.98, 0.97, 1.03, 1.05, 1.0, 0.9];

export type SeedData = { accounts: Account[]; transactions: Transaction[] };

export type SeedOptions = { now: Date; seed?: string };

function buildAccounts(firstDay: Date): Account[] {
  const openedAt = new Date(firstDay.getTime() - 3 * DAY_MS + 15 * 3_600_000).toISOString();
  const account = (id: string, name: string, kind: Account["kind"], openingBalanceCents: Cents, last4: string) => ({
    id,
    name,
    kind,
    currency: "USD" as const,
    openingBalanceCents,
    openedAt,
    status: "active" as const,
    maskedNumber: `•••• ${last4}`,
  });
  return [
    account(OPERATING, "Operating", "operating", 384_912_63, "4821"),
    account(PAYROLL, "Payroll", "payroll", 21_486_10, "7356"),
    account(RESERVE, "Reserve", "reserve", 2_036_418_77, "1903"),
  ];
}

type Draft = Omit<ExternalTransaction, "id" | "reference" | "status"> & { status?: TransactionStatus };

function external(draft: Draft): ExternalTransaction {
  return { ...draft, id: "", reference: "", status: draft.status ?? "completed" };
}

function rollForwardToBusinessDay(date: Date): Date {
  let day = date;
  while (isUtcWeekend(day)) day = addUtcDays(day, 1);
  return day;
}

function rollBackToBusinessDay(date: Date): Date {
  let day = date;
  while (isUtcWeekend(day)) day = addUtcDays(day, -1);
  return day;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getTime() === b.getTime();
}

/** True when a monthly item due on `dayOfMonth` (≤ 26) falls on `day`, rolled forward past weekends. */
function dueOn(day: Date, dayOfMonth: number): boolean {
  const due = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), dayOfMonth));
  return sameDay(rollForwardToBusinessDay(due), day);
}

function jitter(rng: Rng, cents: Cents, spread: number): Cents {
  return Math.round(cents * (1 + (rng.next() * 2 - 1) * spread));
}

type PayrollRun = { runIndex: number; fundingIndex: number; amountCents: Cents; label: string };

/** Semi-monthly runs on the 15th and the last day (earlier if a weekend). */
function schedulePayroll(rng: Rng, firstDay: Date): PayrollRun[] {
  const runs: PayrollRun[] = [];
  const indexOf = (date: Date) => Math.round((date.getTime() - firstDay.getTime()) / DAY_MS);
  for (let offset = 0; offset <= 13; offset++) {
    const year = firstDay.getUTCFullYear();
    const month = firstDay.getUTCMonth() + offset;
    for (const due of [new Date(Date.UTC(year, month, 15)), new Date(Date.UTC(year, month + 1, 0))]) {
      const runDate = rollBackToBusinessDay(due);
      let funding = runDate;
      for (let k = rng.int(1, 2); k > 0; k--) funding = rollBackToBusinessDay(addUtcDays(funding, -1));
      const runIndex = indexOf(runDate);
      const fundingIndex = indexOf(funding);
      if (fundingIndex < 0 || runIndex >= HISTORY_DAYS) continue;
      // Headcount grows from 13 to 15 over the year.
      const headcount = runIndex < 120 ? 13 : runIndex < 250 ? 14 : 15;
      runs.push({
        runIndex,
        fundingIndex,
        amountCents: Math.round(headcount * 6_140_00 * (1 + rng.next() * 0.03 - 0.012)),
        label: `${MONTHS[due.getUTCMonth()]} ${due.getUTCDate()}`,
      });
    }
  }
  return runs;
}

type MonthlyVendor = {
  dayOfMonth: number;
  counterparty: string;
  description: string;
  category: ExternalTransaction["category"];
  method: ExternalTransaction["method"];
  amount: (rng: Rng, dayIndex: number, month: number) => Cents;
};

const MONTHLY_VENDORS: readonly MonthlyVendor[] = [
  {
    dayOfMonth: 1,
    counterparty: "Ashby Street Properties LLC",
    description: "Office lease, Suite 400",
    category: "rent",
    method: "ach",
    amount: () => 14_250_00,
  },
  {
    dayOfMonth: 3,
    counterparty: "Nimbusfield Cloud",
    description: "Cloud infrastructure, monthly usage",
    category: "cloud_hosting",
    method: "card",
    amount: (rng, i) => jitter(rng, Math.round(8_940_00 + (3_660_00 * i) / HISTORY_DAYS), 0.04),
  },
  {
    dayOfMonth: 5,
    counterparty: "Pipewell CRM",
    description: "CRM subscription, 18 seats",
    category: "software",
    method: "card",
    amount: () => 1_180_00,
  },
  {
    dayOfMonth: 10,
    counterparty: "Brambleton Mutual Insurance",
    description: "Business owner's policy, monthly premium",
    category: "insurance",
    method: "ach",
    amount: () => 2_186_40,
  },
  {
    dayOfMonth: 12,
    counterparty: "Pulsewatch Monitoring",
    description: "Uptime and error monitoring",
    category: "software",
    method: "card",
    amount: () => 689_00,
  },
  {
    dayOfMonth: 16,
    counterparty: "Pell & Hart CPAs",
    description: "Monthly bookkeeping and close",
    category: "professional_services",
    method: "ach",
    amount: () => 3_450_00,
  },
  {
    dayOfMonth: 18,
    counterparty: "Riverbend Power & Water",
    description: "Electric and water, Suite 400",
    category: "utilities",
    method: "ach",
    amount: (rng, _i, month) => {
      const seasonal = month >= 5 && month <= 7 ? 1.3 : month <= 1 || month === 11 ? 1.15 : 1;
      return Math.round(rng.int(640_00, 760_00) * seasonal);
    },
  },
  {
    dayOfMonth: 22,
    counterparty: "Kitebrook Dev Co.",
    description: "Contract engineering, monthly invoice",
    category: "contractors",
    method: "ach",
    amount: (rng) => jitter(rng, 9_350_00, 0.08),
  },
  {
    dayOfMonth: 24,
    counterparty: "Signalpost Ads",
    description: "Search ads, monthly",
    category: "marketing",
    method: "card",
    amount: (rng) => rng.int(3_800_00, 6_200_00),
  },
  {
    dayOfMonth: 26,
    counterparty: "Saltmarsh Design LLC",
    description: "Product design retainer",
    category: "contractors",
    method: "ach",
    amount: () => 7_800_00,
  },
];

type Customer = {
  name: string;
  invoiceCents: Cents;
  dayOfMonth: number;
  /** Quarterly customers pay in months where month % 3 === quarterMonth. */
  quarterMonth?: number;
  startIndex: number;
};

const CUSTOMERS: readonly Customer[] = [
  { name: "Harborline Plumbing Co.", invoiceCents: 12_480_00, dayOfMonth: 4, startIndex: 0 },
  { name: "Redfern HVAC Group", invoiceCents: 18_960_00, dayOfMonth: 7, startIndex: 0 },
  { name: "Sablewood Electric", invoiceCents: 7_215_50, dayOfMonth: 9, startIndex: 0 },
  { name: "Northgate Facility Services", invoiceCents: 24_300_00, dayOfMonth: 13, startIndex: 0 },
  { name: "Bluestem Mechanical", invoiceCents: 9_840_00, dayOfMonth: 19, startIndex: 0 },
  { name: "Corvid Landscape Partners", invoiceCents: 31_500_00, dayOfMonth: 21, quarterMonth: 1, startIndex: 0 },
  { name: "Tamarack Roofing LLC", invoiceCents: 6_180_00, dayOfMonth: 11, startIndex: 90 },
  { name: "Pinecrest Home Services", invoiceCents: 8_725_00, dayOfMonth: 6, startIndex: 160 },
  { name: "Marlow & Finch Builders", invoiceCents: 22_140_00, dayOfMonth: 15, quarterMonth: 2, startIndex: 200 },
  { name: "Ironvale Contractors", invoiceCents: 9_890_00, dayOfMonth: 17, startIndex: 240 },
];

type CardCategory = "meals" | "travel" | "office";
type CardMerchant = { name: string; description: string; min: Cents; max: Cents };

const CARD_MERCHANTS: Record<CardCategory, readonly CardMerchant[]> = {
  meals: [
    { name: "Copper Kettle Café", description: "Coffee meeting", min: 18_00, max: 64_00 },
    { name: "Lindenhall Bistro", description: "Team lunch", min: 120_00, max: 480_00 },
    { name: "Saffron Table", description: "Customer dinner", min: 60_00, max: 260_00 },
  ],
  travel: [
    { name: "Bluefinch Airways", description: "Flight, customer onsite", min: 240_00, max: 1_180_00 },
    { name: "Lanternhouse Hotel", description: "Hotel, 2 nights", min: 180_00, max: 960_00 },
    { name: "Cityhop Rides", description: "Rideshare", min: 14_00, max: 68_00 },
  ],
  office: [
    { name: "Deskline Office Supply", description: "Office supplies", min: 35_00, max: 420_00 },
    { name: "Paperhouse Supply Co.", description: "Printer paper and toner", min: 25_00, max: 180_00 },
    { name: "Northlight Hardware", description: "Peripherals and cables", min: 89_00, max: 1_450_00 },
  ],
};

export function generateSeed({ now, seed = DEFAULT_SEED }: SeedOptions): SeedData {
  const rng = createRng(seed);
  const firstDay = addUtcDays(startOfUtcDay(now), -HISTORY_DAYS);
  const accounts = buildAccounts(firstDay);
  const accountById = (id: string): Account => {
    const account = accounts.find((candidate) => candidate.id === id);
    if (!account) throw new Error(`Unknown seed account ${id}`);
    return account;
  };
  const balances = new Map(accounts.map((account) => [account.id, account.openingBalanceCents]));
  const balanceOf = (id: string) => balances.get(id) ?? 0;

  const at = (day: Date, hour: number, minute = rng.int(0, 59)) =>
    new Date(day.getTime() + hour * 3_600_000 + minute * 60_000).toISOString();

  let transferCount = 0;
  const transfer = (fromId: string, toId: string, amountCents: Cents, when: Date, description: string) => {
    const transferId = `trf_${String(++transferCount).padStart(3, "0")}`;
    const ids = [transferId, `${transferId}_out`, `${transferId}_in`];
    return buildTransferLegs(
      { from: accountById(fromId), to: accountById(toId), amountCents, description },
      { now: when, newId: () => ids.shift() ?? transferId },
    );
  };

  let invoiceNumber = 2041;
  let payoutBatch = 5170;
  const payrollRuns = schedulePayroll(rng, firstDay);
  const dayIndexNear = (index: number) => {
    const day = rollForwardToBusinessDay(addUtcDays(firstDay, index + rng.int(-4, 4)));
    return Math.round((day.getTime() - firstDay.getTime()) / DAY_MS);
  };
  const oneOffs = buildOneOffs(rng, dayIndexNear);

  const transactions: Transaction[] = [];
  for (let i = 0; i < HISTORY_DAYS; i++) {
    const day = addUtcDays(firstDay, i);
    const month = day.getUTCMonth();
    const weekend = isUtcWeekend(day);
    const growth = 1 + (0.3 * i) / HISTORY_DAYS;
    const today: Transaction[] = [];

    if (day.getUTCDate() === 1) {
      today.push(
        external({
          accountId: RESERVE,
          amountCents: Math.round((balanceOf(RESERVE) * RESERVE_APY_BASIS_POINTS) / 10_000 / 12),
          counterparty: "Oak Banking",
          description: `Interest, ${MONTHS[(month + 11) % 12]}`,
          category: "interest",
          method: "deposit",
          occurredAt: at(day, 6, 0),
        }),
      );
    }

    // Weekly sweep keeps Operating inside its cash band.
    if (day.getUTCDay() === 1) {
      const operating = balanceOf(OPERATING);
      if (operating < SWEEP_LOW) {
        const amount = Math.ceil((SWEEP_TARGET - operating) / SWEEP_STEP) * SWEEP_STEP;
        today.push(...transfer(RESERVE, OPERATING, amount, new Date(at(day, 14, 5)), "Sweep from Reserve"));
      } else if (operating > SWEEP_HIGH) {
        const amount = Math.floor((operating - SWEEP_TARGET) / SWEEP_STEP) * SWEEP_STEP;
        today.push(...transfer(OPERATING, RESERVE, amount, new Date(at(day, 14, 5)), "Sweep to Reserve"));
      }
    }

    for (const run of payrollRuns) {
      if (run.fundingIndex === i) {
        today.push(
          ...transfer(OPERATING, PAYROLL, run.amountCents, new Date(at(day, 15)), `Payroll funding, ${run.label} run`),
        );
      }
      if (run.runIndex === i) {
        today.push(
          external({
            accountId: PAYROLL,
            amountCents: -run.amountCents,
            counterparty: "Lanternway Payroll",
            description: `Payroll run, ${run.label}`,
            category: "payroll",
            method: "ach",
            occurredAt: at(day, 9, 30),
          }),
        );
      }
    }

    if (!weekend) {
      for (const vendor of MONTHLY_VENDORS) {
        if (!dueOn(day, vendor.dayOfMonth)) continue;
        today.push(
          external({
            accountId: OPERATING,
            amountCents: -vendor.amount(rng, i, month),
            counterparty: vendor.counterparty,
            description: vendor.description,
            category: vendor.category,
            method: vendor.method,
            occurredAt: at(day, rng.int(13, 21)),
          }),
        );
      }

      for (const customer of CUSTOMERS) {
        if (i < customer.startIndex || !dueOn(day, customer.dayOfMonth)) continue;
        if (customer.quarterMonth !== undefined && month % 3 !== customer.quarterMonth) continue;
        today.push(
          external({
            accountId: OPERATING,
            amountCents: jitter(rng, Math.round(customer.invoiceCents * SEASONALITY[month]), 0.04),
            counterparty: customer.name,
            description: `Invoice QF-${invoiceNumber++} payment`,
            category: "customer_payment",
            method: "ach",
            occurredAt: at(day, rng.int(14, 21)),
          }),
        );
      }

      if (day.getUTCDay() === 2) {
        today.push(
          external({
            accountId: OPERATING,
            amountCents: jitter(rng, Math.round(8_600_00 * growth * SEASONALITY[month]), 0.12),
            counterparty: "Tillstream Payouts",
            description: `Card payout, batch ${payoutBatch++}`,
            category: "processor_payout",
            method: "deposit",
            occurredAt: at(day, 10),
          }),
        );
      }
    }

    if (i < HISTORY_DAYS - PENDING_DAYS && rng.chance(weekend ? 0.05 : 0.17)) {
      const category = rng.pick<CardCategory>(["meals", "meals", "travel", "office"]);
      today.push(cardSpend(rng, category, at(day, rng.int(12, 23))));
    }

    for (const oneOff of oneOffs) {
      if (oneOff.index === i) today.push(...oneOff.build(day, at));
    }

    if (i === HISTORY_DAYS - 1) today.push(...pendingItems(rng, firstDay, at));

    today.sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
    for (const tx of today) {
      if (tx.status === "completed") balances.set(tx.accountId, balanceOf(tx.accountId) + tx.amountCents);
    }
    transactions.push(...today);
  }

  // Stable chronological ids; transfer legs keep the reference of their transfer.
  const ordered = transactions
    .map((tx, order) => ({ tx, order }))
    .sort((a, b) => Date.parse(a.tx.occurredAt) - Date.parse(b.tx.occurredAt) || a.order - b.order)
    .map(({ tx }, index): Transaction => {
      const id = `txn_${String(index + 1).padStart(4, "0")}`;
      return tx.method === "transfer" ? { ...tx, id } : { ...tx, id, reference: referenceFor(`${seed}:${id}`) };
    });

  return { accounts, transactions: ordered };
}

type At = (day: Date, hour: number, minute?: number) => string;

function cardSpend(rng: Rng, category: CardCategory, occurredAt: string, status?: TransactionStatus): ExternalTransaction {
  const merchant = rng.pick(CARD_MERCHANTS[category]);
  return external({
    accountId: OPERATING,
    amountCents: -rng.int(merchant.min, merchant.max),
    counterparty: merchant.name,
    description: merchant.description,
    category,
    method: "card",
    occurredAt,
    status,
  });
}

function wireFee(occurredAt: string, cents: Cents, description: string): ExternalTransaction {
  return external({
    accountId: OPERATING,
    amountCents: -cents,
    counterparty: "Oak Banking",
    description,
    category: "bank_fees",
    method: "fee",
    occurredAt,
  });
}

type OneOff = { index: number; build: (day: Date, at: At) => Transaction[] };

/** Irregular events: large customer wires, legal invoices, equipment, failures. */
function buildOneOffs(rng: Rng, near: (index: number) => number): OneOff[] {
  const incomingWire = (index: number, name: string, cents: Cents, note: string): OneOff => ({
    index: near(index),
    build: (day, at) => {
      const time = at(day, 16);
      return [
        external({
          accountId: OPERATING,
          amountCents: cents,
          counterparty: name,
          description: "Incoming wire, annual contract",
          category: "customer_payment",
          method: "wire",
          occurredAt: time,
          note,
        }),
        wireFee(time, 15_00, "Incoming wire fee"),
      ];
    },
  });

  const outgoingWire = (
    index: number,
    name: string,
    cents: Cents,
    description: string,
    category: ExternalTransaction["category"],
    note?: string,
  ): OneOff => ({
    index: near(index),
    build: (day, at) => {
      const time = at(day, 18);
      return [
        external({
          accountId: OPERATING,
          amountCents: -cents,
          counterparty: name,
          description,
          category,
          method: "wire",
          occurredAt: time,
          ...(note ? { note } : {}),
        }),
        wireFee(time, 30_00, "Outgoing wire fee"),
      ];
    },
  });

  const single = (index: number, draft: (day: Date, at: At) => ExternalTransaction[]): OneOff => ({
    index: near(index),
    build: draft,
  });

  const oneOffs: OneOff[] = [
    incomingWire(72, "Granite Ridge Facilities Group", 86_400_00, "Annual prepayment, 40 technician seats"),
    incomingWire(206, "Westbrook Property Management", 64_800_00, "Annual plan, 3 regions"),
    outgoingWire(58, "Ostrander Vale LLP", 8_426_50, "Legal services, customer MSA review", "professional_services"),
    outgoingWire(101, "Northlight Hardware", 13_940_18, "Laptops for new hires", "office", "6 laptops, asset tags QF-L031 to QF-L036"),
    outgoingWire(172, "Ostrander Vale LLP", 16_780_00, "Legal services, Series A follow-on", "professional_services", "Includes filing fees"),
    outgoingWire(291, "Ostrander Vale LLP", 6_152_75, "Legal services, trademark filing", "professional_services"),
    single(150, (day, at) => [
      external({
        accountId: OPERATING,
        amountCents: -5_040_00,
        counterparty: "Codewharf",
        description: "Code hosting, annual team plan",
        category: "software",
        method: "card",
        occurredAt: at(day, 17),
      }),
    ]),
    // Failed items, each with an explanatory note.
    single(48, (day, at) => [
      external({
        accountId: OPERATING,
        amountCents: -612_80,
        counterparty: "Lanternhouse Hotel",
        description: "Hotel, 3 nights",
        category: "travel",
        method: "card",
        occurredAt: at(day, 20),
        status: "failed",
        note: "Declined: card spend limit reached",
      }),
    ]),
    single(137, (day, at) => {
      const time = at(day, 17);
      return [
        external({
          accountId: OPERATING,
          amountCents: 6_180_00,
          counterparty: "Tamarack Roofing LLC",
          description: "Invoice payment (returned)",
          category: "customer_payment",
          method: "ach",
          occurredAt: time,
          status: "failed",
          note: "Returned R01: insufficient funds at payer's bank",
        }),
        external({
          accountId: OPERATING,
          amountCents: -12_00,
          counterparty: "Oak Banking",
          description: "Returned deposit fee",
          category: "bank_fees",
          method: "fee",
          occurredAt: time,
        }),
      ];
    }),
    single(229, (day, at) => [
      external({
        accountId: OPERATING,
        amountCents: -9_350_00,
        counterparty: "Kitebrook Dev Co.",
        description: "Contract engineering, monthly invoice",
        category: "contractors",
        method: "ach",
        occurredAt: at(day, 15),
        status: "failed",
        note: "Rejected: beneficiary account closed. Resent with updated details.",
      }),
    ]),
    single(318, (day, at) => {
      const declined = at(day, 19, 10);
      const retried = at(day, 19, 24);
      const base = {
        accountId: OPERATING,
        amountCents: -842_30,
        counterparty: "Bluefinch Airways",
        description: "Flight, conference",
        category: "travel",
        method: "card",
      } as const;
      return [
        external({ ...base, occurredAt: declined, status: "failed", note: "Declined: fraud check, approved on retry" }),
        external({ ...base, occurredAt: retried }),
      ];
    }),
  ];

  if (rng.chance(0.5)) {
    oneOffs.push(
      single(275, (day, at) => [
        external({
          accountId: OPERATING,
          amountCents: -4_210_00,
          counterparty: "Signalpost Ads",
          description: "Search ads, campaign top-up",
          category: "marketing",
          method: "card",
          occurredAt: at(day, 21),
          status: "failed",
          note: "Declined: billing ZIP mismatch",
        }),
      ]),
    );
  }
  return oneOffs;
}

/** 6–9 pending items spread over the last 3 days, mostly outflows (holds). */
function pendingItems(rng: Rng, firstDay: Date, at: At): Transaction[] {
  const days = Array.from({ length: PENDING_DAYS }, (_, k) => addUtcDays(firstDay, HISTORY_DAYS - PENDING_DAYS + k));
  const businessDays = days.filter((day) => !isUtcWeekend(day));
  const lastBusinessDay = businessDays[businessDays.length - 1] ?? days[days.length - 1];

  const items: Transaction[] = [];
  const cardCount = rng.int(3, 5);
  for (let k = 0; k < cardCount; k++) {
    const category = rng.pick<CardCategory>(["meals", "travel", "office"]);
    items.push(cardSpend(rng, category, at(rng.pick(days), rng.int(12, 22)), "pending"));
  }
  items.push(
    external({
      accountId: OPERATING,
      amountCents: -6_500_00,
      counterparty: "Quarry Lane Recruiting",
      description: "Placement fee, 50% deposit",
      category: "professional_services",
      method: "ach",
      occurredAt: at(lastBusinessDay, 16),
      status: "pending",
    }),
    external({
      accountId: OPERATING,
      amountCents: -9_872_40,
      counterparty: "Northlight Hardware",
      description: "Laptops for new hires",
      category: "office",
      method: "wire",
      occurredAt: at(lastBusinessDay, 18),
      status: "pending",
      note: "4 laptops, asset tags QF-L037 to QF-L040",
    }),
    external({
      accountId: OPERATING,
      amountCents: 12_604_00,
      counterparty: "Westbrook Property Management",
      description: "Invoice QF-PO-118 payment",
      category: "customer_payment",
      method: "ach",
      occurredAt: at(rng.pick(businessDays.length > 0 ? businessDays : days), 15),
      status: "pending",
    }),
  );
  if (rng.chance(0.6)) {
    items.push(
      external({
        accountId: OPERATING,
        amountCents: rng.int(7_900_00, 10_400_00),
        counterparty: "Tillstream Payouts",
        description: "Card payout, in transit",
        category: "processor_payout",
        method: "deposit",
        occurredAt: at(lastBusinessDay, 10),
        status: "pending",
      }),
    );
  }
  return items;
}
