class Attribute {
    constructor(name, defaultVal, inputType) {
        this.name = name
        this.defaultVal = defaultVal
        this.inputType = inputType
    }
}

class Item {
    constructor(name, description, parent, attributes, url, task, allowedTypes) {
        this.name = name
        this.description = description
        this.parent = parent
        this.attributes = attributes
        this.url = `static/tiles/${url}`
        this.task = Number(task)
        this.allowedTypes = allowedTypes
    }
}

const tools = {
    "Eraser": new Item("Eraser", "Erase tiles you previously drew.", "", [], "Eraser.png", 0, ["topdown", "platformer"]),
    "Player": new Item("Player", "Where the player appears when the level is loaded.", "", [], "Player.png", 0, ["topdown", "platformer"]),
}

let toolbarLookup = {...tools}

let items = {}

const selector = `static/tiles/Selector.png`

let board = []

let activeItem = ""
let task = 7
let type = "topdown"

let toolbar = document.getElementById("toolbar")
let level = document.getElementById("level")

let types = {}

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
    renderAttributes()
})

let backgroundFname = "Grass.png"
let bgTiled= true

type = typeSelect.value
task = Number(taskSelect.value)

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

    let editorData = {}
    fetch("static/editor.json").then(
        (response) => {
            return response.json()
        }).then(data => {
            editorData = data
            initTasks(editorData["tasks"])
            initTypes(editorData["types"])
            initItems(editorData["items"])
            resetLevel()
        renderToolbar()
        })
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
    type = dropdown.children[0].value
    dropdown.children[0].selected = true
}

function initItems(loadedItems) {
    items = loadedItems
    for ([item, itemEntry] of Object.entries(loadedItems)) {
        items[item] = new Item(itemEntry["name"], itemEntry["description"], itemEntry["parent"], itemEntry["attributes"], itemEntry["url"], itemEntry["task"], itemEntry["allowedTypes"])
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
        toolbarItem.style.backgroundImage = "url(" + itemInstance.url + ")"
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
    toolbarLookup[activeItem].attributes.forEach((item) => {
        let label = document.createElement("label")
        let input = document.createElement("input")
        label.for = item.name
        label.textContent = item.name
        input.id = item.name
        input.name = item.name
        input.type = item.inputType
        input.value = item.defaultVal
        const legal = /[a-z]|[0-9]|[!@#$%^&*()\-_+=.?~`]/i;
        input.oninput = (item) => {
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
        attributes.append(label, input, document.createElement("br"))
    })
    attributesSec.append(attributes)
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
    activeItem = item.textContent
    renderAttributes()
}

function mouseDownEvent(event) {
    event.preventDefault();
    if (activeItem === "") {
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
        case "Settings":
            document.getElementById("settings").style.display = ""
            if (document.getElementById("selector") != null) {
                document.getElementById("selector").remove()
            }
            const selector = document.createElement("div")
            selector.id = "selector"
            selector.style.backgroundImage = "url(" + selector + ")"
            item.append(selector)
            activeItem = item.textContent
            renderAttributes()
    }
}

function drawEvent(event) {
    if (event.target.className === "box") {
        if (Object.keys(tools).includes(activeItem)) {
            toolHandler(event)
        }
        event.target.style.backgroundImage = "url(" + toolbarLookup[activeItem].url + ")"
        event.target.textContent = activeItem
        event.target.dataset.type = "tile"
        let attributes = document.getElementsByClassName("attribute").length !== 0 ? "," + Array.from(document.getElementsByClassName("attribute")).map((element) => element.value).reduce((a, b) => a + "," + b) : ""
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
    board = Array(Number(document.getElementById("height").value)).fill("").map(() => Array(Number(document.getElementById("width").value)).fill(""))
}

function importLevel(file) {
    const reader = new FileReader()
    reader.readAsText(file)
    reader.onload = () => {
        const lvl = reader.result.split("\n")
        switch (lvl[0].split(',')[0]) {
            case "TopDownLevel":
                typeSelect.value = "topdown"
                break
            case "PlatformerLevel":
                typeSelect.value = "platformer"
                break
            case "OpenWorldLevel":
                typeSelect.value = "openworld"
                break
            case "SideScrollerLevel":
                typeSelect.value = "sidescroller"
                break
            default:
                return
        }
        document.getElementById("name").value = lvl[0].split(',')[1]
        document.getElementById("width").value = lvl[0].split(',')[2]
        document.getElementById("height").value = lvl[0].split(',')[3]
        resetLevel()
        let width = lvl[1].split(',')[1]
        let height = lvl[1].split(',')[2]
        board[height][width] = `,Player,${width},${height}`
        for (let line of lvl.slice(2)) {
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
                    div.style.backgroundImage = `url(${toolbarLookup[board[y][x].split(',')[1]].url})`
                    div.textContent = board[y][x].split(',')[1]
                }
            }
        }
    }
}

function exportLevel() {
    let name = document.getElementById("name").value === "" ? "level" : document.getElementById("name").value
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
    let typePrettyName = ""
    switch (type) {
        case "topdown":
            typePrettyName = "TopDownLevel"
            break
        case "platformer":
            typePrettyName = "PlatformerLevel"
            break
        case "openworld":
            typePrettyName = "OpenWorldLevel"
            break
        case "sidescroller":
            typePrettyName = "SideScrollerLevel"
            break
        default:
            typePrettyName = type
    }

    out = `${typePrettyName},${name},${board[0].length},${board.length}\nPlayerStartLocation,${startLocation[0]},${startLocation[1]}\n${bgTiled ? "BackgroundTile" : "BackgroundImage"},${backgroundFname}\n` + out
    const link = document.createElement("a")
    const file = new Blob([out], {type: "text/plain"})
    link.href = URL.createObjectURL(file)
    link.download = name + ".csv"
    link.click()
    URL.revokeObjectURL(link.href)
}