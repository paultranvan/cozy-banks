import logger from 'cozy-logger'
import { getDefaultedSettings, isConfigurationSetting } from './helpers'
import { Document } from 'cozy-doctypes'
import { DOCTYPE } from './constants'
import omit from 'lodash/omit'

const log = logger.namespace('settings-doctype')

class Settings extends Document {
  static async fetchWithDefault() {
    const settingDocuments = await this.fetchAll()
    const settings = settingDocuments.find(
      isConfigurationSetting
    )

    if (!settings) {
      log('info', 'No settings yet, default settings are used')
    }

    return omit(getDefaultedSettings(settings), ['_type'])
  }
}

Settings.doctype = DOCTYPE
Settings.idAttributes = ['_id']

export { Settings }
