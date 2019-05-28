import React from 'react'
import Icon from 'cozy-ui/react/Icon'
import cx from 'classnames'

const FileIcon = props => {
  const { className, ...rest } = props

  return <Icon icon="file" className={cx('u-mr-half', className)} {...rest} />
}

export default FileIcon
