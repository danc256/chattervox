import KISS_TNC from 'kiss-tnc'

import {TNCConnection} from "./TNCConnection";


export class TNCConnectionSerial implements TNCConnection {
    private readonly port: string;
    private readonly baudrate: number;
    private tnc: any;

    constructor(port: string, baudrate: number) {
        this.port = port;
        this.baudrate = baudrate;
    }

    openConnection(receiveDataHandler: any, errorHandler: any): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.tnc) {
                this.tnc = new KISS_TNC(this.port, this.baudrate);

                this.tnc.on('error', (error: any) => errorHandler(error));
                this.tnc.on('data', (data: any) => receiveDataHandler(data));

                this.tnc.open((err: any) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            } else {
                // Port already open, request automatically succeeds
                resolve();
            }
        })
    }

    closeConnection(): void {
        if (this.tnc) {
            this.tnc.close();
            this.tnc = null
        }
    }

    sendData(data: Buffer, postSendHandler: any): Promise<void> {
        return new Promise((resolve, reject) => {
            this.tnc.send_data(data, (err: Error) => {
                if (err) {
                    reject(err);
                }

                postSendHandler(data);
                resolve()
            });
        });
    }
}