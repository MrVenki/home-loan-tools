import test from 'node:test';
import assert from 'node:assert/strict';
import { emi, balanceAfter, summary, loanForEmi, lakhLabel, inr } from '../src/math.js';

test('EMI matches the standard formula', () => {
  assert.ok(Math.abs(emi(5_000_000, 8.5, 20) - 43391) < 1);
  assert.ok(Math.abs(emi(1_200_000, 0, 10) - 10000) < 1e-9);
});

test('balance is the principal at the start and zero at the end', () => {
  assert.ok(Math.abs(balanceAfter(5_000_000, 8.5, 20, 0) - 5_000_000) < 1e-6);
  assert.ok(Math.abs(balanceAfter(5_000_000, 8.5, 20, 240)) < 1);
});

test('summary totals are consistent', () => {
  const s = summary(5_000_000, 8.5, 20);
  assert.ok(Math.abs(s.total - s.emi * 240) < 1e-6);
  assert.ok(Math.abs(s.interest - (s.total - 5_000_000)) < 1e-6);
});

test('loanForEmi inverts emi', () => {
  const e = emi(3_000_000, 9, 15);
  assert.ok(Math.abs(loanForEmi(e, 9, 15) - 3_000_000) < 1);
});

test('formatting uses Indian grouping and lakh/crore', () => {
  assert.equal(inr(4339100), '₹43,39,100');
  assert.equal(lakhLabel(50), '₹50 lakh');
  assert.equal(lakhLabel(150), '₹1.5 crore');
});
