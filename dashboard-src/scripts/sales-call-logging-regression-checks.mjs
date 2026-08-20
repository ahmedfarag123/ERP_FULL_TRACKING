import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  customerCard: path.join(root, "sales_team", "components", "customers", "CustomerCard.tsx"),
  callPage: path.join(root, "sales_team", "components", "calls", "CustomerCallPage.tsx"),
  service: path.join(root, "sales_team", "lib", "customerCallActivity.ts"),
};

function readExisting(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${path.relative(root, filePath)}`);
  }

  return fs.readFileSync(filePath, "utf8");
}

function assertIncludes(source, pattern, label) {
  if (!source.includes(pattern)) {
    throw new Error(`Expected ${label} to include "${pattern}".`);
  }
}

const customerCard = readExisting(files.customerCard);
const callPage = readExisting(files.callPage);
const service = readExisting(files.service);

assertIncludes(customerCard, "CustomerCallPage", "customer card call logging wiring");
assertIncludes(customerCard, "selectedCallCustomer", "customer card selected customer state");
assertIncludes(customerCard, "useAuthStore", "customer card authenticated actor lookup");

assertIncludes(callPage, "saveCustomerCallActivity", "call logging form submit");
assertIncludes(callPage, "CALL_REASON_OPTIONS", "call logging reason select");
assertIncludes(callPage, "CUSTOMER_RESPONSE_OPTIONS", "call logging response select");
assertIncludes(callPage, "CALL_OUTCOME_OPTIONS", "call logging outcome select");
assertIncludes(callPage, "NEXT_ACTION_OPTIONS", "call logging next action select");
assertIncludes(callPage, "callbackRequired", "call logging callback validation");
assertIncludes(callPage, "requiresUrgentAction", "urgent follow-up capture");
for (const flag of [
  "showCallReason",
  "showCustomerResponse",
  "showCallOutcome",
  "showNextAction",
  "showFinalDetails",
]) {
  assertIncludes(callPage, flag, "progressive call form visibility");
}

for (const handler of [
  "handleCustomerProfilesChange",
  "handleCallReasonChange",
  "handleCustomerResponseChange",
  "handleCallOutcomeChange",
  "handleNextActionChange",
]) {
  assertIncludes(callPage, handler, "progressive call form reset handling");
}

for (const field of [
  "call_reason",
  "customer_response",
  "call_outcome",
  "next_action",
  "callback_at",
  "requires_urgent_action",
  "raw_form_payload",
]) {
  assertIncludes(service, field, "sales call activity persistence");
}

assertIncludes(service, "customer_interactions", "customer interaction timeline write");
assertIncludes(service, "parseDurationMinutesToSeconds", "duration parsing helper");

console.log("Sales call logging regression checks passed.");
