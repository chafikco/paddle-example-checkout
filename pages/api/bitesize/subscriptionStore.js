// In-memory map: transaction_id -> subscription_id (from subscription.created webhook).
// For production, replace with Redis or DB. Serverless may reset between invocations.
const transactionToSubscription = new Map()

export function setSubscriptionForTransaction(transactionId, subscriptionId) {
  transactionToSubscription.set(transactionId, subscriptionId)
}

export function getSubscriptionForTransaction(transactionId) {
  return transactionToSubscription.get(transactionId) ?? null
}
