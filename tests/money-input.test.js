import test from 'node:test'
import assert from 'node:assert/strict'
import { formatMoneyInput, parseMoneyInput, moneyInputError } from '../src/utils/moneyInput.js'

test('money display and API strings retain decimal precision', () => {
  for (const [value, display] of [['1000', '1.000'], ['100000', '100.000'], ['1000000', '1.000.000'], ['1000.50', '1.000,50'], ['9999999999999.99', '9.999.999.999.999,99'], ['', '']]) {
    assert.equal(formatMoneyInput(value), display)
    assert.equal(parseMoneyInput(display), value)
  }
})

test('money validation enforces required, decimal precision and exact bounds', () => {
  for (const value of ['', '-1', 'abc', '1.001', '1.2.3', '10000000000000', '0', '1.']) {
    assert.notEqual(moneyInputError(value, '0.01'), '')
  }
  for (const value of ['0.01', '1000.50', '9999999999999.99']) assert.equal(moneyInputError(value, '0.01'), '')
  assert.equal(moneyInputError('0', '0'), '')
})
