var setState = (el, state)=>{el.style.display = state?'':'none'}
var updatePair = (state, elTrue, elFalse)=>{setState(elTrue, state); setState(elFalse, !state);}
var getElements = (dataId)=>Array.from(document.querySelectorAll(`*[data-id*="${dataId}"]`))
var updateIdPair = (state, dataIdTrue, dataIdFalse)=>{
    var els = [getElements(dataIdFalse), getElements(dataIdTrue)]
    els.forEach((array,i)=>{array.forEach(x=>setState(x, i==1?state:!state))})
}
var setPropsOfId = (dataId, props)=>{
    var elements = getElements(dataId)
    var keys = Object.keys(props)
    elements.forEach(el => {
        Object.assign(el, props)
    })
}
var setStylesOfId = (dataId, styles)=>{
    var elements = getElements(dataId)
    var keys = Object.keys(styles)
    elements.forEach(el => {
        Object.assign(el.style, styles)
    })
}
var makeInputHook = (object, key, callback=null)=>{
    return function(e){
        object[key] = e.target.value
        if(callback) callback()
    }
}

class Client{
    constructor(){
        this.loaded = false
        this.config = null
        this.appInfo = null
        this.has_token = false
    }
    goToOptions(){
        chrome.runtime.openOptionsPage()
    }
    onShowPasswordButton(e){
        var input = e.target.previousElementSibling
        var targetClasses = e.target.classList
        if(input.type == "password"){
            input.type = "text"
            targetClasses.add("active")
        }
        else{
            input.type = "password"
            targetClasses.remove("active")
        }
    }
    async loadData(){
        this.config = await readConfigFromStorage()
        this.has_token = this.config.token != undefined
        console.log(this.config)
        this.appInfo = await chrome.management.getSelf()
    }
    async setup(){
        this.updateDOM()
        await this.loadData()
        this.loaded = true
        this.updateDOM()
    }

    updateDOM(){
        setPropsOfId("mbcd_link", {href: "https://mbc-d.ru", target: "_blank", innerHTML: "mbc-d.ru"})
        setPropsOfId("token_page_link", {href: "https://mbc-d.ru/dashboard/headman/services?act=app-token", target: "_blank"})

        setPropsOfId("go_to_options_button", {onclick: this.goToOptions.bind(this)})
        setPropsOfId("show_password_button", {onclick: this.onShowPasswordButton.bind(this)})

        updateIdPair(this.loaded, "if_ready", "if_not_ready")
        updateIdPair(this.has_token, "if_has_token", "if_has_no_token")
    }
}