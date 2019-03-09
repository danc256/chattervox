import {TNCConnection} from "./TNCConnection";
// import {SocketKISSFrameEndpoint} from 'utils-for-aprs';

export class TNCConnectionTCP implements TNCConnection {
    closeConnection(): void {
    }

    openConnection(receiveDataHandler: any, errorHandler: any): Promise<void> {
        return null;
    }

    sendData(data: Buffer, postSendHandler: any): Promise<void> {
        return null;
    }
}