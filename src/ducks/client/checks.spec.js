import StartupChecksPlugin from './checks'
import CozyClient from 'cozy-client'
import merge from 'lodash/merge'

const sleep = delay => new Promise(resolve => setTimeout(resolve, delay))

describe('startup checks', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })
  const setup = async ({ loggedIn = false, existingTriggers = [] } = {}) => {
    const clientOpts = loggedIn
      ? {
          uri: 'https://test.mycozy.cloud',
          token: '1234'
        }
      : {}
    let client = new CozyClient(clientOpts)
    const launch = jest.fn()
    client.collection = () => ({
      launch
    })
    client.query = () => ({
      data: existingTriggers
    })
    client.registerPlugin(StartupChecksPlugin, {
      launchTriggers: [
        {
          slug: 'banks',
          name: 'autogroups',
          type: '@event',
          policy: 'never-executed'
        }
      ]
    })
    if (loggedIn) {
      await client.loginPromise
    }
    jest.spyOn(client.plugins.startupChecks, 'doChecks')
    return {
      client,
      plugin: client.plugins.startupChecks,
      launch
    }
  }

  const triggers = [
    { id: '1' },
    {
      id: '1234',
      attributes: {
        type: '@event',
        message: {
          slug: 'banks',
          name: 'autogroups'
        }
      }
    }
  ]

  it('should call check on login ', async () => {
    const { plugin, client } = await setup()
    expect(plugin.doChecks).not.toHaveBeenCalled()
    client.emit('login')
    expect(plugin.doChecks).toHaveBeenCalled()
  })

  it('should create autogroups job if trigger exists and has not been executed yet', async () => {
    const { client, launch } = await setup({
      existingTriggers: triggers
    })
    client.emit('login')
    await sleep(0)
    expect(launch).toHaveBeenCalled()
  })

  it('should not create autogroups job if trigger does not exist', async () => {
    const { client, launch } = await setup({
      loggedIn: true,
      existingTriggers: triggers.slice(0, 1)
    })
    client.emit('login')
    await sleep(0)
    expect(launch).not.toHaveBeenCalled()
  })

  it('should not create autogroups job if trigger has been executed', async () => {
    const { client, launch } = await setup({
      existingTriggers: [
        triggers[0],
        merge(triggers[1], {
          attributes: { last_execution: '2019-10-31T00:00' }
        })
      ]
    })
    client.emit('login')
    await sleep(0)
    expect(launch).not.toHaveBeenCalled()
  })
})
