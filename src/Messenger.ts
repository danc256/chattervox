import {EventEmitter} from 'events'
import {Keystore} from './Keystore.js'
import {Packet, Station} from './Packet.js'
import {Config} from './config.js'
import {callsignSSIDToStation, md5, timeout} from './utils.js'
import {TNCConnectionFactory} from "./tnc/TNCConnectionFactory";
import {TNCConnection} from "./tnc/TNCConnection";

export interface MessageEvent {
    to: Station
    from: Station
    message: string
    verification: Verification,
    ax25Buffer?: Buffer
}

export enum Verification {
    NotSigned,
    KeyNotFound,
    Valid,
    Invalid
}

export class Messenger extends EventEmitter {
    private ks: Keystore
    private config: Config
    private recentlySent = new Map<string, number>()
    private tncConnection: TNCConnection;

    constructor(config: Config) {
        super()
        this.config = config
        this.ks = new Keystore(this.config.keystoreFile)
        if (this.ks.getKeyPairs(config.callsign).length === 0) {
            this.ks.genKeyPair(config.callsign)
        }

        // Build instance of TNC communication handler
        this.tncConnection = TNCConnectionFactory.createTNCConnection(config);
    }

    openTNC(): Promise<void> {
        return this.tncConnection.openConnection(
            (data: Buffer) => {this._onAX25DataRecieved(data)},
            (error: any) => { this.emit('tnc-error', error)}
            );
    }

    closeTNC(): void {
        this.tncConnection.closeConnection();
    }

    async send(to: string | Station, message: string, sign: boolean) {
        if (typeof to === 'string') to = callsignSSIDToStation(to)
        const from: Station = { callsign: this.config.callsign, ssid: this.config.ssid }

        let signature: Buffer = null
        if (sign) {
            if (this.config.signingKey) {
                const privates = this.ks.getKeyPairs(this.config.callsign)
                                        .filter(key => key.public === this.config.signingKey)
                                        .map(key => key.private)
                if (privates.length > 0) {
                    signature = this.ks.sign(message, privates[0])
                } else {
                    throw Error('No signing key was found in the keystore. Make sure your config.signingKey is in your keystore.')
                }
            } else {
                throw Error(`sign is ${sign} but config.signingKey "${this.config.signingKey}" is not in keystore.`)
            }
        }

        const packet: Buffer = await Packet.ToAX25Packet(from, to, message, signature)
        // if (this.tnc == null) throw Error('Error sending message with send(). The Messenger\'s TNC object is null. Are you sure it is connected?')

        return this.tncConnection.sendData(packet, this._handlePostSend.bind(this));
    }

    private _handlePostSend(data: Buffer): void {
        if (this.config.feedbackDebounce) {
            this._addToRecentlySent(data, this.config.feedbackDebounce)
        }
    }

    private async _onAX25DataRecieved(data: any): Promise<void> {

        let packet: Packet
        try  {
            packet = await Packet.FromAX25Packet(data.data)
        } catch (err) {
            if (err.name == 'InvalidPacket') {
                // console.log('Received invalid packet, skipping')
                return
            } else throw err
        }

        if (this.config.feedbackDebounce && this._wasRecentlySent(data.data)) {
            // console.error('[verbose] received recently sent message, aborting received event.')
            return
        }

        let verification = Verification.NotSigned
        if (packet.signature) {
            // if we don't have a public key from that callsign
            if (this.ks.getPublicKeys(packet.from.callsign).length === 0) {
                verification = Verification.KeyNotFound
            } else {
                const verified = this.ks.verify(packet.from.callsign, packet.message, packet.signature)
                if (verified) verification = Verification.Valid
                else verification = Verification.Invalid
            }
        }

        const event: MessageEvent = {
            to: { callsign: packet.to.callsign.trim(), ssid: packet.to.ssid },
            from: { callsign: packet.from.callsign.trim(), ssid: packet.from.ssid },
            message: packet.message,
            verification,
            ax25Buffer: data.data
        }

        this.emit('message', event)
    }

    private _addToRecentlySent(buffer: Buffer, expiresIn: number): void {
        // MD5 is weak, but it doesn't matter here because we aren't using it
        // for anything sensitive. Here we like speed ;)
        const fingerprint = md5(buffer)
        if (!this.recentlySent.has(fingerprint)) {
            this.recentlySent.set(fingerprint, 1)
        } else {
            let count = this.recentlySent.get(fingerprint)
            this.recentlySent.set(fingerprint, count + 1)
        }
        timeout(expiresIn).then(() => {
            const count = this.recentlySent.get(fingerprint)
            if (count == 1) this.recentlySent.delete(fingerprint)
            else this.recentlySent.set(fingerprint, count - 1)
        })
    }

    private _wasRecentlySent(buffer: Buffer): boolean {
        // MD5 is weak, but it doesn't matter here because we aren't using it
        // for anything sensitive. Here we like speed ;)
        const fingerprint = md5(buffer)
        return this.recentlySent.has(fingerprint)
    }
}
