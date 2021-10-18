class azureDevopsClient {   
    static _token ;

    static setToken = (token) => {
        this._token = token;
    }
}

export default azureDevopsClient;