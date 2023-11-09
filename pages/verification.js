
const crypto = require('crypto');
 
const timestamp = '1690533657';

const fullBodyData = '{"data":{"id":"txn_01h6dtgxd5gts4d6d0g96k20jd","items":[{"price":{"id":"pri_01gswn2pwscp9j6btjb6rkj1f4","status":"active","quantity":{"maximum":100,"minimum":1},"tax_mode":"account_setting","product_id":"pro_01gswmd728c5apa98ksn2qd31v","unit_price":{"amount":"7500","currency_code":"USD"},"description":"A plan that scales with your rapidly growing business.","revision_id":"prirev_01h03npxc9v8vva59gzkrszapg","trial_period":null,"billing_cycle":{"interval":"month","frequency":1},"unit_price_overrides":[{"unit_price":{"amount":"5000","currency_code":"GBP"},"country_codes":["GB"]}]},"quantity":1}],"origin":"api","status":"ready","details":{"totals":{"fee":null,"tax":"1000","total":"6000","credit":"0","balance":"6000","discount":"0","earnings":null,"subtotal":"5000","grand_total":"6000","currency_code":"GBP","exchange_rate":"1"},"line_items":[{"id":"txnitm_01h6dtgxr9yasj99377x6tdf0f","totals":{"tax":"1000","total":"6000","discount":"0","subtotal":"5000"},"product":{"id":"pro_01gswmd728c5apa98ksn2qd31v","name":"Premier","status":"active","image_url":null,"description":null,"tax_category":"standard"},"price_id":"pri_01gswn2pwscp9j6btjb6rkj1f4","quantity":1,"tax_rate":"0.2","unit_totals":{"tax":"1000","total":"6000","discount":"0","subtotal":"5000"},"price_revision_id":"prirev_01h03npxc9v8vva59gzkrszapg"}],"payout_totals":null,"tax_rates_used":[{"totals":{"tax":"1000","total":"6000","discount":"0","subtotal":"5000"},"tax_rate":"0.2"}],"adjusted_totals":{"fee":"0","tax":"1000","total":"6000","earnings":"0","subtotal":"5000","grand_total":"6000","currency_code":"GBP"},"adjusted_payout_totals":null},"checkout":{"url":"https://b24a-79-116-133-149.ngrok-free.app?_ptxn=txn_01h6dtgxd5gts4d6d0g96k20jd"},"payments":[],"billed_at":null,"address_id":"add_01h6dtgxk2c816mhkmrr8jybrd","created_at":"2023-07-28T08:40:56.035732Z","invoice_id":null,"updated_at":"2023-07-28T08:40:56.348723991Z","business_id":null,"custom_data":null,"customer_id":"ctm_01gth1txs9q2zwd1agc8rbsjvk","discount_id":null,"currency_code":"GBP","billing_period":null,"invoice_number":null,"billing_details":null,"collection_mode":"automatic","subscription_id":null},"event_id":"evt_01h6dtgy253w20smb653n43ndq","event_type":"transaction.ready","occurred_at":"2023-07-28T08:40:56.645434Z","notification_id":"ntf_01h6dtgy4yrjf6washdtdvd5ef"}'

const signedPayload = `${timestamp}:${fullBodyData}`;

// Calling createHmac method
const hash = crypto.createHmac('sha256', 'pdl_ntfset_01gwjbbdbpqhh0rarvmp8z4tcn_0j79ZoOug7wsXag3HblBd8usJcHV9Xas')
hash.update(signedPayload);
const signature = hash.digest('hex');

// Displays output
console.log(signature);

export default function Customise() {

}