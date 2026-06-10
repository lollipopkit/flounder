#!/usr/bin/env node
import { loadSource, runSeeders } from "../dist/index.js";

const source = await loadSource(["fixtures/halo2_scalar_mul_binding.rs"]);
const checklist = runSeeders(source);
const bindingItems = checklist.filter((item) => item.seeder === "halo2_advice_binding");

if (bindingItems.length !== 1) {
  throw new Error(`Expected exactly one halo2_advice_binding item, found ${bindingItems.length}`);
}

const body = JSON.stringify(bindingItems[0]);
if (!/missing_constraint/.test(bindingItems[0].failureMode) || !/downstream gates that rely on them/.test(bindingItems[0].securityProperty)) {
  throw new Error("Blind checklist item did not preserve the expected generic missing-constraint invariant.");
}
if (!/scalar\/point dataflow context/.test(body)) {
  throw new Error("Blind checklist item did not explain the generic code shape it found.");
}

console.log("Local seeder checklist coverage check passed.");
