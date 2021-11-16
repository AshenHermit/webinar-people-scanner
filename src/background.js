importScripts("exportable.js");
importScripts("storage.js");
importScripts("remote_api.js");

class BGRemoteApi extends RemoteApi{
    constructor(api_server){
        super(api_server)
        this.setup()
    }

    async setup(){
        var config = await readConfigFromStorage();
        this.apiServer = config.api_server
        this.auth(config.token)
        this.setupListeners()
    }

    anyDataToJSON(data){
        if(typeof data == "object"){
            if("exportData" in data) data = data.exportData()
        }
        return JSON.stringify(data)
    }

    setupListeners(){
        chrome.runtime.onMessageExternal.addListener(
            async (request, sender, sendResponse)=>{
                var result = {}
                try{
                    //TODO: reusing code ?
                    if (request.action == "fetch"){
                        var args = Object.values(request.kwargs)
                        var data
                        if(request.method=="GET") 
                            data = await this.makeGetRequest(...args)
                        if(request.method=="POST") 
                            data = await this.makePostRequest(...args)
                        result.data = data
                    }else
                    if (request.action == "executeMethod"){
                        var args = JSON.parse(request.args)
                        var data = await this[request.method](...args)
                        result.json = this.anyDataToJSON(data)
                    }
                }catch(e){
                    console.error(e)
                    result.error = e.toString()
                }
                sendResponse(result)
                return true
            }
        )
    }
}

function setGlobalConfig(config, appId){
    window.people_scanner_api_config = config;
    window.people_scanner_app_id = appId;
}

async function executeScannerScripts(tabId){
    var appInfo = await chrome.management.getSelf();
    var config = await readConfigFromStorage();

    var results = await chrome.scripting.executeScript({
        target: {tabId: tabId, allFrames: true},
        func: setGlobalConfig,
        world: "MAIN",
        args: [config, appInfo.id],
    });

    var results = await chrome.scripting.executeScript({
        target: {tabId: tabId, allFrames: true},
        world: "MAIN",
        files: ["src/exportable.js", "src/remote_api.js", "src/setup_deamon.js", "src/people_scanner.js", "src/run_scanner.js"],
    });
}

function addTabHandler(){
    const webinarFilter = {
        url: [
            {
                urlMatches: 'https://events.webinar.ru/*',
            },
            {
                urlMatches: 'https://www.google.com/*',
            },
        ],
    };
    chrome.webNavigation.onCompleted.addListener((details) => {
        executeScannerScripts(details.tabId);
    }, webinarFilter);
}

addTabHandler();
var remoteApi = new BGRemoteApi()