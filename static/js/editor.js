class Item {
    constructor(name, description, parent, attributes, url, task, allowedTypes, alternatives=[]) {
        this.name = name
        this.description = description
        this.parent = parent
        this.attributes = attributes
        this.url = `static/tiles/${url}`
        this.task = Number(task)
        this.allowedTypes = allowedTypes
        this.alternatives = alternatives
        this.custom = false

        this.allowedTypes.push("custom")
        alternatives.forEach((item) => {item.url = `static/tiles/${item.url}`})

    }
}

const tools = {
    "Eraser": new Item("Eraser", "Erase tiles you previously drew.", "", [], "Eraser.png", 0, ["topdown", "platformer"]),
    "Player": new Item("Player", "Where the player appears when the level is loaded.", "", [], "Player.png", 0, ["topdown", "platformer"]),
    "Custom": new Item("Custom", "Create custom tiles.", "", [{"name": "Parent", "defaultVal": "", "inputType": "text"},{"name": "Name", "defaultVal": "", "inputType": "text"},{"name":"Toolbar","defaultVal":"Add to Toolbar","inputType":"button"},{"name":"Export Custom","defaultVal":"Export Custom Items","inputType":"button"},{"name":"Import Custom","defaultVal":"Import Custom Items","inputType":"button"}], "Custom.png", 0, ["topdown", "platformer"])
}

let toolbarLookup = {...tools}

let items = {}

const selector = `static/tiles/Selector.png`

let toolbar = document.getElementById("toolbar")
let level = document.getElementById("level")

let types = {}

let globalBackgrounds = {}

let backgroundFname = "Grass.png"
let bgTiled= true

let activeItem = ""
let type = ""
let task = 0
let board = []

let customConfig = {}

initEditor()

if (localStorage.getItem("theme") === "dark") {
    setDarkMode(true)
    document.getElementById("dark-mode").checked = true
} else {
    setDarkMode(false)
    document.getElementById("dark-mode").checked = false
}

function initEditor() {
    document.getElementById("eraser-button").addEventListener("click", (event) => {setActiveItem(event)})
    document.getElementById("player-button").addEventListener("click", (event) => setActiveItem(event))
    document.getElementById("custom-button").addEventListener("click", (event) => setActiveItem(event))
    const reset = document.getElementById("reset")
    reset.addEventListener("click", resetLevel)

    const exportBtn = document.getElementById("export")
    exportBtn.addEventListener("click", exportLevel)

    const taskSelect = document.getElementById("task")
    taskSelect.addEventListener("change", () => {
        task = Number(taskSelect.value)
        if (activeItem === "" || toolbarLookup[activeItem].task > task) {
            activeItem = ""
        }
        renderToolbar()
        renderAttributes()
    })

    const typeSelect = document.getElementById("type")
    typeSelect.addEventListener("change", () => {
        type = typeSelect.value
        renderToolbar()
        if (activeItem === "" || !toolbarLookup[activeItem].allowedTypes.includes(type)) {
            activeItem = ""
        }
        if (type === "custom") {
            document.getElementById("custom-type-container").style.display = "block"
        } else {
            document.getElementById("custom-type-container").style.display = "none"
            document.getElementById("type-name").value = types[type]
        }

        renderAttributes()
    })
    fetch("static/editor.json").then(
        (response) => {
            return response.json()
        }).then(data => {
            initTasks(data["tasks"])
            initTypes(data["types"])
            initItems(data["items"])
            resetLevel()
            initBackgrounds(data["backgrounds"])
        renderToolbar()
        })
}

function initBackgrounds(backgrounds) {
    let selector = document.getElementById("background-select")
    for (let background of backgrounds) {
        let select = document.createElement("option")
        select.value = background["filename"]
        select.textContent = background["filename"]
        globalBackgrounds[background["filename"]] = background["tiled"]
        selector.append(select)
    }
    let custom = document.createElement("option")
    custom.value = "Custom"
    custom.textContent = "Custom"
    selector.append(custom)
    selector.children[0].selected = true
    selector.addEventListener("change", (event) => {
        changeBackground(event.target.value)
    })
    changeBackground(selector.children[0].value)
}

