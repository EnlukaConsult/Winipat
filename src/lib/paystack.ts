const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;
const PAYSTACK_BASE = "https://api.paystack.co";

async function paystackFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  return res.json();
}

export async function initializeTransaction({
  email,
  amount,
  reference,
  metadata,
  callbackUrl,
}: {
  email: string;
  amount: number; // in kobo
  reference: string;
  metadata: Record<string, unknown>;
  callbackUrl: string;
}) {
  return paystackFetch("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email,
      amount,
      reference,
      metadata,
      callback_url: callbackUrl,
    }),
  });
}

export async function verifyTransaction(reference: string) {
  return paystackFetch(`/transaction/verify/${reference}`);
}

export async function initiateTransfer({
  amount,
  recipient,
  reference,
  reason,
}: {
  amount: number; // in kobo
  recipient: string; // recipient code
  reference: string;
  reason: string;
}) {
  return paystackFetch("/transfer", {
    method: "POST",
    body: JSON.stringify({
      source: "balance",
      amount,
      recipient,
      reference,
      reason,
    }),
  });
}

export async function createTransferRecipient({
  name,
  accountNumber,
  bankCode,
}: {
  name: string;
  accountNumber: string;
  bankCode: string;
}) {
  return paystackFetch("/transferrecipient", {
    method: "POST",
    body: JSON.stringify({
      type: "nuban",
      name,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: "NGN",
    }),
  });
}

export async function listBanks() {
  return paystackFetch("/bank?country=nigeria&perPage=100");
}

export async function resolveAccountNumber(accountNumber: string, bankCode: string) {
  return paystackFetch(
    `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`
  );
}
