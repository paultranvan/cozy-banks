import configureStore from 'store/configureStore'
import differenceInCalendarMonths from 'date-fns/difference_in_calendar_months'
import {
  hydrateTransaction,
  getDate,
  getReimbursedAmount,
  isFullyReimbursed,
  isExpense,
  getReimbursementStatus,
  isReimbursementLate
} from './helpers'
import { BILLS_DOCTYPE } from 'doctypes'

const fakeCozyClient = {
  attachStore: () => {},
  createDocument: (doctype, doc) => {
    doc._type = doctype
    doc.id = doc._id
    return Promise.resolve({ data: [doc] })
  }
}

jest.mock('date-fns/difference_in_calendar_months')

xdescribe('transaction', () => {
  const healthId = '400610'
  const BILL_ID = '1234'
  let store, transaction // , bill
  beforeEach(() => {
    transaction = {
      automaticCategoryId: healthId,
      amount: -10,
      reimbursements: [{ billId: `${BILLS_DOCTYPE}:${BILL_ID}` }]
    }
    // bill = { _id: BILL_ID, invoice: 'io.cozy.files:4567' }
    store = configureStore(fakeCozyClient)
    // store.dispatch(createDocument(BILLS_DOCTYPE, bill))
  })

  describe('reimbursements', () => {
    it('should be hydrated if transaction in health category', () => {
      const transactions = [transaction].map(t =>
        hydrateTransaction(store.getState(), t)
      )
      expect(transactions[0].reimbursements[0].bill).toBeTruthy()
      expect(transactions[0].reimbursements[0].bill._id).toBe(BILL_ID)
    })

    it('should not be hydrated if transaction not in the health category', () => {
      const transactions = [
        { ...transaction, automaticCategoryId: '1000' }
      ].map(t => hydrateTransaction(store.getState(), t))
      expect(transactions[0].reimbursements[0].bill).toBe(undefined)
    })

    it('should not be hydrated if bill does not exist in store', () => {
      const transactions = [
        { ...transaction, reimbursements: [{ billId: undefined }] }
      ].map(t => hydrateTransaction(store.getState(), t))
      expect(transactions[0].reimbursements[0].bill).toBe(undefined)
    })
  })
})

describe('getDate', () => {
  it('should return realisation date if there is one and the linked account is a CreditCard one', () => {
    const transactionCreditCard = {
      realisationDate: '2019-01-28T00:00:00Z',
      date: '2019-01-31T00:00:00Z',
      account: { data: { type: 'CreditCard' } }
    }

    const transactionOther = {
      realisationDate: '2019-01-28T00:00:00Z',
      date: '2019-01-31T00:00:00Z'
    }

    expect(getDate(transactionCreditCard)).toBe('2019-01-28')
    expect(getDate(transactionOther)).toBe('2019-01-31')
  })

  it('should return the date if there is no relation date', () => {
    const transaction = { date: '2019-01-31T00:00:00Z' }

    expect(getDate(transaction)).toBe('2019-01-31')
  })
})

describe('getReimbursedAmount', () => {
  it('should throw if the given transaction is not an expense', () => {
    expect(() => getReimbursedAmount({ amount: 10 })).toThrow()
  })

  it('should return the good reimbursed amount', () => {
    const reimbursedExpense = {
      amount: -10,
      reimbursements: {
        target: {
          reimbursements: [{ amount: 2 }, { amount: 8 }]
        }
      }
    }

    expect(getReimbursedAmount(reimbursedExpense)).toBe(10)
  })
})

describe('isFullyReimbursed', () => {
  it('should return true if the expense is fully reimbursed, false otherwise', () => {
    const reimbursedExpense = {
      amount: -10,
      reimbursements: {
        target: {
          reimbursements: [{ amount: 2 }, { amount: 8 }]
        }
      }
    }

    const expense = { amount: -10 }

    expect(isFullyReimbursed(reimbursedExpense)).toBe(true)
    expect(isFullyReimbursed(expense)).toBe(false)
  })
})

describe('isExpense', () => {
  it('should return true if the transaction amount is lesser than 0', () => {
    const transaction = { amount: -10 }
    expect(isExpense(transaction)).toBe(true)
  })

  it('should return false if the transaction amount is greater than or equals to 0', () => {
    const t1 = { amount: 10 }
    expect(isExpense(t1)).toBe(false)

    const t2 = { amount: 0 }
    expect(isExpense(t2)).toBe(false)
  })
})

describe('getReimbursementStatus', () => {
  describe('General case', () => {
    it("should return the reimbursement status if it's defined", () => {
      const transaction = { reimbursementStatus: 'reimbursed' }
      expect(getReimbursementStatus(transaction)).toBe('reimbursed')
    })

    it("should return no-reimbursement status if it's undefined", () => {
      const transaction = {}
      expect(getReimbursementStatus(transaction)).toBe('no-reimbursement')
    })
  })

  describe('Health expense case', () => {
    it('should return `pending` if the status is undefined and the transaction is not fully reimbursed', () => {
      const t1 = {
        manualCategoryId: '400610',
        amount: -10
      }

      const t2 = {
        manualCategoryId: '400610',
        amount: -10,
        reimbursements: {
          target: {
            reimbursements: [{ amount: 5 }]
          }
        }
      }

      expect(getReimbursementStatus(t1)).toBe('pending')
      expect(getReimbursementStatus(t2)).toBe('pending')
    })

    it('should return `reimbursed` if the status is undefined and the transaction is fully reimbursed', () => {
      const transaction = {
        manualCategoryId: '400610',
        amount: -10,
        reimbursements: {
          target: {
            reimbursements: [{ amount: 10 }]
          }
        }
      }

      expect(getReimbursementStatus(transaction)).toBe('reimbursed')
    })
  })
})

describe('isReimbursementLate', () => {
  it('should return false if the transaction is not an health expense', () => {
    const transaction = {
      manualCategoryId: '400310',
      amount: 10
    }

    expect(isReimbursementLate(transaction)).toBe(false)
  })

  it('should return false if the transaction reimbursement status is not pending', () => {
    const t1 = {
      reimbursementStatus: 'reimbursed',
      manualCategoryId: '400610',
      amount: -10
    }
    const t2 = {
      reimbursementStatus: 'no-reimbursement',
      manualCategoryId: '400610',
      amount: -10
    }

    expect(isReimbursementLate(t1)).toBe(false)
    expect(isReimbursementLate(t2)).toBe(false)
  })

  it('should return false if the transaction reimbursement is pending but for less than one month', () => {
    differenceInCalendarMonths.mockReturnValueOnce(0)
    const transaction = {
      reimbursementStatus: 'pending',
      date: '2019-05-23',
      manualCategoryId: '400610',
      amount: -10
    }

    expect(isReimbursementLate(transaction)).toBe(false)
  })

  it('should return true if the transaction reimbursement is pending for more than one month', () => {
    differenceInCalendarMonths.mockReturnValueOnce(2)
    const transaction = {
      reimbursementStatus: 'pending',
      date: '2018-05-23',
      manualCategoryId: '400610',
      amount: -10
    }

    expect(isReimbursementLate(transaction)).toBe(true)
  })
})