function changeBackground(to) {
    if (to === "Custom") {
        document.getElementById("background-options").style.display = "block"
        document.getElementById("level").style.backgroundImage = "url('static/tiles/Grass.png')"
    } else {
        document.getElementById("background-options").style.display = "none"
        document.getElementById("bg-filename").value = to
        document.getElementById("bg-tiled").checked = globalBackgrounds[to]
        document.getElementById("level").style.backgroundImage = `url('static/tiles/${to}')`
    }
}

function initTasks(tasks) {
    let dropdown = document.getElementById("task")
    for (let i = 0; i < tasks.length; i++) {
        let task = document.createElement("option")
        task.value = (i+1).toString()
        task.textContent = tasks[i]
        dropdown.append(task)
    }
    task = dropdown.children.length
    dropdown.children[dropdown.children.length-1].selected = true
}

function initTypes(loadedTypes) {
    types = loadedTypes
    let dropdown = document.getElementById("type")
    for ([id, prettyName] of Object.entries(loadedTypes)) {
        let type = document.createElement("option")
        type.value = id
        type.textContent = prettyName
        dropdown.append(type)
    }
    let opt = document.createElement("option")
        opt.value = "custom"
        opt.textContent = "Custom"
        dropdown.append(opt)
    type = dropdown.children[0].value
    document.getElementById("type-name").value = types[type]
    dropdown.children[0].selected = true
}

function initItems(loadedItems) {
    items = loadedItems
    for ([item, itemEntry] of Object.entries(loadedItems)) {
        if ("alternatives" in itemEntry) {
            items[item] = new Item(item, itemEntry["description"],
            itemEntry["parent"], itemEntry["attributes"], itemEntry["url"],
            itemEntry["task"], itemEntry["allowedTypes"], itemEntry["alternatives"])
        } else {
            items[item] = new Item(item, itemEntry["description"],
            itemEntry["parent"], itemEntry["attributes"], itemEntry["url"],
            itemEntry["task"], itemEntry["allowedTypes"])
        }
    }
    toolbarLookup = {...tools, ...items}
}

function setDarkMode(to) {
    document.getElementById("dark-mode-style").disabled = !to
    localStorage.setItem("theme", to ? "dark" : "light")
}

function renderToolbar() {
    Array.from(document.getElementsByTagName("div")).filter((el) => { return el.dataset.type === "tb-tile" }).forEach((el) => el.remove())

    let legalItems = Object.entries(items).filter(([item, itemInstance]) => {
        return (itemInstance.task <= task && itemInstance.allowedTypes.includes(type) && !Object.keys(tools).includes(item))
    })
    for (const [item, itemInstance] of legalItems) {
        const toolbarItem = document.createElement("div")
        toolbarItem.className = "toolbar-item"
        toolbarItem.textContent = itemInstance.name
        toolbarItem.style.backgroundImage = `url(${itemInstance.url})`
        toolbarItem.dataset.type = "tb-tile"

        toolbarItem.addEventListener("click", setActiveItem)

        if (item === activeItem) {
            const selector = document.createElement("div")
            selector.id = "selector"
            selector.style.backgroundImage = "url(" + selector + ")"
            toolbarItem.append(selector)
        }
        toolbar.append(toolbarItem)
    }
}

