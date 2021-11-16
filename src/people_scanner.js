var tabContentClassName = "StreamPeople__tabContent___ZQ7G6"
var streamPeopleTabClassName = "StreamPeople__tab___EWMh4"

/**@type {Config} */
var globalConfig = window.people_scanner_api_config
var globalAppId = window.people_scanner_app_id

class ClientRemoteApi extends RemoteApi{
    constructor(api_server, extension_id){
        super(api_server)
        this.extension_id = extension_id
    }

    //TODO: reusing code, difenitely
    
    async makeBgFetchRequest(method="GET", kwargs){
        return new Promise((resolve, reject)=>{
            chrome.runtime.sendMessage(
                this.extension_id, {action: "fetch", method: method, kwargs: kwargs}, {},
                function(response) {
                    if(!response || response.error){
                        reject(response)
                        return
                    }
                    resolve(response.data)
                    return
                }
            )
        })
    }
    
    async makeGetRequest(url){
        return await this.makeBgFetchRequest("GET", {url:url})
    }
    
    async makePostRequest(url, data, postData={}){
        return await this.makeBgFetchRequest("POST", {url:url, data:data, postData:postData})
    }
}

class PeopleScanner{
    constructor(){
        this.api = new ClientRemoteApi(globalConfig.api_server, globalAppId)

        /**@type {PeopleLibrary} */
        this.groupMembers = []
        /**@type {ScanResult} */
        this.prevScanResult = new ScanResult()

        this.dataChangeCallbacks = []
    }

    async setup(){
        var success = this.api.auth(globalConfig.token)
        try{
            this.groupMembers = await this.api.getGroupMembers()
        }catch(e){

        }
    }

    async fetchPeopleList(){
        return new Promise((resolve, reject)=>{
            var content = document.getElementsByClassName(tabContentClassName)[0]
            var peopleList = content.children[0].children[1].children[1].children[0].children[0]
            var scanInterval = 0
            var people = {}
            
            function scanPeople(){
                Array.from(peopleList.children).forEach(personEl=>{
                    people[personEl.innerText] = personEl.innerText
                })
            }

            content.scrollTo(0,0)
            scanPeople()
            scanInterval = setInterval(()=>{
                scanPeople()
                //stop if scrolled to bottom
                if(content.scrollTop+content.clientHeight+1 >= content.scrollHeight){
                    clearInterval(scanInterval)
                    resolve(Object.values(people))
                }
                content.scrollBy(0, content.clientHeight/2)
            }, 10)
        })
    }

    webinarNameToNorimalized(personName){
        personName = personName.split("\n")[0]
        var personNameParts = personName.split(" ")
        var name = personNameParts[0]
        var surname = personNameParts[personNameParts.length-1]
        var normalizedName = `${surname} ${name}`
        return normalizedName
    }

    async scanPeople() {
        var peopleList = await this.fetchPeopleList()

        var result = new ScanResult()

        result.presentList = peopleList
            .map(this.webinarNameToNorimalized)
            .map(Person.justifyName)
            .filter(x=>this.groupMembers.hasPerson(x))
            .sort()
            .map(this.groupMembers.getPersonByName.bind(this.groupMembers))

        result.absentList = this.groupMembers.people
            .filter(x=>result.presentList.indexOf(x)==-1)

        result.addedItemsList = result.presentList
            .filter(x=>this.prevScanResult.presentList.indexOf(x)==-1)

        result.removedItemsList = this.prevScanResult.presentList
            .filter(x=>result.presentList.indexOf(x)==-1)

        
        this.prevScanResult = result

        this.api.sendScanResult(result).then(()=>{
            this.callDataChangeCb()
        })

        return result
    }

    callDataChangeCb(){
        this.dataChangeCallbacks.forEach(x=>x())
    }

    async notifyUsers(){
        this.api.notifyUsers()
    }
}

class PeopleScannerControls{
    constructor(instancePath, uiContainer){
        this.instancePath = instancePath
        this.uiContainer = uiContainer
        /**@type {PeopleScanner} */
        this.scanner = new PeopleScanner()
        /**@type {ScanResult} */
        this.scanResult = new ScanResult()

        this.scanner.dataChangeCallbacks.push(this.updateUI.bind(this))
    }

    emptyOrText(text){
        if(text.trim().length==0) return '<div style="opacity: 0.3;">-пусто-</div>'
        else return text
    }

    renderButtonStyles(){
        return `width:100%; border: 0; padding: 0.5em; margin-bottom: 5px;`
    }

    /**
     * @param {Array<Person>} people 
     * @returns {String}
     */
    generateVkIdsList(people){
        if(!people) return ""
        people = people.filter(x=>x.vk_id)
        if(people.length==0) return ""
        if(people.length==0) return ""
        return `<textarea rows=1 style="border:0; width:100%; opacity:0.7; font-size:0.6em; margin-bottom: 8px;">${
            people.map(x=>"@id"+x.vk_id).join(", ")
        }</textarea>`
    }

