import { groupBy, sortBy, deburr, sumBy, get } from 'lodash'
import { ACCOUNT_DOCTYPE, GROUP_DOCTYPE } from 'doctypes'
import { associateDocuments } from 'ducks/client/utils'
import { getAccountType, getAccountBalance } from 'ducks/account/helpers'
import flag from 'cozy-flags'

export const getGroupLabel = (group, t) => {
  if (group.virtual) {
    return (
      t(`Data.accountTypes.${group.label}`, { _: 'other' }) +
      (flag('debug-groups') ? ' (virtual)' : '')
    )
  } else if (isAutoGroup(group) && !isFormerAutoGroup(group)) {
    return (
      t(`Data.accountTypes.${group.accountType}`) +
      (flag('debug-groups') ? ' (auto)' : '')
    )
  } else {
    return group.label
  }
}

export const buildAutoGroup = (accountType, accounts, options = {}) => {
  const { virtual = true, client = null } = options

  const group = {
    _type: GROUP_DOCTYPE,
    label: accountType,
    accountType: accountType
  }

  if (virtual) {
    group.virtual = true
    group._id = accountType
  }

  associateDocuments(group, 'accounts', ACCOUNT_DOCTYPE, accounts)

  if (client) {
    group.accounts = accounts.map(x => x._id)
    return client.hydrateDocument(group)
  } else {
    associateDocuments(group, 'accounts', ACCOUNT_DOCTYPE, accounts)
    return group
  }
}

export const buildAutoGroups = (accounts, options) => {
  const accountsByType = groupBy(accounts, getAccountType)

  const virtualGroups = Object.entries(accountsByType).map(
    ([accountType, accounts]) => buildAutoGroup(accountType, accounts, options)
  )

  return virtualGroups
}

/**
 * Returns a function that returns the translated label of a group
 *
 * @param {Object} group - Group
 * @param {Function} translate - Translation function
 * @returns {Object} Translated label
 */

const isOtherVirtualGroup = group => group.virtual && group.label === 'Other'

export const isReimbursementsVirtualGroup = group =>
  group.virtual && group._id === 'Reimbursements'

const getCategory = group => {
  if (isReimbursementsVirtualGroup(group)) {
    return 'virtualReimbursements'
  } else if (isOtherVirtualGroup(group)) {
    return 'virtualOther'
  } else {
    return 'normal'
  }
}

/**
 * If obj[name] is a function, invokes it with this binded to obj and with args
 * Otherwise, returns obj[name]
 *
 * Similar to lodash's result but supports args
 */
const result = (obj, name, args) => {
  const v = obj[name]
  if (typeof v === 'function') {
    return v.apply(obj, args)
  } else {
    return v
  }
}

const groupSortingPriorities = {
  normal: 0,
  virtualOther: 1,
  virtualReimbursements: group => {
    const balance = getGroupBalance(group)
    if (flag('demo') || flag('balance.reimbursements-top-position')) {
      // Must be first if we have reimbursements waiting
      return balance > 0 ? -1 : 2
    } else {
      return 2
    }
  }
}
const getGroupPriority = wrappedGroup =>
  result(groupSortingPriorities, wrappedGroup.category, [wrappedGroup.group])

/**
 * Translate groups labels then sort them on their translated label. But always put "others accounts" last
 * @param {Object[]} groups - The groups to sort
 * @param {Function} translate - The translation function
 * @returns {Object[]} The sorted wrapped groups ({ category, label, group })
 */
export const translateAndSortGroups = (groups, translate) => {
  // Wrap groups to add necessary information for sorting
  const wrappedGroups = groups.map(group => ({
    group,
    category: getCategory(group),
    label: getGroupLabel(group, translate)
  }))

  return sortBy(wrappedGroups, wrappedGroup => [
    getGroupPriority(wrappedGroup),
    deburr(wrappedGroup.label).toLowerCase()
  ])
}

export const renamedGroup = (group, label) => {
  const updatedGroup = {
    ...group,
    label
  }

  if (group.accountType) {
    // As soon as the account is renamed it loses its accountType
    updatedGroup.accountType = null
  }

  return updatedGroup
}

// For automatically created groups, the `accountType` attribute is present.
export const isFormerAutoGroup = group => group.accountType === null
export const isAutoGroup = group => group.accountType !== undefined
export const getGroupAccountType = group => group.accountType

export const isLoanGroup = group => {
  for (const account of group.accounts.data) {
    if (getAccountType(account) !== 'Loan') {
      return false
    }
  }

  return true
}

/**
 * Returns a group balance (all its accounts balance sumed)
 * @param {Object} group
 * @param {string[]} excludedAccountIds - Account ids that should be exclude from the sum
 * @returns {number}
 */
export const getGroupBalance = (group, excludedAccountIds = []) => {
  const accounts = get(group, 'accounts.data')

  if (!accounts) {
    return 0
  }

  const accountsToSum = accounts
    .filter(Boolean)
    .filter(account => !excludedAccountIds.includes(account._id))

  return sumBy(accountsToSum, getAccountBalance)
}