function renderAttributes() {
    if (!Object.keys(toolbarLookup).includes(activeItem)) {
        document.getElementById("attributes-section").innerHTML = "<h2>Level Editor</h2><p class=\"center\">Click on a tile to start drawing it.</p><p class=\"center\">Left Click - Draw</p> <p class=\"center\">Right Click - Erase</p>"
        return
    }
    let attributesSec = document.getElementById("attributes-section")
    attributesSec.innerHTML = ""
    let heading = document.createElement("h2")
    let description = document.createElement("p")
    let attributes = document.createElement("div")
    attributes.id = "attributes"
    heading.textContent = toolbarLookup[activeItem].name
    description.textContent = toolbarLookup[activeItem].description
    attributesSec.append(heading, description)
    if (activeItem === "Custom") {
        document.getElementById("customizer").style.display = "block"
        return
    } else {
        document.getElementById("customizer").style.display = "none"
    }
    toolbarLookup[activeItem].attributes.forEach((item) => {
        let label = document.createElement("label")
        let input = document.createElement("input")
        label.for = item.name
        label.textContent = item.name
        input.id = item.name
        input.name = item.name
        input.type = item.inputType
        input.value = item.defaultVal

        input.oninput = (item) => {
            let legal = /[a-z]|[0-9]|[\s!@#$%^&*()\-_+=.?~`]/i
            item.target.value = Array.from(item.target.value).filter((character) => {
                    return legal.test(character)
            }).join('')
        }
        if (item.inputType !== "text") {
            input.size = 5
        }
        if (item.name === "Filename") {
            input.value = backgroundFname
            input.addEventListener("change", (event) => {
                backgroundFname = event.target.value
            })
        }

        input.className = "attribute"

      attributes.append(label, document.createElement("br"), input, document.createElement("br"))
    })

    if (toolbarLookup[activeItem].alternatives.length !== 0) {
        let label = document.createElement("label")
        let select = document.createElement("select")
        label.for = "alternatives"
        label.textContent = "Sprite"
        toolbarLookup[activeItem].alternatives.forEach((item) => {
            let option = document.createElement("option")
            option.value = item.value
            option.name = item.displayName
            option.textContent = item.displayName
            select.append(option)
            select.className = "attribute"
            select.id = "alternatives-select"
        })
        attributes.append(label, select, document.createElement("br"))
    }

    attributesSec.append(attributes)
}

function customizerAdd() {
    let name = document.getElementById("custom-name").value
    let parent = document.getElementById("custom-parent").value
    if (name === "" || parent === "") {
        return
    }
    addCustomItem(name, parent)
}

function addCustomItem(name, parent) {
    let item = new Item(
        name,
        "",
        parent,
        [
        {
        "name": "Attributes",
        "defaultVal": "",
        "inputType": "text"
        }],
        "", 0, Object.keys(types)
    )
    item.url = `\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' version='1.1' height='80px' width='80px'><rect x='0' y='0' width='500px' height='500px' fill='${encodeURIComponent(document.getElementById("custom-color").value)}'></rect><text x='0' y='40' fill='white' font-size='20' font-family='sans-serif' font-weight='bold'>${name}</text></svg>\"`
    item.custom = true
    toolbarLookup[name] = item
    items[name] = item
    customConfig[name] = item
    renderToolbar()
}

function setActiveItem(event) {
    let item = event.currentTarget
    if (document.getElementById("selector") != null) {
        document.getElementById("selector").remove()
    }
    const selector = document.createElement("div")
    selector.id = "selector"
    selector.style.backgroundImage = "url(" + selector + ")"
    item.append(selector)
    activeItem = toolbarLookup[item.textContent].name
    renderAttributes()
}

function setTiledBackground(to) {
    bgTiled = to

}

function exportCustom() {
    let lvlName = document.getElementById("name").value === "" ? "level" : document.getElementById("name").value
    let filename = lvlName + "-config.json"
    const json = JSON.stringify(customConfig, null, 4)
    const file = new Blob([json], {type: "application/json"})
    const link = document.createElement("a")
    link.href = URL.createObjectURL(file)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
}

function importCustom(file) {
    const reader = new FileReader()
    reader.readAsText(file)
    reader.onload = () => {
        let json = JSON.parse(reader.result.toString())
        customConfig = {...customConfig, ...json}
        toolbarLookup = {...toolbarLookup, ...json}
        items = {...items, ...json}
        renderToolbar()
    }
}

function mouseDownEvent(event) {
    event.preventDefault();
    if (activeItem === "" || activeItem === "Custom") {
        return
    }
    if (activeItem === "Eraser") {
        eraseEvent(event)
        level.addEventListener("mouseover", eraseEvent)
        return
    }

    if (event.button === 0) {
        drawEvent(event)
        level.addEventListener("mouseover", drawEvent)
    } else if (event.button === 2) {
        eraseEvent(event)
        level.addEventListener("mouseover", eraseEvent)
    }
}

function toolHandler(event) {
    switch (activeItem) {
        case "Eraser":
            eraseEvent(event)
            level.addEventListener("mouseover", eraseEvent)
            break
        case "Player":
            if (document.getElementById("player") != null) {
                const prev = document.getElementById("player")
                prev.id = ""
                prev.style.removeProperty("background-image")
                prev.textContent = " "
                board[Number(prev.dataset.y)][Number(prev.dataset.x)] = ""
            }
            event.target.id = "player"
            break
    }
}

function drawEvent(event) {
    if (event.target.className === "box") {
        if (Object.keys(tools).includes(activeItem)) {
            toolHandler(event)
        }
        if (toolbarLookup[activeItem].alternatives.length !== 0) {
            let alternative = toolbarLookup[activeItem].alternatives.find((item) => {
                return item.value === document.getElementById("alternatives-select").value
            })
            event.target.style.backgroundImage = "url(" + alternative.url + ")"
        } else {
            event.target.style.backgroundImage = "url(" + toolbarLookup[activeItem].url + ")"
        }
        event.target.textContent = toolbarLookup[activeItem].name
        event.target.dataset.type = "tile"
        const attributes = document.getElementsByClassName("attribute").length !== 0 && !(toolbarLookup[activeItem].custom && document.getElementById("Attributes").value.length === 0) ? "," + Array.from(document.getElementsByClassName("attribute")).map((element) => element.value).reduce((a, b) => a + "," + b) : ""
        board[Number(event.target.dataset.y)][Number(event.target.dataset.x)] = toolbarLookup[activeItem].parent + "," + toolbarLookup[activeItem].name + "," + event.target.dataset.x + "," + event.target.dataset.y + attributes + "\n"
    }
    level.addEventListener("mouseup", () => {
        level.removeEventListener("mouseover", drawEvent)
    })
}

function eraseEvent(event) {
    if (event.target.className === "box") {
        event.target.style.removeProperty("background-image")
        event.target.textContent = " "
        board[Number(event.target.dataset.y)][Number(event.target.dataset.x)] = ""
    }
    level.addEventListener("mouseup", () => {
        level.removeEventListener("mouseover", eraseEvent)
    })
}

function resetLevel() {
    document.getElementById("level").remove()
    const nlevel = document.createElement("div")
    nlevel.id = "level"
    for (let y = 0; y < document.getElementById("height").value; y++) {
        const row = document.createElement("div")
        row.className = "row"
        for (let x = 0; x < document.getElementById("width").value; x++) {
            const tile = document.createElement("div")
            tile.className = "box"
            tile.textContent = " "
            tile.dataset.x = x.toString()
            tile.dataset.y = y.toString()
            row.append(tile)
        }
        nlevel.append(row)
    }
    nlevel.addEventListener("mousedown", mouseDownEvent)
    nlevel.addEventListener("contextmenu", (e) => {
        e.preventDefault()
    })
    document.getElementById("level-container").prepend(nlevel)
    level = nlevel
    changeBackground(document.getElementById("background-select").value)
    board = Array(Number(document.getElementById("height").value)).fill("").map(() => Array(Number(document.getElementById("width").value)).fill(""))
}

let stu = ""

function importLevel(file) {
    const reader = new FileReader()
    reader.readAsText(file)
    reader.onload = () => {
        const lvl = reader.result.split("\n")
        const typeSelect = document.getElementById("type")
        const selType = Object.keys(types).find((type) => {return types[type] === lvl[0].split(',')[0]})
        if (selType !== undefined) {
            typeSelect.value = selType
            type = selType
            document.getElementById("custom-type-container").style.display = "none"
            document.getElementById("type-name").value = types[selType]
        } else {
            typeSelect.value = "custom"
            type = "custom"
            document.getElementById("custom-type-container").style.display = "block"
            document.getElementById("type-name").value = lvl[0].split(',')[0]
        }
        document.getElementById("name").value = lvl[0].split(',')[1]
        document.getElementById("width").value = lvl[0].split(',')[2]
        document.getElementById("height").value = lvl[0].split(',')[3]
        resetLevel()
        if (lvl[1].split(',')[1] !== "undefined" && lvl[1].split(',')[2] !== "undefined") {
            let width = lvl[1].split(',')[1]
            let height = lvl[1].split(',')[2]
            board[height][width] = `,Player,${width},${height}`
        }
        let bgFilename = lvl[2].split(',')[1].replace("\n","")
        document.getElementById("bg-filename").value = bgFilename
        document.getElementById("bg-tiled").checked = lvl[2].split(',')[0] === "BackgroundTile"
        if (Object.keys(globalBackgrounds).includes(bgFilename)) {
            document.getElementById("background-select").value = bgFilename
        } else {
            document.getElementById("background-select").value = "Custom"
        }
        document.getElementById("background-select").dispatchEvent(new Event("change"))

        for (let line of lvl.slice(3)) {
            if (line !== "") {
                let width = line.split(',')[2]
                let height = line.split(',')[3]
                board[height][width] = line + "\n"
            }
        }
        for (let y = 0; y < board.length; y++) {
            for (let x = 0; x < board[y].length; x++) {
                if (board[y][x] !== "") {
                    const div = document.getElementById("level").children[y].children[x]
                    if (!(board[y][x].split(',')[1] in toolbarLookup)) {
                        addCustomItem(board[y][x].split(',')[1], board[y][x].split(',')[0])
                        div.style.backgroundImage = `url(${items[board[y][x].split(',')[1]].url})`
                    } else {
                        let item = toolbarLookup[board[y][x].split(',')[1]]
                        if (item.alternatives.length !== 0) {
                        let alternative = item.alternatives.find((item) => {
                            let entry = board[y][x].split(',')
                            return item.value === entry[entry.length-1].replace("\n", "")
                        })
                        div.style.backgroundImage = `url(${alternative.url})`
                        } else (
                            div.style.backgroundImage = `url(${item.url})`
                        )
                    }
                }
            }
        }
        renderToolbar()
    }
}

function exportLevel() {
    let lvlName = document.getElementById("name").value === "" ? "level" : document.getElementById("name").value
    let out = ""
    let startLocation = []
    for (let y = 0; y < board.length; y++) {
        for (let x = 0; x < board[y].length; x++) {
            if (board[y][x].split(",")[1] === "Player") {
                startLocation = [x, y]
            } else {
                out += board[y][x]
            }
        }
    }
    let lvlTypePrettyName = document.getElementById("type-name").value

    let bgName = document.getElementById("bg-filename").value

    out = `${lvlTypePrettyName},${lvlName},${board[0].length},${board.length}\nPlayerStartLocation,${startLocation[0]},${startLocation[1]}\n${bgTiled ? "BackgroundTile" : "BackgroundImage"},${bgName}\n` + out
    const link = document.createElement("a")
    const file = new Blob([out], {type: "text/plain"})
    link.href = URL.createObjectURL(file)
    link.download = lvlName + ".csv"
    link.click()
    URL.revokeObjectURL(link.href)
}