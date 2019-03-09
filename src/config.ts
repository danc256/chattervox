import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { isCallsignSSID, isCallsign, isSSID } from './utils'
import { Keystore } from './Keystore' 

export enum TNCConnectionType {
    Diagnostic = "Diagnostic",
    KissSerial = "Serial",
    KissNetwork = "Network",
    Test = "Test"
}

export interface Config {
    readonly version: number,
    callsign: string,
    ssid: number,
    keystoreFile: string,
    kissPort: string,
    kissBaud: number,
    feedbackDebounce: number,
    kissHost: string;
    tncConnectionType: TNCConnectionType;
    signingKey?: string,
}

export const defaultChattervoxDir = path.join(os.homedir(), '.chattervox')
export const defaultConfigPath = path.join(defaultChattervoxDir, 'config.json')
export const defaultKeystorePath = path.join(defaultChattervoxDir, 'keystore.json')

export const defaultConfig: Config = {
    version: 3,
    callsign: 'N0CALL',
    ssid: 0,
    keystoreFile: defaultKeystorePath,
    kissPort: '/tmp/kisstnc',
    kissBaud: 9600,
    feedbackDebounce: 20 * 1000,
    kissHost: '127.0.0.1',
    tncConnectionType: TNCConnectionType.KissSerial
}

/** Save a config file as JSON
 * @function save
 * @param  {Config} config
 * @param  {string} configPath?
 * @returns void
 */
export function save(config: Config, configPath?: string): void {
    validate(config)
    const path = typeof configPath === 'string' ? configPath : defaultConfigPath
    fs.writeFileSync(path, JSON.stringify(config, null, 4))
}

/** Load a config file
 * @function load
 * @param  {string} configPath?
 * @returns Config
 */
export function load(configPath?: string): Config {
    const path = typeof configPath === 'string' ? configPath : defaultConfigPath
    const conf: Config = JSON.parse(fs.readFileSync(path).toString('utf8'))
    if (migrate(conf)) save(conf, configPath)
    validate(conf)
    return conf
}

/**
 * Update an older config to a newer one. Transforms the config object in place.
 * @function migrate
 * @param {Config} config
 * @returns boolean True if the config was changed
 */
export function migrate(config: Config): boolean {
    let changed = false
    // this change was made in config v3
    if (typeof config.feedbackDebounce === 'undefined') {
        config.feedbackDebounce = defaultConfig.feedbackDebounce
        changed = true
    }
    return changed
}

/** Check if the config file (or any file) exists
 * @function exists
 * @param  {string} configPath?
 * @returns boolean
 */
export function exists(configPath?: string): boolean {
    const path = typeof configPath === 'string' ? configPath : defaultConfigPath
    return fs.existsSync(path)
}

/**
 * @function validate
 * @param config 
 * @throws TypeError
 */
export function validate(config: Config): void {
    
    if (typeof config !== 'object') {
        throw TypeError('config is not an object')
    } else if (typeof config.version !== 'number') {
        throw TypeError('version must be a number type')
    } else if (typeof config.callsign !== 'string') {
        throw TypeError('callsign must be a string type')
    } else if (isCallsignSSID(config.callsign)) {
        throw TypeError('callsign must be a valid callsign excluding an SSID')
    } else if (!isCallsign(config.callsign)) {
        throw TypeError('callsign must be a valid callsign')
    } else if (!isSSID(config.ssid)) {
        throw TypeError('ssid must be a number between 0 and 15')
    } else if (typeof config.kissPort !== 'string') {
        throw TypeError('kissPort must be a string type')
    } else if (typeof config.kissBaud !== 'number') {
        throw TypeError('kissBaud must be a number type')
    } else if (typeof config.keystoreFile !== 'string') {
        throw TypeError('keystoreFile must be a string type')
    } else if (typeof config.signingKey !== 'undefined' 
          && config.signingKey !== null
          && typeof config.signingKey !== 'string') {
        throw TypeError('signingKey must be a string or null if it is defined')
    } else if (config.feedbackDebounce !== null
               && typeof config.feedbackDebounce !== 'number') {
        throw TypeError('feedbackDebounce must be a number or null')
    }
}

/**
 * Create new chattervox directory, config file, and keystore ONLY if they do
 * not already exist.
 * @function init
 */
export function init(): void {

    if (!fs.existsSync(defaultChattervoxDir)) {
        fs.mkdirSync(defaultChattervoxDir)
    }

    if (!exists(defaultConfigPath)) {
        save(defaultConfig)
    }

    if (!exists(defaultKeystorePath)) {
        // simply creating a new keystore object with save the store
        new Keystore(defaultKeystorePath)
    }
}
