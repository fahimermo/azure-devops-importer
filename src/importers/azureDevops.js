class azureDevopsClient {   
    static _token ;

    static setToken = (token) => {
        this._token = token;
    }
}

export default azureDevopsClient;

class AuthError extends Error {
    constructor(message) {
      super(message);
    }
}

function getHeader() {
    return {
        'Authorization': "Bearer " + azureDevopsClient._token,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
}


async function sendGetHttpRequest(endpoint, forWhat) {
    const response = await fetch(
        endpoint,
        {
          method: 'GET',
          headers: getHeader(),
        }
    );

    if (!response.ok && response.status === 401) {
        throw new AuthError(response.statusText);
    }

    const json = await response.json();

    switch(forWhat) {
        case 'userId':
            return json.id;
        case 'organizationInfo':
            const organizationInfo = json.value.map((organization) => ({
                text: organization.accountName,
                value: organization.accountName
            }))
            return organizationInfo;
    }

    return json.value;
}

export async function getOrganizationInfo(){       
    let endPoint = 'https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=6.0';
    let forWhat = 'userId';
    const userId = await sendGetHttpRequest(endPoint, forWhat);

    endPoint = `https://app.vssps.visualstudio.com/_apis/accounts?memberId=${userId}&api-version=5.1`;
    forWhat = 'organizationInfo';
    const result = await sendGetHttpRequest(endPoint, forWhat);

    return result;
}

export async function getWorkItems(organization) {  
    const body = {
      "query": "Select  [System.Id], [System.Title], [System.State] From WorkItems"
    };
  
    let response = await fetch(
      `https://dev.azure.com/${organization}/_apis/wit/wiql?api-version=5.1`,
      {
        method: 'POST',
        headers: getHeader(),
        body:  JSON.stringify(body)
      }
    );
  
    if (!response.ok && response.status === 401) {
      return false;
    }
  
    let json = await response.json();
    if(json.workItems.length === 0) {
      return "nothing";
    }
  
    const workitemsIdStr = json.workItems.map(workitem => workitem.id).join(",");  
    const endPoint = `https://dev.azure.com/${organization}/_apis/wit/workitems?ids=${workitemsIdStr}&$expand=all&api-version=6.0`;
    const result = await sendGetHttpRequest(endPoint, '');    
    return result;
  }

