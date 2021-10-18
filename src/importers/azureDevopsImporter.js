import React from "react";
import azureDevopsClient from './azureDevops';

const importer = aha.getImporter("my-new-importer.importer.azureDevopsImporter");

async function authenticate() {
  const authData = await aha.auth("ado", { useCachedRetry: true });
  azureDevopsClient.setToken(authData.token);
}

importer.on({ action: "listFilters" }, async ({}, {identifier, settings}) => {
  await authenticate();
  return {
    organization: {
      title: "Organization",
      required: true,
      type: "text",
    },
  };
});


importer.on({ action: "filterValues" }, async ({ filterName, filters }, {identifier, settings}) => {
  switch (filterName) {
    case "organization":
  }
  return [];
});

importer.on({ action: "listCandidates" }, async ({ filters, nextPage }, {identifier, settings}) => {
  await authenticate();

  const workItemList = await getWorkItems(filters.organization, azureDevopsClient._token);

  if(workItemList == 'nothing') {
    alert('There is no task to show.');
    return { 
      records: [] , 
      nextPage: nextPage 
    };
  }

  if(workItemList){
      const records = workItemList.map((workItem) => ({
        uniqueId: workItem.id,
        name: workItem.fields['System.Title'],
        state: workItem.fields['System.State'],
        url: workItem._links.html.href
      }));
    
      return { 
        records: records , 
        nextPage: nextPage 
      };
  }else{
    alert('The organization that you enter doesn\'t exist.');
    return { 
      records: [] , 
      nextPage: nextPage 
    };
  }
  
});


importer.on({ action: "renderRecord" }, ({ record, onUnmounted }, { identifier, settings }) => {
  onUnmounted(() => {
    console.log("Un-mounting component for", record.identifier);
  });

  return (
    <div>
      <h6>{record.state}</h6>
      <a href={`${record.url}`}>{record.name}</a>
    </div>
  );
  
});


importer.on({ action: "importRecord" }, async ({ importRecord, ahaRecord }, {identifier, settings}) => {
  await authenticate();
  ahaRecord.description =
    `<a href='${importRecord.url}'>View on Azure Devops</a></p>`;
  await ahaRecord.save();
});

class AuthError extends Error {
  constructor(message) {
    super(message);
  }
}

async function getWorkItems(organization, token) {
  let headers = {
    'Authorization': "Bearer " + token,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  const body = {
    "query": "Select  [System.Id], [System.Title], [System.State] From WorkItems"
  };

  let response = await fetch(
    `https://dev.azure.com/${organization}/_apis/wit/wiql?api-version=5.1`,
    {
      method: 'POST',
      headers: headers,
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

  response = await fetch(
    `https://dev.azure.com/${organization}/_apis/wit/workitems?ids=${workitemsIdStr}&$expand=all&api-version=6.0`,
    {
      method: 'GET',
      headers: headers,
    }
  );

  if (!response.ok && response.status === 401) {
    throw new AuthError(response.statusText);
  }

  json = await response.json();

  return json.value;
}
