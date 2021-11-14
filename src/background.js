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
        this.api_server = config.api_server
        this.auth(config.token)
        this.setupListeners()
    }

    setupListeners(){
        chrome.runtime.onMessageExternal.addListener(
            async (request, sender, sendResponse)=>{
                console.log(request)
                var result = {}
                try{
                    if (request.action == "executeMethod"){
                        var args = JSON.parse(request.args)
                        var data = await this[request.method](...args)
                        result.json = JSON.stringify(data.exportData())
                    }
                }catch(e){
                    result.error = e.toString()
                }
                sendResponse(JSON.stringify(result))
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
    console.log(config)

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
        ],
    };
    chrome.webNavigation.onCompleted.addListener((details) => {
        executeScannerScripts(details.tabId);
    }, webinarFilter);
}

addTabHandler();
var remoteApi = new BGRemoteApi()