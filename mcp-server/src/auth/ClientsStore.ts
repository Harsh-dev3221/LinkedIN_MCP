import { OAuthClientInformationFull } from "./SessionsStore.js";

export interface OAuthRegisteredClientsStore {
    getClient: (clientId: string) => OAuthClientInformationFull | undefined;
    registerClient: (client: OAuthClientInformationFull) => OAuthClientInformationFull;
}

export class ClientsStore implements OAuthRegisteredClientsStore {
    private _clientsByClientId: Record<string, OAuthClientInformationFull> = {};

    public getClient = (clientId: string) => this._clientsByClientId[clientId];

    public registerClient = (client: OAuthClientInformationFull) => {
        this._clientsByClientId[client.client_id] = client;

        return client;
    };
} 