export interface TNCConnection {
    openConnection(receiveDataHandler: any, errorHandler: any): Promise<void>;
    closeConnection(): void;
    sendData(data: Buffer, postSendHandler: any): Promise<void>;
}


