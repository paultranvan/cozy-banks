import React from 'react'
import { connect } from 'react-redux'
import { getAccountType } from './helpers'
import { TransactionsPageWithBackButton } from 'ducks/transactions'
import LoanDetailsPage from 'ducks/account/LoanDetailsPage'
import { isLoanGroup, isReimbursementsVirtualGroup } from 'ducks/groups/helpers'
import { ACCOUNT_DOCTYPE, GROUP_DOCTYPE } from 'doctypes'
import { ReimbursementsPage } from 'ducks/reimbursements'

const getComponent = filteringDoc => {
  if (filteringDoc._type === ACCOUNT_DOCTYPE) {
    const accountType = getAccountType(filteringDoc)

    if (accountType === 'Loan') {
      return LoanDetailsPage
    } else if (accountType === 'Reimbursements') {
      return ReimbursementsPage
    } else {
      return TransactionsPageWithBackButton
    }
  } else if (filteringDoc._type === GROUP_DOCTYPE) {
    if (isLoanGroup(filteringDoc)) {
      return LoanDetailsPage
    } else if (isReimbursementsVirtualGroup(filteringDoc)) {
      return ReimbursementsPage
    } else {
      return TransactionsPageWithBackButton
    }
  } else {
    return TransactionsPageWithBackButton
  }
}

export const RawAccountDetailsPage = props => {
  const Component = getComponent(props.filteringDoc)
  return <Component {...props} />
}

function mapStateToProps(state) {
  return {
    filteringDoc: state.filters.filteringDoc
  }
}

const AccountDetailsPage = connect(mapStateToProps)(RawAccountDetailsPage)

export default AccountDetailsPage
