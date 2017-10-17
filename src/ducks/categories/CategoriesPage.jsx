import React, { Component } from 'react'
import { withRouter } from 'react-router'
import { connect } from 'react-redux'
import { translate } from 'cozy-ui/react/I18n'
import Loading from 'components/Loading'
import { TopbarTitle } from 'ducks/commons/Topbar'
import { getFilteredTransactions } from 'ducks/filters'
import { fetchTransactions } from 'actions'
import { transactionsByCategory, computeCategorieData } from './helpers'
import Categories from './Categories'
import BackButton from 'components/BackButton'
import styles from './CategoriesPage.styl'
import { flowRight as compose } from 'lodash'
import { cozyConnect } from 'cozy-client'

class CategoriesPage extends Component {
  state = {
    withIncome: true
  }

  selectCategory = selectedCategory => {
    if (selectedCategory) {
      this.props.router.push(`/categories/${selectedCategory}`)
    } else {
      this.props.router.push('/categories')
    }
  }

  filterWithInCome = withIncome => {
    this.setState({withIncome})
  }

  render ({t, categories, transactions, router}, {withIncome}) {
    const isFetching = transactions.fetchStatus !== 'loaded'
    const selectedCategory = router.params.categoryName
    // compute the filter to use
    if (!withIncome) {
      categories = categories.filter(category => (category.name !== 'incomeCat'))
    }
    return (
      <div className={styles['bnk-cat-page']}>
        <TopbarTitle>
          <h2>{t('Categories.title.general')}</h2>
        </TopbarTitle>
        {selectedCategory && <BackButton onClick={() => this.selectCategory(undefined)} />}
        {isFetching
          ? <Loading loadingType='categories' />
          : <Categories categories={categories}
            selectedCategory={selectedCategory} selectCategory={this.selectCategory}
            withIncome={withIncome} filterWithInCome={this.filterWithInCome} />}
      </div>
    )
  }
}

const mapStateToProps = state => ({
  categories: computeCategorieData(transactionsByCategory(getFilteredTransactions(state)))
})

const mapDocumentsToProps = ownProps => ({
  transactions: fetchTransactions(ownProps.dispatch)
})

export default compose(
  withRouter,
  connect(mapStateToProps),
  cozyConnect(mapDocumentsToProps),
  translate()
)(CategoriesPage)
