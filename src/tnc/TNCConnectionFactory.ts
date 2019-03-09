import {Config, TNCConnectionType} from "../config";
import {TNCConnection} from "./TNCConnection";
import {TNCConnectionSerial} from "./TNCConnectionSerial";
import {TNCConnectionTest} from "./TNCConnectionTest";

export class TNCConnectionFactory {
    public static createTNCConnection(config: Config): TNCConnection {
        // TODO Extend configuration to add connection type. Assume serial if not specified
        switch (config.tncConnectionType) {
            case TNCConnectionType.Diagnostic: {
                throw new Error(`Unsupported connection type: ${config.tncConnectionType}`)
            }

            case TNCConnectionType.KissSerial: {
                return TNCConnectionFactory._initializeSerialConnection(config);
            }

            case TNCConnectionType.KissNetwork: {
                throw new Error(`Unsupported connection type: ${config.tncConnectionType}`)
            }

            case TNCConnectionType.Test: {
                return new TNCConnectionTest();
            }

            default: {
                // Assume serial if connection type not specified for backward compatibility
                return TNCConnectionFactory._initializeSerialConnection(config);
            }
        }
    }

    private static _initializeSerialConnection(config: Config): TNCConnectionSerial {
        // Configuration is centrally validated on load and save so we can assume good data
        return new TNCConnectionSerial(config.kissPort, config.kissBaud);
    }
}