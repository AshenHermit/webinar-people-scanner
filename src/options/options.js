class OptionsScreen extends Client{
    constructor(){
        super()
        this.changesSaved = false
        this.moreOptionsShown = false
        this.saveStatusTimeout = 0
    }

    async saveChanges(){
        this.changesSaved = false
        this.updateDOM()
        await writeConfigToStorage(this.config)
        this.changesSaved = true
        this.updateDOM()
        clearTimeout(this.saveStatusTimeout)
        this.saveStatusTimeout = setTimeout(()=>{
            this.changesSaved = false
            this.updateDOM()
        }, 1000)
    }

    showMoreOptions(){
        this.moreOptionsShown = !this.moreOptionsShown
        this.updateDOM()
    }

    updateDOM(){
        super.updateDOM()
        
        // TODO: needs some dynamic logic
        var fields = ["token", "api_server", "main_server"]

        fields.forEach(field=>{
            setPropsOfId(field+"_input", {oninput: makeInputHook(this.config, field, this.saveChanges.bind(this))})
        })
        if (this.config){
            fields.forEach(field=>{
                if(this.config[field]){
                    setPropsOfId(field+"_input", {value: this.config[field]})
                }
            })
        }
        
        setPropsOfId("show_more_options_button", {onclick: this.showMoreOptions.bind(this)})

        setStylesOfId("more_options_folder", {
            maxHeight: this.moreOptionsShown?'1000px':'0px'
        })
        setStylesOfId("save_status", {
            maxHeight: this.changesSaved?'100px':'0px'
        })
    }
}

var client = new OptionsScreen()
client.setup()