    renderNotifyButton(){
        if(this.scanner.api.lastScanId && this.scanner.prevScanResult.absentList.length>0){
            return `<button class="wps-button" style="${this.renderButtonStyles()} font-size: 0.9em;" onclick='${this.instancePath}.notifyUsers();'>Уведомить отсутствующих</button>`
        }else{
            return ''
        }
    }

    renderLists(){
        if(this.scanner.api.lastScanId){
            return `
                <h3>Список присутствующих [${this.scanResult.presentList.length}]</h3>
                ${this.generateVkIdsList(this.scanResult.presentList)}
                <div>${this.emptyOrText(this.scanResult.presentList.map(x=>x.name).join("<br/>"))}</div>

                <br/>
                <h3>Список отсутствующих [${this.scanResult.absentList.length}]</h3>
                ${this.generateVkIdsList(this.scanResult.absentList)}
                <div>${this.emptyOrText(this.scanResult.absentList.map(x=>x.name).join("<br/>"))}</div>

                <br/>
                <br/>
                <h3>Пришли [${this.scanResult.addedItemsList.length}]<br/><span style="opacity: 0.5; font-size: 0.8em;">(c момента последнего сканирования)</span></h3>
                <div>${this.emptyOrText(this.scanResult.addedItemsList.map(x=>x.name).map(x=>"+ "+x).join("<br/>"))}</div>
                <br/>
                <h3>Ушли [${this.scanResult.removedItemsList.length}]</h3>
                <div>${this.emptyOrText(this.scanResult.removedItemsList.map(x=>x.name).map(x=>"- "+x).join("<br/>"))}</div>
            `
        }else{
            return ''
        }
    }

    getOptionsLink(text){
        // chrome only, need to port extension on other browsers sometime
        var url = `chrome-extension://${globalAppId}/src/options/options.html`
        return `<a href="${url}" target="_blank">${text}</a>`
    }

    renderNoTokenError(){
        return `
            <div>Не указан токен доступа к данным. Пожалуйста, перейдите в ${this.getOptionsLink("настройки")} и заполните необходимые поля.</div>
        `
    }
    renderInvalidTokenError(){
        return `
            <div>Имеющийся токен не действителен. Чтобы решить эту проблему, вы можете сгенерировать новый токен по ссылке в ${this.getOptionsLink("настройках")} и ввести новый токен.</div>
        `
    }
    renderInterface(){
        return `
            <button class="wps-button" style="${this.renderButtonStyles()}" onclick='${this.instancePath}.scanPeople();'>Сканировать</button>
            ${this.renderNotifyButton()}
            <br/><br/>
                ${this.renderLists()}
            <br/>
        `
    }

    renderStyes(){
        return `
        <style>
        button.wps-button{
            border: 0;
            background-color: #fff;
            padding: 0.6em;
            cursor: pointer;
            box-shadow: 0 0 6px rgb(0 0 0 / 10%);
            transition: scale box-shadow background-color 0.1s;
            transition-timing-function: ease;
        }
        button.wps-button:active{
            opacity: 0.5;
            scale: 0.9;
            background-color: rgb(248, 248, 248);
            box-shadow: 0 0 6px rgb(0 0 0 / 0%);
        }
        </style>
        `
    }

    renderHTML(){
        //TODO:
        // really bad rendering
        // styling should be injected
        var html =  `${this.renderStyes()}
        <h3>Сканнер участников вебинара</h3>`
        if(!this.scanner.api.hasToken()){
            html += this.renderNoTokenError()
        }else
        if(!this.scanner.api.isTokenValid()){
            html += this.renderInvalidTokenError()
        }
        else{
            html += this.renderInterface()
        }
        return html
    }
    updateUI(){
        this.uiContainer.innerHTML = this.renderHTML()
    }
    async notifyUsers(){
        await this.scanner.notifyUsers()
        this.notifyResult = this.updateUI()
    }
    async scanPeople(){
        this.scanResult = await this.scanner.scanPeople()
        this.updateUI()
    }
    async start(){
        await this.scanner.setup()
        this.updateUI()
    }
}

function createUIContainer(){
    var uiContainer = document.createElement("DIV")
    uiContainer.style.overflowY = "auto"
    uiContainer.style.height = "calc(100%)"
    uiContainer.style.padding = "2em"
    uiContainer.style.boxShadow = "0 -10px 11px -10px rgb(0 0 0 / 5%)"
    return uiContainer
}

function setupUserInterface(){
    var container = document.getElementsByClassName(streamPeopleTabClassName)[0]
    if (container){
        container.style.height = "50%"
        var uiContainer = createUIContainer()
        container.appendChild(uiContainer)

        var instanceName = "people_scanner_instance"
        var peopleScanner = new PeopleScannerControls("window."+instanceName, uiContainer)
        window.people_scanner_instance = peopleScanner
        peopleScanner.start()
        return true
    }
    else{
        return false
    }
}

window.global_scanner = new PeopleScanner()
window.global_scanner.setup()