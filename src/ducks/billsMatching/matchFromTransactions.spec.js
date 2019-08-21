import matchFromTransactions from './matchFromTransactions'
import { Bill } from 'models'

jest.mock('./Linker/Linker')

const transactions = [
  { date: '2019-07-01' },
  { date: '2019-07-20' },
  { date: '2019-08-21' }
]

beforeEach(() => {
  jest.spyOn(Bill, 'queryAll').mockImplementation(() => {})
})

it('should fetch the potentials bills', async () => {
  await matchFromTransactions(transactions)

  expect(Bill.queryAll).toHaveBeenCalledWith({
    date: {
      $gt: '2019-06-02',
      $lt: '2019-09-05'
    }
  })
})
