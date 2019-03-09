import {TNCConnection} from "./TNCConnection";
import {Packet, Station} from "../Packet";

export class TNCConnectionTest implements TNCConnection {
    // @ts-ignore
    private receiveDataHandler: any;
    // @ts-ignore
    private errorHandler: any;

    closeConnection(): void {
        console.log('Closing test TNC connection')
    }

    openConnection(receiveDataHandler: any, errorHandler: any): Promise<void> {
        this.receiveDataHandler = receiveDataHandler;
        this.errorHandler = errorHandler;

        return new Promise((resolve, reject) => {
            // Nobody likes empty promises
            resolve();
        });
    }

    sendData(data: Buffer, postSendHandler: any): Promise<void> {
        return new Promise((resolve, reject) => {
            (Packet.FromAX25Packet(data)).then((sentMessage) => {
                console.log(`\n--- Sending test data: ${sentMessage.message}`);

                postSendHandler(data);

                const from: Station = {callsign: 'LOOPBK', ssid: 0};
                Packet.ToAX25Packet(from, sentMessage.to, sentMessage.message, null).then((receivedMessage) => {
                    const echoPacket: any = {
                        data: receivedMessage
                    };

                    setTimeout((echodata) => {
                        this.receiveDataHandler(echodata);
                    }, 2000, echoPacket);

                    resolve();
                });
            });
        });
    }
}